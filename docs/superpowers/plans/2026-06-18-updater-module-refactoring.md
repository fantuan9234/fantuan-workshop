# 自动更新模块重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将更新系统从 `src/main/index.ts` 拆出为独立模块 `src/main/updater/`，支持非强制更新、跳过版本、更新备注展示，并升级渲染进程 UI。

**Architecture:** 主进程侧采用 `MainUpdater` 类封装 `autoUpdater` + 状态机驱动，`UpdateStore` 基于 JSON 文件持久化跳过版本和用户偏好；渲染进程侧将 `ForceUpdateModal` 重构为 `UpdateCenter`，支持非强制/强制两种模式，增加跳过版本和更新说明展示。IPC 通道新增 `update:skipVersion` / `update:getPreferences` / `update:setPreferences`。

**Tech Stack:** Electron 28 + electron-updater 6 + React 18 + TailwindCSS + electron-log + Sentry

---

## 文件清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/main/updater/UpdaterState.ts` | **创建** | 状态机类型定义：阶段枚举、更新状态、状态转换 |
| `src/main/updater/UpdateStore.ts` | **创建** | JSON 文件持久化：跳过版本列表、自动下载开关 |
| `src/main/updater/MainUpdater.ts` | **创建** | 封装 `autoUpdater`，驱动状态机，管理事件生命周期 |
| `src/main/updater/ipcHandlers.ts` | **创建** | 注册/注销 IPC handlers（`update:check`/`download`/`install`/`skipVersion`/`getPreferences`/`setPreferences`） |
| `src/main/updater/logger.ts` | **创建** | 基于 `electron-log` 的统一日志封装 |
| `src/main/updater/index.ts` | **创建** | 导出 `initAutoUpdater(mainWindow)` 作为唯一入口 |
| `src/main/index.ts` | **修改** | 删除内联的 `setupAutoUpdater` 函数及 IPC handlers，改为调用 `initAutoUpdater(win)` |
| `src/preload/index.ts` | **修改** | 新增 `skipVersion`、`getUpdatePreferences`、`setUpdatePreferences`、`onUpdatePreferencesChanged` |
| `src/renderer/src/components/ForceUpdateModal.tsx` | **重写** | 重构为 `UpdateCenter`：支持跳过版本、更新备注 Markdown 渲染 |
| `src/renderer/src/components/UpdateCenter.tsx` | **创建** | 新组件名 |
| `src/renderer/src/global.d.ts` | **修改** | 更新 `ElectronAPI` 类型定义 |
| `src/renderer/src/i18n/en.ts` | **修改** | 新增跳过版本、更新说明相关翻译 |
| `src/renderer/src/i18n/zh.ts` | **修改** | 新增跳过版本、更新说明相关翻译 |
| `src/renderer/src/App.tsx` | **修改** | 将 `ForceUpdateModal` 引用改为 `UpdateCenter` |

---

### Task 1: 创建 UpdaterState — 状态机类型定义

**目的：** 定义更新系统的状态机类型，与渲染进程共享一致的状态契约。

**Files:**
- Create: `src/main/updater/UpdaterState.ts`

- [ ] **Step 1: 创建 UpdaterState.ts**

```typescript
/**
 * 更新状态机类型定义
 * ----------------------------------------------------------------
 * 状态流：
 *   idle → checking → available → downloading → downloaded → installing
 *                     → error ← downloading
 *   idle → up-to-date
 *
 * 主要变更：新增 checking/up-to-date/installing 状态，精确表达完整流程
 */

/** 更新阶段枚举 */
export enum UpdatePhase {
  Idle = 'idle',
  Checking = 'checking',
  Available = 'available',
  Downloading = 'downloading',
  Downloaded = 'downloaded',
  Installing = 'installing',
  Error = 'error',
  /** 已是最新，无需更新 */
  UpToDate = 'up-to-date',
}

/** 更新信息 */
export interface UpdateInfo {
  version: string
  currentVersion: string
  releaseNotes?: string | null
  releaseDate?: string
  /** 是否为强制更新 */
  force: boolean
}

/** 下载进度 */
export interface DownloadProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

/** 更新错误 */
export interface UpdateError {
  message: string
  /** 错误码，用于区分网络错误/服务器错误/校验错误 */
  code?: string
}

/** 完整的更新状态 */
export interface UpdaterState {
  phase: UpdatePhase
  info: UpdateInfo | null
  progress: DownloadProgress | null
  error: UpdateError | null
}

/** 初始状态 */
export const INITIAL_UPDATER_STATE: UpdaterState = {
  phase: UpdatePhase.Idle,
  info: null,
  progress: null,
  error: null,
}

/** 用户偏好配置 */
export interface UpdatePreferences {
  /** 是否自动下载更新（非强制模式下有效） */
  autoDownload: boolean
  /** 上次检查时间的时间戳 */
  lastCheckTimestamp: number | null
}

export const DEFAULT_PREFERENCES: UpdatePreferences = {
  autoDownload: true,
  lastCheckTimestamp: null,
}
```

- [ ] **Step 2: 验证文件创建成功**

无额外验证步骤，类型文件在 import 时由 TypeScript 编译器检查。

- [ ] **Step 3: Commit**

```bash
git add src/main/updater/UpdaterState.ts
git commit -m "refactor(updater): add UpdaterState type definitions"
```

---

### Task 2: 创建 UpdateStore — 跳过版本持久化

**目的：** 用 JSON 文件持久化跳过版本列表和用户偏好，避免引入 `electron-store` 依赖。

**Files:**
- Create: `src/main/updater/UpdateStore.ts`

- [ ] **Step 1: 创建 UpdateStore.ts**

```typescript
/**
 * UpdateStore — 跳过版本与用户偏好持久化
 * ----------------------------------------------------------------
 * 使用 app.getPath('userData')/updater-config.json 存储：
 *   - skippedVersions: string[] — 用户跳过的版本号列表
 *   - preferences: UpdatePreferences — 用户偏好
 *
 * 不引入 electron-store 依赖，用 fs 原生读写 JSON。
 */

import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { UpdatePreferences, DEFAULT_PREFERENCES } from './UpdaterState'

interface StoreData {
  skippedVersions: string[]
  preferences: UpdatePreferences
}

function getConfigPath(): string {
  const dir = app.getPath('userData')
  return join(dir, 'updater-config.json')
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function loadStore(): StoreData {
  try {
    const configPath = getConfigPath()
    if (!existsSync(configPath)) {
      return { skippedVersions: [], preferences: { ...DEFAULT_PREFERENCES } }
    }
    const raw = readFileSync(configPath, 'utf-8')
    const data = JSON.parse(raw) as Partial<StoreData>
    return {
      skippedVersions: Array.isArray(data.skippedVersions) ? data.skippedVersions : [],
      preferences: { ...DEFAULT_PREFERENCES, ...(data.preferences || {}) },
    }
  } catch {
    return { skippedVersions: [], preferences: { ...DEFAULT_PREFERENCES } }
  }
}

function saveStore(data: StoreData): void {
  try {
    const configPath = getConfigPath()
    ensureDir(configPath)
    writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('UpdateStore: 保存配置失败', err)
  }
}

/** 检查版本是否被跳过 */
export function isVersionSkipped(version: string): boolean {
  return loadStore().skippedVersions.includes(version)
}

/** 添加跳过的版本号 */
export function addSkippedVersion(version: string): void {
  const data = loadStore()
  if (!data.skippedVersions.includes(version)) {
    data.skippedVersions.push(version)
    saveStore(data)
  }
}

/** 清除跳过的版本号（安装新版本后调用） */
export function clearSkippedVersions(): void {
  const data = loadStore()
  data.skippedVersions = []
  saveStore(data)
}

/** 获取用户偏好 */
export function getPreferences(): UpdatePreferences {
  return loadStore().preferences
}

/** 更新用户偏好 */
export function setPreferences(prefs: Partial<UpdatePreferences>): UpdatePreferences {
  const data = loadStore()
  data.preferences = { ...data.preferences, ...prefs, lastCheckTimestamp: Date.now() }
  saveStore(data)
  return data.preferences
}

/** 获取已跳过的版本列表 */
export function getSkippedVersions(): string[] {
  return loadStore().skippedVersions
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/updater/UpdateStore.ts
git commit -m "refactor(updater): add UpdateStore for skipped versions and preferences"
```

---

### Task 3: 创建 MainUpdater — 核心更新引擎

**目的：** 将 `autoUpdater` 封装为可测试的类，驱动状态机，管理事件订阅和定时检查。

**Files:**
- Create: `src/main/updater/MainUpdater.ts`

- [ ] **Step 1: 创建 MainUpdater.ts**

```typescript
/**
 * MainUpdater — 自动更新核心引擎
 * ----------------------------------------------------------------
 * 职责：
 *   1. 封装 electron-updater 的 autoUpdater
 *   2. 驱动 UpdaterState 状态机
 *   3. 通过回调通知外部（MainProcessBridge 或 IPC）
 *   4. 管理启动延迟检查 + 定期检查
 *
 * 不直接引用 BrowserWindow 或 ipcMain，保持纯逻辑可测试。
 */

import { autoUpdater, UpdateCheckResult } from 'electron-updater'
import log from 'electron-log'
import {
  UpdatePhase,
  UpdateInfo,
  DownloadProgress,
  UpdateError,
  UpdaterState,
  INITIAL_UPDATER_STATE,
} from './UpdaterState'
import * as UpdateStore from './UpdateStore'

/** 外部更新状态变化的回调类型 */
export type OnStateChange = (state: UpdaterState) => void

/** 比较语义化版本号：v1 > v2 返回正数，v1 < v2 返回负数，相等返回 0 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number)
  const parts2 = v2.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0
    const b = parts2[i] || 0
    if (a !== b) return a - b
  }
  return 0
}

export class MainUpdater {
  private state: UpdaterState = { ...INITIAL_UPDATER_STATE }
  private onStateChange: OnStateChange | null = null
  private checkIntervalMs: number
  private delayTimer: ReturnType<typeof setTimeout> | null = null
  private intervalTimer: ReturnType<typeof setInterval> | null = null
  private destroyed = false

  /** GitHub 仓库配置 */
  private owner: string
  private repo: string

  constructor(
    owner: string,
    repo: string,
    options?: {
      onStateChange?: OnStateChange
      checkIntervalMs?: number
    },
  ) {
    this.owner = owner
    this.repo = repo
    this.onStateChange = options?.onStateChange ?? null
    this.checkIntervalMs = options?.checkIntervalMs ?? 30 * 60 * 1000
    this.setupListeners()
  }

  private setState(partial: Partial<UpdaterState>): void {
    if (this.destroyed) return
    this.state = { ...this.state, ...partial }
    this.onStateChange?.(this.state)
  }

  private setupListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      log.info('[MainUpdater] 正在检查更新...')
      this.setState({ phase: UpdatePhase.Checking })
    })

    autoUpdater.on('update-available', (info) => {
      // 检查该版本是否被跳过
      if (UpdateStore.isVersionSkipped(info.version)) {
        log.info(`[MainUpdater] 版本 v${info.version} 已被用户跳过，忽略本次更新`)
        this.setState({ phase: UpdatePhase.Idle })
        return
      }

      log.info(`[MainUpdater] 发现新版本 v${info.version}`)
      const prefs = UpdateStore.getPreferences()
      this.setState({
        phase: UpdatePhase.Available,
        info: {
          version: info.version,
          currentVersion: app.getVersion(),
          releaseNotes: info.releaseNotes,
          releaseDate: info.releaseDate,
          force: false, // 目前所有更新都为非强制；未来可通过 release 标记做强制
        },
      })

      // 如果用户开启了自动下载，直接开始下载
      if (prefs.autoDownload) {
        this.downloadUpdate()
      }
    })

    autoUpdater.on('update-not-available', () => {
      log.info('[MainUpdater] 没有可用更新')
      this.setState({ phase: UpdatePhase.UpToDate })
      // 短暂显示"已是最新"后回到 idle
      setTimeout(() => {
        if (!this.destroyed) {
          this.setState({ phase: UpdatePhase.Idle })
        }
      }, 3000)
    })

    autoUpdater.on('download-progress', (progress) => {
      this.setState({
        phase: UpdatePhase.Downloading,
        progress: {
          percent: Math.round(progress.percent * 100) / 100,
          transferred: progress.transferred,
          total: progress.total,
          bytesPerSecond: progress.bytesPerSecond,
        },
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      log.info(`[MainUpdater] 版本 v${info.version} 下载完成`)
      // 安装前清除跳过的旧版本号
      UpdateStore.clearSkippedVersions()
      this.setState({
        phase: UpdatePhase.Downloaded,
        info: {
          version: info.version,
          currentVersion: app.getVersion(),
          releaseNotes: info.releaseNotes,
          releaseDate: info.releaseDate,
          force: false,
        },
      })
    })

    autoUpdater.on('error', (err) => {
      log.error('[MainUpdater] 更新错误:', err)
      this.setState({
        phase: UpdatePhase.Error,
        error: { message: err?.message || String(err) },
      })
    })

    // 配置 autoUpdater 行为
    autoUpdater.autoDownload = false // 由 MainUpdater 控制下载时机
    autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装（兜底）
  }

  /** 配置并检查更新 */
  private async checkForUpdatesInternal(): Promise<void> {
    try {
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: this.owner,
        repo: this.repo,
      })
      await autoUpdater.checkForUpdates()
    } catch (e: any) {
      log.warn('[MainUpdater] 检查更新失败:', e?.message || e)
      this.setState({
        phase: UpdatePhase.Error,
        error: { message: e?.message || String(e), code: 'NETWORK_ERROR' },
      })
    }
  }

  /** 启动自动更新（在窗口就绪后调用） */
  start(delayMs: number = 5_000): void {
    if (this.destroyed) return
    log.info('[MainUpdater] 启动自动更新')

    // 延迟首次检查
    this.delayTimer = setTimeout(() => {
      if (this.destroyed) return
      this.checkForUpdatesInternal()
    }, delayMs)

    // 定期检查
    this.intervalTimer = setInterval(() => {
      if (this.destroyed) return
      this.checkForUpdatesInternal()
    }, this.checkIntervalMs)
  }

  /** 手动检查更新 */
  async checkForUpdates(): Promise<{ hasUpdate: boolean; version?: string; currentVersion?: string; error?: string }> {
    try {
      this.setState({ phase: UpdatePhase.Checking })
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: this.owner,
        repo: this.repo,
      })
      const result = await autoUpdater.checkForUpdates()
      const latest = result?.updateInfo?.version
      const current = app.getVersion()
      const hasUpdate = !!latest && compareVersions(latest, current) > 0
      return {
        hasUpdate,
        version: latest,
        currentVersion: current,
      }
    } catch (e: any) {
      this.setState({
        phase: UpdatePhase.Error,
        error: { message: e?.message || String(e), code: 'CHECK_ERROR' },
      })
      return { hasUpdate: false, error: e?.message }
    }
  }

  /** 开始下载更新 */
  async downloadUpdate(): Promise<boolean> {
    try {
      this.setState({ phase: UpdatePhase.Downloading })
      await autoUpdater.downloadUpdate()
      return true
    } catch (e: any) {
      log.error('[MainUpdater] 下载失败:', e)
      this.setState({
        phase: UpdatePhase.Error,
        error: { message: e?.message || String(e), code: 'DOWNLOAD_ERROR' },
      })
      return false
    }
  }

  /** 安装更新 */
  installUpdate(): void {
    log.info('[MainUpdater] 用户确认重启，开始安装更新...')
    this.setState({ phase: UpdatePhase.Installing })
    UpdateStore.clearSkippedVersions()
    // isSilent=false 显示安装向导；isForceRunAfter=true 安装完自动启动
    autoUpdater.quitAndInstall(false, true)
  }

  /** 跳过指定版本 */
  skipVersion(version: string): void {
    log.info(`[MainUpdater] 用户跳过了版本 v${version}`)
    UpdateStore.addSkippedVersion(version)
    this.setState({ phase: UpdatePhase.Idle, info: null, progress: null, error: null })
  }

  /** 销毁清理（窗口关闭时调用） */
  destroy(): void {
    this.destroyed = true
    if (this.delayTimer) {
      clearTimeout(this.delayTimer)
      this.delayTimer = null
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
      this.intervalTimer = null
    }
  }
}
```

注意：文件顶部需要添加 `import { app } from 'electron'`。

- [ ] **Step 2: Commit**

```bash
git add src/main/updater/MainUpdater.ts
git commit -m "refactor(updater): add MainUpdater class with state machine"
```

---

### Task 4: 创建 Logger 模块

**目的：** 提供统一的日志封装。

**Files:**
- Create: `src/main/updater/logger.ts`

- [ ] **Step 1: 创建 logger.ts**

```typescript
import log from 'electron-log'

log.transports.file.level = 'info'
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'

export const logger = log
export default log
```

- [ ] **Step 2: Commit**

```bash
git add src/main/updater/logger.ts
git commit -m "refactor(updater): add logger module"
```

---

### Task 5: 创建 IPC Handlers

**目的：** 将更新相关的 IPC handlers 集中管理，通过 `initIpcHandlers(mainUpdater, mainWindow)` 注册。

**Files:**
- Create: `src/main/updater/ipcHandlers.ts`

- [ ] **Step 1: 创建 ipcHandlers.ts**

```typescript
/**
 * IPC Handlers — 更新相关 IPC 通道注册
 * ----------------------------------------------------------------
 * 注册的通道：
 *   update:check           — 手动检查更新
 *   update:download        — 手动下载更新
 *   update:install         — 安装更新
 *   update:skipVersion     — 跳过版本
 *   update:getPreferences  — 获取用户偏好
 *   update:setPreferences  — 更新用户偏好
 */

import { ipcMain, BrowserWindow, app } from 'electron'
import { MainUpdater } from './MainUpdater'
import * as UpdateStore from './UpdateStore'
import { UpdatePreferences } from './UpdaterState'

/** 收集清理函数，便于注销 */
type CleanupFn = () => void

export function initIpcHandlers(mainUpdater: MainUpdater): CleanupFn {
  const cleanupFns: CleanupFn[] = []

  const handleCheck = ipcMain.handle('update:check', async () => {
    return await mainUpdater.checkForUpdates()
  })
  cleanupFns.push(() => ipcMain.removeHandler('update:check'))

  const handleDownload = ipcMain.handle('update:download', async () => {
    return await mainUpdater.downloadUpdate()
  })
  cleanupFns.push(() => ipcMain.removeHandler('update:download'))

  const handleInstall = ipcMain.handle('update:install', () => {
    mainUpdater.installUpdate()
  })
  cleanupFns.push(() => ipcMain.removeHandler('update:install'))

  const handleSkipVersion = ipcMain.handle('update:skipVersion', (_event, version: string) => {
    mainUpdater.skipVersion(version)
  })
  cleanupFns.push(() => ipcMain.removeHandler('update:skipVersion'))

  const handleGetPreferences = ipcMain.handle('update:getPreferences', () => {
    return UpdateStore.getPreferences()
  })
  cleanupFns.push(() => ipcMain.removeHandler('update:getPreferences'))

  const handleSetPreferences = ipcMain.handle('update:setPreferences', (_event, prefs: Partial<UpdatePreferences>) => {
    return UpdateStore.setPreferences(prefs)
  })
  cleanupFns.push(() => ipcMain.removeHandler('update:setPreferences'))

  const handleGetVersion = ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })
  cleanupFns.push(() => ipcMain.removeHandler('app:getVersion'))

  return () => {
    cleanupFns.forEach((fn) => fn())
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/updater/ipcHandlers.ts
git commit -m "refactor(updater): add IPC handlers module"
```

---

### Task 6: 创建 updater/index.ts — 模块入口

**目的：** 对外只暴露 `initAutoUpdater(mainWindow)` 一个函数，封装完整的初始化和销毁逻辑。

**Files:**
- Create: `src/main/updater/index.ts`

- [ ] **Step 1: 创建 index.ts**

```typescript
/**
 * updater 模块入口
 * ----------------------------------------------------------------
 * 对外只暴露 initAutoUpdater(mainWindow)，封装：
 *   1. 创建 MainUpdater 实例
 *   2. 注册 IPC handlers
 *   3. 状态变更通过 IPC 推送给渲染进程
 *   4. 返回 destroy 函数，供窗口关闭时清理
 */

import { BrowserWindow } from 'electron'
import { MainUpdater, OnStateChange } from './MainUpdater'
import { initIpcHandlers } from './ipcHandlers'
import { UpdaterState, UpdatePhase } from './UpdaterState'

const GITHUB_OWNER = 'fantuan9234'
const GITHUB_REPO = 'fantuan-workshop'
const CHECK_DELAY_MS = 5_000

export interface AutoUpdaterHandle {
  /** 手动检查更新 */
  checkForUpdates: () => ReturnType<MainUpdater['checkForUpdates']>
  /** 销毁清理 */
  destroy: () => void
}

export function initAutoUpdater(mainWindow: BrowserWindow): AutoUpdaterHandle {
  // 开发模式下跳过自动更新
  if (process.env.ELECTRON_RENDERER_URL || !app.isPackaged) {
    log.info('开发模式：跳过自动更新检查')
    return {
      checkForUpdates: async () => ({ hasUpdate: false }),
      destroy: () => {},
    }
  }

  const onStateChange: OnStateChange = (state: UpdaterState) => {
    if (mainWindow.isDestroyed()) return

    switch (state.phase) {
      case UpdatePhase.Checking:
        // 无需推送，手动检查时由 IPC 返回
        break
      case UpdatePhase.Available:
        mainWindow.webContents.send('update:available', {
          version: state.info?.version,
          releaseNotes: state.info?.releaseNotes,
          releaseDate: state.info?.releaseDate,
          force: state.info?.force ?? false,
        })
        break
      case UpdatePhase.Downloading:
        mainWindow.webContents.send('update:progress', state.progress)
        break
      case UpdatePhase.Downloaded:
        mainWindow.webContents.send('update:downloaded', {
          version: state.info?.version,
          force: state.info?.force ?? false,
        })
        break
      case UpdatePhase.Error:
        mainWindow.webContents.send('update:error', {
          message: state.error?.message || '未知错误',
        })
        break
    }
  }

  const updater = new MainUpdater(GITHUB_OWNER, GITHUB_REPO, {
    onStateChange,
  })

  const cleanupIpc = initIpcHandlers(updater)

  // 延迟启动自动检查
  updater.start(CHECK_DELAY_MS)

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    cleanupIpc()
    updater.destroy()
  })

  return {
    checkForUpdates: () => updater.checkForUpdates(),
    destroy: () => {
      cleanupIpc()
      updater.destroy()
    },
  }
}
```

注意：需要在文件开头添加：
```typescript
import { app } from 'electron'
import log from './logger'
```

- [ ] **Step 2: Commit**

```bash
git add src/main/updater/index.ts
git commit -m "refactor(updater): add module entry point"
```

---

### Task 7: 改造 src/main/index.ts — 接入新模块

**目的：** 删除 `setupAutoUpdater` 函数和所有 IPC handlers（511-661 行），替换为 `initAutoUpdater(win)`。

**Files:**
- Modify: `src/main/index.ts` (lines 511-658 → replace with simple init call)

- [ ] **Step 1: 修改 import 语句**

在文件顶部的 import 区域（import 语句附近，约第 8-10 行），添加：
```typescript
import { initAutoUpdater } from './updater'
```

删除 `import { autoUpdater } from 'electron-updater'`（不再直接引用）。

- [ ] **Step 2: 删除 setupAutoUpdater 函数和全部 IPC handlers**

删除 `src/main/index.ts` 中第 502-658 行的全部内容（从 `/** 强制更新策略 */` 注释开始，到 `// IPC: 动态添加允许的路径` 之前）。

替换为：
```typescript
// ========== 自动更新 ==========
import { initAutoUpdater } from './updater'
let updaterHandle: ReturnType<typeof initAutoUpdater> | null = null
```

然后在 `createWindow()` 之后或 `app.whenReady()` 中调用：
找到 `createWindow()` 调用之后的位置，大约在第 487-490 行附近。添加：
```typescript
// 初始化自动更新
updaterHandle = initAutoUpdater(mainWindow)
```

- [ ] **Step 3: 确保 `GITHUB_OWNER` / `GITHUB_REPO` 常量保留用于其他地方**

检查 `GITHUB_OWNER` 和 `GITHUB_REPO` 常量是否还在其他地方使用（除了 `setupAutoUpdater`）——如果仅在那里使用，它们已移至 `updater/index.ts`，可删除。

- [ ] **Step 4: 验证编译**

Run: `npx tsc --noEmit`
Expected: 编译通过，无报错。

- [ ] **Step 5: Commit**

```bash
git add src/main/index.ts
git commit -m "refactor(updater): integrate new updater module in main process"
```

---

### Task 8: 更新 Preload — 新增 IPC 通道

**目的：** 在 contextBridge 中暴露 `skipVersion`、`getUpdatePreferences`、`setUpdatePreferences` 三个新 API。

**Files:**
- Modify: `src/preload/index.ts`

- [ ] **Step 1: 在 preload 中添加新 API**

在现有 `// 自动更新` 区块（行 72-96）中添加：

```typescript
// ... 现有 checkForUpdate, downloadUpdate, installUpdate, getAppVersion ...

skipVersion: (version: string): void => ipcRenderer.invoke('update:skipVersion', version),
getUpdatePreferences: (): Promise<{ autoDownload: boolean; lastCheckTimestamp: number | null }> =>
  ipcRenderer.invoke('update:getPreferences'),
setUpdatePreferences: (prefs: { autoDownload?: boolean }): Promise<{ autoDownload: boolean; lastCheckTimestamp: number | null }> =>
  ipcRenderer.invoke('update:setPreferences', prefs),
```

- [ ] **Step 2: Commit**

```bash
git add src/preload/index.ts
git commit -m "feat(updater): add skipVersion and preferences IPC to preload"
```

---

### Task 9: 更新类型定义

**目的：** 在 global.d.ts 中添加新的 API 类型签名。

**Files:**
- Modify: `src/renderer/src/global.d.ts`

- [ ] **Step 1: 在 ElectronAPI 接口中添加新方法**

在 `checkForUpdate` / `downloadUpdate` / `installUpdate` / `getAppVersion` 等之后（行 131-139），添加：

```typescript
skipVersion: (version: string) => void
getUpdatePreferences: () => Promise<{ autoDownload: boolean; lastCheckTimestamp: number | null }>
setUpdatePreferences: (prefs: { autoDownload?: boolean }) => Promise<{ autoDownload: boolean; lastCheckTimestamp: number | null }>
```

同时更新 `onUpdateAvailable` 的回调类型 — `force` 字段改为非必填默认 false（保持兼容）：

当前（行 136）：
```typescript
onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string | null; releaseDate?: string; force: boolean }) => void) => () => void
```

改为：
```typescript
onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string | null; releaseDate?: string; force?: boolean }) => void) => () => void
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/global.d.ts
git commit -m "feat(updater): add skipVersion and preferences to type definitions"
```

---

### Task 10: 重写 ForceUpdateModal → UpdateCenter

**目的：** 重构更新 UI 组件，支持：
1. 非强制模式下显示"稍后"和"跳过此版本"按钮
2. 强制模式下全屏不可关闭（保留原有行为）
3. 显示更新说明（release notes）
4. 下载进度实时展示 + 速度显示

**Files:**
- Delete: `src/renderer/src/components/ForceUpdateModal.tsx`
- Create: `src/renderer/src/components/UpdateCenter.tsx`

- [ ] **Step 1: 创建 UpdateCenter.tsx**

```typescript
import { useEffect, useState, useCallback } from 'react'
import { useT, asString } from '../i18n'

type UpdatePhase = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'up-to-date'

interface UpdateState {
  phase: UpdatePhase
  version: string
  currentVersion: string
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
  force: boolean
  errorMessage: string
  releaseNotes: string
}

const INITIAL_STATE: UpdateState = {
  phase: 'idle',
  version: '',
  currentVersion: '',
  percent: 0,
  transferred: 0,
  total: 0,
  bytesPerSecond: 0,
  force: false,
  errorMessage: '',
  releaseNotes: '',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`))
}

export default function UpdateCenter(): JSX.Element | null {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [state, setState] = useState<UpdateState>(INITIAL_STATE)
  const [showNotes, setShowNotes] = useState(false)

  useEffect(() => {
    // 获取当前版本
    try {
      const fn = (window as any).electronAPI?.getAppVersion
      if (typeof fn === 'function') {
        fn().then((v: string) => {
          setState((prev) => ({ ...prev, currentVersion: v }))
        }).catch(() => {})
      }
    } catch {}

    if (!window.electronAPI) return

    const offAvailable = window.electronAPI.onUpdateAvailable((info) => {
      setState((prev) => ({
        ...prev,
        phase: 'available',
        version: info.version,
        force: info.force ?? false,
        releaseNotes: info.releaseNotes ?? '',
        percent: 0,
        transferred: 0,
        total: 0,
        errorMessage: '',
      }))
    })

    const offProgress = window.electronAPI.onUpdateProgress((progress) => {
      setState((prev) => ({
        ...prev,
        phase: 'downloading',
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      }))
    })

    const offDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
      setState((prev) => ({
        ...prev,
        phase: 'downloaded',
        version: info.version,
        force: info.force ?? false,
        percent: 100,
      }))
    })

    const offError = window.electronAPI.onUpdateError((info) => {
      setState((prev) => ({
        ...prev,
        phase: 'error',
        errorMessage: info.message,
      }))
    })

    return () => {
      offAvailable?.()
      offProgress?.()
      offDownloaded?.()
      offError?.()
    }
  }, [])

  // 强制模式下禁用 ESC
  useEffect(() => {
    if (state.phase === 'idle' || state.phase === 'up-to-date') return
    const handler = (e: KeyboardEvent): void => {
      if (state.force && (e.key === 'Escape' || e.key === 'F5' || (e.ctrlKey && e.key === 'w'))) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [state.phase, state.force])

  // 非强制模式下，在 "已是最新" 和 用户关闭后自动隐藏
  if (state.phase === 'idle' || state.phase === 'up-to-date') return null

  const handleInstall = (): void => {
    window.electronAPI?.installUpdate()
  }

  const handleLater = (): void => {
    setState(INITIAL_STATE)
  }

  const handleSkipVersion = (): void => {
    window.electronAPI?.skipVersion(state.version)
    setState(INITIAL_STATE)
  }

  const handleRetry = async (): Promise<void> => {
    setState((prev) => ({ ...prev, phase: 'available', errorMessage: '' }))
    const result = await window.electronAPI?.checkForUpdate().catch(() => {})
    if (result?.hasUpdate) {
      // 如果有更新，开始下载
      await window.electronAPI?.downloadUpdate()
    }
  }

  // 可操作阶段：available / downloaded / error
  const isInteractive = state.phase === 'available' || state.phase === 'downloaded' || state.phase === 'error'

  // 计算标题和描述
  const getTitle = (): string => {
    switch (state.phase) {
      case 'checking': return ts('updater.checking')
      case 'available': return ts('updater.newVersionAvailable')
      case 'downloading': return ts('updater.downloadingUpdate')
      case 'downloaded': return ts('updater.updateReady')
      case 'error': return ts('updater.updateError')
      default: return ''
    }
  }

  const getDescription = (): string => {
    switch (state.phase) {
      case 'available':
        return renderTemplate(ts('updater.newVersionDesc'), {
          version: state.version,
          current: state.currentVersion,
        })
      case 'downloading':
        return ts('updater.downloadingHint')
      case 'downloaded':
        return state.force ? ts('updater.forceHint') : ''
      case 'error':
        return state.errorMessage || ts('updater.errorHint')
      default:
        return ''
    }
  }

  // 解析 releaseNotes 中的 Markdown（简单行渲染）
  const renderReleaseNotes = (): JSX.Element | null => {
    if (!state.releaseNotes) return null
    const lines = state.releaseNotes.split('\n').filter((l) => l.trim())
    return (
      <div className="mt-3 px-4 py-3 rounded-lg themed-bg-hover max-h-[200px] overflow-y-auto text-sm themed-text-secondary space-y-1">
        {lines.map((line, i) => {
          if (line.startsWith('## ')) {
            return <h4 key={i} className="font-bold text-base themed-text-primary mt-2 first:mt-0">{line.replace(/^##\s*/, '')}</h4>
          }
          if (line.startsWith('- ')) {
            return <li key={i} className="list-disc list-inside ml-1">{line.replace(/^-\s*/, '')}</li>
          }
          if (line.startsWith('* ')) {
            return <li key={i} className="list-disc list-inside ml-1">{line.replace(/^\*\s*/, '')}</li>
          }
          return <p key={i}>{line}</p>
        })}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={state.force ? undefined : (e) => { if (e.target === e.currentTarget) handleLater() }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="themed-bg-card rounded-2xl w-[520px] max-w-[92vw] shadow-2xl border themed-border-primary overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            {state.phase === 'error' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : state.phase === 'downloaded' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" className={state.phase === 'downloading' ? 'animate-spin' : ''}>
                <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold themed-text-primary">{getTitle()}</h2>
            <p className="text-sm themed-text-muted mt-1">{getDescription()}</p>
            {/* 更新说明 */}
            {state.phase === 'available' && state.releaseNotes && (
              <>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-sm text-blue-400 hover:text-blue-300 mt-1 focus:outline-none"
                >
                  {showNotes ? ts('updater.hideReleaseNotes') : ts('updater.viewReleaseNotes')}
                </button>
                {showNotes && renderReleaseNotes()}
              </>
            )}
          </div>
        </div>

        {/* 进度条（下载中） */}
        {state.phase === 'downloading' && (
          <div className="px-6 pb-4">
            <div className="h-2 themed-bg-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, state.percent))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm themed-text-muted mt-2">
              <span>{renderTemplate(ts('updater.percentComplete'), { percent: state.percent.toFixed(1) })}</span>
              <span>
                {formatBytes(state.transferred)} / {formatBytes(state.total)}
                {state.bytesPerSecond > 0 && (
                  <span className="ml-2">
                    · {renderTemplate(ts('updater.speed'), { speed: formatBytes(state.bytesPerSecond) })}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* 下载完成 + 强制提示 */}
        {state.phase === 'downloaded' && state.force && (
          <div className="mx-6 mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
            {ts('updater.forceHint')}
          </div>
        )}

        {/* 按钮区 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t themed-border-secondary">
          {/* available 阶段：非强制显示 稍后 / 跳过 / 下载；强制只显示下载 */}
          {state.phase === 'available' && (
            <>
              {!state.force && (
                <>
                  <button
                    onClick={handleLater}
                    className="px-4 py-1.5 text-sm rounded-lg themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors"
                  >
                    {ts('updater.later')}
                  </button>
                  <button
                    onClick={handleSkipVersion}
                    className="px-4 py-1.5 text-sm rounded-lg themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors"
                  >
                    {ts('updater.skipVersion')}
                  </button>
                </>
              )}
              <button
                onClick={() => window.electronAPI?.downloadUpdate()}
                className="px-5 py-1.5 text-sm rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                autoFocus
              >
                {ts('updater.downloadNow')}
              </button>
            </>
          )}

          {/* downloaded 阶段：始终显示立即安装 */}
          {state.phase === 'downloaded' && (
            <button
              onClick={handleInstall}
              className="px-5 py-1.5 text-sm rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              autoFocus
            >
              {ts('updater.installNow')}
            </button>
          )}

          {/* error 阶段：非强制可关闭；可重试 */}
          {state.phase === 'error' && (
            <>
              {!state.force && (
                <button
                  onClick={handleLater}
                  className="px-4 py-1.5 text-sm rounded-lg themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors"
                >
                  {ts('updater.close')}
                </button>
              )}
              <button
                onClick={handleRetry}
                className="px-5 py-1.5 text-sm rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                autoFocus
              >
                {ts('updater.retry')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 删除旧文件**

```bash
git rm src/renderer/src/components/ForceUpdateModal.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/UpdateCenter.tsx
git rm src/renderer/src/components/ForceUpdateModal.tsx
git commit -m "refactor(updater): replace ForceUpdateModal with UpdateCenter"
```

---

### Task 11: 更新 i18n 翻译

**目的：** 添加新 UI 需要的翻译键值。

**Files:**
- Modify: `src/renderer/src/i18n/en.ts`
- Modify: `src/renderer/src/i18n/zh.ts`

- [ ] **Step 1: 修改 en.ts**

在 `updater` 区块（1278-1299 行）末尾添加：

```typescript
downloadNow: 'Download',
skipVersion: 'Skip this version',
close: 'Close',
viewReleaseNotes: 'View release notes',
hideReleaseNotes: 'Hide release notes',
```

- [ ] **Step 2: 修改 zh.ts**

在 `updater` 区块（1305-1326 行）末尾添加：

```typescript
downloadNow: '下载更新',
skipVersion: '跳过此版本',
close: '关闭',
viewReleaseNotes: '查看更新说明',
hideReleaseNotes: '收起更新说明',
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/i18n/en.ts src/renderer/src/i18n/zh.ts
git commit -m "feat(updater): add i18n keys for skip version and release notes"
```

---

### Task 12: 更新 App.tsx — 替换组件名

**目的：** 将 `ForceUpdateModal` 的 import 和 JSX 引用替换为 `UpdateCenter`。

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: 修改 import 语句**

```typescript
// 删除：import ForceUpdateModal from './components/ForceUpdateModal'
// 添加：
import UpdateCenter from './components/UpdateCenter'
```

- [ ] **Step 2: 修改 JSX**

```typescript
// 在 GlobalModals 中：
// 删除：<ForceUpdateModal />
// 添加：
<UpdateCenter />
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "refactor(updater): replace ForceUpdateModal with UpdateCenter in App"
```

---

### Task 13: 端到端验证

**目的：** 确保整个更新链路编译通过，逻辑正确。

- [ ] **Step 1: TypeScript 编译检查**

```bash
npx tsc --noEmit
```
Expected: 无类型错误。

- [ ] **Step 2: Vite 构建检查**

```bash
npx electron-vite build
```
Expected: 构建成功，`out/` 目录生成正确。

- [ ] **Step 3: 代码审查核对清单**

- [ ] `FORCE_UPDATE` 硬编码常量已从 `main.ts` 中删除
- [ ] `setupAutoUpdater` 函数已从 `main.ts` 中删除
- [ ] `ipcMain.handle('update:check/download/install')` 不再内联在 `main.ts` 中
- [ ] `autoUpdater.autoDownload = false`（现在由 `MainUpdater` 控制）
- [ ] `autoUpdater.autoInstallOnAppQuit = true`（保留兜底）
- [ ] 跳过版本数据持久化到 `updater-config.json`
- [ ] `UpdateCenter` 组件正确处理所有阶段（idle/available/downloading/downloaded/error）
- [ ] 非强制模式下显示"稍后"和"跳过此版本"按钮
- [ ] 强制模式下全屏不可关闭（ESC 拦截 + 遮罩不可点击）
- [ ] 更新说明（releaseNotes）正确展示/收起
- [ ] i18n 新键值完整

- [ ] **Step 4: Commit 最终整合**

```bash
git commit -m "feat: complete updater module refactoring with skip-version and release notes"
```

---

## 执行顺序建议

按以下顺序执行可确保每步完成后都能编译通过：

1. Task 1: UpdaterState (纯类型，无副作用)
2. Task 2: UpdateStore (纯逻辑，依赖 app.getPath)
3. Task 3: MainUpdater (依赖 UpdaterState + UpdateStore)
4. Task 4: Logger (独立)
5. Task 5: IPC Handlers (依赖 MainUpdater)
6. Task 6: updater/index.ts (依赖全部，但此时外部还不引用)
7. Task 7: 改造 main/index.ts (接入新模块)
8. Task 8: Preload (新增 API)
9. Task 9: 类型定义
10. Task 10-11: 渲染进程 + i18n (可并行)
11. Task 12: App.tsx 集成
12. Task 13: 验证

**关键点：** 在 Task 7 执行完成之前，应用仍然使用旧的 `setupAutoUpdater` 函数。Task 7 是"切换开关"——一旦完成，旧路径被切断，新路径生效。
