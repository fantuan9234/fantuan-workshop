import { useEffect, useState } from 'react'
import { useT, asString } from '../i18n'

/** 在线公告数据格式 */
interface ChangelogData {
  latestVersion: string
  title: string
  date: string
  items: string[]
  footer?: string
}

/** 默认在线公告 URL（GitHub raw，用户在 settings 里可改） */
const DEFAULT_CHANGELOG_URL = 'https://raw.githubusercontent.com/fantuan9234/fantuan-workshop/main/src/renderer/public/changelog.json'

/** localStorage 里存的上次已读版本 */
const LS_KEY_SEEN = 'fantuan_changelog_seen'

export default function ChangelogModal(): JSX.Element | null {
  const t = useT()
  const ts = (k: string): string => asString(t, k)

  const [data, setData] = useState<ChangelogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchChangelog = async () => {
      try {
        setLoading(true)
        setError(false)

        const resp = await fetch(DEFAULT_CHANGELOG_URL, {
          // 5 秒超时，不阻塞启动
          signal: AbortSignal.timeout(5000),
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const json: ChangelogData = await resp.json()

        if (cancelled) return

        // 检查是否已读过这个版本
        const seenVersion = localStorage.getItem(LS_KEY_SEEN)
        if (seenVersion === json.latestVersion) {
          setData(null) // 已看过 → 不弹窗
        } else {
          setData(json)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchChangelog()
    return () => { cancelled = true }
  }, [])

  const handleDismiss = () => {
    if (data) {
      localStorage.setItem(LS_KEY_SEEN, data.latestVersion)
    }
    setDismissed(true)
  }

  // 不显示的场景
  if (dismissed || loading || error || !data) return null

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleDismiss() }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="themed-bg-card rounded-2xl w-[520px] max-w-[92vw] max-h-[85vh] shadow-2xl border themed-border-primary overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-6 pt-6 pb-3 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold themed-text-primary">{data.title}</h2>
            <p className="text-[11px] themed-text-dimmed mt-0.5">{data.date}</p>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="mx-6 border-t themed-border-secondary" />

        {/* 变更列表（可滚动） */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ul className="space-y-3">
            {data.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm themed-text-secondary leading-relaxed">
                <span className="themed-text-dimmed flex-shrink-0 mt-0.5 select-none">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 底部 */}
        {data.footer && (
          <div className="px-6 pb-2">
            <p className="text-[11px] themed-text-dimmed leading-relaxed">{data.footer}</p>
          </div>
        )}

        {/* 按钮区 */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t themed-border-secondary">
          <button
            onClick={handleDismiss}
            className="px-6 py-2 text-sm font-medium rounded-lg themed-btn-primary transition-colors"
            autoFocus
          >
            {ts('changelogModal.gotIt')}
          </button>
        </div>
      </div>
    </div>
  )
}
