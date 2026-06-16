import { useState } from 'react'
import { useNpcAssets } from '../data/useNpcAssets'
import { useSettings, type ThemeMode, type Locale } from '../data/useSettings'
import { useT, asString } from '../i18n'

interface Props {
  onClose: () => void
}

export default function SettingsModal({ onClose }: Props): JSX.Element {
  const { gameDir, setGameDir } = useNpcAssets()
  const { theme, setTheme, locale, setLocale } = useSettings()
  const [detecting, setDetecting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const t = useT()
  /** 把 t() 收窄为 string */
  const ts = (k: string): string => asString(t, k)

  const handleAutoDetect = async () => {
    setDetecting(true)
    setStatusMsg(ts('settings.detecting'))
    try {
      const dir = await window.electronAPI?.autoDetectGameDir?.()
      if (dir) {
        setGameDir(dir)
        setStatusMsg(ts('settings.detectSuccess'))
        setTimeout(() => setStatusMsg(''), 1500)
      } else {
        setStatusMsg(ts('settings.gameNotFound'))
      }
    } catch {
      setStatusMsg(ts('settings.detectError'))
    }
    setDetecting(false)
  }

  const handleManualSelect = async () => {
    const dir = await window.electronAPI?.selectGameDir?.()
    if (dir) {
      setGameDir(dir)
      setStatusMsg(ts('settings.pathUpdated'))
      setTimeout(() => setStatusMsg(''), 1500)
    }
  }

  const handleClear = () => {
    setGameDir(null)
    setStatusMsg(ts('settings.cleared'))
    setTimeout(() => setStatusMsg(''), 1500)
  }

  const isDark = theme === 'dark'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="rounded-xl w-[460px] shadow-2xl border themed-bg-secondary themed-border-primary" onClick={e => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b themed-border-primary">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <h2 className={`text-sm font-bold themed-text-primary`}>{ts('settings.title')}</h2>
          </div>
          <button onClick={onClose} className={`themed-text-secondary hover:text-current p-1`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-5">
          {/* ===== 外观设置 ===== */}
          <div>
            <label className={`text-[11px] themed-text-secondary block mb-3 font-medium`}>{ts('settings.appearance')}</label>
            <div className="space-y-3">
              {/* 主题切换 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isDark ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="themed-text-secondary">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="themed-text-secondary">
                      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                  )}
                  <span className={`text-xs themed-text-primary`}>{ts('settings.theme')}</span>
                </div>
                <div className="flex rounded-lg overflow-hidden border themed-border-primary">
                  <button onClick={() => setTheme('dark')}
                    className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${theme === 'dark'
                      ? 'themed-btn-primary'
                      : 'themed-text-muted themed-bg-hover'
                    }`}>
                    {ts('settings.dark')}
                  </button>
                  <button onClick={() => setTheme('light')}
                    className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${theme === 'light'
                      ? 'themed-btn-primary'
                      : 'themed-text-muted themed-bg-hover'
                    }`}>
                    {ts('settings.light')}
                  </button>
                </div>
              </div>

              {/* 语言切换 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="themed-text-secondary">
                    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                  <span className={`text-xs themed-text-primary`}>{ts('settings.language')}</span>
                </div>
                <div className="flex rounded-lg overflow-hidden border themed-border-primary">
                  <button onClick={() => setLocale('zh')}
                    className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${locale === 'zh'
                      ? 'themed-btn-primary'
                      : 'themed-text-muted themed-bg-hover'
                    }`}>
                    中文
                  </button>
                  <button onClick={() => setLocale('en')}
                    className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${locale === 'en'
                      ? 'themed-btn-primary'
                      : 'themed-text-muted themed-bg-hover'
                    }`}>
                    EN
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t themed-border-primary" />

          {/* ===== 游戏目录 ===== */}
          <div>
            <label className={`text-[11px] themed-text-secondary block mb-2 font-medium`}>{ts('settings.gameDir')}</label>
            <p className={`text-[10px] themed-text-dimmed mb-3`}>
              {ts('settings.gameDirHint')}
            </p>

            {/* 当前路径 */}
            <div className="rounded-lg p-3 mb-3 min-h-[40px] flex items-center themed-bg-primary">
              {gameDir ? (
                <div className="flex-1 min-w-0">
                  <span className={`text-xs themed-text-secondary inline-flex items-center gap-1`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {ts('settings.set')}
                  </span>
                  <p className={`text-[11px] themed-text-primary mt-0.5 truncate`}>{gameDir}</p>
                </div>
              ) : (
                <span className={`text-xs themed-text-dimmed`}>
                  {ts('settings.notSet')}
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button onClick={handleAutoDetect} disabled={detecting}
                className="flex-1 px-4 py-2 text-xs rounded-lg transition-colors disabled:opacity-50 font-medium themed-btn-primary">
                {detecting
                  ? ts('settings.detecting')
                  : ts('settings.autoDetect')
                }
              </button>
              <button onClick={handleManualSelect}
                className={`flex-1 px-4 py-2 text-xs rounded-lg transition-colors font-medium themed-btn-secondary`}>
                {ts('settings.manualSelect')}
              </button>
              {gameDir && (
                <button onClick={handleClear}
                  className={`px-3 py-2 text-xs themed-text-secondary hover:text-current rounded-lg themed-bg-hover transition-colors`}>
                  {ts('settings.clear')}
                </button>
              )}
            </div>

            {/* 状态提示 */}
            {statusMsg && (
              <p className={`text-[10px] mt-2 themed-text-dimmed`}>{statusMsg}</p>
            )}
          </div>

          {/* 分隔线 */}
          <div className="border-t themed-border-primary" />

          {/* ===== 关于 ===== */}
          <div>
            <label className={`text-[11px] themed-text-secondary block mb-2 font-medium`}>{ts('settings.about')}</label>
            <div className={`space-y-1 text-[10px] themed-text-dimmed`}>
              <p>饭团工坊 v0.1.0</p>
              <p>{ts('settings.aboutDesc')}</p>
              <p className="mt-2">{ts('settings.exportFormat')}</p>
              <p>{ts('settings.dependencies')}</p>
            </div>
          </div>
        </div>

        {/* 底部关闭 */}
        <div className="px-5 py-4 border-t flex justify-end themed-border-primary">
          <button onClick={onClose}
            className="px-5 py-2 text-sm font-medium rounded-md transition-colors themed-btn-primary">
            {ts('settings.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
