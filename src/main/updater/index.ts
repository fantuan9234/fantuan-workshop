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
        // 无需推送，手动检查时由 IPC 返回
        break
      case UpdatePhase.Available:
        // 后台静默模式：不发送 available 事件给渲染进程（直接由 MainUpdater 下载）
        break
      case UpdatePhase.Downloading:
        // 后台静默模式：不发送进度事件给渲染进程（无弹窗显示）
        break
      case UpdatePhase.Downloaded:
        // 下载完成：通知渲染进程显示重启提示
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