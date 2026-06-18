import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT, asString } from '../i18n'
import { useProject } from '../data/ProjectContext'

export default function WelcomePage(): JSX.Element {
  const navigate = useNavigate()
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const { openProject } = useProject()
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('fantuan-welcome-dismissed')
  })

  const dismissWelcome = () => {
    localStorage.setItem('fantuan-welcome-dismissed', 'true')
    setShowWelcome(false)
  }

  if (!showWelcome) return <></>

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center themed-bg-content">
      <div className="max-w-lg w-full mx-4">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl themed-bg-card mx-auto mb-4 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="themed-text-primary">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold themed-text-primary">{ts('welcome.title')}</h1>
          <p className="text-base themed-text-muted mt-2">{ts('welcome.subtitle')}</p>
        </div>

        {/* 操作卡片 */}
        <div className="space-y-3 mb-8">
          <button onClick={() => { dismissWelcome(); navigate('/about') }}
            className="w-full themed-bg-card border themed-border-secondary rounded-xl p-5 flex items-center gap-4 hover:themed-bg-hover transition-colors text-left">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-base font-semibold themed-text-primary">{ts('welcome.about')}</div>
              <div className="text-sm themed-text-dimmed mt-0.5">{ts('welcome.aboutDesc')}</div>
            </div>
            <svg className="themed-text-disabled" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        {/* 快速操作 */}
        <div className="themed-bg-card border themed-border-secondary rounded-xl p-5">
          <h3 className="text-sm font-semibold themed-text-dimmed uppercase tracking-wider mb-4">{ts('welcome.quickStart')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { dismissWelcome(); window.location.hash = '#/'; window.location.reload() }}
              className="p-4 rounded-lg themed-bg-hover transition-colors text-center">
              <svg className="mx-auto mb-2 themed-text-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <div className="text-sm font-medium themed-text-primary">{ts('welcome.newProject')}</div>
            </button>
            <button onClick={() => { dismissWelcome(); openProject() }}
              className="p-4 rounded-lg themed-bg-hover transition-colors text-center">
              <svg className="mx-auto mb-2 themed-text-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
              <div className="text-sm font-medium themed-text-primary">{ts('welcome.openProject')}</div>
            </button>
          </div>
        </div>

        {/* 跳过按钮 */}
        <div className="text-center mt-6">
          <button onClick={dismissWelcome}
            className="text-sm themed-text-dimmed hover:themed-text-muted transition-colors">
            {ts('welcome.skip')}
          </button>
        </div>
      </div>
    </div>
  )
}