/**
 * 饭团工坊发布工具 - Electron 主进程
 *
 * 功能：
 *   1. 创建主窗口（加载渲染层 UI）
 *   2. 管理 Token 配置（保存到用户目录）
 *   3. 通过 IPC 调用 lib/publisher.js 执行发布流程
 *   4. 实时推送日志和进度到渲染层
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const log = require('electron-log')

// 发布逻辑
const { publishRelease, readPackageVersion, setPackageVersion } = require('./lib/publisher')

// ============================================================
// 配置文件路径（Token 等敏感信息保存在用户目录）
// ============================================================
const CONFIG_DIR = path.join(app.getPath('userData'), 'config')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

// 默认配置
const DEFAULT_CONFIG = {
  githubToken: '',
  giteeToken: '',
  // 项目路径（默认指向同级的主项目）
  projectPath: path.resolve(__dirname, '..'),
}

// ============================================================
// 配置文件读写
// ============================================================
function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) }
    }
  } catch (e) {
    log.error('读取配置失败:', e)
  }
  return { ...DEFAULT_CONFIG }
}

function saveConfig(config) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
    log.info('配置已保存到:', CONFIG_FILE)
  } catch (e) {
    log.error('保存配置失败:', e)
    throw e
  }
}

// ============================================================
// 主窗口
// ============================================================
let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: '饭团工坊 - 一键发布工具',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 开发模式加载本地服务器，生产模式加载打包文件
  if (process.argv.includes('--dev')) {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ============================================================
// IPC: 配置管理
// ============================================================

// 读取配置
ipcMain.handle('config:load', () => {
  return loadConfig()
})

// 保存配置
ipcMain.handle('config:save', (_event, config) => {
  saveConfig(config)
  return { success: true }
})

// 选择项目目录
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择饭团工坊项目目录',
    properties: ['openDirectory'],
    defaultPath: path.resolve(__dirname, '..'),
  })
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }
  // 校验是否是有效项目（包含 package.json 和 scripts/publish-dual.js）
  const selectedPath = result.filePaths[0]
  const hasPkg = fs.existsSync(path.join(selectedPath, 'package.json'))
  const hasScript = fs.existsSync(path.join(selectedPath, 'scripts', 'publish-dual.js'))
  if (!hasPkg || !hasScript) {
    return {
      canceled: true,
      error: '所选目录不是有效的饭团工坊项目（缺少 package.json 或 scripts/publish-dual.js）',
    }
  }
  return { canceled: false, path: selectedPath }
})

// ============================================================
// IPC: 版本号管理
// ============================================================

// 读取当前版本号
ipcMain.handle('version:read', (_event, projectPath) => {
  try {
    const version = readPackageVersion(projectPath)
    return { success: true, version }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ============================================================
// IPC: 发布流程
// ============================================================

// 当前发布任务的状态（防止重复发布）
let isPublishing = false

ipcMain.handle('publish:run', async (_event, params) => {
  if (isPublishing) {
    return { success: false, error: '已有发布任务正在执行，请等待完成' }
  }

  const { projectPath, newVersion, bumpType, githubToken, giteeToken } = params

  // 参数校验
  if (!projectPath) {
    return { success: false, error: '未设置项目路径' }
  }
  if (!githubToken || !giteeToken) {
    return { success: false, error: '未配置 GitHub 或 Gitee Token' }
  }
  if (!newVersion && !bumpType) {
    return { success: false, error: '未指定新版本号或版本类型' }
  }

  isPublishing = true

  // 日志推送函数
  const sendLog = (level, message) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('publish:log', { level, message, timestamp: Date.now() })
    }
  }

  // 进度推送函数
  const sendProgress = (step, totalSteps, message) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('publish:progress', { step, totalSteps, message })
    }
  }

  try {
    const result = await publishRelease({
      projectPath,
      newVersion,
      bumpType,
      githubToken,
      giteeToken,
      onLog: sendLog,
      onProgress: sendProgress,
    })
    isPublishing = false
    return { success: true, ...result }
  } catch (e) {
    isPublishing = false
    sendLog('error', '发布失败: ' + e.message)
    return { success: false, error: e.message }
  }
})

// ============================================================
// 应用生命周期
// ============================================================

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
