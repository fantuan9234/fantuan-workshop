import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNpcAssets } from '../data/useNpcAssets'
import { useProject } from '../data/ProjectContext'
import { IconEvent, IconHeart, IconMap, IconSeason, IconWeather, IconPerson } from '../components/Icons'
import { useT, asString } from '../i18n'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import { generateEventId, sampleEvents, type GameEvent } from '../data/eventData'

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
  'both': '春夏', 'Both': '春夏',
}

const weatherLabels: Record<string, string> = {
  'sunny': '晴天', 'rainy': '雨天', 'any': '不限', 'both': '不限',
}

const seasonColors: Record<string, string> = {
  'spring': 'bg-pink-500/20 text-pink-300',
  'summer': 'bg-yellow-500/20 text-yellow-300',
  'fall': 'bg-orange-500/20 text-orange-300',
  'winter': 'bg-blue-500/20 text-blue-300',
  'any': 'bg-gray-500/20 text-gray-400',
}

/** 地图英文名 → 中文翻译 */
const mapNameCN: Record<string, string> = {
  'Farm': '农场', 'FarmHouse': '农舍', 'Greenhouse': '温室',
  'FarmCave': '农场洞穴', 'Cellar': '酒窖',
  'Backwoods': '后山小径', 'BusStop': '公交站', 'Forest': '森林',
  'Tunnel': '隧道', 'Mountain': '山区',
  'Town': '小镇', 'ManorHouse': '庄园', 'HarveyRoom': '哈维房间',
  'Hospital': '医院', 'Clinic': '诊所',
  'SeedShop': '皮埃尔商店', 'PierreShop': '皮埃尔商店',
  'Blacksmith': '铁匠铺', 'Saloon': '酒吧',
  'LibraryMuseum': '图书馆博物馆', 'Museum': '博物馆',
  'CommunityCenter': '社区中心', 'JojaMart': '乔家超市',
  'Sunroom': '日光室', 'TownSquare': '镇广场',
  'Beach': '沙滩', 'BeachNightMarket': '沙滩夜市',
  'NightMarket': '夜市', 'Submarine': '潜水艇',
  'SubmarineCockpit': '潜水艇驾驶舱', 'MermaidHouse': '美人鱼小屋',
  'TrashBearLocation': '垃圾熊位置',
  'ElliottHouse': '艾略特小屋', 'LeahHouse': '莉亚小屋',
  'SamHouse': '山姆家', 'HaleyHouse': '海莉家',
  'AlexHouse': '亚历克斯家', 'EmilyHouse': '艾米丽家',
  'JodiHouse': '乔迪家', 'MaruHouse': '玛鲁家',
  'SebastianRoom': '塞巴斯蒂安房间', 'AbigailRoom': '阿比盖尔房间',
  'ScienceHouse': '罗宾木工坊', 'RobinHouse': '罗宾家',
  'MarnieRanch': '玛妮牧场', 'Ranch': '牧场',
  'WillyShop': '威利鱼店', 'FishShop': '威利鱼店',
  'WizardHouse': '法师塔', 'WizardHouseBasement': '法师塔地下室',
  'Trailer': '拖车', 'Trailer_Big': '大拖车', 'PamHouse': '潘姆家',
  'JoshHouse': '乔什家', 'GrandpasShed': '爷爷的棚屋',
  'HenchmanCave': '仆人洞穴',
  'Cabin1': '小屋1', 'Cabin2': '小屋2', 'Cabin3': '小屋3', 'Cabin4': '小屋4',
  'Cabin5': '小屋5', 'Cabin6': '小屋6', 'Cabin7': '小屋7', 'Cabin8': '小屋8',
  'Mine': '矿洞', 'Mines': '矿洞', 'UndergroundMine': '地下矿洞',
  'SkullCave': '骷髅洞穴', 'SkullCavern': '骷髅洞穴',
  'Sewer': '下水道', 'BugLand': '虫洞',
  'SlimeHutch': '史莱姆小屋', 'SlimeCave': '史莱姆洞穴',
  'Desert': '沙漠', 'Club': '赌场', 'Casino': '赌场',
  'QiNutRoom': '齐核桃房间', 'QiClub': '齐俱乐部',
  'AbandonedMine': '废弃矿洞', 'AbandonedMines': '废弃矿洞',
  'WitchSwamp': '巫婆沼泽', 'WitchHut': '巫婆小屋',
  'WitchWarpCave': '巫婆传送洞', 'WitchGarden': '巫婆花园',
  'Railroad': '铁路', 'Spa': '温泉',
  'BathHouse': '澡堂', 'BathHouse_Pool': '澡堂泳池',
  'BathHouse_Entry': '澡堂入口', 'BathHouse_MensLocker': '男更衣室',
  'BathHouse_WomensLocker': '女更衣室', 'Summit': '山顶',
  'AdventureGuild': '冒险公会', 'MarlonRoom': '马龙房间',
  'IslandFarmHouse': '姜岛农舍', 'IslandFarm': '姜岛农场',
  'IslandWest': '姜岛西部', 'IslandNorth': '姜岛北部',
  'IslandSouth': '姜岛南部', 'IslandEast': '姜岛东部',
  'IslandHut': '姜岛小屋', 'IslandShrine': '姜岛神殿',
  'IslandWestCave1': '姜岛西洞1', 'IslandWestCave2': '姜岛西洞2',
  'IslandNorthCave1': '姜岛北洞1', 'IslandNorthCave2': '姜岛北洞2',
  'IslandSoutheast': '姜岛东南', 'IslandSouthEast': '姜岛东南',
  'IslandSouthEastCave': '姜岛东南洞穴',
  'IslandWestDock': '姜岛西码头', 'IslandDock': '姜岛码头',
  'IslandLowerMine': '姜岛下层矿洞', 'IslandUpperMine': '姜岛上层矿洞',
  'IslandVolcanoDungeon': '姜岛火山地牢',
  'VolcanoDungeon0': '火山地牢0', 'VolcanoDungeon1': '火山地牢1',
  'VolcanoDungeon2': '火山地牢2', 'VolcanoDungeon3': '火山地牢3',
  'VolcanoDungeon4': '火山地牢4', 'VolcanoDungeon5': '火山地牢5',
  'Caldera': '火山口', 'IslandForge': '姜岛锻造台',
  'IslandFieldOffice': '姜岛野外办公室', 'IslandTurtle': '姜岛乌龟',
  'LeoTreeHouse': '雷欧树屋', 'IslandHouse': '姜岛房屋',
  'MovieTheater': '电影院', 'MovieTheaterConcession': '电影院小卖部',
  'MovieTheaterScreeningRoom': '电影院放映厅', 'MovieTheaterLobby': '电影院大厅',
  'Cave': '洞穴', 'DeepWoods': '深林',
  'DesertLake': '沙漠湖泊', 'DesertTunnel': '沙漠隧道',
  'ElliottCabin': '艾略特木屋', 'LeahCabin': '莉亚木屋',
  'Tent': '帐篷', 'Festival': '节日场地', 'Temp': '临时地图',
  'Forest-FlowerFestival': '森林-花舞节', 'Town-EggFestival': '小镇-蛋蛋节',
  'Beach-Luau': '沙滩-夏威夷宴会', 'Forest-MoonlightJamboree': '森林-月光果冻舞',
  'Town-StardewValleyFair': '小镇-星露谷展览会',
  'Mountain-IceFestival': '山区-冰雪节', 'Beach-NightMarket': '沙滩-夜市',
  'Town-FeastOfTheWinterStar': '小镇-冬日星盛宴',
  'Barn': '畜棚', 'Barn2': '大畜棚', 'Barn3': '豪华畜棚',
  'Coop': '鸡舍', 'Coop2': '大鸡舍', 'Coop3': '豪华鸡舍',
  'Mill': '磨坊', 'Silo': '筒仓', 'Shed': '棚屋', 'Shed2': '大棚屋',
  'Well': '水井', 'Stable': '马厩',
  'EarthObelisk': '土之方尖碑', 'WaterObelisk': '水之方尖碑',
  'DesertObelisk': '沙漠方尖碑', 'IslandObelisk': '岛屿方尖碑',
  'GoldClock': '金时钟', 'JunimoHut': '祝尼魔小屋',
}

function getMapCN(mapId: string): string {
  return mapNameCN[mapId] || mapId
}

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
            <h2 className="text-base font-bold themed-text-primary">{ts('events.title')}</h2>
            <p className="text-[10px] themed-text-dimmed">{ts('events.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] themed-text-dimmed">
            <span className="themed-text-primary font-medium">{customEvents.length}</span>{ts('events.custom')}
          </span>
          <span className="text-[11px] themed-text-disabled">|</span>
          <span className="text-[11px] themed-text-dimmed">
            <span className="themed-text-primary font-medium">{vanillaEvents.length}</span>{ts('events.vanilla')}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
        {/* ========== 上半: 我的创作 ========== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold themed-text-secondary flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full themed-bg-primary" />
              {ts('events.myCreation')}
              {customEvents.length > 0 && <span className="text-[10px] themed-text-dimmed font-normal">({customEvents.length})</span>}
            </h3>
            {customEvents.length > 0 && (
              <button onClick={handleCreate}
                className="text-[11px] px-3 py-1.5 rounded-lg themed-btn-primary font-medium transition-colors flex items-center gap-1.5">
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
                  <p className="text-lg font-semibold themed-text-primary">{ts('events.createFirst')}</p>
                  <p className="text-xs themed-text-dimmed mt-1.5 max-w-[280px]">{ts('events.createFirstDesc')}</p>
                </div>
                <div className="mt-2 px-5 py-2 rounded-lg themed-btn-primary text-xs font-medium transition-colors">
                  {ts('events.startCreate')}
                </div>
              </button>

              {/* 事件模板区：从示例快速创建 */}
              <div>
                <p className="text-[11px] themed-text-dimmed mb-2.5 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  或从模板快速开始（可在此基础上修改）
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {sampleEvents.map(tpl => (
                    <button key={tpl.id} onClick={() => handleCreateFromTemplate(tpl)}
                      className="text-left themed-bg-secondary rounded-xl p-3.5 themed-bg-card-hover transition-all group border border-transparent themed-border-hover">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg themed-bg-card flex items-center justify-center themed-text-muted">
                          <IconEvent />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold themed-text-primary truncate">{tpl.title}</p>
                          <p className="text-[9px] themed-text-dimmed">{tpl.heartRequired}心 · {tpl.steps.length}步</p>
                        </div>
                      </div>
                      <p className="text-[10px] themed-text-muted line-clamp-2 leading-relaxed">{tpl.description}</p>
                      <div className="mt-2 flex items-center gap-1 text-[9px] themed-text-disabled group-hover:themed-text-muted transition-colors">
                        <span>使用此模板</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
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
                      <h4 className="text-sm font-semibold themed-text-primary truncate">{event.title}</h4>
                      <p className="text-[10px] themed-text-dimmed mt-0.5">{event.created} {ts('events.created')}</p>
                    </div>
                  </div>

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1.5">
                    {/* 主NPC + 心数归属标识（优先显示） */}
                    {event.mainNpcId && event.heartRequired > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30 font-medium">
                        <IconHeart />{(event.npcNames && event.npcNames[event.npcIds.indexOf(event.mainNpcId)]) ?? event.mainNpcId} · {event.heartRequired}心事件
                      </span>
                    ) : (
                      <>
                        {event.npcIds.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300">
                            <IconPerson />{event.npcIds.join('、')}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-red-500/15 text-red-300">
                          <IconHeart />{event.heartRequired}{ts('events.hearts')}
                        </span>
                      </>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300">
                      <IconMap />{getMapCN(event.map)}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md ${seasonColors[event.season] || seasonColors['any']}`}>
                      <IconSeason />{seasonLabels[event.season] || event.season}
                    </span>
                  </div>

                  {/* 步骤数 */}
                  <div className="mt-3 pt-2 border-t themed-border-secondary flex items-center justify-between">
                    <span className="text-[10px] themed-text-dimmed">{event.steps.length} {ts('events.steps')}</span>
                    <span className="text-[10px] themed-text-disabled group-hover:themed-text-muted transition-colors">{ts('events.clickEdit')}</span>
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
            {ts('events.reference')}
            {!loading && <span className="text-[10px] themed-text-dimmed font-normal">({filteredEvents.length})</span>}
          </h3>

          {/* 搜索 + 筛选 */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 max-w-xs min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 themed-text-dimmed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={ts('events.search')}
                className="w-full themed-bg-primary border themed-border-primary rounded-lg pl-9 pr-3 py-2 text-xs themed-text-secondary placeholder:themed-text-disabled focus:outline-none themed-border-hover transition-colors" />
            </div>
            <select value={filterMap} onChange={e => setFilterMap(e.target.value)}
              className="text-[11px] px-3 py-2 rounded-lg themed-bg-primary border themed-border-primary themed-text-tertiary focus:outline-none themed-border-hover">
              <option value="all">{ts('events.allMaps')}</option>
              {maps.map(m => <option key={m} value={m}>{getMapCN(m)}</option>)}
            </select>
            <div className="flex gap-1">
              {['all', 'spring', 'summer', 'fall', 'winter'].map(s => (
                <button key={s} onClick={() => setFilterSeason(s)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-md transition-colors ${filterSeason === s ? 'themed-btn-primary font-medium' : 'themed-text-muted hover:themed-text-primary themed-bg-active'}`}>
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
              <p className="text-xs">{ts('events.loading')}</p>
            </div>
          ) : !unpackedRoot ? (
            <div className="flex flex-col items-center justify-center py-16 themed-text-dimmed">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-30 mb-2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              <p className="text-xs">{ts('events.unpackFirst')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {pagedEvents.map(event => (
                <div key={event.id} className="themed-bg-secondary rounded-xl px-4 py-3 themed-bg-card-hover transition-colors border border-transparent themed-border-primary">
                  <div className="flex items-start gap-3">
                    {/* 地图图标 */}
                    <div className="w-8 h-8 rounded-lg themed-bg-card flex items-center justify-center flex-shrink-0 themed-text-dimmed">
                      <IconMap />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium themed-text-primary truncate">{getMapCN(event.map)}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${seasonColors[event.season?.toLowerCase()] || seasonColors['any']}`}>
                          {seasonLabels[event.season] || event.season}
                        </span>
                        {event.time && <span className="text-[9px] themed-text-dimmed">{event.time}</span>}
                      </div>
                      {event.npcIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {event.npcIds.slice(0, 4).map(npc => (
                            <span key={npc} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">{npc}</span>
                          ))}
                          {event.npcIds.length > 4 && <span className="text-[9px] themed-text-disabled">+{event.npcIds.length - 4}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-[9px] px-1.5 py-0.5 rounded themed-bg-card themed-text-dimmed font-mono">{event.key || event.id.split('/').pop()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && unpackedRoot && filteredEvents.length === 0 && (
            <div className="text-center py-12 themed-text-dimmed text-xs">{ts('events.noMatch')}</div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 text-[11px] rounded-lg themed-bg-secondary themed-text-tertiary themed-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                {ts('events.prevPage')}
              </button>
              <span className="text-[11px] themed-text-dimmed">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-[11px] rounded-lg themed-bg-secondary themed-text-tertiary themed-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
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
