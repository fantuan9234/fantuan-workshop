import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo } from 'react'
import type { GameMail, MailAttachment } from '../../data/mailData'
import { useProject } from '../../data/ProjectContext'
import { useT, asString } from '../../i18n'
import EditorHeader from '../../components/EditorHeader'
import { UnsavedChangesGuard } from '../../components/useUnsavedChangesGuard'

// 常见触发条件提示
const triggerHints = [
  { label: 'PLAYER_FARMING_LEVEL Current 10', desc: '农业等级10' },
  { label: 'PLAYER_FISHING_LEVEL Current 5', desc: '钓鱼等级5' },
  { label: 'PLAYER_MINING_LEVEL Current 8', desc: '采矿等级8' },
  { label: 'PLAYER_COMBAT_LEVEL Current 6', desc: '战斗等级6' },
  { label: 'PLAYER_FORAGING_LEVEL Current 7', desc: '采集等级7' },
  { label: 'YEAR 2', desc: '第二年' },
  { label: 'SEASON Spring', desc: '春季' },
  { label: 'DAY_OF_WEEK Monday', desc: '周一' },
  { label: 'WEATHER Rain', desc: '雨天' },
]

export default function MailEditor(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { mutateSnapshot } = useProject()
  const t = useT()
  const ts = (k: string): string => asString(t, k)

  // ★ 从路由 state 获取数据
  const stateData = location.state as { newMail?: GameMail; allMails?: GameMail[] }
  const initialMails = stateData?.allMails ?? []

  // 查找当前编辑的邮件
  const found = initialMails.find(m => m.id === id)

  const [title, setTitle] = useState(found?.title ?? '')
  const [text, setText] = useState(found?.text ?? '')
  const [attachments, setAttachments] = useState<MailAttachment[]>(found?.attachments ?? [])
  const [gold, setGold] = useState(found?.gold ?? 0)
  const [recipe, setRecipe] = useState(found?.recipe ?? '')
  const [forceOpen, setForceOpen] = useState(found?.forceOpen ?? false)
  const [trigger, setTrigger] = useState(found?.trigger ?? '')
  const [savedToast, setSavedToast] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showTriggerHints, setShowTriggerHints] = useState(false)

  // 附件操作
  const addAttachment = () => {
    setAttachments(prev => [...prev, { itemId: '', count: 1 }])
    setDirty(true)
  }
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
    setDirty(true)
  }
  const updateAttachment = (index: number, field: keyof MailAttachment, value: string | number) => {
    setAttachments(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a))
    setDirty(true)
  }

  // 快捷插入特殊代码
  const insertCode = (code: string) => {
    setText(prev => prev + code)
    setDirty(true)
  }

  // 保存
  const handleSave = () => {
    if (!title.trim()) return
    const savedId = found?.id ?? `mail_${Date.now()}`
    const newMail: GameMail = {
      id: savedId,
      title,
      text,
      attachments,
      gold,
      recipe,
      forceOpen,
      trigger,
      created: found?.created ?? new Date().toISOString().slice(0, 10),
    }
    mutateSnapshot<GameMail[]>('mails', prev => {
      const idx = prev.findIndex(m => m.id === savedId)
      return idx >= 0 ? prev.map(m => m.id === savedId ? newMail : m) : [...prev, newMail]
    })
    if (!found) {
      navigate(`/mails/${savedId}`, { replace: true, state: { allMails: [...initialMails.filter(m => m.id !== id), newMail] } })
    }
    setSavedToast(true)
    setDirty(false)
    setTimeout(() => setSavedToast(false), 1500)
  }

  // 预览文本
  const previewText = useMemo(() => {
    return text
      .replace(/\^/g, '\n')
      .replace(/@\s?/g, '玩家名')
      .replace(/%farm/g, '农场名')
      .replace(/%pet/g, '宠物名')
      .replace(/\[#([0-9a-fA-F]{6})\]/g, (_, color) => `【彩色文字#${color}】`)
  }, [text])

  return (
    <div className="h-full flex flex-col overflow-hidden" onChange={() => setDirty(true)}>
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-5 py-3 border-b themed-border-primary flex-shrink-0 themed-bg-primary">
        <EditorHeader title={title || ts('mails.title')} />
        <div className="flex items-center gap-2">
          {savedToast && <span className="text-[11px] text-green-400 animate-pulse">{ts('mailEditor.saved')}</span>}
          <button onClick={() => setShowPreview(!showPreview)}
            className={`text-[11px] px-3 py-1.5 rounded-lg transition-colors ${showPreview ? 'themed-bg-active themed-text-primary' : 'themed-text-muted hover:themed-text-primary themed-bg-hover'}`}>
            {ts('mailEditor.preview')}
          </button>
          <button onClick={handleSave}
            className="text-[11px] themed-btn-primary font-medium px-4 py-1.5 rounded-lg transition-colors">
            {ts('mailEditor.saveMail')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* 左侧：编辑面板 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 基本信息 */}
          <div>
            <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider mb-3">{ts('mailEditor.basicInfo')}</h3>
            <div className="space-y-3">
              <Field label={ts('mailEditor.mailTitle')}>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={ts('mailEditor.mailTitlePlaceholder')} className="input" />
              </Field>
              <Field label={ts('mailEditor.mailId')}>
                <input type="text" value={id || ''} readOnly className="input themed-text-dimmed bg-opacity-50" />
              </Field>
            </div>
          </div>

          {/* 邮件正文 */}
          <div>
            <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider mb-3">{ts('mailEditor.mailBody')}</h3>
            <div className="space-y-2">
              <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
                placeholder={ts('mailEditor.mailBodyPlaceholder')}
                className="w-full themed-bg-primary border themed-border-primary rounded-lg px-3 py-2 text-xs themed-text-secondary placeholder:themed-text-disabled focus:outline-none themed-border-hover transition-colors resize-none font-mono leading-relaxed" />
              {/* 快捷插入按钮 */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] themed-text-dimmed self-center mr-1">{ts('mailEditor.quickInsert')}</span>
                <button onClick={() => insertCode('@')} className="text-[10px] px-2 py-1 rounded-md themed-bg-card themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors">@ {ts('mailEditor.playerName')}</button>
                <button onClick={() => insertCode('%farm')} className="text-[10px] px-2 py-1 rounded-md themed-bg-card themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors">%farm {ts('mailEditor.farmName')}</button>
                <button onClick={() => insertCode('%pet')} className="text-[10px] px-2 py-1 rounded-md themed-bg-card themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors">%pet {ts('mailEditor.petName')}</button>
                <button onClick={() => insertCode('^')} className="text-[10px] px-2 py-1 rounded-md themed-bg-card themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors">^ {ts('mailEditor.lineBreak')}</button>
                <button onClick={() => insertCode('[#]')} className="text-[10px] px-2 py-1 rounded-md themed-bg-card themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors">[#color] {ts('mailEditor.colorCode')}</button>
              </div>
              <p className="text-[9px] themed-text-disabled">{ts('mailEditor.colorCodeHint')}</p>
            </div>
          </div>

          {/* 附件 */}
          <div>
            <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider mb-3">{ts('mailEditor.attachments')}</h3>
            <div className="space-y-3">
              {/* 金币 */}
              <Field label={ts('mailEditor.goldAttachment')}>
                <div className="flex items-center gap-2">
                  <input type="number" value={gold} onChange={e => setGold(Number(e.target.value) || 0)} min={0} className="input w-32" />
                  <span className="text-[10px] themed-text-dimmed">g</span>
                </div>
              </Field>

              {/* 物品附件 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] themed-text-dimmed">{ts('mailEditor.itemAttachments')}</label>
                  <button onClick={addAttachment} className="text-[10px] px-2 py-1 rounded-md themed-bg-card themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors">
                    + {ts('mailEditor.addItem')}
                  </button>
                </div>
                {attachments.length === 0 ? (
                  <p className="text-[10px] themed-text-disabled py-2">{ts('mailEditor.noAttachments')}</p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="text" value={att.itemId} onChange={e => updateAttachment(idx, 'itemId', e.target.value)}
                          placeholder={ts('mailEditor.itemIdPlaceholder')} className="input flex-1" />
                        <input type="number" value={att.count} onChange={e => updateAttachment(idx, 'count', Number(e.target.value) || 1)}
                          min={1} className="input w-20" />
                        <button onClick={() => removeAttachment(idx)} className="p-1 themed-text-dimmed hover:text-red-400 rounded transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 配方解锁 */}
              <Field label={ts('mailEditor.recipeUnlock')}>
                <input type="text" value={recipe} onChange={e => setRecipe(e.target.value)} placeholder={ts('mailEditor.recipePlaceholder')} className="input" />
              </Field>
            </div>
          </div>

          {/* 设置 */}
          <div>
            <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider mb-3">{ts('mailEditor.settings')}</h3>
            <div className="space-y-3">
              {/* 强制打开 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[10px] themed-text-dimmed">{ts('mailEditor.forceOpen')}</label>
                  <p className="text-[9px] themed-text-disabled">{ts('mailEditor.forceOpenHint')}</p>
                </div>
                <button onClick={() => { setForceOpen(!forceOpen); setDirty(true) }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${forceOpen ? 'bg-green-500' : 'themed-bg-active'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${forceOpen ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* 触发条件 */}
              <div>
                <label className="text-[10px] themed-text-dimmed block mb-1">{ts('mailEditor.triggerCondition')}</label>
                <div className="relative">
                  <input type="text" value={trigger} onChange={e => setTrigger(e.target.value)}
                    onFocus={() => setShowTriggerHints(true)}
                    onBlur={() => setTimeout(() => setShowTriggerHints(false), 200)}
                    placeholder={ts('mailEditor.triggerPlaceholder')} className="input" />
                  {showTriggerHints && (
                    <div className="absolute top-full left-0 right-0 mt-1 themed-bg-secondary border themed-border-primary rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {triggerHints.map((hint, i) => (
                        <button key={i} onMouseDown={e => { e.preventDefault(); setTrigger(hint.label); setDirty(true); setShowTriggerHints(false) }}
                          className="w-full text-left px-3 py-2 text-[10px] hover:themed-bg-hover transition-colors themed-text-secondary">
                          <span className="font-mono themed-text-primary">{hint.label}</span>
                          <span className="ml-2 themed-text-dimmed">{hint.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[9px] themed-text-disabled mt-1">{ts('mailEditor.triggerHint')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：预览面板 */}
        {showPreview && (
          <div className="w-full lg:w-[360px] lg:flex-shrink-0 border-t lg:border-t-0 lg:border-l themed-border-primary flex flex-col themed-bg-secondary">
            <div className="px-4 py-3 border-b themed-border-primary flex items-center justify-between flex-shrink-0">
              <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider">{ts('mailEditor.preview')}</h3>
              <button onClick={() => setShowPreview(false)} className="themed-text-dimmed hover:themed-text-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* 模拟游戏邮件界面 */}
              <div className="themed-bg-primary rounded-xl border themed-border-secondary overflow-hidden">
                {/* 邮件标题栏 */}
                <div className="px-4 py-3 border-b themed-border-secondary flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="themed-text-muted">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span className="text-xs font-semibold themed-text-primary">{title || ts('mailEditor.untitled')}</span>
                </div>
                {/* 邮件正文 */}
                <div className="px-4 py-3">
                  {previewText ? (
                    <p className="text-[11px] themed-text-secondary leading-relaxed whitespace-pre-wrap">{previewText}</p>
                  ) : (
                    <p className="text-[11px] themed-text-disabled italic">{ts('mailEditor.noContent')}</p>
                  )}
                </div>
                {/* 附件区域 */}
                {(gold > 0 || attachments.length > 0 || recipe) && (
                  <div className="px-4 py-3 border-t themed-border-secondary">
                    <p className="text-[9px] themed-text-dimmed mb-2">{ts('mailEditor.attachmentPreview')}</p>
                    <div className="flex flex-wrap gap-2">
                      {gold > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                          <span className="text-[10px] text-amber-300">{gold}g</span>
                        </div>
                      )}
                      {attachments.map((att, idx) => att.itemId && (
                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                          <span className="text-[10px] text-blue-300">{att.itemId} x{att.count}</span>
                        </div>
                      ))}
                      {recipe && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <span className="text-[10px] text-green-300">{recipe}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 导出格式预览 */}
              <div className="mt-4">
                <p className="text-[9px] themed-text-dimmed mb-1">{ts('mailEditor.exportFormat')}</p>
                <pre className="text-[9px] themed-text-muted font-mono whitespace-pre-wrap break-all leading-relaxed themed-bg-primary rounded-lg p-3 border themed-border-secondary">
{JSON.stringify({
  [`{{ModId}}_${id}`]: {
    Text: text || '(空)',
    ...(attachments.length > 0 ? { Attachments: attachments.map(a => ({ ItemId: a.itemId.startsWith('(') ? a.itemId : `(O)${a.itemId}`, Count: a.count })) } : {}),
    ...(gold > 0 ? { Gold: gold } : {}),
    ...(recipe ? { Recipe: recipe } : {}),
    ...(forceOpen ? { ForceOpen: true } : {}),
    ...(trigger ? { Trigger: trigger } : {}),
  }
}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
      <UnsavedChangesGuard dirty={dirty} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return <div><label className="text-[10px] themed-text-dimmed block mb-1">{label}</label>{children}</div>
}
