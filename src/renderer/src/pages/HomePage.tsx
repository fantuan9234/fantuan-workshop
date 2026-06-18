import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../data/ProjectContext'
import { useT, asString } from '../i18n'
import { useToast } from '../components/Toast'

export default function HomePage(): JSX.Element {
  const navigate = useNavigate()
  const t = useT()
  /** 强制收窄为 string 的本地 helper */
  const ts = (k: string): string => asString(t, k)
  const { meta, setProjectName, saveProject, openProject, getFullSnapshot } = useProject()
  const { toast } = useToast()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(meta.name)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => { setNameDraft(meta.name) }, [meta.name])

  const snap = getFullSnapshot()
  const stats = useMemo(() => {
    // NPC 数量：合并 npcAssets（有肖像/行走图的NPC）和 customNpcs（自定义NPC数据），取并集去重
    const npcAssetIds = Object.keys(snap.npcAssets || {})
    const customNpcIds = (snap.customNpcs as Array<Record<string, unknown>> || []).map(n => (n.id as string) || (n.name as string)).filter(Boolean)
    const allNpcIds = new Set([...npcAssetIds, ...customNpcIds])
    return {
      npcs: allNpcIds.size,
      events: ((snap.events as unknown[])?.length ?? 0),
      items: ((snap.customItems as unknown[])?.length ?? 0),
      maps: ((snap.customMaps as unknown[])?.length ?? 0),
      quests: ((snap.quests as unknown[])?.length ?? 0),
    }
  }, [snap])

  const actions = [
    {
      title: t('home.npcManage'),
      desc: t('home.npcManageDesc'),
      path: '/npc',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      title: t('home.eventEditor'),
      desc: t('home.eventEditorDesc'),
      path: '/events',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    },
    {
      title: t('home.itemCreate'),
      desc: t('home.itemCreateDesc'),
      path: '/items',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      )
    },
    {
      title: t('home.mapEdit'),
      desc: t('home.mapEditDesc'),
      path: '/maps',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      )
    }
  ]

  const handleNewProject = () => {
    window.location.hash = '#/'
    window.location.reload()
  }

  const handleSaveName = () => {
    if (nameDraft.trim()) setProjectName(nameDraft.trim())
    setEditingName(false)
  }

  const handleSave = async () => {
    const ok = await saveProject()
    toast(ok ? ts('toast.saved') : ts('home.saveFail'), ok ? 'success' : 'error')
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      {/* 标题区 */}
      <h2 className="text-3xl font-bold themed-text-primary">{ts('home.title')}</h2>
      <p className="text-base themed-text-muted mt-1">{ts('home.subtitle')}</p>

      {/* 项目名称 */}
      <div className="mt-5 themed-bg-card rounded-xl p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input type="text" value={nameDraft} onChange={e => setNameDraft(e.target.value)}
              onBlur={handleSaveName} onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
              className="themed-bg-input themed-border-hover rounded px-2 py-1 text-base themed-text-primary outline-none focus:border-[#888] w-full" autoFocus />
          ) : (
            <button onClick={() => setEditingName(true)}
              className="text-base font-medium themed-text-primary hover:text-gray-300 transition-colors truncate block w-full text-left">
              {meta.name}
            </button>
          )}
          {meta.filePath && <p className="text-xs themed-text-dimmed mt-0.5 truncate">{meta.filePath}</p>}
          {meta.lastSaved && !editingName && <p className="text-xs themed-text-disabled mt-0.5">{ts('home.lastSaved')}: {new Date(meta.lastSaved).toLocaleString('zh-CN')}</p>}
        </div>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.hasUnsavedChanges ? 'bg-gray-400' : 'bg-gray-600'}`} title={meta.hasUnsavedChanges ? ts('layout.unsaved') : ts('home.saveSuccess')} />
      </div>

      {/* 新建/打开/保存 */}
      <div className="mt-4 flex flex-wrap items-center gap-3 md:gap-3">
        <button onClick={handleNewProject}
          className="inline-flex items-center gap-3 themed-btn-primary text-base font-medium px-5 py-2.5 rounded-md transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {ts('home.newName')}
        </button>
        <button onClick={openProject}
          className="inline-flex items-center gap-3 text-base themed-text-muted hover:text-white px-4 py-2.5 rounded-md border themed-border-primary hover:themed-border-hover transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          {ts('home.openProject')}
        </button>
        <button onClick={handleSave}
          className="inline-flex items-center gap-3 text-base text-gray-300 hover:text-white px-4 py-2.5 rounded-md border themed-border-primary hover:themed-border-hover transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
          </svg>
          {ts('home.saveProject')}
        </button>
        {saveMsg && <span className={`text-sm ${saveMsg === ts('home.saveSuccess') ? 'text-gray-300' : 'text-gray-400'}`}>{saveMsg}</span>}
      </div>
      <div className="my-7 border-t themed-border-primary" />

      {/* 项目统计仪表板 */}
      <h3 className="text-sm font-medium themed-text-dimmed uppercase tracking-wider mb-4">{ts('home.stats')}</h3>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-3 mb-7">
        <DashboardCard label="NPC" count={stats.npcs} icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        } />
        <DashboardCard label={ts('sidebar.events')} count={stats.events} icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
        } />
        <DashboardCard label={ts('sidebar.items')} count={stats.items} icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
        } />
        <DashboardCard label={ts('sidebar.maps')} count={stats.maps} icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
        } />
        <DashboardCard label={ts('sidebar.quests')} count={stats.quests} icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        } />
      </div>

      {/* 快速操作区 */}
      <h3 className="text-sm font-medium themed-text-dimmed uppercase tracking-wider mb-4">{ts('home.quickActions')}</h3>
      <div className="space-y-1">
        {actions.map((action) => (
          <button key={action.path} onClick={() => navigate(action.path)}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-md themed-bg-hover transition-colors text-left group">
            <span className="themed-text-muted group-hover:text-white transition-colors flex-shrink-0">{action.icon}</span>
            <div className="min-w-0">
              <div className="text-base font-medium themed-text-primary">{action.title}</div>
              <div className="text-sm themed-text-dimmed mt-0.5">{action.desc}</div>
            </div>
            <svg className="ml-auto themed-text-disabled flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>

      {/* 快捷键提示 */}
      <div className="mt-8 flex flex-wrap items-center gap-4 text-xs themed-text-disabled">
        <span>Ctrl+S {ts('home.saveProject')}</span>
        <span>Ctrl+O {ts('home.openProject')}</span>
        <span>Ctrl+Z {ts('home.undo')}</span>
        <span>Ctrl+Y {ts('home.redo')}</span>
      </div>
    </div>
  )
}

function DashboardCard({ label, count, icon }: { label: string; count: number; icon: React.ReactNode }): JSX.Element {
  return (
    <div className={`themed-bg-primary rounded-xl p-4 flex flex-col items-center text-center border themed-border-primary`}>
      <div className={`themed-text-muted mb-2`}>{icon}</div>
      <div className={`text-3xl font-bold ${count > 0 ? 'themed-text-primary' : 'themed-text-disabled'}`}>{count}</div>
      <div className="text-xs themed-text-dimmed mt-1">{label}</div>
    </div>
  )
}
