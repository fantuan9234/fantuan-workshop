import { useEffect, useState } from 'react'
import { useT, asString } from '../i18n'

/**
 * 强制更新全屏弹窗
 * ----------------------------------------------------------------
 * 状态机：
 *   idle        - 无更新
 *   available   - 已发现新版本，准备下载
 *   downloading - 正在下载
 *   downloaded  - 下载完成，等待用户重启
 *   error       - 更新出错
 *
 * 设计要求：
 *   1. 全屏覆盖（z-index: 99999）— 阻止用户操作主界面
 *   2. 不可关闭：无 X 按钮、无遮罩点击关闭、无 ESC 关闭
 *   3. 强制模式（force=true）下只有"立即重启"按钮
 *   4. 非强制模式下才有"稍后"按钮（保留兼容，目前默认 force=true）
 *   5. 实时显示下载进度（百分比/已下载/速度）
 */
type UpdatePhase = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error'

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
}

const INITIAL_STATE: UpdateState = {
  phase: 'idle',
  version: '',
  currentVersion: '',
  percent: 0,
  transferred: 0,
  total: 0,
  bytesPerSecond: 0,
  force: true,
  errorMessage: '',
}

/** 把字节数格式化为人类可读 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** 注入到主进程 IPC 通道的格式化模板 */
function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`))
}

export default function ForceUpdateModal(): JSX.Element | null {
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
        force: info.force ?? true,
        percent: 0,
        transferred: 0,
        total: 0,
        errorMessage: '',
      }))
    })

    const offProgress = window.electronAPI.onUpdateProgress((progress) => {
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
        force: info.force ?? true,
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

  // 强制模式下禁用 ESC 和遮罩点击
  useEffect(() => {
    if (state.phase === 'idle') return
    const handler = (e: KeyboardEvent): void => {
      // 阻断 ESC / F5 / Ctrl+W 等可能关闭窗口的快捷键
      if (e.key === 'Escape' || e.key === 'F5' || (e.ctrlKey && e.key === 'w')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [state.phase])

  if (state.phase === 'idle') return null

  // 根据阶段决定标题/描述/按钮
  let title = ''
  let description = ''
  let showProgress = false
  let showInstallButton = false
  let showRetryButton = false
  let showLaterButton = false

  switch (state.phase) {
    case 'available':
      title = ts('updater.newVersionAvailable')
      description = renderTemplate(ts('updater.newVersionDesc'), {
        version: state.version,
        current: state.currentVersion,
      })
      // 强制模式下不显示"稍后"按钮
      showLaterButton = !state.force
      break
    case 'downloading':
      title = ts('updater.downloadingUpdate')
      description = ts('updater.downloadingHint')
      showProgress = true
      break
    case 'downloaded':
      title = ts('updater.updateReady')
      description = state.force ? ts('updater.forceHint') : ''
      showInstallButton = true
      break
    case 'error':
      title = ts('updater.updateError')
      description = state.errorMessage || ts('updater.errorHint')
      showRetryButton = !state.force
      break
  }

  const handleInstall = (): void => {
    window.electronAPI?.installUpdate()
  }

  const handleLater = (): void => {
    // 强制模式下不应到达这里；非强制模式则关闭弹窗
    setState(INITIAL_STATE)
  }

  const handleRetry = async (): Promise<void> => {
    setState((prev) => ({ ...prev, phase: 'available', errorMessage: '' }))
    await window.electronAPI?.checkForUpdate().catch(() => { /* ignore */ })
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      // 强制模式下禁止点击遮罩关闭
      onClick={state.force ? undefined : (e) => { if (e.target === e.currentTarget) handleLater() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
    >
      <div
        className="themed-bg-card rounded-2xl w-[480px] max-w-[92vw] shadow-2xl border themed-border-primary overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部图标 + 标题 */}
        <div className="px-6 pt-6 pb-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            {state.phase === 'error' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : state.phase === 'downloaded' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" className={state.phase === 'downloading' ? 'animate-spin' : ''}>
                <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="force-update-title" className="text-base font-bold themed-text-primary">
              {title}
            </h2>
            <p className="text-xs themed-text-muted mt-1">{description}</p>
          </div>
        </div>

        {/* 进度条（仅下载中显示） */}
        {showProgress && (
          <div className="px-6 pb-4">
            <div className="h-2 themed-bg-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, state.percent))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] themed-text-muted mt-2">
              <span>{renderTemplate(ts('updater.percentComplete'), { percent: state.percent.toFixed(1) })}</span>
              <span>
                {formatBytes(state.transferred)} / {formatBytes(state.total)}
                {state.bytesPerSecond > 0 && (
                  <span className="ml-2">
                    · {renderTemplate(ts('updater.speed'), { speed: formatBytes(state.bytesPerSecond) })}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* 强制提示（仅强制模式 + 等待重启阶段） */}
        {state.force && state.phase === 'downloaded' && (
          <div className="mx-6 mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            {ts('updater.forceHint')}
          </div>
        )}

        {/* 按钮区 */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t themed-border-secondary">
          {showLaterButton && (
            <button
              onClick={handleLater}
              className="px-4 py-1.5 text-xs rounded-lg themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors"
            >
              {ts('updater.later')}
            </button>
          )}
          {showRetryButton && (
            <button
              onClick={handleRetry}
              className="px-4 py-1.5 text-xs rounded-lg themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors"
            >
              {ts('updater.retry')}
            </button>
          )}
          {showInstallButton && (
            <button
              onClick={handleInstall}
              className="px-5 py-1.5 text-xs rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              autoFocus
            >
              {ts('updater.installNow')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
