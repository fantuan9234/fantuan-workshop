/**
 * 饭团工坊发布工具 - 预加载脚本
 *
 * 通过 contextBridge 安全地暴露 IPC 接口给渲染层
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // 配置管理
  config: {
    load: () => ipcRenderer.invoke('config:load'),
    save: (config) => ipcRenderer.invoke('config:save', config),
  },

  // 对话框
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },

  // 版本号
  version: {
    read: (projectPath) => ipcRenderer.invoke('version:read', projectPath),
  },

  // 发布
  publish: {
    run: (params) => ipcRenderer.invoke('publish:run', params),
    onLog: (callback) => {
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('publish:log', handler)
      return () => ipcRenderer.removeListener('publish:log', handler)
    },
    onProgress: (callback) => {
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('publish:progress', handler)
      return () => ipcRenderer.removeListener('publish:progress', handler)
    },
  },
})
