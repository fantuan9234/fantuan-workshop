/**
 * NVIDIA GLM5.1 API 请求限流代理
 * ================================
 *
 * 功能：在本地启动一个 HTTP 代理服务器，所有发往 NVIDIA API 的请求
 * 经过此代理时会被限流（默认 ≤ 40 次/分钟），超出部分自动排队。
 *
 * 使用方式：
 *   1. 启动代理：   node scripts/nvidia-rate-limiter.js
 *   2. 将客户端的 API endpoint 改为 http://localhost:3080
 *   3. 查看状态：   curl http://localhost:3080/stats
 *
 * 环境变量配置：
 *   RL_PORT      监听端口（默认 3080）
 *   RL_RATE      每分钟请求上限（默认 40）
 *   RL_BURST     最大突发请求数（默认 10）
 *   RL_UPSTREAM  上游 API 地址（默认 https://api.nvidia.com）
 *
 * 原理：令牌桶算法
 *   - 每分钟生成 40 个令牌（每 1.5 秒 1 个）
 *   - 每个请求消耗 1 个令牌，无令牌时排队等待
 *   - 支持短时突发（最多积累 10 个令牌）
 *
 * 依赖：零外部依赖，仅使用 Node.js 内置模块
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ======================== 配置 ========================

const PORT = parseInt(process.env.RL_PORT || '3080', 10);
const RATE = parseInt(process.env.RL_RATE || '40', 10);           // 每分钟请求数
const BURST = parseInt(process.env.RL_BURST || '10', 10);         // 最大突发
const UPSTREAM = process.env.RL_UPSTREAM || 'https://api.nvidia.com';

// 参数校验
if (RATE < 1 || RATE > 1000) {
  console.error('[FATAL] RL_RATE 必须在 1-1000 之间');
  process.exit(1);
}
if (BURST < 1 || BURST > RATE) {
  console.error('[FATAL] RL_BURST 必须在 1-RL_RATE 之间');
  process.exit(1);
}

// ======================== 令牌桶 ========================

class TokenBucket {
  constructor(rate, burst) {
    this.rate = rate;
    this.burst = burst;
    this.tokens = burst;             // 初始为满
    this.lastRefill = Date.now();
    this.refillInterval = 60000 / rate;  // 每多少毫秒生成 1 个令牌
  }

  /** 补充令牌（每次调用时按时间差计算） */
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillInterval);
    if (newTokens > 0) {
      this.tokens = Math.min(this.burst, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }

  /** 尝试消费 1 个令牌，成功返回 true */
  tryConsume() {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }
}

// ======================== 统计 ========================

const stats = {
  totalRequests: 0,
  forwarded: 0,
  queued: 0,
  errors: 0,
  startTime: Date.now(),
};

// ======================== 请求队列 ========================

/** 待处理请求队列（先进先出） */
const queue = [];

/** 添加请求到队列尾部 */
function enqueue(req, res, startTime) {
  return new Promise(resolve => {
    queue.push({ req, res, startTime, resolve });
  });
}

/** 从队列头部取出一个请求 */
function dequeue() {
  return queue.shift();
}

// ======================== 请求转发 ========================

/**
 * 将客户端请求转发到上游 API
 */
function forwardRequest(req, res, startTime) {
  const targetUrl = new URL(req.url, UPSTREAM);

  // 根据上游协议选择 http 或 https
  const isHttps = targetUrl.protocol === 'https:';
  const transport = isHttps ? https : http;
  const defaultPort = isHttps ? 443 : 80;

  // 构建转发选项
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || defaultPort,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.hostname,
    },
    timeout: 60000,             // 60 秒超时
  };

  // HTTPS 时允许自签名证书（适用于自定义上游）
  if (isHttps) {
    options.rejectUnauthorized = false;
  }

  // 如果客户端设置了 proxy-connection，转发时转为 connection
  if (req.headers['proxy-connection']) {
    options.headers['connection'] = req.headers['proxy-connection'];
    delete options.headers['proxy-connection'];
  }

  const proxyReq = transport.request(options, (proxyRes) => {
    // 计算耗时
    const elapsed = Date.now() - startTime;
    const waitTime = elapsed > 100
      ? ` [排队 ${Math.floor(elapsed / 1000)}s]`
      : '';

    console.log(
      `[${proxyRes.statusCode}] ${req.method} ${req.url} (${elapsed}ms)${waitTime}`
    );

    // 把上游响应传回给客户端
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);

    // 请求完成后尝试处理队列
    proxyRes.on('end', processQueue);
    proxyRes.on('close', processQueue);
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    stats.errors++;
    console.error(`[TIMEOUT] ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'text/plain' });
      res.end('Proxy Timeout');
    }
    processQueue();
  });

  proxyReq.on('error', (err) => {
    // 忽略已发送响应后的错误（客户端断开等）
    if (res.headersSent) return;

    stats.errors++;
    console.error(`[ERROR] ${req.method} ${req.url} → ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Proxy Error: ${err.message}`);
    }
    processQueue();
  });

  // 将客户端请求体转发到上游
  req.pipe(proxyReq);
}

// ======================== 队列处理 ========================

/**
 * 尝试从队列中取出请求并转发（有多少令牌就处理多少）
 */
function processQueue() {
  while (queue.length > 0 && bucket.tryConsume()) {
    const item = dequeue();
    stats.forwarded++;
    const waited = Math.floor((Date.now() - item.startTime) / 1000);
    console.log(
      `[DEQUEUE] ${item.req.method} ${item.req.url} (等了 ${waited}s，队列剩余 ${queue.length})`
    );
    forwardRequest(item.req, item.res, item.startTime);
    item.resolve();  // 通知等待者
  }
}

// ======================== 请求处理入口 ========================

async function handleRequest(req, res) {
  const startTime = Date.now();
  stats.totalRequests++;

  // ---- 特殊端点 ----

  // 状态页
  if (req.url === '/stats' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({
      status: 'running',
      uptime_seconds: Math.floor((Date.now() - stats.startTime) / 1000),
      config: { rate: RATE, burst: BURST, port: PORT, upstream: UPSTREAM },
      token_bucket: { current: bucket.tokens, max: BURST },
      queue: { length: queue.length },
      stats: {
        total_requests: stats.totalRequests,
        forwarded: stats.forwarded,
        queued: stats.queued,
        errors: stats.errors,
      },
      timestamp: new Date().toISOString(),
    }, null, 2));
    return;
  }

  // 健康检查
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // ---- 普通请求：限流转发 ----

  // 尝试直接获取令牌（无等待）
  if (bucket.tryConsume()) {
    stats.forwarded++;
    forwardRequest(req, res, startTime);
    return;
  }

  // 无可用令牌，加入队列
  stats.queued++;
  const logPrefix = queue.length === 0 ? '[QUEUED]' : `[QUEUED #${queue.length + 1}]`;
  console.log(`${logPrefix} ${req.method} ${req.url}`);

  // 等待被从队列取出
  await enqueue(req, res, startTime);
}

// ======================== 启动服务器 ========================

const bucket = new TokenBucket(RATE, BURST);

const server = http.createServer(handleRequest);

// 定时补充令牌并尝试处理队列（每秒检查一次）
setInterval(() => {
  const prevTokens = bucket.tokens;
  bucket.refill();
  if (bucket.tokens > prevTokens && queue.length > 0) {
    processQueue();
  }
}, 1000);

// 优雅关闭
function shutdown(signal) {
  console.log(`\n[SHUTDOWN] 收到 ${signal}，正在关闭...`);
  if (queue.length > 0) {
    console.log(`[SHUTDOWN] 队列中还有 ${queue.length} 个请求未处理`);
  }
  server.close(() => {
    console.log('[SHUTDOWN] 代理已关闭');
    process.exit(0);
  });
  // 强制退出
  setTimeout(() => {
    console.error('[SHUTDOWN] 强制退出');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

// ======================== 启动信息 ========================

server.listen(PORT, '127.0.0.1', () => {
  const divider = '─'.repeat(56);
  console.log('');
  console.log(`  ┌${divider}┐`);
  console.log(`  │        🚦 NVIDIA GLM5.1 请求限流代理`);
  console.log(`  │${divider}│`);
  console.log(`  │  监听端口  │  http://127.0.0.1:${PORT}`);
  console.log(`  │  速率限制  │  ${RATE} 次/分钟 (每 ${(60 / RATE).toFixed(1)} 秒 1 次)`);
  console.log(`  │  最大突发  │  ${BURST} 次`);
  console.log(`  │  上游地址  │  ${UPSTREAM}`);
  console.log(`  │${divider}│`);
  console.log(`  │  状态查看  │  http://127.0.0.1:${PORT}/stats`);
  console.log(`  │  健康检查  │  http://127.0.0.1:${PORT}/health`);
  console.log(`  └${divider}┘`);
  console.log('');
});
