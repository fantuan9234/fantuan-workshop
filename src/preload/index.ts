import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  // 窗口控制
  windowMinimize: (): void => ipcRenderer.send('window:minimize'),
  windowMaximize: (): void => ipcRenderer.send('window:maximize'),
  windowClose: (): void => ipcRenderer.send('window:close'),
  selectGameDir: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  autoDetectGameDir: (): Promise<string | null> => ipcRenderer.invoke('game:autoDetect'),
  readGameFile: (filePath: string): Promise<string | null> => ipcRenderer.invoke('fs:readFile', filePath),
  /** 弹出保存对话框，返回选中的路径 */
  saveProjectDialog: (defaultName: string): Promise<string | null> => ipcRenderer.invoke('dialog:saveProject', defaultName),
  /** 弹出打开文件对话框，返回选中的路径 */
  openProjectDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openProject'),
  /** 写入文本到指定路径 */
  writeFile: (filePath: string, data: string): Promise<boolean> => ipcRenderer.invoke('fs:writeFile', filePath, data),
  /** 读取文本文件 */
  readTextFile: (filePath: string): Promise<string | null> => ipcRenderer.invoke('fs:readTextFile', filePath),
  /** 选择导出目录（传入已知游戏目录以定位 Mods 文件夹） */
  selectExportDir: (gameDir?: string): Promise<string | null> => ipcRenderer.invoke('dialog:selectExportDir', gameDir),
  /** 创建目录（递归） */
  mkdir: (dirPath: string): Promise<boolean> => ipcRenderer.invoke('fs:mkdir', dirPath),
  /** 写入二进制文件（从base64 dataURL） */
  writeBinaryFile: (filePath: string, dataUrl: string): Promise<boolean> => ipcRenderer.invoke('fs:writeBinaryFile', filePath, dataUrl),
  /** 获取临时目录 */
  getTempDir: (): Promise<string> => ipcRenderer.invoke('fs:getTempDir'),
  /** 打包文件夹为 .zip */
  packToZip: (sourceDir: string): Promise<{ zipPath?: string; error?: string } | null> => ipcRenderer.invoke('fs:packToZip', sourceDir),
  /** XNB 解包 Content 文件夹（使用 StardewXnbHack，forceRefresh 强制重新解包） */
  xnbUnpack: (gameContentDir: string, forceRefresh?: boolean): Promise<{ success: boolean; rootPath: string; tree: any[]; error?: string }> => ipcRenderer.invoke('xnb:unpack', gameContentDir, forceRefresh),
  /** 从游戏素材中选择地图文件 */
  xnbSelectMapFile: (): Promise<{ path: string; name: string; dataUrl: string } | null> => ipcRenderer.invoke('xnb:selectMapFile'),
  /** 列出游戏素材中的地图（解析 .tmx 文件） */
  xnbListMaps: (rootPath?: string): Promise<{ success: boolean; rootPath: string; maps: any[]; error?: string }> => ipcRenderer.invoke('xnb:listMaps', rootPath),
  /** 渲染地图为 PNG 图片（基于 .tmx 文件路径） */
  mapRender: (tmxPath: string, maxSize?: number): Promise<string | null> => ipcRenderer.invoke('map:render', tmxPath, maxSize),
  /** 读取子目录 */
  xnbReadDir: (dirPath: string): Promise<{ success: boolean; tree: any[] }> => ipcRenderer.invoke('xnb:readDir', dirPath),
  /** 读取文件内容（图片返回dataURL，文本返回字符串） */
  xnbReadFile: (filePath: string): Promise<string | null> => ipcRenderer.invoke('xnb:readFile', filePath),
  /** 选择地图覆盖文件并解析元数据 */
  mapSelectOverlayFile: (): Promise<{ filePath: string; fileName: string; width: number; height: number; tilewidth: number; tileheight: number; tilesheets: string[]; layerNames: string[] } | null> => ipcRenderer.invoke('map:selectOverlayFile'),
  /** 复制地图覆盖资源到模组目录 */
  mapCopyOverlayAsset: (tmxFilePath: string, destAssetsDir: string): Promise<{ success: boolean; copiedFiles: string[]; error?: string }> => ipcRenderer.invoke('map:copyOverlayAsset', tmxFilePath, destAssetsDir),
  /** 读取解包后的物品数据 */
  xnbListItems: (rootPath?: string): Promise<{ success: boolean; items: { id: string; name: string; displayName: string; description: string; type: string; category: number; price: number; texture: string; spriteIndex: number }[]; unpackedDir?: string; error?: string }> => ipcRenderer.invoke('xnb:listItems', rootPath),
  /** 读取解包后的事件数据 */
  xnbListEvents: (rootPath?: string): Promise<{ success: boolean; events: { id: string; map: string; season: string; time: string; key: string; script: string; npcIds: string[] }[]; unpackedDir?: string; error?: string }> => ipcRenderer.invoke('xnb:listEvents', rootPath),
  /** 读取物品贴图 */
  xnbReadItemImage: (unpackedDir: string, texture: string, spriteIndex: number): Promise<string | null> => ipcRenderer.invoke('xnb:readItemImage', unpackedDir, texture, spriteIndex),
  /** 批量加载物品贴图 */
  xnbBatchItemImages: (unpackedDir: string, items: { id: string; texture: string; spriteIndex: number }[]): Promise<Record<string, string>> => ipcRenderer.invoke('xnb:batchItemImages', unpackedDir, items),
  /** 选择图片文件并返回 data URL */
  selectImageFile: (): Promise<{ filePath: string; fileName: string; dataUrl: string } | null> => ipcRenderer.invoke('dialog:selectImageFile'),
  /** 批量读取拖放文件 */
  readDroppedFiles: (filePaths: string[]): Promise<Array<{ filePath: string; fileName: string; dataUrl: string; size: number }>> => ipcRenderer.invoke('fs:readDroppedFiles', filePaths),
  /** 一键复制模组到 Mods 文件夹 */
  gameInstallMod: (modDir: string): Promise<{ success: boolean; message?: string; error?: string; targetDir?: string }> => ipcRenderer.invoke('game:installMod', modDir),
  /** 读取 SMAPI 日志 */
  gameReadSmapiLog: (): Promise<{ success: boolean; lines: string[]; errors: string[]; error?: string; logPath?: string }> => ipcRenderer.invoke('game:readSmapiLog'),
  /** 读取原版NPC日程数据 */
  npcReadVanillaSchedule: (unpackedRoot: string, npcName: string): Promise<Record<string, string> | null> => ipcRenderer.invoke('npc:readVanillaSchedule', unpackedRoot, npcName),
  /** 读取原版NPC对话数据 */
  npcReadVanillaDialogue: (unpackedRoot: string, npcName: string, locale?: string): Promise<Record<string, string> | null> => ipcRenderer.invoke('npc:readVanillaDialogue', unpackedRoot, npcName, locale),
  /** 读取原版NPC礼物偏好数据 */
  npcReadVanillaGiftTastes: (unpackedRoot: string, npcName: string, locale?: string): Promise<string | null> => ipcRenderer.invoke('npc:readVanillaGiftTastes', unpackedRoot, npcName, locale),
  // 路径安全
  addAllowedPath: (dirPath: string): Promise<boolean> => ipcRenderer.invoke('app:addAllowedPath', dirPath),
  // 自动更新
  checkForUpdate: (): Promise<{ hasUpdate: boolean; version?: string; currentVersion?: string; error?: string }> => ipcRenderer.invoke('update:check'),
  downloadUpdate: (): Promise<boolean> => ipcRenderer.invoke('update:download'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('update:install'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string | null; releaseDate?: string; force: boolean }) => void): (() => void) => {
    const handler = (_event: any, info: { version: string; releaseNotes?: string | null; releaseDate?: string; force: boolean }): void => callback(info)
    ipcRenderer.on('update:available', handler)
    return () => { ipcRenderer.removeListener('update:available', handler) }
  },
  onUpdateProgress: (callback: (progress: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void): (() => void) => {
    const handler = (_event: any, progress: { percent: number; transferred: number; total: number; bytesPerSecond: number }): void => callback(progress)
    ipcRenderer.on('update:progress', handler)
    return () => { ipcRenderer.removeListener('update:progress', handler) }
  },
  onUpdateDownloaded: (callback: (info: { version: string; force: boolean }) => void): (() => void) => {
    const handler = (_event: any, info: { version: string; force: boolean }): void => callback(info)
    ipcRenderer.on('update:downloaded', handler)
    return () => { ipcRenderer.removeListener('update:downloaded', handler) }
  },
  onUpdateError: (callback: (info: { message: string }) => void): (() => void) => {
    const handler = (_event: any, info: { message: string }): void => callback(info)
    ipcRenderer.on('update:error', handler)
    return () => { ipcRenderer.removeListener('update:error', handler) }
  },
  // 日志
  getLogPath: (): Promise<string> => ipcRenderer.invoke('app:getLogPath'),
})

export {}
