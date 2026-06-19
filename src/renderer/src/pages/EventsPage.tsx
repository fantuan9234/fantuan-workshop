import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNpcAssets } from '../data/useNpcAssets'
import { useProject } from '../data/ProjectContext'
import { getMapCN } from '../data/useMapLibrary'
import { IconEvent, IconHeart, IconMap, IconSeason, IconWeather, IconPerson } from '../components/Icons'
import { useT, asString } from '../i18n'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { generateEventId, type GameEvent } from '../data/eventData'

/** 从解包数据读取的原版事件 */
interface VanillaEvent {
  id: string
  map: string
  season: string
  time: string
  key: string
  script: string
  npcIds: string[]
}

/** 用户创建的自定义事件 */
interface CustomEvent {
  id: string
  title: string
  npcIds: string[]
  npcNames?: string[]
  mainNpcId?: string
  heartRequired: number
  map: string
  timeStart: string
  timeEnd: string
  season: string
  weather: string
  description: string
  steps: { id: string; type: string; label: string; config: Record<string, string> }[]
  created: string
}

const seasonLabels: Record<string, string> = {
  'spring': '春', 'summer': '夏', 'fall': '秋', 'winter': '冬',
  'Spring': '春', 'Summer': '夏', 'Fall': '秋', 'Winter': '冬',
  'any': '不限', 'Any': '不限', 'all': '不限', 'All': '不限',
}

const weatherLabels: Record<string, string> = {
  'sunny': '晴天', 'rainy': '雨天', 'any': '不限',
}

const seasonColors: Record<string, string> = {
  'spring': 'bg-pink-500/20 text-pink-300',
  'summer': 'bg-yellow-500/20 text-yellow-300',
  'fall': 'bg-orange-500/20 text-orange-300',
  'winter': 'bg-blue-500/20 text-blue-300',
  'any': 'bg-gray-500/20 text-gray-400',
}

// getMapCN 已从 useMapLibrary 统一导入，不再硬编码地图翻译

export default function EventsPage(): JSX.Element {
  const navigate = useNavigate()
  const { unpackedRoot } = useNpcAssets()
  const { registerSnapshot, mutateSnapshot, markDirty } = useProject()
  const t = useT()
  /** 强制收窄为 string 的本地 helper */
  const ts = (k: string): string => asString(t, k)
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // ---- 自定义事件 ----
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([])
  const customEventsRef = useRef<CustomEvent[]>([])
  customEventsRef.current = customEvents
  useEffect(() => {
    return registerSnapshot('events',
      () => customEventsRef.current,
      (data: unknown) => { if (Array.isArray(data)) setCustomEvents(data as CustomEvent[]) }
    )
  }, [registerSnapshot])

  // ---- 原版事件 ----
  const [vanillaEvents, setVanillaEvents] = useState<VanillaEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!unpackedRoot) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    async function load() {
      const result = await window.electronAPI?.xnbListEvents?.(unpackedRoot || undefined)
      if (!cancelled && result?.success) {
        setVanillaEvents(result.events || [])
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [unpackedRoot])

  // ---- 筛选 ----
  const [search, setSearch] = useState('')
  const [filterMap, setFilterMap] = useState<string>('all')
  const [filterSeason, setFilterSeason] = useState<string>('all')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 40

  const maps = useMemo(() => {
    const set = new Set<string>()
    vanillaEvents.forEach(e => { if (e.map) set.add(e.map) })
    return [...set].sort()
  }, [vanillaEvents])

  const filteredEvents = useMemo(() => {
    let events = vanillaEvents
    if (filterMap !== 'all') events = events.filter(e => e.map === filterMap)
    if (filterSeason !== 'all') {
      events = events.filter(e => {
        const s = e.season?.toLowerCase() || ''
        return s === filterSeason.toLowerCase() || s === 'any' || s === 'both' || s === 'all'
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      events = events.filter(e =>
        e.map.toLowerCase().includes(q) ||
        e.npcIds.some(n => n.toLowerCase().includes(q)) ||
        e.id.toLowerCase().includes(q)
      )
    }
    return events
  }, [vanillaEvents, filterMap, filterSeason, search])

  useEffect(() => { setPage(0) }, [search, filterMap, filterSeason])

  const pagedEvents = useMemo(() => filteredEvents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filteredEvents, page])
  const totalPages = Math.ceil(filteredEvents.length / PAGE_SIZE)

  // ---- 创建自定义事件（直接进编辑器） ----
  const handleCreate = () => {
    const existingIds = customEventsRef.current.map(e => e.id)
    const newId = generateEventId(existingIds)
    const evt: CustomEvent = {
      id: newId,
      title: '新事件',
      npcIds: [],
      heartRequired: 0,
      map: 'Town',
      timeStart: '09:00',
      timeEnd: '17:00',
      season: 'any',
      weather: 'any',
      description: '',
      steps: [],
      created: new Date().toISOString().slice(0, 10),
    }
    mutateSnapshot<CustomEvent[]>('events', prev => [...prev, evt])
    navigate(`/events/${evt.id}`, { state: { newEvent: evt, allEvents: [...customEventsRef.current, evt] } })
  }

  /** 从模板创建事件（深拷贝模板并生成新ID） */
  const handleCreateFromTemplate = (template: GameEvent) => {
    const existingIds = customEventsRef.current.map(e => e.id)
    const newId = generateEventId(existingIds)
    const evt: CustomEvent = {
      id: newId,
      title: template.title + ' (副本)',
      npcIds: [...template.npcIds],
      heartRequired: template.heartRequired,
      map: template.map,
      timeStart: template.timeStart,
      timeEnd: template.timeEnd,
      season: template.season,
      weather: template.weather,
      description: template.description,
      // 深拷贝步骤，给每个步骤生成新ID避免冲突
      steps: template.steps.map(s => ({ ...s, id: `s${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, config: { ...s.config } })),
      created: new Date().toISOString().slice(0, 10),
    }
    mutateSnapshot<CustomEvent[]>('events', prev => [...prev, evt])
    navigate(`/events/${evt.id}`, { state: { newEvent: evt, allEvents: [...customEventsRef.current, evt] } })
  }

  const handleDeleteCustom = (id: string) => {
    setDeleteTarget(id)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      setCustomEvents(prev => prev.filter(e => e.id !== deleteTarget))
      markDirty()
      toast(ts('toast.deleted'), 'success')
      setDeleteTarget(null)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b themed-border-primary flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg themed-bg-card flex items-center justify-center themed-text-muted">
            <IconEvent />
          </div>
          <div>
            <h2 className="text-lg font-bold themed-text-primary">{ts('events.title')}</h2>
            <p className="text-xs themed-text-dimmed">{ts('events.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm themed-text-dimmed">
            <span className="themed-text-primary font-medium">{customEvents.length}</span>{ts('events.custom')}
          </span>
          <span className="text-sm themed-text-disabled">|</span>
          <span className="text-sm themed-text-dimmed">
            <span className="themed-text-primary font-medium">{vanillaEvents.length}</span>{ts('events.vanilla')}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
        {/* ========== 上半: 我的创作 ========== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold themed-text-secondary flex items-center gap-3">
              <span className="w-1.5 h-5 rounded-full themed-bg-primary" />
              {ts('events.myCreation')}
              {customEvents.length > 0 && <span className="text-xs themed-text-dimmed font-normal">({customEvents.length})</span>}
            </h3>
            {customEvents.length > 0 && (
              <button onClick={handleCreate}
                className="text-sm px-3 py-1.5 rounded-lg themed-btn-primary font-medium transition-colors flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {ts('events.newEvent')}
              </button>
            )}
          </div>

          {customEvents.length === 0 ? (
            <div className="space-y-5">
              {/* 空状态：大卡片式创建入口 */}
              <button onClick={handleCreate}
                className="w-full themed-bg-secondary border themed-border-primary border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 themed-border-hover themed-bg-card-hover transition-all group">
                <div className="w-20 h-20 rounded-2xl themed-bg-card flex items-center justify-center themed-bg-hover transition-colors">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="12" y1="10" x2="12" y2="16"/>
                    <line x1="9" y1="13" x2="15" y2="13"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold themed-text-primary">{ts('events.createFirst')}</p>
                  <p className="text-sm themed-text-dimmed mt-1.5 max-w-[320px]">{ts('events.createFirstDesc')}</p>
                </div>
                <div className="mt-2 px-5 py-2 rounded-lg themed-btn-primary text-sm font-medium transition-colors">
                  {ts('events.startCreate')}
                </div>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {customEvents.map(event => (
                <div key={event.id}
                  onClick={() => navigate(`/events/${event.id}`)}
                  className="themed-bg-secondary rounded-xl p-4 themed-bg-card-hover transition-all group relative cursor-pointer border border-transparent themed-border-hover">
                  {/* 删除按钮 */}
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCustom(event.id) }}
                    className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center themed-text-disabled hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>

                  {/* 图标 + 标题 */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg themed-bg-card flex items-center justify-center flex-shrink-0 themed-text-muted">
                      <IconEvent />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-semibold themed-text-primary truncate">{event.title}</h4>
                      <p className="text-xs themed-text-dimmed mt-0.5">{event.created} {ts('events.created')}</p>
                    </div>
                  </div>

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1.5">
                    {/* 主NPC + 心数归属标识（优先显示） */}
                    {event.mainNpcId && event.heartRequired > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30 font-medium">
                        <IconHeart />{(event.npcNames && event.npcNames[event.npcIds.indexOf(event.mainNpcId)]) ?? event.mainNpcId} · {event.heartRequired}心事件
                      </span>
                    ) : (
                      <>
                        {event.npcIds.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300">
                            <IconPerson />{event.npcIds.join('、')}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-red-500/15 text-red-300">
                          <IconHeart />{event.heartRequired}{ts('events.hearts')}
                        </span>
                      </>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300">
                      <IconMap />{getMapCN(event.map)}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md ${seasonColors[event.season] || seasonColors['any']}`}>
                      <IconSeason />{seasonLabels[event.season] || event.season}
                    </span>
                  </div>

                  {/* 步骤数 */}
                  <div className="mt-3 pt-2 border-t themed-border-secondary flex items-center justify-between">
                    <span className="text-xs themed-text-dimmed">{event.steps.length} {ts('events.steps')}</span>
                    <span className="text-xs themed-text-disabled group-hover:themed-text-muted transition-colors">{ts('events.clickEdit')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========== 下半: 游戏参考素材 ========== */}
        <section>
          <h3 className="text-base font-semibold themed-text-secondary mb-4 flex items-center gap-3">
            <span className="w-1.5 h-5 rounded-full themed-text-dimmed" />
            {ts('events.reference')}
            {!loading && <span className="text-xs themed-text-dimmed font-normal">({filteredEvents.length})</span>}
          </h3>

          {/* 搜索 + 筛选 */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 max-w-xs min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 themed-text-dimmed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={ts('events.search')}
                className="w-full themed-bg-primary border themed-border-primary rounded-lg pl-9 pr-3 py-2 text-sm themed-text-secondary placeholder:themed-text-disabled focus:outline-none themed-border-hover transition-colors" />
            </div>
            <select value={filterMap} onChange={e => setFilterMap(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg themed-bg-primary border themed-border-primary themed-text-tertiary focus:outline-none themed-border-hover">
              <option value="all">{ts('events.allMaps')}</option>
              {maps.map(m => <option key={m} value={m}>{getMapCN(m)}</option>)}
            </select>
            <div className="flex gap-1">
              {['all', 'spring', 'summer', 'fall', 'winter'].map(s => (
                <button key={s} onClick={() => setFilterSeason(s)}
                  className={`text-sm px-2.5 py-1.5 rounded-md transition-colors ${filterSeason === s ? 'themed-btn-primary font-medium' : 'themed-text-muted hover:themed-text-primary themed-bg-active'}`}>
                  {s === 'all' ? ts('events.allSeasons') : seasonLabels[s] || s}
                </button>
              ))}
            </div>
          </div>

          {/* 原版事件列表 */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 themed-text-dimmed">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-spin mb-3 opacity-40">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <p className="text-sm">{ts('events.loading')}</p>
            </div>
          ) : !unpackedRoot ? (
            <EmptyState
              icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>}
              title={ts('events.unpackFirst')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pagedEvents.map(event => (
                <div key={event.id} className="themed-bg-secondary rounded-xl px-4 py-3 themed-bg-card-hover transition-colors border border-transparent themed-border-primary">
                  <div className="flex items-start gap-3">
                    {/* 地图图标 */}
                    <div className="w-8 h-8 rounded-lg themed-bg-card flex items-center justify-center flex-shrink-0 themed-text-dimmed">
                      <IconMap />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium themed-text-primary truncate">{getMapCN(event.map)}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${seasonColors[event.season?.toLowerCase()] || seasonColors['any']}`}>
                          {seasonLabels[event.season] || event.season}
                        </span>
                        {event.time && <span className="text-[11px] themed-text-dimmed">{event.time}</span>}
                      </div>
                      {event.npcIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {event.npcIds.slice(0, 4).map(npc => (
                            <span key={npc} className="text-[11px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">{npc}</span>
                          ))}
                          {event.npcIds.length > 4 && <span className="text-[11px] themed-text-disabled">+{event.npcIds.length - 4}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-[11px] px-1.5 py-0.5 rounded themed-bg-card themed-text-dimmed font-mono">{event.key || event.id.split('/').pop()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && unpackedRoot && filteredEvents.length === 0 && (
            <EmptyState title={ts('events.noMatch')} />
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 text-sm rounded-lg themed-bg-secondary themed-text-tertiary themed-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                {ts('events.prevPage')}
              </button>
              <span className="text-sm themed-text-dimmed">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-sm rounded-lg themed-bg-secondary themed-text-tertiary themed-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                {ts('events.nextPage')}
              </button>
            </div>
          )}
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
