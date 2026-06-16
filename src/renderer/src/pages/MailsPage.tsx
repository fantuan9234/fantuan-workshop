import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../data/ProjectContext'
import type { GameMail, MailAttachment } from '../data/mailData'
import { useT, asString, asArray } from '../i18n'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

export default function MailsPage(): JSX.Element {
  const navigate = useNavigate()
  const { registerSnapshot, mutateSnapshot, markDirty } = useProject()
  const t = useT()
  const ts = (k: string): string => asString(t, k)

  // ---- 自定义邮件 ----
  const [customMails, setCustomMails] = useState<GameMail[]>([])
  const customMailsRef = useRef<GameMail[]>([])
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  customMailsRef.current = customMails
  useEffect(() => {
    return registerSnapshot('mails',
      () => customMailsRef.current,
      (data: unknown) => { if (Array.isArray(data)) setCustomMails(data as GameMail[]) }
    )
  }, [registerSnapshot])

  // ---- 创建自定义邮件（直接进编辑器） ----
  const handleCreate = () => {
    const mail: GameMail = {
      id: `mail_${Date.now()}`,
      title: ts('mails.newMail'),
      text: '',
      attachments: [],
      gold: 0,
      recipe: '',
      forceOpen: false,
      trigger: '',
      created: new Date().toISOString().slice(0, 10),
    }
    mutateSnapshot<GameMail[]>('mails', prev => [...prev, mail])
    navigate(`/mails/${mail.id}`, { state: { newMail: mail, allMails: [...customMailsRef.current, mail] } })
  }

  const handleDeleteCustom = (id: string) => {
    setDeleteTarget(id)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      setCustomMails(prev => prev.filter(m => m.id !== deleteTarget))
      markDirty()
      toast(ts('toast.deleted'), 'success')
      setDeleteTarget(null)
    }
  }

  // ---- 参考素材：编写小贴士 ----
  const tips = asArray(t, 'mails.tips')

  // ---- 参考素材：快速模板 ----
  interface MailTemplate {
    icon: string
    color: string
    name: string
    desc: string
    text: string
    gold: number
    attachments: MailAttachment[]
    recipe: string
    forceOpen: boolean
    trigger: string
    tags: string[]
  }

  const templateData: MailTemplate[] = [
    {
      icon: 'welcome', color: 'bg-blue-500/15 text-blue-300',
      name: ts('mails.tplWelcomeName'), desc: ts('mails.tplWelcomeDesc'), text: ts('mails.tplWelcomeText'),
      gold: 0, attachments: [], recipe: '', forceOpen: false, trigger: '',
      tags: ['mails.tagText'],
    },
    {
      icon: 'birthday', color: 'bg-pink-500/15 text-pink-300',
      name: ts('mails.tplBirthdayName'), desc: ts('mails.tplBirthdayDesc'), text: ts('mails.tplBirthdayText'),
      gold: 500, attachments: [{ itemId: '390', count: 5 }], recipe: '', forceOpen: false, trigger: '',
      tags: ['mails.tagAttachment', 'mails.tagGold'],
    },
    {
      icon: 'recipe', color: 'bg-green-500/15 text-green-300',
      name: ts('mails.tplRecipeName'), desc: ts('mails.tplRecipeDesc'), text: ts('mails.tplRecipeText'),
      gold: 0, attachments: [], recipe: 'Fried Egg', forceOpen: false, trigger: '',
      tags: ['mails.recipeTag'],
    },
    {
      icon: 'festival', color: 'bg-purple-500/15 text-purple-300',
      name: ts('mails.tplFestivalName'), desc: ts('mails.tplFestivalDesc'), text: ts('mails.tplFestivalText'),
      gold: 0, attachments: [], recipe: '', forceOpen: false, trigger: 'YEAR 2',
      tags: ['mails.autoSend'],
    },
    {
      icon: 'notice', color: 'bg-amber-500/15 text-amber-300',
      name: ts('mails.tplNoticeName'), desc: ts('mails.tplNoticeDesc'), text: ts('mails.tplNoticeText'),
      gold: 0, attachments: [], recipe: '', forceOpen: true, trigger: '',
      tags: ['mails.forceOpenTag'],
    },
    {
      icon: 'tutorial', color: 'bg-cyan-500/15 text-cyan-300',
      name: ts('mails.tplTutorialName'), desc: ts('mails.tplTutorialDesc'), text: ts('mails.tplTutorialText'),
      gold: 0, attachments: [], recipe: '', forceOpen: false, trigger: 'PLAYER_FARMING_LEVEL Current 1',
      tags: ['mails.tagText', 'mails.autoSend'],
    },
  ]

  const renderTemplateIcon = (key: string): JSX.Element => {
    const icons: Record<string, JSX.Element> = {
      welcome: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
      birthday: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
      recipe: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
      festival: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
      notice: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>,
      tutorial: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    }
    return icons[key] ?? icons.welcome
  }

  const handleCreateFromTemplate = (tpl: MailTemplate) => {
    const mail: GameMail = {
      id: `mail_${Date.now()}`,
      title: tpl.name,
      text: tpl.text,
      attachments: tpl.attachments,
      gold: tpl.gold,
      recipe: tpl.recipe,
      forceOpen: tpl.forceOpen,
      trigger: tpl.trigger,
      created: new Date().toISOString().slice(0, 10),
    }
    mutateSnapshot<GameMail[]>('mails', prev => [...prev, mail])
    navigate(`/mails/${mail.id}`, { state: { newMail: mail, allMails: [...customMailsRef.current, mail] } })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b themed-border-primary flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg themed-bg-card flex items-center justify-center themed-text-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold themed-text-primary">{ts('mails.title')}</h2>
            <p className="text-[10px] themed-text-dimmed">{ts('mails.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] themed-text-dimmed">
            <span className="themed-text-primary font-medium">{customMails.length}</span>{ts('mails.custom')}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
        {/* ========== 上半: 我的创作 ========== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold themed-text-secondary flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full themed-bg-primary" />
              {ts('mails.myCreation')}
              {customMails.length > 0 && <span className="text-[10px] themed-text-dimmed font-normal">({customMails.length})</span>}
            </h3>
            {customMails.length > 0 && (
              <button onClick={handleCreate}
                className="text-[11px] px-3 py-1.5 rounded-lg themed-btn-primary font-medium transition-colors flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {ts('mails.newMail')}
              </button>
            )}
          </div>

          {customMails.length === 0 ? (
            /* 空状态：大卡片式创建入口 */
            <button onClick={handleCreate}
              className="w-full themed-bg-secondary border themed-border-primary border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 themed-border-hover themed-bg-card-hover transition-all group">
              <div className="w-20 h-20 rounded-2xl themed-bg-card flex items-center justify-center themed-bg-hover transition-colors">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold themed-text-primary">{ts('mails.createFirst')}</p>
                <p className="text-xs themed-text-dimmed mt-1.5 max-w-[280px]">{ts('mails.createFirstDesc')}</p>
              </div>
              <div className="mt-2 px-5 py-2 rounded-lg themed-btn-primary text-xs font-medium transition-colors">
                {ts('mails.startCreate')}
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {customMails.map(mail => (
                <div key={mail.id}
                  onClick={() => navigate(`/mails/${mail.id}`)}
                  className="themed-bg-secondary rounded-xl p-4 themed-bg-card-hover transition-all group relative cursor-pointer border border-transparent themed-border-hover">
                  {/* 删除按钮 */}
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCustom(mail.id) }}
                    className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center themed-text-disabled hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>

                  {/* 图标 + 标题 */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg themed-bg-card flex items-center justify-center flex-shrink-0 themed-text-muted">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold themed-text-primary truncate">{mail.title}</h4>
                      <p className="text-[10px] themed-text-dimmed mt-0.5">{mail.created} {ts('mails.created')}</p>
                    </div>
                  </div>

                  {/* 预览文本 */}
                  {mail.text && (
                    <p className="text-[11px] themed-text-muted line-clamp-2 mb-2">{mail.text.replace(/\^/g, ' ').replace(/@\s?/g, '玩家').replace(/%farm/g, '农场').replace(/%pet/g, '宠物')}</p>
                  )}

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1.5">
                    {mail.gold > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                        {mail.gold}g
                      </span>
                    )}
                    {mail.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                        {mail.attachments.length}{ts('mails.attachments')}
                      </span>
                    )}
                    {mail.recipe && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-green-500/15 text-green-300">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        {ts('mails.recipeTag')}
                      </span>
                    )}
                    {mail.forceOpen && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-red-500/15 text-red-300">
                        {ts('mails.forceOpenTag')}
                      </span>
                    )}
                    {mail.trigger && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300">
                        {ts('mails.autoSend')}
                      </span>
                    )}
                  </div>

                  {/* 底部 */}
                  <div className="mt-3 pt-2 border-t themed-border-secondary flex items-center justify-between">
                    <span className="text-[10px] themed-text-dimmed">{mail.text ? `${mail.text.length}${ts('mails.charCount')}` : ts('mails.noContent')}</span>
                    <span className="text-[10px] themed-text-disabled group-hover:themed-text-muted transition-colors">{ts('mails.clickEdit')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========== 下半: 游戏参考素材 ========== */}
        <section>
          <h3 className="text-sm font-semibold themed-text-secondary mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full themed-text-dimmed" />
            {ts('mails.reference')}
          </h3>

          {/* 编写小贴士 */}
          <div className="themed-bg-secondary rounded-xl p-4 mb-4 border themed-border-primary">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg themed-bg-card flex items-center justify-center flex-shrink-0 text-amber-300">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0012 2z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold themed-text-primary mb-2">{ts('mails.tipsTitle')}</h4>
                <ul className="space-y-1.5">
                  {tips.map((tip, i) => (
                    <li key={i} className="text-[11px] themed-text-muted flex items-start gap-1.5">
                      <span className="themed-text-dimmed mt-0.5 flex-shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 快速模板 */}
          <p className="text-[11px] themed-text-dimmed mb-3">{ts('mails.referenceTip')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templateData.map((tpl, i) => (
              <button key={i} onClick={() => handleCreateFromTemplate(tpl)}
                className="themed-bg-secondary rounded-xl p-4 text-left themed-bg-card-hover transition-all group border border-transparent themed-border-hover flex flex-col">
                {/* 图标 + 标题 */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tpl.color}`}>
                    {renderTemplateIcon(tpl.icon)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold themed-text-primary truncate">{tpl.name}</h4>
                    <p className="text-[10px] themed-text-dimmed mt-0.5 line-clamp-1">{tpl.desc}</p>
                  </div>
                </div>

                {/* 预览文本 */}
                <p className="text-[11px] themed-text-muted line-clamp-2 mb-3 flex-1">
                  {tpl.text.replace(/\^/g, ' ').replace(/@\s?/g, '玩家').replace(/%farm/g, '农场').replace(/%pet/g, '宠物')}
                </p>

                {/* 标签 */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tpl.tags.map(tagKey => (
                    <span key={tagKey} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md themed-bg-card themed-text-muted">
                      {ts(tagKey)}
                    </span>
                  ))}
                </div>

                {/* 底部 */}
                <div className="pt-2 border-t themed-border-secondary flex items-center justify-between">
                  <span className="text-[10px] themed-text-dimmed">{tpl.text.length}{ts('mails.charCount')}</span>
                  <span className="text-[10px] themed-text-disabled group-hover:themed-text-muted transition-colors">{ts('mails.useTemplate')} →</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        title={ts('confirm.deleteTitle')}
        message={ts('confirm.deleteMessage')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
