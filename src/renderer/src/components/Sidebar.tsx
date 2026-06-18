import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useT, asString } from '../i18n'
import iconImg from '../assets/icon.png'
import UpdateCenter from './UpdateCenter'

interface MenuItem {
  path: string
  labelKey: string
  icon: JSX.Element
}

const menuItems: MenuItem[] = [
  {
    path: '/',
    labelKey: 'sidebar.project',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  },
  {
    path: '/events',
    labelKey: 'sidebar.events',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <polyline points="8 14 10 16 13 13" />
        <polyline points="16 14 14 16 11 13" />
      </svg>
    )
  },
  {
    path: '/maps',
    labelKey: 'sidebar.maps',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    )
  },
  {
    path: '/items',
    labelKey: 'sidebar.items',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  },
  {
    path: '/npc',
    labelKey: 'sidebar.npc',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  },
  {
    path: '/quests',
    labelKey: 'sidebar.quests',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    )
  },
  {
    path: '/mails',
    labelKey: 'sidebar.mails',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    )
  },
  {
    path: '/assets',
    labelKey: 'sidebar.assets',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    path: '/mod-settings',
    labelKey: 'sidebar.modSettings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    )
  },
  {
    path: '/export',
    labelKey: 'sidebar.export',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    )
  },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-base transition-colors justify-center xl:justify-start xl:px-3 ${
    isActive
      ? 'themed-bg-card themed-text-primary'
      : 'themed-text-muted hover:themed-text-secondary themed-bg-hover'
  }`

export default function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  // 动态获取应用版本号（避免硬编码）
  const [appVersion, setAppVersion] = useState('0.0.0')
  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((v) => setAppVersion(v)).catch(() => {})
    }
  }, [])
  return (
    <aside role="navigation" aria-label={ts('sidebar.mainNav')} className="w-[64px] min-w-[64px] xl:w-[220px] xl:min-w-[220px] themed-bg-sidebar flex flex-col select-none transition-all">
      {/* 品牌区 */}
      <div className="py-4 flex justify-center xl:justify-start xl:px-4">
        {/* 折叠态：只显示图标 */}
        <div className="w-7 h-7 xl:hidden rounded-md overflow-hidden flex items-center justify-center themed-bg-elevated">
          <img src={iconImg} alt="icon" className="w-full h-full object-contain" draggable={false} />
        </div>
        {/* 展开态：图标 + 文字 */}
        <div className="hidden xl:flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center themed-bg-elevated">
            <img src={iconImg} alt="icon" className="w-full h-full object-contain" draggable={false} />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-[0.15em] themed-text-primary leading-tight">饭团工坊</span>
            <span className="text-xs themed-text-dimmed leading-tight">v{appVersion}</span>
          </div>
        </div>
      </div>

      {/* 菜单 */}
      <nav className="flex-1 flex flex-col gap-0.5">
        {menuItems.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClass} aria-label={ts(item.labelKey)}>
            <span className="flex-shrink-0 opacity-70">{item.icon}</span>
            <span className="hidden xl:inline">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      {/* 底部设置区 */}
      <div className="border-t themed-border-secondary p-2 flex flex-col gap-1">
        <NavLink to="/about">
          {({ isActive }) => (
            <div aria-label={ts('sidebar.about')} className={`group flex items-center gap-3 w-full px-2 xl:px-3 py-2.5 rounded-lg transition-all justify-center xl:justify-start cursor-pointer ${
              isActive
                ? 'themed-bg-active themed-text-primary'
                : 'themed-text-secondary hover:themed-text-primary themed-bg-hover'
            }`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                isActive
                  ? 'bg-[#07c160]/15 text-[#07c160]'
                  : 'bg-white/5 text-gray-300 group-hover:bg-white/10'
              }`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <span className="hidden xl:inline text-[15px] font-medium">{ts('sidebar.about')}</span>
            </div>
          )}
        </NavLink>
        <button onClick={onOpenSettings} aria-label={ts('sidebar.settings')} className="group flex items-center gap-3 w-full px-2 xl:px-3 py-2.5 rounded-lg themed-text-secondary hover:themed-text-primary themed-bg-hover transition-all justify-center xl:justify-start">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/5 text-gray-300 group-hover:bg-white/10 group-hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <span className="hidden xl:inline text-[15px] font-medium">{ts('sidebar.settings')}</span>
        </button>

        {/* GitHub 仓库入口（外链跳转） */}
        <a
          href="https://github.com/fantuan9234/fantuan-workshop"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="group flex items-center gap-3 w-full px-2 xl:px-3 py-2.5 rounded-lg themed-text-secondary hover:themed-text-primary themed-bg-hover transition-all justify-center xl:justify-start"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/5 text-gray-300 group-hover:bg-white/10 group-hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </div>
          <span className="hidden xl:inline text-[15px] font-medium">GitHub</span>
        </a>
      </div>

      {/* 更新通知区（后台静默下载完成后显示重启提示） */}
      <UpdateCenter />
    </aside>
  )
}
