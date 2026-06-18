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