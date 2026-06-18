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
