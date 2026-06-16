import { useNavigate, useLocation } from 'react-router-dom'
import { useT, asString } from '../i18n'

interface EditorHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  backPath?: string
  backLabel?: string
}

/** 路径 → 模块名映射 */
const pathModuleMap: Record<string, string> = {
  events: 'sidebar.events',
  maps: 'sidebar.maps',
  items: 'sidebar.items',
  npc: 'sidebar.npc',
  quests: 'sidebar.quests',
  mails: 'sidebar.mails',
}

export default function EditorHeader({ title, subtitle, icon, backPath, backLabel }: EditorHeaderProps): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()
  const ts = (k: string): string => asString(t, k)

  // 自动推断返回路径和标签
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const moduleName = pathSegments[0]
  const inferredBackPath = backPath || `/${moduleName}`
  const inferredBackLabel = backLabel || ts(pathModuleMap[moduleName] || moduleName)

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b themed-border-primary flex-shrink-0">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate(inferredBackPath)}
        className="w-8 h-8 rounded-lg themed-bg-card flex items-center justify-center themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors flex-shrink-0"
        title={inferredBackLabel}
        aria-label={ts('common.cancel')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* 面包屑 */}
      <div className="flex items-center gap-1.5 text-xs min-w-0">
        <button
          onClick={() => navigate(inferredBackPath)}
          className="themed-text-dimmed hover:themed-text-secondary transition-colors truncate"
        >
          {inferredBackLabel}
        </button>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="themed-text-disabled flex-shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="themed-text-primary font-medium truncate">{title}</span>
      </div>

      {/* 图标（可选） */}
      {icon && <div className="ml-auto flex-shrink-0">{icon}</div>}
    </div>
  )
}
