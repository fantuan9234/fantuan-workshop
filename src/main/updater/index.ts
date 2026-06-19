/**
 * updater 模块入口
 * ----------------------------------------------------------------
 * 对外只暴露 initAutoUpdater(mainWindow)，封装：
 *   1. 创建 MainUpdater 实例
 *   2. 注册 IPC handlers
 *   3. 状态变更通过 IPC 推送给渲染进程
 *   4. 返回 destroy 函数，供窗口关闭时清理
 */

import { app, BrowserWindow } from 'electron'
import { MainUpdater, OnStateChange } from './MainUpdater'
import { initIpcHandlers } from './ipcHandlers'
import { UpdaterState, UpdatePhase } from './UpdaterState'
import log from './logger'

const GITHUB_OWNER = 'fantuan9234'
const GITHUB_REPO = 'fantuan-workshop'
const OPENLIST_URL = 'https://wp.svlmod.cn/d/SVL/SVL/fantuangongfang/update'
const OPENLIST_TOKEN = 'openlist-a1c1f182-dab5-442d-ac95-5b9be53a895anZaf43BVmqDWcvLIgxE29En3eTi9WpYkGODRrjK1hrezoRrXCzdV2w6GBatpcSur'
const CHECK_DELAY_MS = 5_000

export interface AutoUpdaterHandle {
  /** 手动检查更新 */
  checkForUpdates: () => ReturnType<MainUpdater['checkForUpdates']>
  /** 销毁清理 */
  destroy: () => void
}

export function initAutoUpdater(mainWindow: BrowserWindow, options?: { beforeInstall?: () => void }): AutoUpdaterHandle {
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
        mainWindow.webContents.send('update:checking')
        break
      case UpdatePhase.Available:
        mainWindow.webContents.send('update:available', {
          version: state.info?.version,
          releaseNotes: state.info?.releaseNotes ?? null,
          releaseDate: state.info?.releaseDate,
          force: state.info?.force ?? false,
        })
        break
      case UpdatePhase.Downloading:
        if (state.progress) {
          mainWindow.webContents.send('update:progress', {
            percent: state.progress.percent,
            transferred: state.progress.transferred,
            total: state.progress.total,
            bytesPerSecond: state.progress.bytesPerSecond,
          })
        }
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
      case UpdatePhase.Idle:
      case UpdatePhase.UpToDate:
      case UpdatePhase.Installing:
        // 无需推送
        break
    }
  }

  const updater = new MainUpdater(GITHUB_OWNER, GITHUB_REPO, {
    onStateChange,
    beforeInstall: options?.beforeInstall,
    openListUrl: OPENLIST_URL,
    openListToken: OPENLIST_TOKEN,
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