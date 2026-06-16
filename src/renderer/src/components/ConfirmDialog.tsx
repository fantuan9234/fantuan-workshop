import { useT, asString } from '../i18n'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel }: ConfirmDialogProps): JSX.Element | null {
  const t = useT()
  const ts = (k: string): string => asString(t, k)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="themed-bg-card rounded-xl w-[380px] shadow-2xl border themed-border-primary" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
              {danger ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              )}
            </div>
            <h3 className="text-sm font-bold themed-text-primary">{title}</h3>
          </div>
          <p className="text-xs themed-text-muted ml-12">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t themed-border-secondary">
          <button onClick={onCancel}
            className="px-4 py-1.5 text-xs rounded-lg themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors">
            {cancelLabel || ts('confirm.cancel')}
          </button>
          <button onClick={onConfirm}
            className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'themed-btn-primary'
            }`}>
            {confirmLabel || ts('confirm.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
