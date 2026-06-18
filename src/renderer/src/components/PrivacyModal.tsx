import { useState } from 'react'
import { useT, asString } from '../i18n'

export default function PrivacyModal(): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [show, setShow] = useState(() => {
    return !localStorage.getItem('fantuan-privacy-accepted')
  })

  const accept = () => {
    localStorage.setItem('fantuan-privacy-accepted', 'true')
    setShow(false)
  }

  const decline = () => {
    window.close()
  }

  if (!show) return <></>

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60">
      <div className="themed-bg-card border themed-border-secondary rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl themed-bg-primary mx-auto mb-3 flex items-center justify-center themed-text-muted">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold themed-text-primary">{ts('privacy.title')}</h2>
        </div>

        <div className="themed-bg-secondary rounded-xl p-4 mb-6 max-h-60 overflow-y-auto text-sm themed-text-secondary leading-relaxed space-y-2">
          <p>{ts('privacy.p1')}</p>
          <p>{ts('privacy.p2')}</p>
          <p>{ts('privacy.p3')}</p>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <button onClick={decline}
            className="px-4 py-2 text-base themed-text-muted hover:themed-text-primary transition-colors">
            {ts('privacy.decline')}
          </button>
          <button onClick={accept}
            className="px-5 py-2 rounded-lg themed-btn-primary text-base font-medium transition-colors">
            {ts('privacy.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}