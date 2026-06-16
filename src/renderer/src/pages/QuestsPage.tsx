import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef } from 'react'
import { referenceQuests, questCategories, questTypeLabels, questTypeSvgIcons, type QuestInfo, type QuestType } from '../data/questData'
import { useProject } from '../data/ProjectContext'
import { defaultNPCs } from '../data/npcData'
import { useT, asString } from '../i18n'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

export default function QuestsPage(): JSX.Element {
  const navigate = useNavigate()
  const t = useT()
  /** 强制收窄为 string 的本地 helper */
  const ts = (k: string): string => asString(t, k)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<QuestType | 'all'>('all')
  const [customQuests, setCustomQuests] = useState<QuestInfo[]>([])
  const customQuestsRef = useRef<QuestInfo[]>([])
  customQuestsRef.current = customQuests
  const { registerSnapshot, mutateSnapshot } = useProject()
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // ---- 创建任务（直接进编辑器） ----
  const handleCreate = () => {
    const questId = 'quest_' + Date.now()
    const newQuest: QuestInfo = {
      id: questId,
      name: '新任务',
      displayName: '新任务',
      type: 'help',
      description: '',
      triggerNpcId: '',
      triggerNpcName: '',
      heartRequired: 0,
      season: 'all',
      days: 0,
      objectives: [],
      rewards: { gold: 0, friendship: 0, items: [] },
      introText: '',
      completeText: '',
    }
    mutateSnapshot<QuestInfo[]>('quests', prev => [...prev, newQuest])
    navigate(`/quests/${questId}`, { state: { newQuest, allQuests: [...customQuestsRef.current, newQuest] } })
  }

  useEffect(() => {
    return registerSnapshot('quests',
      () => customQuestsRef.current,
      (data: unknown) => { setCustomQuests(data as QuestInfo[]) }
    )
  }, [registerSnapshot])

  const filteredRef = useMemo(() => {
    let quests = referenceQuests
    if (activeType !== 'all') quests = quests.filter(q => q.type === activeType)
    if (search.trim()) {
      const q = search.toLowerCase()
      quests = quests.filter(x => x.displayName.includes(q) || x.name.toLowerCase().includes(q) || x.description.includes(q) || x.triggerNpcName.includes(q))
    }
    return quests
  }, [search, activeType])

  const handleDelete = (questId: string) => {
    setDeleteTarget(questId)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      mutateSnapshot<QuestInfo[]>('quests', prev => prev.filter(q => q.id !== deleteTarget))
      toast(ts('toast.deleted'), 'success')
      setDeleteTarget(null)
    }
  }

  // 类型标签颜色映射
  const typeColorMap: Record<QuestType, string> = {
    story: 'bg-blue-500/20 text-blue-300',
    help: 'bg-amber-500/20 text-amber-300',
    specialOrder: 'bg-purple-500/20 text-purple-300',
    collection: 'bg-emerald-500/20 text-emerald-300',
    custom: 'bg-pink-500/20 text-pink-300',
  }

  // 季节标签
  const seasonLabels: Record<string, { label: string; color: string }> = {
    spring: { label: '春', color: 'bg-green-500/20 text-green-300' },
    summer: { label: '夏', color: 'bg-yellow-500/20 text-yellow-300' },
    fall: { label: '秋', color: 'bg-orange-500/20 text-orange-300' },
    winter: { label: '冬', color: 'bg-cyan-500/20 text-cyan-300' },
    all: { label: '全年', color: 'bg-gray-500/20 text-gray-400' },
  }

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-y-auto">
      {/* ===== 顶栏 ===== */}
      <div className="flex items-center justify-between flex-shrink-0 mb-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold themed-text-primary">{ts('quests.title')}</h2>
            <p className="text-xs themed-text-dimmed mt-0.5">
              {ts('quests.customCount')} <span className="text-amber-400 font-medium">{customQuests.length}</span> 个 · {ts('quests.vanillaCount')} <span className="themed-text-muted font-medium">{referenceQuests.length}</span> 个
            </p>
          </div>
        </div>
        {customQuests.length > 0 && (
          <button onClick={handleCreate}
            className="inline-flex items-center gap-2 themed-btn-primary font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-200 transition-colors shadow-lg shadow-black/20 text-sm flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {ts('quests.newQuest')}
          </button>
        )}
      </div>

      {/* ===== 上半: 我的创作 ===== */}
      <section className="mb-8 flex-shrink-0">
        <h3 className="text-sm font-medium themed-text-secondary mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-amber-500" />
          {ts('quests.myCreation')}
          {customQuests.length > 0 && <span className="text-[10px] themed-text-dimmed themed-bg-card px-1.5 py-0.5 rounded-full">{customQuests.length}</span>}
        </h3>

        {customQuests.length === 0 ? (
          /* 空状态：大卡片式创建入口 */
          <button onClick={handleCreate}
            className="w-full border-2 border-dashed border-gray-600 hover:border-amber-500/50 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-colors group themed-bg-primary/50 hover:themed-bg-primary">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center transition-colors">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold themed-text-secondary group-hover:themed-text-primary transition-colors">{ts('quests.createFirst')}</p>
              <p className="text-xs themed-text-dimmed mt-1">{ts('quests.createFirstDesc')}</p>
            </div>
            <span className="px-6 py-2.5 themed-btn-primary text-sm font-semibold rounded-xl group-hover:scale-105 transition-transform shadow-lg shadow-black/20">
              {ts('quests.startCreate')}
            </span>
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customQuests.map(q => {
              const npc = defaultNPCs.find(n => n.id === q.triggerNpcId)
              return (
                <div key={q.id} className="group relative themed-bg-card rounded-xl p-4 themed-bg-hover transition-colors cursor-pointer border border-transparent hover:border-gray-600/50"
                  onClick={() => navigate(`/quests/${q.id}`)}>
                  {/* 删除按钮 */}
                  <button onClick={e => { e.stopPropagation(); handleDelete(q.id) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-500/0 hover:bg-red-500/20 themed-text-disabled hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  {/* 卡片内容 */}
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl themed-bg-primary flex items-center justify-center flex-shrink-0">
                      {questTypeSvgIcons[q.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[13px] font-semibold themed-text-primary truncate">{q.displayName}</h3>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${typeColorMap[q.type]}`}>
                          {questTypeLabels[q.type]}
                        </span>
                      </div>
                      <p className="text-[10px] themed-text-dimmed line-clamp-1 mb-2">{q.description || ts('quests.noDescription')}</p>
                      <div className="flex items-center gap-3">
                        {npc && (
                          <div className="flex items-center gap-1.5">
                            <img src={npc.portraitUrl} alt={npc.displayName} className="w-4 h-4 rounded-full object-cover" />
                            <span className="text-[9px] themed-text-muted">{npc.displayName}</span>
                          </div>
                        )}
                        {q.heartRequired > 0 && (
                          <span className="text-[9px] text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>{q.heartRequired}</span>
                        )}
                        {q.objectives.length > 0 && (
                          <span className="text-[9px] themed-text-dimmed ml-auto">{q.objectives.length}{ts('quests.objectives')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== 下半: 游戏参考素材 ===== */}
      <section className="flex-1">
        <h3 className="text-sm font-medium themed-text-secondary mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-gray-500" />
          {ts('quests.reference')}
          <span className="text-[10px] themed-text-dimmed themed-bg-card px-1.5 py-0.5 rounded-full">{filteredRef.length}</span>
        </h3>

        {/* 搜索和筛选 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={ts('quests.search')} className="input pl-8" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setActiveType('all')}
              className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${activeType === 'all' ? 'themed-btn-primary font-medium' : 'themed-text-muted hover:themed-text-primary themed-bg-active'}`}>{ts('quests.filterAll')}</button>
            {questCategories.map(c => (
              <button key={c.id} onClick={() => setActiveType(c.id)}
                className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${activeType === c.id ? 'themed-btn-primary font-medium' : 'themed-text-muted hover:themed-text-primary themed-bg-active'}`}>
                {questTypeSvgIcons[c.id]} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 参考任务卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRef.map(q => {
            const npc = defaultNPCs.find(n => n.id === q.triggerNpcId)
            const sInfo = seasonLabels[q.season] || seasonLabels.all
            return (
              <div key={q.id}
                className="themed-bg-card rounded-xl p-4 themed-bg-hover transition-colors cursor-pointer border border-transparent hover:border-gray-600/50"
                onClick={() => navigate(`/quests/${q.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl themed-bg-primary flex items-center justify-center flex-shrink-0 text-xl">
                    {questTypeSvgIcons[q.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[13px] font-semibold themed-text-primary truncate">{q.displayName}</h3>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${typeColorMap[q.type]}`}>
                        {questTypeLabels[q.type]}
                      </span>
                    </div>
                    <p className="text-[10px] themed-text-dimmed line-clamp-1 mb-2">{q.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {npc && (
                        <div className="flex items-center gap-1.5">
                          <img src={npc.portraitUrl} alt={npc.displayName} className="w-4 h-4 rounded-full object-cover" />
                          <span className="text-[9px] themed-text-muted">{npc.displayName}</span>
                        </div>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${sInfo.color}`}>{sInfo.label}</span>
                      {q.objectives.length > 0 && (
                        <span className="text-[9px] themed-text-dimmed ml-auto">{q.objectives.length}{ts('quests.objectives')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {filteredRef.length === 0 && (
          <div className="mt-8 text-center themed-text-dimmed text-sm">{ts('quests.noMatch')}</div>
        )}
      </section>

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
