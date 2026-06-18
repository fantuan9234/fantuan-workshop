import { useEffect, useState } from 'react'
import { useT, asString } from '../i18n'

/**
 * 更新中心
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
 *   2. 强制模式：无 X 按钮、无遮罩点击关闭、ESC 拦截
 *   3. 非强制模式：稍后/跳过此版本/遮罩点击关闭
 *   4. 实时显示下载进度（百分比/已下载/速度）
 *   5. 可展示更新说明（release notes）
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

export default function UpdateCenter(): JSX.Element | null {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [state, setState] = useState<UpdateState>(INITIAL_STATE)
  const [showNotes, setShowNotes] = useState(false)

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

  // 强制模式下禁用 ESC 和遮罩点击
  useEffect(() => {
    if (state.phase === 'idle' || state.phase === 'up-to-date') return
    const handler = (e: KeyboardEvent): void => {
      // 强制模式下阻断 ESC / F5 / Ctrl+W 等可能关闭窗口的快捷键
      if (state.force && (e.key === 'Escape' || e.key === 'F5' || (e.ctrlKey && e.key === 'w'))) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [state.phase, state.force])

  // 后台静默下载：仅当下载完成或出错时才展示 UI，其余阶段全部隐藏
  if (state.phase !== 'downloaded' && state.phase !== 'error') return null

  const handleInstall = (): void => {
    window.electronAPI?.installUpdate()
  }

  const handleLater = (): void => {
    // 非强制模式下关闭弹窗
    setState(INITIAL_STATE)
  }

  const handleSkipVersion = (): void => {
    window.electronAPI?.skipVersion(state.version)
    setState(INITIAL_STATE)
  }

  const handleRetry = async (): Promise<void> => {
    setState((prev) => ({ ...prev, phase: 'available', errorMessage: '' }))
    const result = await window.electronAPI?.checkForUpdate().catch(() => undefined)
    if (result?.hasUpdate) {
      // 如果有更新，开始下载
      await window.electronAPI?.downloadUpdate()
    }
  }

  // 根据阶段决定标题/描述
  const getTitle = (): string => {
    switch (state.phase) {
      case 'checking': return ts('updater.checking')
      case 'available': return ts('updater.newVersionAvailable')
      case 'downloading': return ts('updater.downloadingUpdate')
      case 'downloaded': return ts('updater.updateReady')
      case 'error': return ts('updater.updateError')
      default: return ''
    }
  }

  const getDescription = (): string => {
    switch (state.phase) {
      case 'available':
        return renderTemplate(ts('updater.newVersionDesc'), {
          version: state.version,
          current: state.currentVersion,
        })
      case 'downloading':
        return ts('updater.downloadingHint')
      case 'downloaded':
        return state.force ? ts('updater.forceHint') : ''
      case 'error':
        return state.errorMessage || ts('updater.errorHint')
      default:
        return ''
    }
  }

  /** 简易 Markdown 行渲染（标题/列表） */
  const renderReleaseNotes = (): JSX.Element | null => {
    if (!state.releaseNotes) return null
    const lines = state.releaseNotes.split('\n').filter((l) => l.trim())
    return (
      <div className="mt-3 px-4 py-3 rounded-lg themed-bg-hover max-h-[200px] overflow-y-auto text-sm themed-text-secondary space-y-1">
        {lines.map((line, i) => {
          if (line.startsWith('## ')) {
            return <h4 key={i} className="font-bold text-base themed-text-primary mt-2 first:mt-0">{line.replace(/^##\s*/, '')}</h4>
          }
          if (line.startsWith('- ')) {
            return <li key={i} className="list-disc list-inside ml-1">{line.replace(/^-\s*/, '')}</li>
          }
          if (line.startsWith('* ')) {
            return <li key={i} className="list-disc list-inside ml-1">{line.replace(/^\*\s*/, '')}</li>
          }
          return <p key={i}>{line}</p>
        })}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      // 强制模式下禁止点击遮罩关闭；非强制模式下点击遮罩关闭
      onClick={state.force ? undefined : (e) => { if (e.target === e.currentTarget) handleLater() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-center-title"
    >
      <div
        className="themed-bg-card rounded-2xl w-[520px] max-w-[92vw] shadow-2xl border themed-border-primary overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部图标 + 标题 */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            {state.phase === 'error' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : state.phase === 'downloaded' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" className={state.phase === 'downloading' ? 'animate-spin' : ''}>
                <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="update-center-title" className="text-lg font-bold themed-text-primary">
              {getTitle()}
            </h2>
            <p className="text-sm themed-text-muted mt-1">{getDescription()}</p>
            {/* 更新说明（仅在 available 阶段展示） */}
            {state.phase === 'available' && state.releaseNotes && (
              <>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-sm text-blue-400 hover:text-blue-300 mt-1 focus:outline-none"
                >
                  {showNotes ? ts('updater.hideReleaseNotes') : ts('updater.viewReleaseNotes')}
                </button>
                {showNotes && renderReleaseNotes()}
              </>
            )}
          </div>
        </div>

        {/* 进度条（仅下载中显示） */}
        {state.phase === 'downloading' && (
          <div className="px-6 pb-4">
            <div className="h-2 themed-bg-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, state.percent))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm themed-text-muted mt-2">
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
        {state.phase === 'downloaded' && state.force && (
          <div className="mx-6 mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
            {ts('updater.forceHint')}
          </div>
        )}

        {/* 按钮区 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t themed-border-secondary">
          {/* available 阶段：非强制显示 稍后 / 跳过 / 下载；强制只显示下载 */}
          {state.phase === 'available' && (
            <>
              {!state.force && (
                <>
                  <button
                    onClick={handleLater}
                    className="px-4 py-1.5 text-sm rounded-lg themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors"
                  >
                    {ts('updater.later')}
                  </button>
                  <button
                    onClick={handleSkipVersion}
                    className="px-4 py-1.5 text-sm rounded-lg themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors"
                  >
                    {ts('updater.skipVersion')}
                  </button>
                </>
              )}
              <button
                onClick={() => window.electronAPI?.downloadUpdate()}
                className="px-5 py-1.5 text-sm rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                autoFocus
              >
                {ts('updater.downloadNow')}
              </button>
            </>
          )}

          {/* downloaded 阶段：始终显示立即安装 */}
          {state.phase === 'downloaded' && (
            <button
              onClick={handleInstall}
              className="px-5 py-1.5 text-sm rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              autoFocus
            >
              {ts('updater.installNow')}
            </button>
          )}

          {/* error 阶段：非强制可关闭；可重试 */}
          {state.phase === 'error' && (
            <>
              {!state.force && (
                <button
                  onClick={handleLater}
                  className="px-4 py-1.5 text-sm rounded-lg themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors"
                >
                  {ts('updater.close')}
                </button>
              )}
              <button
                onClick={handleRetry}
                className="px-5 py-1.5 text-sm rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                autoFocus
              >
                {ts('updater.retry')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
