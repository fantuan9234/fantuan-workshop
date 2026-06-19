#!/usr/bin/env node
/**
 * 饭团工坊 - 可靠构建脚本
 *
 * 绕过 app-builder-bin 的文件锁定 bug，手动构建安装包。
 * 用法: node scripts/build-release.js [publish]
 *   publish: 同时上传到 GitHub Releases
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const PREPACKAGED = path.join(DIST, 'prepackaged')
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'))
const VERSION = PKG.version
const GH_TOKEN = process.env.GH_TOKEN || ''

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`)
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true, ...opts })
}

function step(msg) {
  console.log(`\n=== ${msg} ===`)
}

async function main() {
  const publish = process.argv[2] === 'publish'

  if (!fs.existsSync(path.join(ROOT, 'out', 'main', 'index.js'))) {
    step('编译 TypeScript')
    run('npm run build')
  }

  step('清理 dist')
  try { fs.rmSync(DIST, { recursive: true, force: true }) } catch {}

  step('创建 prepackaged 应用目录')
  fs.mkdirSync(PREPACKAGED, { recursive: true })
  fs.mkdirSync(path.join(PREPACKAGED, 'resources'), { recursive: true })

  const electronDist = path.join(ROOT, 'node_modules', 'electron', 'dist')
  const entries = fs.readdirSync(electronDist)
  for (const entry of entries) {
    const src = path.join(electronDist, entry)
    const dst = path.join(PREPACKAGED, entry)
    if (entry === 'resources') {
      // resources 目录只复制不包含 default_app.asar
      fs.mkdirSync(dst, { recursive: true })
      const resEntries = fs.readdirSync(src)
      for (const re of resEntries) {
        if (re === 'default_app.asar') continue
        const rsrc = path.join(src, re)
        const rdst = path.join(dst, re)
        fs.cpSync(rsrc, rdst, { recursive: true, force: true })
      }
    } else {
      try { fs.cpSync(src, dst, { recursive: true, force: true }) } catch {}
    }
  }

  step('重建原生模块（为 Electron 编译 canvas）')
  run(`npx @electron/rebuild -f -w canvas -v 28.3.3`)

  step('复制所有生产依赖到 resources/node_modules')
  const nodeModulesDest = path.join(PREPACKAGED, 'resources', 'node_modules')
  const prodDepsList = execSync('npm ls --omit=dev --all --parseable', {
    cwd: ROOT,
    encoding: 'utf-8',
  })
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith(path.join(ROOT, 'node_modules')))
  for (const modPath of prodDepsList) {
    const relPath = path.relative(path.join(ROOT, 'node_modules'), modPath)
    const dst = path.join(nodeModulesDest, relPath)
    if (!fs.existsSync(dst)) {
      fs.mkdirSync(path.dirname(dst), { recursive: true })
      try { fs.cpSync(modPath, dst, { recursive: true, force: true }) } catch {}
    }
  }
  console.log(`  ✓ 已复制 ${prodDepsList.length} 个生产依赖模块`)

  step('准备 package.json（Electron 启动时需要读取 main 入口）')
  const outPkg = {
    name: PKG.name,
    version: PKG.version,
    main: './main/index.js',
  }
  fs.writeFileSync(path.join(ROOT, 'out', 'package.json'), JSON.stringify(outPkg, null, 2))

  step('打包 app.asar')
  run(`npx asar pack out "${path.join(PREPACKAGED, 'resources', 'app.asar')}"`)

  step('重命名 electron.exe → fantuan-workshop.exe')
  const electronExe = path.join(PREPACKAGED, 'electron.exe')
  const targetExe = path.join(PREPACKAGED, 'fantuan-workshop.exe')
  if (fs.existsSync(electronExe)) {
    fs.renameSync(electronExe, targetExe)
  }

  step('嵌入自定义图标到 fantuan-workshop.exe')
  try {
    const { rcedit } = require('rcedit')
    const iconPath = path.join(ROOT, 'build', 'icons', 'icon.ico')
    // rcedit 的 Go 二进制对反斜杠和中文路径处理有问题，改用正斜杠
    rcedit(targetExe.replace(/\\/g, '/'), { icon: iconPath.replace(/\\/g, '/') })
      .then(() => console.log('  ✓ 自定义图标嵌入成功'))
      .catch(err => console.warn('  ⚠ 图标嵌入失败（不影响运行）:', err.message))
  } catch (err) {
    console.warn('  ⚠ rcedit 不可用，跳过图标嵌入（不影响运行）')
  }

  step('构建 NSIS 安装包')
  const args = ['--win', '--x64', '--prepackaged', PREPACKAGED]
  if (publish) {
    if (!GH_TOKEN) {
      console.error('[ERROR] 发布需要设置 GH_TOKEN 环境变量')
      process.exit(1)
    }
    args.push('--publish', 'always')
  }
  const result = spawn('npx', ['electron-builder', ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  })
  result.on('exit', (code) => {
    if (code === 0) {
      console.log(`\n✅ 构建成功: dist/fantuan-workshop-setup-${VERSION}.exe`)
    } else {
      console.error(`\n❌ 构建失败，退出码: ${code}`)
      process.exit(code || 1)
    }
  })
}

main().catch(err => {
  console.error('构建失败:', err.message)
  process.exit(1)
})
