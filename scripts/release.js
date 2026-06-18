#!/usr/bin/env node
/**
 * ============================================================
 * 饭团工坊 - 一键发布脚本（版本号修改 + GitHub Release）
 * ============================================================
 *
 * 功能：
 *   1. 修改 package.json 中的 version 字段
 *   2. 构建安装包并自动上传到 GitHub Releases
 *   3. 客户端启动后自动检查 GitHub Releases 更新
 *
 * 使用方式：
 *   # 1) 直接指定版本号
 *   node scripts/release.js 0.2.0
 *
 *   2) 使用语义化版本关键字（patch / minor / major）
 *   node scripts/release.js patch     # 0.1.0 -> 0.1.1
 *   node scripts/release.js minor     # 0.1.0 -> 0.2.0
 *   node scripts/release.js major     # 0.1.0 -> 1.0.0
 *
 *   3) 不传参数 -> 交互式提示输入
 *   node scripts/release.js
 *
 *   # 通过 npm 脚本调用
 *   npm run release -- 0.2.0
 *   npm run release -- patch
 *
 * 环境变量（必须）：
 *   GH_TOKEN - GitHub Personal Access Token（需 repo 权限）
 *
 * PowerShell 设置示例：
 *   $env:GH_TOKEN="ghp_xxx"
 *   npm run release -- patch
 * ============================================================
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const readline = require('readline')

// 颜色输出
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}
const log = {
  info: (msg) => console.log(`${c.cyan}[INFO]${c.reset} ${msg}`),
  ok: (msg) => console.log(`${c.green}[OK]${c.reset} ${msg}`),
  warn: (msg) => console.log(`${c.yellow}[WARN]${c.reset} ${msg}`),
  error: (msg) => console.error(`${c.red}[ERROR]${c.reset} ${msg}`),
  step: (n, msg) => console.log(`\n${c.bold}${c.blue}━━━ 步骤 ${n}: ${msg} ━━━${c.reset}`),
}

const pkgPath = path.resolve(__dirname, '..', 'package.json')

// ============================================================
// 版本号工具
// ============================================================

/**
 * 校验版本号格式 x.y.z（支持预发布标签，如 1.0.0-beta.1）
 */
function isValidVersion(v) {
  return /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v)
}

/**
 * 语义化版本号自增
 * @param {string} current 当前版本号，如 "0.1.0"
 * @param {'patch'|'minor'|'major'} type 自增类型
 * @returns {string} 新版本号
 */
function bumpVersion(current, type) {
  const [mainPart] = current.split('-')
  const parts = mainPart.split('.').map((n) => parseInt(n, 10))
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`无法解析版本号: ${current}`)
  }
  let [major, minor, patch] = parts
  if (type === 'major') {
    major += 1
    minor = 0
    patch = 0
  } else if (type === 'minor') {
    minor += 1
    patch = 0
  } else if (type === 'patch') {
    patch += 1
  } else {
    throw new Error(`未知的版本类型: ${type}（应为 patch/minor/major）`)
  }
  return `${major}.${minor}.${patch}`
}

/**
 * 修改 package.json 中的 version 字段
 */
function setPackageVersion(newVersion) {
  const pkgRaw = fs.readFileSync(pkgPath, 'utf-8')
  const pkg = JSON.parse(pkgRaw)
  const oldVersion = pkg.version
  if (oldVersion === newVersion) {
    log.warn(`package.json 版本号已是 ${newVersion}，无需修改`)
    return oldVersion
  }
  pkg.version = newVersion
  // 保持 2 空格缩进格式
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
  log.ok(`package.json 版本号: ${oldVersion} → ${c.bold}${newVersion}${c.reset}`)
  return oldVersion
}

// ============================================================
// 交互式输入（无参数时使用）
// ============================================================

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log(`${c.bold}${c.cyan}`)
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   饭团工坊 一键发布（版本修改 + GitHub Release）║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log(c.reset)

  // ---- 解析目标版本号 ----
  const arg = process.argv[2]
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  const currentVersion = pkg.version
  let targetVersion

  if (!arg) {
    // 无参数：交互式提示
    console.log(`当前版本: ${c.bold}${currentVersion}${c.reset}`)
    console.log('可选输入：')
    console.log('  - 具体版本号，如 0.2.0')
    console.log('  - 关键字 patch / minor / major')
    const input = await prompt(`请输入新版本号 [patch]: `)
    const keyword = (input || 'patch').toLowerCase()
    if (isValidVersion(keyword)) {
      targetVersion = keyword
    } else if (['patch', 'minor', 'major'].includes(keyword)) {
      targetVersion = bumpVersion(currentVersion, keyword)
    } else {
      log.error(`无效输入: ${input}（应为 x.y.z 或 patch/minor/major）`)
      process.exit(1)
    }
  } else if (isValidVersion(arg)) {
    targetVersion = arg
  } else if (['patch', 'minor', 'major'].includes(arg.toLowerCase())) {
    targetVersion = bumpVersion(currentVersion, arg.toLowerCase())
  } else {
    log.error(`无效参数: ${arg}`)
    log.info('用法: node scripts/release.js [x.y.z | patch | minor | major]')
    process.exit(1)
  }

  log.info(`当前版本: ${currentVersion}`)
  log.info(`目标版本: ${c.bold}${targetVersion}${c.reset}`)

  // ---- 环境变量检查（提前失败，避免版本号改了但发布失败） ----
  if (!process.env.GH_TOKEN) {
    log.error('缺少环境变量 GH_TOKEN（GitHub Personal Access Token）')
    log.info('PowerShell 设置: $env:GH_TOKEN="ghp_你的token"')
    log.info('生成地址: https://github.com/settings/tokens')
    process.exit(1)
  }
  log.ok('环境变量 GH_TOKEN 已配置')

  // ---- 步骤 1: 修改 package.json 版本号 ----
  log.step(1, '修改 package.json 版本号')
  setPackageVersion(targetVersion)

  // ---- 步骤 2: 构建 + 发布到 GitHub Releases ----
  log.step(2, '构建安装包并发布到 GitHub Releases')
  log.info('运行 electron-builder --win --x64 --publish always ...')
  log.info('（electron-builder 会自动读取 electron-builder.yml 中的 github provider 配置）')

  const builder = spawn('npx', ['electron-builder', '--win', '--x64', '--publish', 'always'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN },
    shell: true,
  })

  builder.on('error', (err) => {
    log.error('启动 electron-builder 失败: ' + err.message)
    process.exit(1)
  })

  builder.on('exit', (code) => {
    if (code === 0) {
      console.log(`\n${c.bold}${c.green}╔══════════════════════════════════════════════╗`)
      console.log(`║          ✅ 发布完成！                        ║`)
      console.log(`╚══════════════════════════════════════════════╝${c.reset}`)
      console.log(`\n${c.bold}版本:${c.reset} v${targetVersion}`)
      console.log(`${c.bold}GitHub Release:${c.reset}`)
      console.log(`  ${c.cyan}https://github.com/fantuan9234/fantuan-workshop/releases/tag/v${targetVersion}${c.reset}`)
      console.log(`\n${c.bold}客户端更新:${c.reset}`)
      console.log(`  已安装旧版本的用户启动软件后，会自动检查 GitHub Releases，`)
      console.log(`  发现新版本后自动下载并弹出全屏模态框提示重启安装。`)
      console.log(`\n${c.bold}本地安装包:${c.reset}`)
      console.log(`  ${c.cyan}dist/饭团工坊 Setup ${targetVersion}.exe${c.reset}`)
    } else {
      log.error(`electron-builder 退出码: ${code}`)
      log.warn(`package.json 版本号已改为 ${targetVersion}，但发布失败。`)
      log.warn(`如需回滚版本号，请手动改回 ${currentVersion}。`)
      process.exit(code || 1)
    }
  })
}

main().catch((err) => {
  log.error('一键发布过程中出现未捕获的错误: ' + err.message)
  console.error(err.stack)
  process.exit(1)
})