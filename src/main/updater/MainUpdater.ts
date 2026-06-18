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

import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
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
