import { useEffect, useState } from 'react'
import { useT, asString } from '../i18n'

/**
 * 更新中心 - 底部工具栏通知版本
 * ----------------------------------------------------------------
 * 显示更新状态：available → downloading(进度) → downloaded(重启)
 * 所有阶段都由主进程通过 IPC 主动推送
 */
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

export default function UpdateCenter(): JSX.Element | null {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [state, setState] = useState<UpdateState>(INITIAL_STATE)

  // 启动时拉取当前版本号 + 监听所有更新事件
  useEffect(() => {
    // 1. 拉取当前版本
    try {
      const fn = (window as any).electronAPI?.getAppVersion
      if (typeof fn === 'function') {
        fn().then((v: string) => {
          setState((prev) => ({ ...prev, currentVersion: v }))
        }).catch(() => { /* ignore */ })
      }
    } catch { /* ignore */ }

    if (!window.electronAPI) return

    // 2. 监听各阶段事件
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
      if (!progress) return
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

  const handleDownload = (): void => {
    window.electronAPI?.downloadUpdate()
  }

  const handleInstall = (): void => {
    window.electronAPI?.installUpdate()
  }

  const handleDismiss = (): void => {
    if (state.phase === 'error') {
      setState(INITIAL_STATE)
    }
  }

  const handleSkipVersion = (): void => {
    window.electronAPI?.skipVersion(state.version)
    setState(INITIAL_STATE)
  }

  // idle / checking / up-to-date 不显示
  if (state.phase === 'idle' || state.phase === 'checking' || state.phase === 'up-to-date') return null

  return (
    <div className="mt-2 px-2">
      {/* 可用更新 - 显示下载按钮 */}
      {state.phase === 'available' && (
        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <span className="text-xs font-medium text-blue-400">
              {ts('updater.latestVersion').replace('{{version}}', state.version || '')}
            </span>
          </div>
          <button
            onClick={handleDownload}
            className="w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            {ts('updater.downloadUpdate')}
          </button>
          <button
            onClick={handleSkipVersion}
            className="w-full mt-1 px-3 py-1 text-[10px] text-gray-400 hover:text-gray-300 transition-colors"
          >
            {ts('updater.skipVersion')}
          </button>
        </div>
      )}

      {/* 下载中 - 显示进度 */}
      {state.phase === 'downloading' && (
        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <span className="text-xs font-medium text-blue-400">
              {ts('updater.downloadingUpdate')} {Math.round(state.percent)}%
            </span>
          </div>
          <div className="w-full bg-gray-700/30 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.round(state.percent)}%` }}
            />
          </div>
        </div>
      )}

      {/* 下载完成 - 重启提示 */}
      {state.phase === 'downloaded' && (
        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-xs font-medium text-green-400">
              {ts('updater.downloadComplete')}
            </span>
          </div>
          <button
            onClick={handleInstall}
            className="w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-500 transition-colors"
          >
            {ts('updater.clickToRestart')}
          </button>
          {!state.force && (
            <button
              onClick={handleSkipVersion}
              className="w-full mt-1 px-3 py-1 text-[10px] text-gray-400 hover:text-gray-300 transition-colors"
            >
              {ts('updater.skipVersion')}
            </button>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {state.phase === 'error' && (
        <div className="p-2 rounded-lg bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <span className="text-xs font-medium text-red-400">
              {state.errorMessage || ts('updater.updateError')}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="w-full mt-2 px-3 py-1 text-[10px] text-gray-400 hover:text-gray-300 transition-colors"
          >
            {ts('common.dismiss')}
          </button>
        </div>
      )}
    </div>
  )
}
