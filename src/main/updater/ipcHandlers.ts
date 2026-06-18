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
 *   app:getVersion         — 获取当前应用版本
 */

import { ipcMain, app } from 'electron'
import { MainUpdater } from './MainUpdater'
import * as UpdateStore from './UpdateStore'
import { UpdatePreferences } from './UpdaterState'

/** 收集清理函数，便于注销 */
type CleanupFn = () => void

export function initIpcHandlers(mainUpdater: MainUpdater): CleanupFn {
  const channelNames: string[] = []

  const registerHandler = (channel: string, handler: (...args: any[]) => any): void => {
    ipcMain.handle(channel, handler)
    channelNames.push(channel)
  }

  registerHandler('update:check', async () => {
    return await mainUpdater.checkForUpdates()
  })

  registerHandler('update:download', async () => {
    return await mainUpdater.downloadUpdate()
  })

  registerHandler('update:install', () => {
    mainUpdater.installUpdate()
  })

  registerHandler('update:skipVersion', (_event: any, version: string) => {
    mainUpdater.skipVersion(version)
  })

  registerHandler('update:getPreferences', () => {
    return UpdateStore.getPreferences()
  })

  registerHandler('update:setPreferences', (_event: any, prefs: Partial<UpdatePreferences>) => {
    return UpdateStore.setPreferences(prefs)
  })

  registerHandler('app:getVersion', () => {
    return app.getVersion()
  })

  return () => {
    channelNames.forEach((channel) => {
      ipcMain.removeHandler(channel)
    })
  }
}
