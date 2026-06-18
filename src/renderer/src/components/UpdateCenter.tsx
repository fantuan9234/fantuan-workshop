import { useEffect, useState } from 'react'
import { useT, asString } from '../i18n'

/**
 * 更新中心 - 底部工具栏通知版本
 * ----------------------------------------------------------------
 * 后台静默下载更新，完成后在底部工具栏显示重启提示
 * 无弹窗、无进度条，仅在下载完成后显示可点击的重启按钮
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
    // 1. 拉取当前版本（容错：preload 未就绪或方法缺失时静默忽略）
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

  const handleInstall = (): void => {
    window.electronAPI?.installUpdate()
  }

  const handleDismiss = (): void => {
    setState(INITIAL_STATE)
  }

  const handleSkipVersion = (): void => {
    window.electronAPI?.skipVersion(state.version)
    setState(INITIAL_STATE)
  }

  // 仅在 downloaded 阶段显示重启提示
  if (state.phase !== 'downloaded') return null

  return (
    <div className="mt-2 px-2">
      {/* 下载完成 - 重启提示 */}
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
    </div>
  )
}
