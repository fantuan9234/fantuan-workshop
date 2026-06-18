#!/usr/bin/env node
/**
 * ============================================================
 * 饭团工坊 - 一键发布脚本（版本号修改 + GitHub/OpenList Release）
 * ============================================================
 *
 * 功能：
 *   1. 修改 package.json 中的 version 字段
 *   2. 构建安装包并自动上传到 GitHub Releases
 *   3. 同时上传到 OpenList（百度网盘国内备用源）
 *   4. 客户端启动后自动检查更新（GitHub 为主，OpenList 为备用）
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
 *   GH_TOKEN  - GitHub Personal Access Token（需 repo 权限）
 *
 * OpenList 上传使用硬编码 token（与客户端 src/main/updater/index.ts 保持一致），无需额外配置。
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
// OpenList 上传工具
// ============================================================

const https = require('https')

const OPENLIST_BASE = 'wp.svlmod.cn'
const OPENLIST_UPLOAD_PATH = '/SVL/SVL/fantuangongfang/update'

// OpenList API Token（与客户端 src/main/updater/index.ts 保持一致）
const OPENLIST_TOKEN = 'openlist-a1c1f182-dab5-442d-ac95-5b9be53a895anZaf43BVmqDWcvLIgxE29En3eTi9WpYkGODRrjK1hrezoRrXCzdV2w6GBatpcSur'

/**
 * 上传文件到 OpenList（WebDAV PUT）
 * @param {string} version 版本号（如 0.8.5）
 * @param {string} openListToken OpenList API Token
 */
async function uploadToOpenList(version, openListToken) {
  log.step(3, '上传到 OpenList（百度网盘）')

  const distDir = path.resolve(__dirname, '..', 'dist')
  const files = [
    `fantuan-workshop-setup-${version}.exe`,
    `fantuan-workshop-setup-${version}.exe.blockmap`,
    `latest.yml`,
  ]

  for (const fileName of files) {
    const filePath = path.join(distDir, fileName)
    if (!fs.existsSync(filePath)) {
      log.warn(`文件不存在，跳过: ${fileName}`)
      continue
    }

    try {
      await openListUploadFile(fileName, filePath, openListToken)
      log.ok(`OpenList 上传: ${fileName}`)
    } catch (err) {
      log.warn(`OpenList 上传失败: ${fileName} - ${err.message}`)
    }
  }

  log.ok(`OpenList 发布完成: https://${OPENLIST_BASE}${OPENLIST_UPLOAD_PATH}/`)
}

/**
 * 通过 WebDAV PUT 上传文件到 OpenList
 */
function openListUploadFile(fileName, filePath, token) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filePath)
    const webdavPath = `${OPENLIST_UPLOAD_PATH}/${fileName}`

    const options = {
      hostname: OPENLIST_BASE,
      path: `/dav${webdavPath}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Length': fileData.length,
        'Content-Type': 'application/octet-stream',
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`))
        }
      })
    })

    req.on('error', reject)
    req.write(fileData)
    req.end()
  })
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   饭团工坊 一键发布（GitHub + OpenList Release）║')
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

  log.info('OpenList 上传使用硬编码 token，已就绪')

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

  builder.on('exit', async (code) => {
    if (code === 0) {
      console.log(`\n${c.bold}${c.green}╔══════════════════════════════════════════════╗`)
      console.log(`║          ✅ GitHub 发布完成！                ║`)
      console.log(`╚══════════════════════════════════════════════╝${c.reset}`)
      console.log(`\n${c.bold}版本:${c.reset} v${targetVersion}`)
      console.log(`${c.bold}GitHub Release:${c.reset}`)
      console.log(`  ${c.cyan}https://github.com/fantuan9234/fantuan-workshop/releases/tag/v${targetVersion}${c.reset}`)

      // 上传到 OpenList（使用硬编码 token）
      try {
        await uploadToOpenList(targetVersion, OPENLIST_TOKEN)
      } catch (err) {
        log.warn(`OpenList 上传出错: ${err.message}`)
      }

      console.log(`\n${c.bold}客户端更新:${c.reset}`)
      console.log(`  已安装旧版本的用户启动软件后，会自动检查更新，`)
      console.log(`  - 国内用户优先使用 OpenList（百度网盘加速），失败回退 GitHub`)
      console.log(`  - 海外用户优先使用 GitHub，失败回退 OpenList`)
      console.log(`  发现新版本后自动下载并提示重启安装。`)
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