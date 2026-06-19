/**
 * 限流代理测试脚本
 * ==================
 *
 * 验证 nvidia-rate-limiter.js 是否能正确限流。
 *
 * 测试方法：
 *   1. 启动一个模拟上游服务器（返回 200 OK）
 *   2. 启动限流代理（RL_RATE=20 加速测试）
 *   3. 批量发送请求，验证限流效果
 *
 * 使用方式：
 *   node scripts/rate-limiter-test.js
 *
 * 预期结果：
 *   - 发送 30 个并发请求
 *   - 前 10 个（BURST）立即通过
 *   - 后 20 个排队，以 20/分钟的速度释放
 *   - 全部完成约需 60~70 秒
 */

const http = require('http');
const { spawn } = require('child_process');

// ======================== 配置 ========================

const MOCK_PORT = 3180;
const PROXY_PORT = 3081;     // 用不同端口避免冲突
const TEST_RATE = 20;        // 测试用速率（20/分钟 = 每 3 秒 1 个）
const TEST_BURST = 10;
const REQUEST_COUNT = 30;    // 发送 30 个请求

// ======================== 辅助：日志 ========================

function log(prefix, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${prefix}] ${msg}`);
}

// ======================== 1. 启动模拟上游服务器 ========================

function startMockUpstream() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      log('MOCK', `收到请求: ${req.method} ${req.url}`);

      // 模拟 50ms 处理延迟
      setTimeout(() => {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-Mock-Server': 'true',
        });
        res.end(JSON.stringify({ status: 'ok', path: req.url }));
      }, 50);
    });

    server.listen(MOCK_PORT, '127.0.0.1', () => {
      log('MOCK', `模拟上游服务器已启动 → http://127.0.0.1:${MOCK_PORT}`);
      resolve(server);
    });
  });
}

// ======================== 2. 启动限流代理 ========================

function startProxy() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      RL_PORT: String(PROXY_PORT),
      RL_RATE: String(TEST_RATE),
      RL_BURST: String(TEST_BURST),
      RL_UPSTREAM: `http://127.0.0.1:${MOCK_PORT}`,
    };

    const proc = spawn('node', ['scripts/nvidia-rate-limiter.js'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });

    let started = false;

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(`  [PROXY] ${text}`);
      // 检测到"监听端口"行说明已启动
      if (!started && text.includes('监听端口')) {
        started = true;
        resolve(proc);
      }
    });

    proc.stderr.on('data', (data) => {
      process.stderr.write(`  [PROXY-ERR] ${data}`);
    });

    proc.on('error', reject);

    // 5 秒超时
    setTimeout(() => {
      if (!started) reject(new Error('代理启动超时'));
    }, 5000);
  });
}

// ======================== 3. 发送测试请求 ========================

function sendRequest(index) {
  return new Promise(resolve => {
    const startTime = Date.now();

    const req = http.request({
      hostname: '127.0.0.1',
      port: PROXY_PORT,
      path: `/test/request-${index}`,
      method: 'GET',
      timeout: 60000,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const elapsed = Date.now() - startTime;
        resolve({ index, status: res.statusCode, elapsed, body });
      });
    });

    req.on('error', (err) => {
      resolve({ index, status: 0, elapsed: Date.now() - startTime, error: err.message });
    });

    req.end();
  });
}

// ======================== 4. 获取代理状态 ========================

function getStats() {
  return new Promise(resolve => {
    const req = http.get(`http://127.0.0.1:${PROXY_PORT}/stats`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

// ======================== 主测试流程 ========================

async function runTest() {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║     🚦 限流代理功能测试                      ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');

  let mockServer;
  let proxyProc;

  try {
    // 启动模拟上游
    log('INIT', '启动模拟上游服务器...');
    mockServer = await startMockUpstream();

    // 启动限流代理
    log('INIT', `启动限流代理 (RL_RATE=${TEST_RATE}, RL_BURST=${TEST_BURST})...`);
    proxyProc = await startProxy();
    log('INIT', '限流代理已启动');

    // 等一秒让代理完全就绪
    await new Promise(r => setTimeout(r, 1000));

    // 获取初始状态
    const initialStats = await getStats();
    log('INIT', `初始状态: 令牌=${initialStats?.token_bucket?.current}, 请求数=${initialStats?.stats?.total_requests}`);

    // === 发送批量请求 ===
    console.log('');
    log('TEST', `并发发送 ${REQUEST_COUNT} 个请求...`);
    console.log('');

    const startAll = Date.now();
    const promises = [];
    for (let i = 1; i <= REQUEST_COUNT; i++) {
      promises.push(sendRequest(i));
    }

    // 等待所有请求完成
    const results = await Promise.all(promises);
    const totalTime = Math.floor((Date.now() - startAll) / 1000);

    // === 分析结果 ===
    console.log('');
    log('DONE', `全部 ${REQUEST_COUNT} 个请求已完成，耗时 ${totalTime} 秒`);
    console.log('');

    // 按耗时排序输出
    results.sort((a, b) => a.elapsed - b.elapsed);

    console.log('  ┌──────┬────────┬──────────┬──────────────┐');
    console.log('  │  #   │ 状态码 │ 耗时(ms) │ 备注          │');
    console.log('  ├──────┼────────┼──────────┼──────────────┤');
    for (const r of results) {
      const note = r.elapsed < 100
        ? '立即通过'
        : r.elapsed < 10000
          ? `排队 ${Math.floor(r.elapsed / 1000)}s`
          : `排队 ${Math.floor(r.elapsed / 1000)}s`;
      const status = r.error ? 'ERR' : String(r.status);
      console.log(
        `  │ ${String(r.index).padStart(3)} │ ${status.padStart(5)} │ ${String(r.elapsed).padStart(7)} │ ${note.padEnd(12)} │`
      );
    }
    console.log('  └──────┴────────┴──────────┴──────────────┘');
    console.log('');

    // === 最终状态 ===
    const finalStats = await getStats();
    console.log('  ┌── 最终统计 ──────────────────────────────┐');
    console.log(`  │  总请求: ${String(finalStats?.stats?.total_requests ?? '?').padStart(5)}                       │`);
    console.log(`  │  转发:   ${String(finalStats?.stats?.forwarded ?? '?').padStart(5)}                       │`);
    console.log(`  │  排队:   ${String(finalStats?.stats?.queued ?? '?').padStart(5)}                       │`);
    console.log(`  │  错误:   ${String(finalStats?.stats?.errors ?? '?').padStart(5)}                       │`);
    console.log(`  │  总耗时: ${String(totalTime).padStart(5)} 秒                     │`);
    console.log('  └──────────────────────────────────────────┘');
    console.log('');

    // === 结果判定 ===
    const successCount = results.filter(r => r.status === 200).length;
    const errorCount = results.filter(r => r.status !== 200).length;

    console.log('  ┌── 测试结论 ──────────────────────────────┐');
    if (errorCount === 0 && successCount === REQUEST_COUNT) {
      console.log('  │  ✅ 全部请求成功转发                       │');
    } else {
      console.log(`  │  ⚠️  成功 ${successCount} / 失败 ${errorCount}                   │`);
    }

    // 估算实际速率
    if (totalTime > 0) {
      const actualRate = Math.round((REQUEST_COUNT / totalTime) * 60);
      console.log(`  │  实际速率: ~${String(actualRate).padStart(2)} 次/分钟                    │`);
      if (actualRate <= TEST_RATE + 2) {
        console.log('  │  ✅ 速率控制符合预期                        │');
      } else {
        console.log(`  │  ⚠️  速率 ${actualRate} > ${TEST_RATE}，可能需检查令牌桶           │`);
      }
    }
    console.log('  └──────────────────────────────────────────┘');
    console.log('');

  } catch (err) {
    console.error('');
    console.error(`  [FATAL] 测试失败: ${err.message}`);
    console.error('');
  } finally {
    // 清理
    log('CLEAN', '清理资源...');

    if (proxyProc) {
      proxyProc.kill('SIGTERM');
      log('CLEAN', '代理进程已终止');
    }

    if (mockServer) {
      mockServer.close();
      log('CLEAN', '模拟上游服务器已关闭');
    }

    // 确保所有子进程退出
    setTimeout(() => process.exit(0), 500);
  }
}

// 运行测试
runTest();
