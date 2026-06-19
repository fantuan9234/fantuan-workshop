import { useEffect, useState, useCallback } from 'react'
import { useT, asString } from '../i18n'

/**
 * 更新中心 - 底部工具栏通知版本
 * ----------------------------------------------------------------
 * 显示更新状态：checking → available → downloading(进度) → downloaded(重启)
 *                    → error
 *
 * 改进：
 *   1. 挂载时主动调用 checkForUpdate() 触发检查，而非仅被动监听
 *   2. 监听 checking 状态，显示"正在检查…"提示
 *   3. 空闲时显示"检查更新"按钮，用户可以手动触发
 *   4. 检查失败显示错误 + 重试按钮
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

  // 手动触发检查更新
  const handleCheckUpdate = useCallback((): void => {
    setState((prev) => ({ ...prev, phase: 'checking', errorMessage: '' }))
    window.electronAPI?.checkForUpdate().then((result) => {
      // 如果主进程没有通过 IPC 推送状态（例如 dev 模式），这里手动处理结果
      setState((prev) => {
        // 只在仍处于 checking 状态时才处理，避免覆盖后续的 IPC 推送
        if (prev.phase !== 'checking') return prev
        if (result.error) {
          return { ...prev, phase: 'error', errorMessage: result.error }
        }
        if (result.hasUpdate && result.version) {
          return {
            ...prev,
            phase: 'available',
            version: result.version,
            force: false,
            releaseNotes: '',
            percent: 0,
            transferred: 0,
            total: 0,
            errorMessage: '',
          }
        }
        // 已是最新：短暂显示后回到 idle
        return { ...prev, phase: 'idle' }
      })
    }).catch((err) => {
      setState((prev) => {
        if (prev.phase !== 'checking') return prev
        return { ...prev, phase: 'error', errorMessage: err?.message || String(err) }
      })
    })
  }, [])

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

    // 2. 监听 checking 事件
    const offChecking = window.electronAPI.onUpdateChecking(() => {
      setState((prev) => ({
        ...prev,
        phase: 'checking',
        errorMessage: '',
        percent: 0,
        transferred: 0,
        total: 0,
      }))
    })

    // 3. 监听各阶段事件
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

    // 4. 挂载时主动触发一次检查更新
    //    使用 setTimeout 避免在 React 渲染阶段发起异步 IPC
    const timer = setTimeout(() => {
      handleCheckUpdate()
    }, 1000)

    return () => {
      clearTimeout(timer)
      offChecking?.()
      offAvailable?.()
      offProgress?.()
      offDownloaded?.()
      offError?.()
    }
  }, [handleCheckUpdate])

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

  // ---- 渲染逻辑 ----

  // 正在检查更新：显示小菊花 + 文字提示
  if (state.phase === 'checking') {
    return (
      <div className="mt-2 px-2">
        <div className="p-2 rounded-lg themed-bg-elevated border themed-border-secondary">
          <div className="flex items-center gap-2">
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-xs themed-text-secondary">{ts('updater.checking')}</span>
          </div>
        </div>
      </div>
    )
  }

  // 空闲状态：显示一个小巧的"检查更新"按钮（始终可见，方便手动触发）
  if (state.phase === 'idle' || state.phase === 'up-to-date') {
    return (
      <div className="mt-2 px-2">
        <button
          onClick={handleCheckUpdate}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg themed-text-secondary hover:themed-text-primary themed-bg-hover transition-all text-xs justify-center xl:justify-start"
          aria-label={ts('updater.checkUpdate')}
          title={ts('updater.checkUpdate')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span className="hidden xl:inline">{ts('updater.checkUpdate')}</span>
        </button>
      </div>
    )
  }

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
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCheckUpdate}
              className="flex-1 px-3 py-1 text-[10px] font-medium rounded-md bg-red-600/30 text-red-300 hover:bg-red-600/50 transition-colors"
            >
              {ts('updater.retry')}
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 px-3 py-1 text-[10px] text-gray-400 hover:text-gray-300 transition-colors"
            >
              {ts('updater.later')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
