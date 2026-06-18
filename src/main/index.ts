import { app, BrowserWindow, shell, ipcMain, dialog, nativeImage } from 'electron'
import { join, basename, dirname, relative } from 'path'
import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises'
import { existsSync, readdirSync, readFileSync, watchFile, unwatchFile, createWriteStream } from 'fs'
import { tmpdir } from 'os'
import { createCanvas, loadImage } from 'canvas'
import { spawn } from 'child_process'
import { initAutoUpdater } from './updater'
import log from 'electron-log'
import * as Sentry from '@sentry/electron/main'
// https / http 原用于更新源探测，切换到 GitHub Releases 后不再需要



// 日志配置
log.transports.file.level = 'info'
log.transports.file.maxSize = 5 * 1024 * 1024 // 5MB
log.info('=== 饭团工坊 启动 ===')

// Sentry 错误上报初始化（仅在打包模式下启用，避免开发环境刷屏）
if (app.isPackaged) {
  Sentry.init({
    dsn: 'https://a6e6ffc412dee2bb97d28593586aaa38@o4509074522701824.ingest.de.sentry.io/4509074524733520',
    environment: 'production',
    release: `fantuan-workshop@${app.getVersion()}`,
  })
}

// 单实例锁：防止多实例冲突导致卡死
const gotSingleLock = app.requestSingleInstanceLock()
if (!gotSingleLock) {
  log.info('已有实例在运行，退出')
  app.quit()
} else {
  app.on('second-instance', () => {
    log.info('检测到第二个实例启动，已阻止')
  })
}

/**
 * 加载窗口图标。
 * 使用 readFileSync + nativeImage.createFromBuffer 而不是直接传路径，
 * 因为打包后文件在 app.asar 中，nativeImage.createFromPath 无法读取 ASAR 内的文件，
 * 而 readFileSync 已被 Electron 打过 ASAR 补丁，可以正常读取。
 */
function loadWindowIcon(): Electron.NativeImage | undefined {
  const candidates = [
    join(__dirname, '../../build/icons/icon.png'),
    join(__dirname, '../../build/icons/icon.ico'),
  ]
  for (const iconPath of candidates) {
    try {
      return nativeImage.createFromBuffer(readFileSync(iconPath))
    } catch {
      continue
    }
  }
  log.warn('未找到窗口图标文件')
  return undefined
}

function createWindow(): void {
  // 禁用 GPU 缓存避免多实例冲突导致卡死
  app.commandLine.appendSwitch('disable-gpu-cache')
  app.commandLine.appendSwitch('disable-software-rasterizer')

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    icon: loadWindowIcon(),
    backgroundColor: '#111827',
    title: '饭团工坊',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 捕获渲染进程加载失败
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log.error('渲染进程加载失败:', { errorCode, errorDescription, validatedURL })
  })

  // 捕获渲染进程崩溃
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log.error('渲染进程崩溃:', details)
  })

  // 捕获控制台错误
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) { // 2 = warning, 3 = error
      log.warn(`[renderer] ${message}`)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // CSP 安全策略（开发模式放行 unsafe-inline 以保证 Vite HMR 正常工作）
  const isDev = !!process.env.ELECTRON_RENDERER_URL
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: file:; font-src 'self' data:; connect-src 'self' ws:"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: file:; font-src 'self' data: connect-src 'self'"
        ]
      }
    })
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    log.info('加载开发服务器:', process.env.ELECTRON_RENDERER_URL)
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    const indexPath = join(__dirname, '../renderer/index.html')
    log.info('加载本地文件:', indexPath)
    mainWindow.loadFile(indexPath)
  }

  // 窗口创建完成
  mainWindow.webContents.on('did-finish-load', () => {
    log.info('渲染进程加载完成')
  })

  // 关闭窗口前检查未保存更改（替代 beforeunload，避免静默阻止关闭）
  mainWindow.on('close', async (e) => {
    if (isForceClosing) return
    if (!rendererHasUnsavedChanges) return

    // 有未保存更改，弹出系统对话框
    e.preventDefault()
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['不保存关闭', '取消'],
      defaultId: 1,
      cancelId: 1,
      title: '确认关闭',
      message: '有未保存的更改',
      detail: '关闭窗口将丢失未保存的更改。确定要关闭吗？',
    })
    if (result.response === 0) {
      // 用户确认不保存关闭
      isForceClosing = true
      mainWindow.close()
    }
    // 取消则什么都不做（已 preventDefault）
  })

  const updaterHandle = initAutoUpdater(mainWindow)

  // 记录主窗口引用，便于 update:install 等 IPC 处理器强制销毁
  mainWindowRef = mainWindow
  mainWindow.on('closed', () => {
    if (mainWindowRef === mainWindow) mainWindowRef = null
  })
}

// ---- 窗口控制 ----
// 标记是否正在强制关闭（用户确认后跳过未保存提示）
let isForceClosing = false

// 主窗口引用（用于 update:install 等需要在 IPC 中直接销毁窗口的场景）
let mainWindowRef: BrowserWindow | null = null

// 后台子进程追踪（XNB 解包器等 detached 进程），更新前主动 kill 避免文件锁
const trackedChildProcs = new Set<import('child_process').ChildProcess>()

/** 注册需要跟踪的子进程 */
function trackChildProc(proc: import('child_process').ChildProcess): void {
  trackedChildProcs.add(proc)
  proc.once('exit', () => trackedChildProcs.delete(proc))
}

/** 强制 kill 所有 tracked 子进程（更新安装前调用） */
function killTrackedChildProcs(): void {
  for (const proc of trackedChildProcs) {
    try {
      if (proc.pid && !proc.killed) {
        // Windows 上 SIGTERM 不会终止 .NET 进程，必须用 taskkill /T /F 杀进程树
        if (process.platform === 'win32') {
          try {
            require('child_process').spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' })
          } catch { /* ignore */ }
        } else {
          proc.kill('SIGTERM')
        }
      }
    } catch { /* ignore */ }
  }
  trackedChildProcs.clear()
}

ipcMain.on('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize()
})
ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win?.isMaximized()) win.unmaximize()
  else win?.maximize()
})
ipcMain.on('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close()
})

// IPC: 渲染进程通知主进程当前是否有未保存更改
let rendererHasUnsavedChanges = false
ipcMain.on('app:set-unsaved', (_event, unsaved: boolean) => {
  rendererHasUnsavedChanges = unsaved
})

// ---- 游戏目录选择 ----
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择星露谷游戏目录'
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// ---- 文件读取 ----
ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  if (!isPathAllowed(filePath)) return null
  try {
    const buf = await readFile(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
      webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
      tiff: 'image/tiff', tif: 'image/tiff', ico: 'image/x-icon', avif: 'image/avif'
    }
    const mime = (ext && mimeMap[ext]) || 'application/octet-stream'
    const b64 = buf.toString('base64')
    return `data:${mime};base64,${b64}`
  } catch (e) {
    log.error('fs:readFile 失败:', filePath, e)
    return null
  }
})

// ---- 项目保存 ----
ipcMain.handle('dialog:saveProject', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    title: '保存项目',
    defaultPath: defaultName,
    filters: [{ name: 'Stardew Mod 项目', extensions: ['stardew-mod'] }]
  })
  if (result.canceled || !result.filePath) return null
  return result.filePath
})

// ---- 项目打开 ----
ipcMain.handle('dialog:openProject', async () => {
  const result = await dialog.showOpenDialog({
    title: '打开项目',
    filters: [{ name: 'Stardew Mod 项目', extensions: ['stardew-mod'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// ---- 写入文件 ----
ipcMain.handle('fs:writeFile', async (_event, filePath: string, data: string) => {
  if (!isPathAllowed(filePath)) return false
  try {
    await writeFile(filePath, data, 'utf-8')
    return true
  } catch (e) {
    log.error('fs:writeFile 失败:', filePath, e)
    return false
  }
})

// ---- 读取文本文件 ----
ipcMain.handle('fs:readTextFile', async (_event, filePath: string) => {
  if (!isPathAllowed(filePath)) return null
  try {
    const buf = await readFile(filePath, 'utf-8')
    return buf
  } catch (e) {
    log.error('fs:readTextFile 失败:', filePath, e)
    return null
  }
})

// ---- 导出目录选择 ----
ipcMain.handle('dialog:selectExportDir', async (_event, knownGameDir?: string) => {
  // 自动检测游戏的 Mods 目录作为默认路径
  let defaultPath: string | undefined
  let detectedGameDir: string | null = null
  try {
    // 优先使用传入的已知游戏目录
    let gameDir = knownGameDir || null
    if (!gameDir) gameDir = await autoDetectGameDirAsync()
    if (gameDir) {
      detectedGameDir = gameDir
      // 同步把游戏目录加入白名单（initGameDirAsync 是异步的，可能还没完成）
      addAllowedPath(gameDir)
      const modsDir = join(gameDir, 'Mods')
      if (existsSync(modsDir)) defaultPath = modsDir
      else defaultPath = gameDir
    }
  } catch { /* ignore */ }

  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: '选择导出目录（建议选择 Mods 文件夹）',
    defaultPath
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const selectedDir = result.filePaths[0]
  // 将用户选中的目录加入白名单（覆盖游戏目录未检测到、用户自选其他位置的情况）
  addAllowedPath(selectedDir)
  // 保险起见：如果游戏目录是选中目录的祖先，确保祖先也在白名单里
  if (detectedGameDir) addAllowedPath(detectedGameDir)
  return selectedDir
})

/** 将指定路径加入 ALLOWED_BASE_PATHS（去重） */
function addAllowedPath(filePath: string): void {
  const normalized = filePath.replace(/\\/g, '/')
  if (!ALLOWED_BASE_PATHS.some(base => base.replace(/\\/g, '/') === normalized)) {
    ALLOWED_BASE_PATHS.push(filePath)
  }
}

// ---- 创建目录 ----
ipcMain.handle('fs:mkdir', async (_event, dirPath: string) => {
  if (!isPathAllowed(dirPath)) return false
  try {
    await mkdir(dirPath, { recursive: true })
    return true
  } catch (e) {
    log.error('fs:mkdir 失败:', dirPath, e)
    return false
  }
})

// ---- 写入二进制文件（从 base64） ----
ipcMain.handle('fs:writeBinaryFile', async (_event, filePath: string, dataUrl: string) => {
  if (!isPathAllowed(filePath)) return false
  try {
    const match = dataUrl.match(/^data:.*;base64,(.+)$/)
    if (!match) return false
    const buf = Buffer.from(match[1], 'base64')
    await writeFile(filePath, buf)
    return true
  } catch (e) {
    log.error('fs:writeBinaryFile 失败:', filePath, e)
    return false
  }
})

// ---- 自动检测星露谷安装目录 ----

/** 异步版本：不阻塞主线程 */
async function autoDetectGameDirAsync(): Promise<string | null> {
  // 1. Steam 注册表检测（异步）
  try {
    if (process.platform === 'win32') {
      const { execFile } = require('child_process') as typeof import('child_process')
      const steamPath = await new Promise<string | null>((resolve) => {
        execFile('powershell', [
          '-NoProfile', '-NonInteractive', '-Command',
          "Get-ItemProperty -Path 'HKCU:\\Software\\Valve\\Steam' -Name SteamPath -ErrorAction Stop | Select-Object -ExpandProperty SteamPath"
        ], { timeout: 5000 }, (err, stdout) => {
          if (err) resolve(null)
          else resolve(stdout?.trim() || null)
        })
      })
      if (steamPath) {
        const gamePath = join(steamPath, 'steamapps', 'common', 'Stardew Valley')
        if (existsSync(gamePath)) return gamePath
      }
    }
  } catch { /* ignore registry errors */ }

  // 2. 常见安装路径
  const commonPaths = [
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Stardew Valley',
    'C:\\Program Files\\Steam\\steamapps\\common\\Stardew Valley',
    'D:\\Steam\\steamapps\\common\\Stardew Valley',
    'D:\\steam\\steamapps\\common\\Stardew Valley',
    'E:\\Steam\\steamapps\\common\\Stardew Valley',
  ]
  for (const p of commonPaths) {
    if (existsSync(p)) return p
  }
  return null
}

/** 同步版本：仅供 IPC handler 内部使用（已异步上下文），优先使用异步版本 */
function autoDetectGameDir(): string | null {
  // 1. Steam 注册表检测
  try {
    if (process.platform === 'win32') {
      const steamPath = require('child_process').execSync(
        "powershell -NoProfile -Command \"Get-ItemProperty -Path 'HKCU:\\Software\\Valve\\Steam' -Name SteamPath -ErrorAction Stop | Select-Object -ExpandProperty SteamPath\"",
        { encoding: 'utf-8', timeout: 5000 }
      ).trim()
      if (steamPath) {
        const gamePath = join(steamPath, 'steamapps', 'common', 'Stardew Valley')
        if (existsSync(gamePath)) return gamePath
      }
    }
  } catch { /* ignore registry errors */ }

  // 2. 常见安装路径
  const commonPaths = [
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Stardew Valley',
    'C:\\Program Files\\Steam\\steamapps\\common\\Stardew Valley',
    'D:\\Steam\\steamapps\\common\\Stardew Valley',
    'D:\\steam\\steamapps\\common\\Stardew Valley',
    'E:\\Steam\\steamapps\\common\\Stardew Valley',
  ]
  for (const p of commonPaths) {
    if (existsSync(p)) return p
  }
  return null
}

/** 自动查找解包目录（Content (unpacked)）— 异步版 */
async function findUnpackedRootAsync(): Promise<string | null> {
  const gameDir = await autoDetectGameDirAsync()
  if (!gameDir) return null
  const contentOut = join(gameDir, 'Content (unpacked)')
  if (existsSync(contentOut) && readdirSync(contentOut).length > 0) return contentOut
  return null
}

/** 同步版本（兼容旧调用） */
function findUnpackedRoot(): string | null {
  const gameDir = autoDetectGameDir()
  if (!gameDir) return null
  const contentOut = join(gameDir, 'Content (unpacked)')
  if (existsSync(contentOut) && readdirSync(contentOut).length > 0) return contentOut
  return null
}

// ---- 路径安全校验 ----
const ALLOWED_BASE_PATHS: string[] = []

function initAllowedPaths(): void {
  // 用户数据目录
  ALLOWED_BASE_PATHS.push(app.getPath('userData'))
  // 临时目录
  ALLOWED_BASE_PATHS.push(tmpdir())
}

/** 异步初始化：检测游戏目录并添加到允许列表（不阻塞主线程） */
async function initGameDirAsync(): Promise<void> {
  try {
    const gameDir = await autoDetectGameDirAsync()
    if (gameDir) ALLOWED_BASE_PATHS.push(gameDir)
  } catch { /* ignore */ }
}

function isPathAllowed(filePath: string): boolean {
  const resolved = filePath.replace(/\\/g, '/').replace(/\/\.\.\//g, '/').replace(/\/\//g, '/')
  // 禁止路径遍历
  if (resolved.includes('..')) return false
  // 检查是否在允许的目录下（使用 path.relative 防止前缀字符串匹配绕过）
  return ALLOWED_BASE_PATHS.some(base => {
    const normalizedBase = base.replace(/\\/g, '/')
    // 确保 base 以 / 结尾，防止 "Documents-evil" 绕过 "Documents" 限制
    const baseWithSlash = normalizedBase.endsWith('/') ? normalizedBase : normalizedBase + '/'
    return resolved === normalizedBase || resolved.startsWith(baseWithSlash)
  })
}

ipcMain.handle('game:autoDetect', async () => autoDetectGameDirAsync())


// IPC: 动态添加允许的路径
ipcMain.handle('app:addAllowedPath', (_event, dirPath: string) => {
  if (existsSync(dirPath)) {
    ALLOWED_BASE_PATHS.push(dirPath)
    return true
  }
  return false
})

// IPC: 获取日志路径
ipcMain.handle('app:getLogPath', () => log.transports.file.getFile().path)

// ---- 获取临时目录（自动创建）----
ipcMain.handle('fs:getTempDir', async () => {
  const dir = join(tmpdir(), 'stardew-mod-studio')
  try { await mkdir(dir, { recursive: true }) } catch {}
  return dir
})

// ---- 读取目录列表 ----
ipcMain.handle('fs:readdir', async (_event, dirPath: string) => {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory(), isFile: e.isFile() }))
  } catch { return null }
})

// ---- 删除文件 ----
ipcMain.handle('fs:unlink', async (_event, filePath: string) => {
  try {
    await (await import('fs/promises')).unlink(filePath)
    return true
  } catch { return false }
})

// ---- 打包为 ZIP ----
ipcMain.handle('fs:packToZip', async (_event, sourceDir: string) => {
  try {
    // 检查源目录是否存在
    try {
      const statResult = await stat(sourceDir)
      if (!statResult.isDirectory()) {
        return { error: `源路径不是目录: ${sourceDir}` }
      }
    } catch {
      return { error: `源目录不存在: ${sourceDir}` }
    }

    const result = await dialog.showSaveDialog({
      title: '导出模组 ZIP 包',
      defaultPath: 'MyMod.zip',
      filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }]
    })
    if (result.canceled || !result.filePath) return null

    const zipPath = result.filePath
    // archiver v8: 使用 create 方法创建 zip 归档
    const archiverModule = await import('archiver')
    const createArchive = archiverModule.create || archiverModule.default
    const output = createWriteStream(zipPath)
    const archive = createArchive('zip', { zlib: { level: 9 } })

    await new Promise<void>((resolve, reject) => {
      // 超时保护：避免 archiver 卡死导致 IPC 永久挂起
      const timer = setTimeout(() => reject(new Error('ZIP 打包超时')), 60000)
      output.on('close', () => { clearTimeout(timer); resolve() })
      archive.on('error', (err: Error) => { clearTimeout(timer); log.error('archiver error:', err); reject(err) })
      archive.pipe(output)
      archive.directory(sourceDir, false)
      archive.finalize()
    })

    return { zipPath }
  } catch (e) {
    log.error('ZIP 打包失败:', e)
    return { error: String(e) }
  }
})

// ---- XNB 预览功能 ----

interface XnbFileEntry {
  name: string
  path: string
  isDir: boolean
  size?: number
  children?: XnbFileEntry[]
}

/** 递归读取目录结构 */
async function readDirTree(dirPath: string, maxDepth = 3, depth = 0): Promise<XnbFileEntry[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    const result: XnbFileEntry[] = []
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        result.push({
          name: entry.name,
          path: fullPath,
          isDir: true,
          children: depth < maxDepth ? await readDirTree(fullPath, maxDepth, depth + 1) : undefined
        })
      } else {
        try {
          const s = await stat(fullPath)
          result.push({ name: entry.name, path: fullPath, isDir: false, size: s.size })
        } catch {
          result.push({ name: entry.name, path: fullPath, isDir: false })
        }
      }
    }
    return result.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  } catch {
    return []
  }
}

/** 使用 StardewXnbHack 解包 Content 文件夹 */
ipcMain.handle('xnb:unpack', async (event, gameContentDir: string, forceRefresh = false) => {
  try {
    const gameDir = dirname(gameContentDir) // Content 的父目录就是游戏目录
    const contentOut = join(gameDir, 'Content (unpacked)')

    const existsAndNotEmpty = existsSync(contentOut) && readdirSync(contentOut).length > 0
    const needUnpack = forceRefresh || !existsAndNotEmpty

    if (needUnpack) {
      // 查找或自动部署 StardewXnbHack.exe
      const exePath = await findOrDeployStardewXnbHack(gameDir)
      if (!exePath) {
        return { success: false, error: '未找到 StardewXnbHack.exe，请确保应用资源完整', rootPath: '', tree: [] }
      }

      // 运行 StardewXnbHack（需要独立控制台窗口，.NET 应用依赖控制台 API）
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(exePath, [], {
          cwd: gameDir,
          detached: true,      // 独立进程组
          stdio: 'ignore',
          windowsHide: false   // 显示控制台窗口
        })
        proc.unref() // 不阻塞父进程
        // 跟踪子进程，更新安装前会主动 kill，避免文件锁
        trackChildProc(proc)

        // 轮询检查解包结果（因为 detached 模式无法监听 close）
        // 判断标准：Maps 目录下至少有 50 个 .tmx 文件（星露谷有上百张地图）
        let checks = 0
        const maxChecks = 240 // 最多等 4 分钟（每秒检查一次，给慢速机器留时间）
        const minTmxCount = 50 // Maps 目录下至少应有 50 个 .tmx 文件才算解包完成
        const timer = setInterval(() => {
          checks++
          const mapsDir = join(contentOut, 'Maps')
          if (existsSync(mapsDir)) {
            try {
              // 递归统计 .tmx 文件数量
              const countTmx = (dir: string): number => {
                let count = 0
                for (const entry of readdirSync(dir, { withFileTypes: true })) {
                  if (entry.isDirectory()) count += countTmx(join(dir, entry.name))
                  else if (entry.name.endsWith('.tmx')) count++
                }
                return count
              }
              const tmxCount = countTmx(mapsDir)
              if (tmxCount >= minTmxCount) {
                clearInterval(timer)
                resolve()
              } else if (checks >= maxChecks) {
                clearInterval(timer)
                if (tmxCount > 0) {
                  // 部分解包，仍然继续（用户可手动刷新）
                  log.warn(`解包可能未完成：仅扫描到 ${tmxCount} 个 .tmx 文件（期望 >= ${minTmxCount}）`)
                  resolve()
                } else {
                  reject(new Error('StardewXnbHack 运行超时，请手动运行游戏目录下的 StardewXnbHack.exe'))
                }
              }
            } catch {
              if (checks >= maxChecks) {
                clearInterval(timer)
                reject(new Error('StardewXnbHack 运行超时，请手动运行游戏目录下的 StardewXnbHack.exe'))
              }
            }
          } else if (checks >= maxChecks) {
            clearInterval(timer)
            if (existsSync(contentOut) && readdirSync(contentOut).length > 0) resolve()
            else reject(new Error('StardewXnbHack 运行超时，请手动运行游戏目录下的 StardewXnbHack.exe'))
          }
        }, 1000)

        proc.on('error', (err) => {
          clearInterval(timer)
          reject(err)
        })
      })

      // 通知渲染进程进度
      if (event) {
        event.sender.send('xnb:progress', { completed: 1, total: 1 })
      }
    }

    const tree = await readDirTree(contentOut)
    return { success: true, rootPath: contentOut, tree }
  } catch (e) {
    log.error('XNB 解包失败:', e)
    return { success: false, error: String(e), rootPath: '', tree: [] }
  }
})

/** 查找 StardewXnbHack.exe：优先游戏目录，否则从内置资源自动复制过去 */
async function findOrDeployStardewXnbHack(gameDir: string): Promise<string | null> {
  // 1. 游戏目录下已有
  const inGame = join(gameDir, 'StardewXnbHack.exe')
  if (existsSync(inGame)) return inGame

  // 2. 从内置资源复制到游戏目录
  const bundled = getBundledXnbHackPath()
  if (bundled && existsSync(bundled)) {
    try {
      const { copyFile } = require('fs/promises')
      await copyFile(bundled, inGame)
      log.info(`已自动部署 StardewXnbHack.exe → ${inGame}`)
      return inGame
    } catch (e) {
      log.error('自动部署 StardewXnbHack 失败:', e)
    }
  }

  return null
}

/** 获取内置的 StardewXnbHack.exe 路径（打包后和开发模式都支持） */
function getBundledXnbHackPath(): string | null {
  // 打包后：process.resourcesPath/resources/tools/...
  const prod = join(process.resourcesPath || '', 'tools', 'StardewXnbHack', 'StardewXnbHack.exe')
  if (existsSync(prod)) return prod

  // 开发模式：项目根目录的 tools
  const dev = join(__dirname, '..', '..', 'tools', 'StardewXnbHack', 'StardewXnbHack 1.1.2 for Windows', 'StardewXnbHack.exe')
  if (existsSync(dev)) return dev

  return null
}

/** 读取子目录 */
ipcMain.handle('xnb:readDir', async (_event, dirPath: string) => {
  if (!isPathAllowed(dirPath)) return { success: false, error: '路径不在允许范围内', tree: [] }
  try {
    const tree = await readDirTree(dirPath, 1)
    return { success: true, tree }
  } catch (e) {
    return { success: false, error: String(e), tree: [] }
  }
})

/** 读取文件内容 */
ipcMain.handle('xnb:readFile', async (_event, filePath: string) => {
  if (!isPathAllowed(filePath)) return null
  try {
    const buf = await readFile(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase()
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext)) {
      const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`
      return `data:${mime};base64,${buf.toString('base64')}`
    }
    const text = buf.toString('utf-8')
    try { return JSON.stringify(JSON.parse(text), null, 2) } catch { return text }
  } catch (e) {
    return null
  }
})

/** 读取原版NPC的日程数据（从解包目录） */
ipcMain.handle('npc:readVanillaSchedule', async (_event, unpackedRoot: string | null, npcName: string) => {
  try {
    const root = unpackedRoot || await findUnpackedRootAsync()
    if (!root) return null
    const schedulePath = join(root, 'Characters', 'Schedules', `${npcName}.json`)
    if (!existsSync(schedulePath)) return null
    const raw = await readFile(schedulePath, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    log.error('npc:readVanillaSchedule 失败:', npcName, e)
    return null
  }
})

/** 读取原版NPC的对话数据（从解包目录，支持多语言） */
ipcMain.handle('npc:readVanillaDialogue', async (_event, unpackedRoot: string | null, npcName: string, locale?: string) => {
  try {
    const root = unpackedRoot || await findUnpackedRootAsync()
    if (!root) return null
    // 根据语言选择对应的对话文件
    const langSuffix = locale === 'zh' ? '.zh-CN' : locale === 'ja' ? '.ja-JP' : locale === 'ko' ? '.ko-KR' : ''
    const localizedPath = join(root, 'Characters', 'Dialogue', `${npcName}${langSuffix}.json`)
    const defaultPath = join(root, 'Characters', 'Dialogue', `${npcName}.json`)
    // 优先读取本地化文件，不存在则回退到默认（英文）
    const dialoguePath = (langSuffix && existsSync(localizedPath)) ? localizedPath : defaultPath
    if (!existsSync(dialoguePath)) return null
    const raw = await readFile(dialoguePath, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    log.error('npc:readVanillaDialogue 失败:', npcName, e)
    return null
  }
})

/** 读取原版NPC的礼物偏好数据（从解包目录，支持多语言） */
ipcMain.handle('npc:readVanillaGiftTastes', async (_event, unpackedRoot: string | null, npcName: string, locale?: string) => {
  try {
    const root = unpackedRoot || await findUnpackedRootAsync()
    if (!root) return null
    // 根据语言选择对应的礼物偏好文件
    const langSuffix = locale === 'zh' ? '.zh-CN' : locale === 'ja' ? '.ja-JP' : locale === 'ko' ? '.ko-KR' : ''
    const localizedPath = join(root, 'Data', `NPCGiftTastes${langSuffix}.json`)
    const defaultPath = join(root, 'Data', 'NPCGiftTastes.json')
    const giftPath = (langSuffix && existsSync(localizedPath)) ? localizedPath : defaultPath
    if (!existsSync(giftPath)) return null
    const raw = await readFile(giftPath, 'utf-8')
    const allGifts = JSON.parse(raw)
    const npcData = allGifts[npcName]
    if (!npcData || typeof npcData !== 'string') return null
    // 同时读取通用偏好键（Universal_Love/Like/Neutral/Dislike/Hate）
    const universalKeys = ['Universal_Love', 'Universal_Like', 'Universal_Neutral', 'Universal_Dislike', 'Universal_Hate']
    const universal: Record<string, string> = {}
    for (const key of universalKeys) {
      if (allGifts[key] && typeof allGifts[key] === 'string') {
        universal[key] = allGifts[key]
      }
    }
    return { npcData, universal }
  } catch (e) {
    log.error('npc:readVanillaGiftTastes 失败:', npcName, e)
    return null
  }
})

/** 从游戏素材中选择地图文件 */
ipcMain.handle('xnb:selectMapFile', async () => {
  try {
    const gameDir = await autoDetectGameDirAsync()
    if (!gameDir) return null
    const mapsDir = join(gameDir, 'Content (unpacked)', 'Maps')
    if (!existsSync(mapsDir)) return null

    const result = await dialog.showOpenDialog({
      title: '从游戏素材选择地图',
      defaultPath: mapsDir,
      properties: ['openFile'],
      filters: [
        { name: '地图文件', extensions: ['tmx', 'tbin', 'png'] },
        { name: '所有文件', extensions: ['*'] },
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const buf = await readFile(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase()
    const mime = ext === 'png' ? 'image/png' : 'application/octet-stream'
    return {
      path: filePath,
      name: filePath.split(/[/\\]/).pop(),
      dataUrl: `data:${mime};base64,${buf.toString('base64')}`
    }
  } catch {
    return null
  }
})

// ---- TMX 地图解析 ----

interface TmxTileset {
  firstgid: number
  name: string
  tilewidth: number
  tileheight: number
  tilecount: number
  columns: number
  image: string
  imagewidth: number
  imageheight: number
}

interface TmxLayer {
  name: string
  width: number
  height: number
  visible: boolean
  opacity: number
  data: number[]  // GID 数组
}

interface TmxMap {
  width: number
  height: number
  tilewidth: number
  tileheight: number
  tilesets: TmxTileset[]
  layers: TmxLayer[]
}

/** 解析 .tmx XML 文件为结构化数据 */
function parseTmx(xml: string): TmxMap {
  const result: TmxMap = { width: 0, height: 0, tilewidth: 16, tileheight: 16, tilesets: [], layers: [] }

  // 简单 XML 解析（避免引入额外依赖）
  const mapMatch = xml.match(/<map[^>]*>/)
  if (mapMatch) {
    const attrs = mapMatch[0]
    result.width = parseInt(attrs.match(/width="(\d+)"/)?.[1] || '0')
    result.height = parseInt(attrs.match(/height="(\d+)"/)?.[1] || '0')
    result.tilewidth = parseInt(attrs.match(/tilewidth="(\d+)"/)?.[1] || '16')
    result.tileheight = parseInt(attrs.match(/tileheight="(\d+)"/)?.[1] || '16')
  }

  // 解析 tileset
  const tilesetRegex = /<tileset\s+([^>]*)>([\s\S]*?)<\/tileset>/g
  let tsMatch: RegExpExecArray | null
  while ((tsMatch = tilesetRegex.exec(xml)) !== null) {
    const attrs = tsMatch[1]
    const body = tsMatch[2]
    const ts: TmxTileset = {
      firstgid: parseInt(attrs.match(/firstgid="(\d+)"/)?.[1] || '1'),
      name: attrs.match(/name="([^"]*)"/)?.[1] || '',
      tilewidth: parseInt(attrs.match(/tilewidth="(\d+)"/)?.[1] || '16'),
      tileheight: parseInt(attrs.match(/tileheight="(\d+)"/)?.[1] || '16'),
      tilecount: parseInt(attrs.match(/tilecount="(\d+)"/)?.[1] || '0'),
      columns: parseInt(attrs.match(/columns="(\d+)"/)?.[1] || '0'),
      image: body.match(/<image\s+[^>]*source="([^"]*)"/)?.[1] || '',
      imagewidth: parseInt(body.match(/<image\s+[^>]*width="(\d+)"/)?.[1] || '0'),
      imageheight: parseInt(body.match(/<image\s+[^>]*height="(\d+)"/)?.[1] || '0'),
    }
    result.tilesets.push(ts)
  }

  // 解析 layer（仅 TileLayer，跳过 ObjectGroup）
  const layerRegex = /<layer\s+([^>]*)>([\s\S]*?)<\/layer>/g
  let lMatch: RegExpExecArray | null
  while ((lMatch = layerRegex.exec(xml)) !== null) {
    const attrs = lMatch[1]
    const body = lMatch[2]
    const layer: TmxLayer = {
      name: attrs.match(/name="([^"]*)"/)?.[1] || '',
      width: parseInt(attrs.match(/width="(\d+)"/)?.[1] || '0'),
      height: parseInt(attrs.match(/height="(\d+)"/)?.[1] || '0'),
      visible: attrs.match(/visible="(\d+)"/)?.[1] !== '0',
      opacity: parseFloat(attrs.match(/opacity="([^"]*)"/)?.[1] || '1'),
      data: [],
    }

    // 解析 tile data（支持 CSV 和 base64 编码）
    const dataMatch = body.match(/<data[^>]*>([\s\S]*?)<\/data>/)
    if (dataMatch) {
      const dataTag = dataMatch[0]
      const dataContent = dataMatch[1].trim()

      if (dataTag.includes('encoding="csv"') || !dataTag.includes('encoding=')) {
        // CSV 格式
        layer.data = dataContent.split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
      } else if (dataTag.includes('encoding="base64"')) {
        // Base64 编码（可能压缩）
        const raw = Buffer.from(dataContent, 'base64')
        if (dataTag.includes('compression="zlib"')) {
          try {
            const zlib = require('zlib')
            const decoded = zlib.inflateSync(raw)
            layer.data = []
            for (let i = 0; i < decoded.length; i += 4) {
              layer.data.push(decoded.readUInt32LE(i))
            }
          } catch { /* 解压失败则跳过 */ }
        } else {
          // 无压缩 base64
          layer.data = []
          for (let i = 0; i < raw.length; i += 4) {
            layer.data.push(raw.readUInt32LE(i))
          }
        }
      }
    }
    result.layers.push(layer)
  }

  return result
}

/** 列出游戏素材中的地图（解析 .tmx 文件） */
ipcMain.handle('xnb:listMaps', async (_event, rootPath?: string) => {
  try {
    let mapsDir: string
    if (rootPath && existsSync(rootPath)) {
      mapsDir = join(rootPath, 'Maps')
    } else {
      const gameDir = await autoDetectGameDirAsync()
      if (!gameDir) return { success: false, maps: [] }
      mapsDir = join(gameDir, 'Content (unpacked)', 'Maps')
    }
    if (!existsSync(mapsDir)) return { success: false, maps: [] }

    const maps: { name: string; tmxPath: string; width: number; height: number; tilesheets: string[] }[] = []
    const tmxFiles = await findFilesByExt(mapsDir, '.tmx')

    for (const tmxPath of tmxFiles) {
      try {
        const xml = await readFile(tmxPath, 'utf-8')
        const map = parseTmx(xml)
        maps.push({
          name: basename(tmxPath, '.tmx'),
          tmxPath,
          width: map.width,
          height: map.height,
          tilesheets: map.tilesets.map(ts => ts.name),
        })
      } catch (err) {
        log.warn(`解析 .tmx 失败 ${basename(tmxPath)}:`, (err as Error).message?.slice(0, 80))
      }
    }

    return { success: true, rootPath: mapsDir, maps }
  } catch (e) {
    return { success: false, error: String(e), maps: [] }
  }
})

/** 渲染指定地图为 PNG 图片（基于 .tmx + tilesheet PNG） */
ipcMain.handle('map:render', async (_event, tmxPath: string, maxSize = 800) => {
  try {
    const xml = await readFile(tmxPath, 'utf-8')
    const map = parseTmx(xml)

    // 解包目录
    const mapsDir = dirname(tmxPath)
    const unpackedDir = dirname(mapsDir) // Content (unpacked)

    // 计算地图像素尺寸
    const mapPixelW = map.width * map.tilewidth
    const mapPixelH = map.height * map.tileheight
    const scale = Math.min(1, maxSize / Math.max(mapPixelW, mapPixelH))
    const canvasW = Math.round(mapPixelW * scale)
    const canvasH = Math.round(mapPixelH * scale)

    const canvas = createCanvas(canvasW, canvasH)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvasW, canvasH)
    ctx.scale(scale, scale)
    ctx.imageSmoothingEnabled = false

    // 加载 tilesheet 图片
    const tilesheetImages: (typeof globalThis.Image | null)[] = []
    for (const ts of map.tilesets) {
      // image source 在 .tmx 中是相对路径或文件名（不含扩展名）
      const imgName = ts.image.replace(/\\/g, '/')
      // 尝试多种路径
      const candidates = [
        join(mapsDir, imgName + '.png'),
        join(mapsDir, imgName),
        join(unpackedDir, 'Maps', imgName + '.png'),
        join(unpackedDir, 'Maps', imgName),
        join(unpackedDir, imgName + '.png'),
      ]
      let imgLoaded = false
      for (const imgPath of candidates) {
        if (existsSync(imgPath)) {
          try {
            const imgBuf = await readFile(imgPath)
            const img = await loadImage(imgBuf)
            tilesheetImages.push(img)
            imgLoaded = true
            break
          } catch { /* 继续尝试下一个路径 */ }
        }
      }
      if (!imgLoaded) tilesheetImages.push(null)
    }

    // 绘制所有可见的 TileLayer
    for (const layer of map.layers) {
      if (!layer.visible || layer.data.length === 0) continue

      for (let y = 0; y < layer.height; y++) {
        for (let x = 0; x < layer.width; x++) {
          const gid = layer.data[y * layer.width + x]
          if (gid === 0) continue // 空 tile

          // 根据 GID 找到对应的 tileset 和 tile 索引
          let tsIdx = -1
          let localId = gid
          for (let i = map.tilesets.length - 1; i >= 0; i--) {
            if (gid >= map.tilesets[i].firstgid) {
              tsIdx = i
              localId = gid - map.tilesets[i].firstgid
              break
            }
          }
          if (tsIdx < 0 || tsIdx >= tilesheetImages.length) continue
          const img = tilesheetImages[tsIdx]
          if (!img) continue

          const ts = map.tilesets[tsIdx]
          const cols = ts.columns || Math.floor(ts.imagewidth / ts.tilewidth)
          const srcX = (localId % cols) * ts.tilewidth
          const srcY = Math.floor(localId / cols) * ts.tileheight

          if (srcX + ts.tilewidth <= img.width && srcY + ts.tileheight <= img.height) {
            ctx.drawImage(img, srcX, srcY, ts.tilewidth, ts.tileheight,
              x * map.tilewidth, y * map.tileheight, ts.tilewidth, ts.tileheight)
          }
        }
      }
    }

    const pngBuf = canvas.toBuffer('image/png')
    return `data:image/png;base64,${pngBuf.toString('base64')}`
  } catch (e) {
    log.error('地图渲染失败:', e)
    return null
  }
})

/** 递归查找指定扩展名的文件 */
async function findFilesByExt(dir: string, ext: string): Promise<string[]> {
  const results: string[] = []
  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.name.endsWith(ext)) results.push(full)
    }
  }
  await walk(dir)
  return results
}

/** 选择地图覆盖文件（.tmx）并解析元数据 */
ipcMain.handle('map:selectOverlayFile', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: '选择修改过的地图文件',
      properties: ['openFile'],
      filters: [
        { name: '地图文件', extensions: ['tmx', 'tbin'] },
        { name: '所有文件', extensions: ['*'] },
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const ext = filePath.split('.').pop()?.toLowerCase()

    if (ext === 'tmx') {
      const xml = await readFile(filePath, 'utf-8')
      const map = parseTmx(xml)
      return {
        filePath,
        fileName: basename(filePath),
        width: map.width,
        height: map.height,
        tilewidth: map.tilewidth,
        tileheight: map.tileheight,
        tilesheets: map.tilesets.map(ts => ts.name),
        layerNames: map.layers.map(l => l.name),
      }
    }

    // .tbin 或其他格式，只返回基本信息
    return {
      filePath,
      fileName: basename(filePath),
      width: 0,
      height: 0,
      tilewidth: 16,
      tileheight: 16,
      tilesheets: [],
      layerNames: [],
    }
  } catch (e) {
    log.error('选择地图覆盖文件失败:', e)
    return null
  }
})

/** 复制地图覆盖文件及其贴图集到模组 assets 目录 */
ipcMain.handle('map:copyOverlayAsset', async (_event, tmxFilePath: string, destAssetsDir: string) => {
  try {
    const { copyFile } = require('fs/promises')
    await mkdir(destAssetsDir, { recursive: true })

    // 复制 .tmx 文件
    const tmxName = basename(tmxFilePath)
    const destTmx = join(destAssetsDir, tmxName)
    await copyFile(tmxFilePath, destTmx)

    // 解析 tmx 获取贴图集引用
    const xml = await readFile(tmxFilePath, 'utf-8')
    const map = parseTmx(xml)
    const mapsDir = dirname(tmxFilePath)

    const copiedFiles: string[] = [tmxName]

    for (const ts of map.tilesets) {
      const imgName = ts.image.replace(/\\/g, '/')
      const candidates = [
        join(mapsDir, imgName + '.png'),
        join(mapsDir, imgName),
      ]
      for (const imgPath of candidates) {
        if (existsSync(imgPath)) {
          const destImg = join(destAssetsDir, basename(imgPath))
          if (!existsSync(destImg)) {
            await copyFile(imgPath, destImg)
            copiedFiles.push(basename(imgPath))
          }
          break
        }
      }
    }

    return { success: true, copiedFiles }
  } catch (e) {
    log.error('复制地图覆盖资源失败:', e)
    return { success: false, copiedFiles: [], error: String(e) }
  }
})

/** 从解包目录读取物品数据 */
ipcMain.handle('xnb:listItems', async (_event, rootPath?: string) => {
  try {
    let unpackedDir: string
    if (rootPath && existsSync(rootPath)) {
      unpackedDir = rootPath
    } else {
      const gameDir = await autoDetectGameDirAsync()
      if (!gameDir) return { success: false, items: [] }
      unpackedDir = join(gameDir, 'Content (unpacked)')
    }

    const objectsJson = join(unpackedDir, 'Data', 'Objects.json')
    if (!existsSync(objectsJson)) return { success: false, items: [] }

    // Load strings for resolving [LocalizedText] tokens
    // Priority: zh-CN > default (English) — load default first, then zh-CN overwrites
    const stringsFiles = [
      join(unpackedDir, 'Strings', 'Objects.json'),
      join(unpackedDir, 'Strings', 'Objects.zh-CN.json'),
      join(unpackedDir, 'Strings', '1_6_Strings.json'),
      join(unpackedDir, 'Strings', '1_6_Strings.zh-CN.json'),
    ]
    let stringsMap: Record<string, string> = {}
    for (const sp of stringsFiles) {
      if (existsSync(sp)) {
        try {
          const sRaw = await readFile(sp, 'utf-8')
          stringsMap = { ...stringsMap, ...JSON.parse(sRaw) }
        } catch { /* ignore */ }
      }
    }

    const raw = await readFile(objectsJson, 'utf-8')
    const data = JSON.parse(raw)

    // 补全游戏官方中文翻译缺失的物品名
    const zhFallback: Record<string, string> = {
      'DiamondStone_Name': '钻石矿石', 'RubyStone_Name': '红宝石矿石',
      'JadeStone_Name': '翡翠矿石', 'AmethystStone_Name': '紫水晶矿石',
      'TopazStone_Name': '黄水晶矿石', 'EmeraldStone_Name': '绿宝石矿石',
      'AquamarineStone_Name': '海蓝宝石矿石', 'MusselStone_Name': '蚌石',
      'GemStone_Name': '宝石矿', 'MysticStone_Name': '神秘矿石',
      'SnowyStone_Name': '雪石', 'GeodeStone_Name': '岩石矿',
      'FrozenGeodeStone_Name': '冰冻岩石矿', 'MagmaGeodeStone_Name': '岩浆岩石矿',
      'RadioactiveStone_Name': '放射性矿石', 'IronStone_Name': '铁矿石',
      'CopperStone_Name': '铜矿石', 'GoldStone_Name': '金矿石',
      'IridiumStone_Name': '铱矿石', 'FossilStone_Name': '化石矿石',
      'ClayStone_Name': '粘土矿石', 'OmniGeodeStone_Name': '万象晶石矿',
      'CinderShardStone_Name': '烬晶碎片矿',
    }

    // Resolve [LocalizedText path:Key] to actual localized string
    const resolveToken = (text: string): string => {
      if (!text.startsWith('[LocalizedText')) return text
      // Match: [LocalizedText Strings\Objects:Key] or [LocalizedText Strings/Objects:Key] or [LocalizedText Strings\1_6_Strings:Key]
      const m = text.match(/\[LocalizedText\s+Strings[\\\/](?:Objects|1_6_Strings|scheduleStrings|events|BigCraftables|Buffs|NPCGiftTastes):([^\]]+)\]/)
      if (m && stringsMap[m[1]]) return stringsMap[m[1]]
      // Some keys have _Name suffix in the strings file but not in the token
      if (m && stringsMap[m[1] + '_Name']) return stringsMap[m[1] + '_Name']
      // Try removing trailing _Name if the token already has it
      if (m && m[1].endsWith('_Name') && stringsMap[m[1].slice(0, -5)]) return stringsMap[m[1].slice(0, -5)]
      // 用本地补全表兜底
      if (m && zhFallback[m[1]]) return zhFallback[m[1]]
      // Fallback: show raw token
      return text
    }

    const items: { id: string; name: string; displayName: string; description: string; type: string; category: number; price: number; texture: string; spriteIndex: number }[] = []

    for (const [id, obj] of Object.entries(data)) {
      const o = obj as Record<string, unknown>
      const rawDisplayName = String(o.DisplayName || o.Name || '')
      items.push({
        id,
        name: String(o.Name || ''),
        displayName: resolveToken(rawDisplayName),
        description: resolveToken(String(o.Description || '')),
        type: String(o.Type || ''),
        category: Number(o.Category || 0),
        price: Number(o.Price || 0),
        texture: String(o.Texture || 'Maps/springobjects'),
        spriteIndex: Number(o.SpriteIndex ?? o.ParentSheetIndex ?? 0),
      })
    }

    return { success: true, items, unpackedDir }
  } catch (e) {
    log.error('读取物品数据失败:', e)
    return { success: false, items: [], error: String(e) }
  }
})

/** 从解包目录读取事件数据 */
ipcMain.handle('xnb:listEvents', async (_event, rootPath?: string) => {
  try {
    let unpackedDir: string
    if (rootPath && existsSync(rootPath)) {
      unpackedDir = rootPath
    } else {
      const gameDir = await autoDetectGameDirAsync()
      if (!gameDir) return { success: false, events: [] }
      unpackedDir = join(gameDir, 'Content (unpacked)')
    }

    const eventsJson = join(unpackedDir, 'Data', 'Events.json')
    if (!existsSync(eventsJson)) return { success: false, events: [] }

    const raw = await readFile(eventsJson, 'utf-8')
    const data = JSON.parse(raw)

    // Events.json 格式: { "MapName/Season/Time/Key": "script_data" }
    // 解析 key 为 map/season/time 等信息
    const events: { id: string; map: string; season: string; time: string; key: string; script: string; npcIds: string[] }[] = []

    for (const [eventKey, script] of Object.entries(data)) {
      const parts = eventKey.split('/')
      const map = parts[0] || ''
      const season = parts[1] || ''
      const time = parts[2] || ''
      const key = parts.slice(3).join('/') || ''

      // 从脚本中提取 NPC ID（格式如 /npcName/ 或 dialogue 中的说话者）
      const npcSet = new Set<string>()
      const npcMatches = String(script).match(/\/(\w+)\//g)
      if (npcMatches) {
        for (const m of npcMatches) {
          const npc = m.replace(/\//g, '')
          if (npc && npc.length > 1 && !['addQuest', 'removeQuest', 'pause', 'speak', 'move', 'faceDirection', 'animate', 'jump', 'shake', 'textAboveHead', 'setTileProperty', 'changeMapTile', 'addObject', 'removeObject', 'positionOverride', 'grantConversationSkill', 'temporarySprite', 'addMail', 'removeMail', 'friendship', 'changeLocation', 'end', 'stop', 'playSound', 'playMusic', 'message', 'question', 'choice', 'fade', 'viewport', 'freeze', 'doAction', 'halt', 'advancedMove', 'warp', 'switchEvent'].includes(npc)) {
            npcSet.add(npc)
          }
        }
      }

      events.push({
        id: eventKey,
        map,
        season,
        time,
        key,
        script: String(script),
        npcIds: [...npcSet],
      })
    }

    return { success: true, events, unpackedDir }
  } catch (e) {
    log.error('读取事件数据失败:', e)
    return { success: false, events: [], error: String(e) }
  }
})

/** 从解包目录读取物品贴图并裁剪指定图块 */
ipcMain.handle('xnb:readItemImage', async (_event, unpackedDir: string, texture: string, spriteIndex: number) => {
  try {
    // texture 格式如 "Maps/springobjects" 或 "TileSheets/Craftables"
    // 解包后 PNG 在 Content (unpacked)/ 下
    const candidates = [
      join(unpackedDir, texture + '.png'),
      join(unpackedDir, texture.replace(/\\/g, '/') + '.png'),
    ]

    let imgPath = ''
    for (const c of candidates) {
      if (existsSync(c)) { imgPath = c; break }
    }

    if (!imgPath) return null

    const imgBuf = await readFile(imgPath)
    const img = await loadImage(imgBuf)

    // 物品贴图通常是 16x16，Craftables 是 16x32
    const tileSize = texture.toLowerCase().includes('craftable') ? 32 : 16
    const tilesPerRow = Math.floor(img.width / tileSize)

    const col = spriteIndex % tilesPerRow
    const row = Math.floor(spriteIndex / tilesPerRow)
    const x = col * tileSize
    const y = row * tileSize

    // 裁剪到 2x 大小以便清晰显示
    const scale = 2
    const outSize = tileSize * scale
    const outCanvas = createCanvas(outSize, outSize)
    const outCtx = outCanvas.getContext('2d')
    outCtx.imageSmoothingEnabled = false
    outCtx.drawImage(img, x, y, tileSize, tileSize, 0, 0, outSize, outSize)

    return outCanvas.toDataURL('image/png')
  } catch (e) {
    log.error('读取物品贴图失败:', e)
    return null
  }
})

/** 批量加载物品贴图 — 一次读取贴图集 PNG，批量裁剪所有图块 */
ipcMain.handle('xnb:batchItemImages', async (_event, unpackedDir: string, items: { id: string; texture: string; spriteIndex: number }[]) => {
  try {
    // 按 texture 分组，避免重复读取同一贴图集
    const byTexture = new Map<string, { id: string; spriteIndex: number }[]>()
    for (const item of items) {
      const key = item.texture
      if (!byTexture.has(key)) byTexture.set(key, [])
      byTexture.get(key)!.push({ id: item.id, spriteIndex: item.spriteIndex })
    }

    const result: Record<string, string> = {}

    for (const [texture, entries] of byTexture) {
      // 查找贴图集 PNG
      const candidates = [
        join(unpackedDir, texture + '.png'),
        join(unpackedDir, texture.replace(/\\/g, '/') + '.png'),
      ]
      let imgPath = ''
      for (const c of candidates) {
        if (existsSync(c)) { imgPath = c; break }
      }
      if (!imgPath) continue

      // 读取贴图集图片（只读一次）
      const imgBuf = await readFile(imgPath)
      const img = await loadImage(imgBuf)

      // 判断图块尺寸
      const isCraftable = texture.toLowerCase().includes('craftable')
      const tileSize = isCraftable ? 32 : 16
      const tilesPerRow = Math.floor(img.width / tileSize)

      // 批量裁剪
      for (const entry of entries) {
        const col = entry.spriteIndex % tilesPerRow
        const row = Math.floor(entry.spriteIndex / tilesPerRow)
        const x = col * tileSize
        const y = row * tileSize

        // 边界检查
        if (x + tileSize > img.width || y + tileSize > img.height) continue

        const scale = 2
        const outSize = tileSize * scale
        const outCanvas = createCanvas(outSize, outSize)
        const outCtx = outCanvas.getContext('2d')
        outCtx.imageSmoothingEnabled = false
        outCtx.drawImage(img, x, y, tileSize, tileSize, 0, 0, outSize, outSize)
        result[entry.id] = outCanvas.toDataURL('image/png')
      }
    }

    return result
  } catch (e) {
    log.error('批量加载物品贴图失败:', e)
    return {}
  }
})

/** 选择图片文件并返回 data URL */
ipcMain.handle('dialog:selectImageFile', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: '选择图片文件',
      properties: ['openFile'],
      filters: [
        { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif', 'ico', 'avif'] },
        { name: 'PNG', extensions: ['png'] },
        { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
        { name: '所有文件', extensions: ['*'] },
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const ext = filePath.split('.').pop()?.toLowerCase()

    // 读取文件并转为 data URL
    const buf = await readFile(filePath)
    const mimeMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp',
      svg: 'image/svg+xml', tiff: 'image/tiff', tif: 'image/tiff',
      ico: 'image/x-icon', avif: 'image/avif',
    }
    const mime = mimeMap[ext || ''] || 'image/png'
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`

    return { filePath, fileName: basename(filePath), dataUrl }
  } catch (e) {
    log.error('选择图片文件失败:', e)
    return null
  }
})

/** 批量读取拖放文件（返回文件名+dataUrl列表） */
ipcMain.handle('fs:readDroppedFiles', async (_event, filePaths: string[]) => {
  try {
    const results: Array<{ filePath: string; fileName: string; dataUrl: string; size: number }> = []
    for (const filePath of filePaths) {
      try {
        const s = await stat(filePath)
        if (s.isDirectory()) continue // 跳过目录
        const buf = await readFile(filePath)
        const ext = filePath.split('.').pop()?.toLowerCase() || ''
        const mimeMap: Record<string, string> = {
          png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
          gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp',
          json: 'application/json', tmx: 'application/xml', tbin: 'application/octet-stream',
        }
        const mime = mimeMap[ext] || 'application/octet-stream'
        const b64 = buf.toString('base64')
        results.push({
          filePath,
          fileName: basename(filePath),
          dataUrl: `data:${mime};base64,${b64}`,
          size: s.size,
        })
      } catch { /* skip unreadable files */ }
    }
    return results
  } catch (e) {
    log.error('读取拖放文件失败:', e)
    return []
  }
})

/** 一键复制模组到游戏的 Mods 文件夹 */
ipcMain.handle('game:installMod', async (_event, modDir: string) => {
  try {
    if (!modDir || !existsSync(modDir)) {
      return { success: false, error: '模组目录不存在' }
    }

    const gameDir = await autoDetectGameDirAsync()
    if (!gameDir) return { success: false, error: '未找到游戏目录' }

    const modsDir = join(gameDir, 'Mods')
    if (!existsSync(modsDir)) {
      return { success: false, error: '未找到 Mods 目录，请确保已安装 SMAPI' }
    }

    // 获取模组文件夹名
    const modName = basename(modDir)
    const targetDir = join(modsDir, modName)

    // 递归复制目录
    async function copyDirRecursive(src: string, dest: string) {
      await mkdir(dest, { recursive: true })
      const entries = await readdir(src, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = join(src, entry.name)
        const destPath = join(dest, entry.name)
        if (entry.isDirectory()) {
          await copyDirRecursive(srcPath, destPath)
        } else {
          const { copyFile: cpFile } = require('fs/promises')
          await cpFile(srcPath, destPath)
        }
      }
    }

    await copyDirRecursive(modDir, targetDir)

    return { success: true, message: `已复制到 ${targetDir}`, targetDir }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

/** 读取 SMAPI 最新日志（用于错误显示） */
ipcMain.handle('game:readSmapiLog', async () => {
  try {
    const logPath = join(process.env.APPDATA || '', 'StardewValley', 'ErrorLogs', 'SMAPI-latest.txt')
    if (!existsSync(logPath)) {
      return { success: false, error: '未找到 SMAPI 日志文件', lines: [] }
    }

    const buf = await readFile(logPath)
    const text = buf.toString('utf-8')

    // 只取最后 200 行
    const allLines = text.split('\n')
    const lines = allLines.slice(-200)

    // 筛选错误和警告
    const errors = lines.filter(l =>
      l.includes('[ERROR]') ||
      l.includes('[WARN]') ||
      l.includes('Exception') ||
      l.includes('error') ||
      l.includes('failed')
    )

    return {
      success: true,
      lines,
      errors: errors.length > 0 ? errors : [],
      logPath,
    }
  } catch (e) {
    return { success: false, error: String(e), lines: [] }
  }
})

initAllowedPaths()
log.info('路径初始化完成')

app.whenReady().then(() => {
  log.info('app.whenReady 触发，创建窗口')
  createWindow()
  // 异步检测游戏目录（不阻塞窗口创建）
  initGameDirAsync()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
