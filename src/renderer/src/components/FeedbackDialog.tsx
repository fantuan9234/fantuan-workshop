import { useState } from 'react'
import { useT, asString } from '../i18n'

interface FeedbackDialogProps {
  open: boolean
  onClose: () => void
}

export default function FeedbackDialog({ open, onClose }: FeedbackDialogProps): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!description.trim()) return
    setSending(true)
    try {
      const version = await window.electronAPI?.getAppVersion().catch(() => 'unknown') || 'unknown'
      const platform = window.electronAPI?.platform || 'unknown'
      const body = [
        `## 问题描述`,
        ``,
        description.trim(),
        ``,
        `---`,
        `**版本**: ${version}`,
        `**操作系统**: ${platform}`,
      ].join('\n')

      const mailto = `mailto:fantuan9234@qq.com?subject=${encodeURIComponent(`[饭团工坊反馈] v${version}`)}&body=${encodeURIComponent(body)}`
      window.open(mailto, '_blank')
      setSent(true)
      setTimeout(() => { onClose(); setSent(false); setDescription('') }, 1500)
    } catch {
      // fallback
    } finally {
      setSending(false)
    }
  }

  if (!open) return <></>

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="themed-bg-card border themed-border-secondary rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold themed-text-primary">{ts('feedback.title')}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg themed-bg-hover flex items-center justify-center themed-text-muted hover:themed-text-primary transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <p className="text-base themed-text-primary font-medium">{ts('feedback.sent')}</p>
          </div>
        ) : (
          <>
            <p className="text-sm themed-text-dimmed mb-4">{ts('feedback.hint')}</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={ts('feedback.placeholder')}
              rows={5}
              className="w-full themed-bg-primary border themed-border-primary rounded-xl p-3 text-base themed-text-secondary placeholder:themed-text-disabled focus:outline-none themed-border-hover transition-colors resize-none"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button onClick={onClose}
                className="px-4 py-2 text-base themed-text-muted hover:themed-text-primary transition-colors">
                {ts('common.cancel')}
              </button>
              <button onClick={handleSubmit} disabled={!description.trim() || sending}
                className="px-5 py-2 rounded-lg themed-btn-primary text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? ts('feedback.sending') : ts('feedback.submit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}