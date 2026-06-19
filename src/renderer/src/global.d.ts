/** 全局 electronAPI 类型声明（由 src/preload/index.ts 注入） */
export {};

declare global {
  interface ElectronAPI {
    platform: NodeJS.Platform
    // 窗口控制
    windowMinimize: () => void
    windowMaximize: () => void
    windowClose: () => void
    // 通知主进程当前是否有未保存更改（用于关闭窗口前的提示）
    setUnsavedChanges: (unsaved: boolean) => void
    // 文件系统
    selectGameDir: () => Promise<string | null>
    autoDetectGameDir: () => Promise<string | null>
    readGameFile: (filePath: string) => Promise<string | null>
    saveProjectDialog: (defaultName: string) => Promise<string | null>
    openProjectDialog: () => Promise<string | null>
    writeFile: (filePath: string, data: string) => Promise<boolean>
    readTextFile: (filePath: string) => Promise<string | null>
    selectExportDir: (gameDir?: string) => Promise<string | null>
    mkdir: (dirPath: string) => Promise<boolean>
    writeBinaryFile: (filePath: string, dataUrl: string) => Promise<boolean>
    getTempDir: () => Promise<string>
    packToZip: (sourceDir: string) => Promise<{ zipPath?: string; error?: string } | null>
    // XNB 解包
    xnbUnpack: (gameContentDir: string, forceRefresh?: boolean) => Promise<{
      success: boolean
      rootPath: string
      tree: any[]
      error?: string
    }>
    xnbSelectMapFile: () => Promise<{ path: string; name: string; dataUrl: string } | null>
    xnbListMaps: (rootPath?: string) => Promise<{
      success: boolean
      rootPath: string
      maps: any[]
      error?: string
    }>
    mapRender: (tmxPath: string, maxSize?: number) => Promise<string | null>
    xnbReadDir: (dirPath: string) => Promise<{ success: boolean; tree: any[] }>
    xnbReadFile: (filePath: string) => Promise<string | null>
    mapSelectOverlayFile: () => Promise<{
      filePath: string
      fileName: string
      width: number
      height: number
      tilewidth: number
      tileheight: number
      tilesheets: string[]
      layerNames: string[]
    } | null>
    mapCopyOverlayAsset: (tmxFilePath: string, destAssetsDir: string) => Promise<{
      success: boolean
      copiedFiles: string[]
      error?: string
    }>
    // 物品
    xnbListItems: (rootPath?: string) => Promise<{
      success: boolean
      items: {
        id: string
        name: string
        displayName: string
        description: string
        type: string
        category: number
        price: number
        texture: string
        spriteIndex: number
      }[]
      unpackedDir?: string
      error?: string
    }>
    // 事件
    xnbListEvents: (rootPath?: string) => Promise<{
      success: boolean
      events: {
        id: string
        map: string
        season: string
        time: string
        key: string
        script: string
        npcIds: string[]
      }[]
      unpackedDir?: string
      error?: string
    }>
    xnbReadItemImage: (unpackedDir: string, texture: string, spriteIndex: number) => Promise<string | null>
    xnbBatchItemImages: (
      unpackedDir: string,
      items: { id: string; texture: string; spriteIndex: number }[]
    ) => Promise<Record<string, string>>
    // 图片选择
    selectImageFile: () => Promise<{ filePath: string; fileName: string; dataUrl: string } | null>
    readDroppedFiles: (filePaths: string[]) => Promise<
      Array<{ filePath: string; fileName: string; dataUrl: string; size: number }>
    >
    // 模组安装
    gameInstallMod: (modDir: string) => Promise<{
      success: boolean
      message?: string
      error?: string
      targetDir?: string
    }>
    gameReadSmapiLog: () => Promise<{
      success: boolean
      lines: string[]
      errors: string[]
      error?: string
      logPath?: string
    }>
    // 路径安全
    addAllowedPath: (dirPath: string) => Promise<boolean>
    // 自动更新
    checkForUpdate: () => Promise<{ hasUpdate: boolean; version?: string; currentVersion?: string; error?: string }>
    downloadUpdate: () => Promise<boolean>
    installUpdate: () => Promise<void>
    getAppVersion: () => Promise<string>
    skipVersion: (version: string) => void
    getUpdatePreferences: () => Promise<{ autoDownload: boolean; lastCheckTimestamp: number | null }>
    setUpdatePreferences: (prefs: { autoDownload?: boolean }) => Promise<{ autoDownload: boolean; lastCheckTimestamp: number | null }>
    onUpdateChecking: (callback: () => void) => () => void
    onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string | null; releaseDate?: string; force?: boolean }) => void) => () => void
    onUpdateProgress: (callback: (progress: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => () => void
    onUpdateDownloaded: (callback: (info: { version: string; force: boolean }) => void) => () => void
    onUpdateError: (callback: (info: { message: string }) => void) => () => void
    // 日志
    getLogPath: () => Promise<string>
    // 文件系统操作（用于自动备份）
    readdir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean; isFile: boolean }[] | null>
    unlink: (filePath: string) => Promise<boolean>
    // 原版 NPC 数据读取
    npcReadVanillaSchedule: (unpackedRoot: string | null, npcName: string) => Promise<Record<string, string> | null>
    npcReadVanillaDialogue: (unpackedRoot: string | null, npcName: string, locale?: string) => Promise<Record<string, string> | null>
    npcReadVanillaGiftTastes: (unpackedRoot: string | null, npcName: string, locale?: string) => Promise<{ npcData: string; universal: Record<string, string> } | null>
  }

  interface Window {
    electronAPI?: ElectronAPI
  }
}
