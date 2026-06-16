import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNpcAssets } from '../data/useNpcAssets'
import { useProject } from '../data/ProjectContext'
import { useT, asString } from '../i18n'
import { type BuildingLink, type NPCSpawnPoint, type LightConfig, type TileSheetEntry, type TilePropertyEntry, type RemoveWarpEntry } from '../data/mapData'
import MapPreviewModal from '../components/MapPreviewModal'

/** 从游戏素材解析出的地图信息 */
interface GameMapInfo {
  name: string
  tmxPath: string
  width: number
  height: number
  tilesheets: string[]
}

/** 地图覆盖补丁 */
export interface MapOverlayPatch {
  id: string
  /** 目标地图素材名，如 Maps/Town */
  target: string
  /** 覆盖文件相对路径（相对于模组 assets 目录），如 assets/town.tmx */
  fromFile: string
  /** 覆盖文件绝对路径（用于复制） */
  sourceFilePath: string
  /** 源区域（可选，null 表示整个地图） */
  fromArea: { X: number; Y: number; Width: number; Height: number } | null
  /** 目标区域（可选，null 表示左上角开始） */
  toArea: { X: number; Y: number; Width: number; Height: number } | null
  /** 补丁模式 */
  patchMode: 'ReplaceByLayer' | 'Overlay' | 'Replace'
  /** 日志名称 */
  logName: string
  /** 覆盖文件元数据 */
  overlayWidth: number
  overlayHeight: number
  overlayTilesheets: string[]
  overlayLayerNames: string[]
  /** EditMap: 设置地图大小 */
  setSize?: { width: number; height: number } | null
  /** EditMap: 右侧增加列数 */
  addToRight?: number | null
  /** EditMap: 底部增加行数 */
  addToBottom?: number | null
  /** EditMap: 添加自定义贴图集 */
  addTileSheets?: TileSheetEntry[] | null
  /** EditMap: 设置图块属性 */
  setTileProperties?: TilePropertyEntry[] | null
  /** EditMap: 移除传送点 */
  removeWarps?: RemoveWarpEntry[] | null
  /** EditMap: 设置地图属性 */
  setMapProperties?: Record<string, string> | null
}

/** 地点类型（与 exportUtils 中 Data/Locations.Type 对齐） */
export type LocationType = 'Outdoors' | 'Indoor' | 'Shed' | 'Decor' | 'Island'

/** 自定义地图（添加新地图到游戏） */
export interface CustomMap {
  id: string
  /** 用户填写的短名（中文/英文均可），最终会 slugify 并加 {{ModId}}_ 前缀 */
  mapName: string
  /** 显示名称 */
  displayName: string
  /** .tmx 文件绝对路径 */
  sourceFilePath: string
  /** 文件名 */
  fileName: string
  /** 地图宽高 */
  width: number
  height: number
  /** 贴图集 */
  tilesheets: string[]
  /** 图层名 */
  layerNames: string[]
  /** 地点类型，默认 Outdoors（户外） */
  locationType?: LocationType
  /** 背景音乐 key，默认 spring */
  music?: string
  /** Data/Locations: 是否户外（自动从 locationType 推导） */
  isOutdoors?: boolean
  /** Data/Locations: 是否农场 */
  isFarm?: boolean
  /** Data/Locations: 灯光颜色 */
  light?: LightConfig | null
  /** Data/Locations: 环境光颜色 */
  ambientLight?: { r: number; g: number; b: number } | null
  /** Data/Locations: NPC生成点 */
  npcSpawnPoints?: NPCSpawnPoint[] | null
}

/**
 * 将用户输入的"短名"清洗为 Content Patcher 安全的标识符片段
 * - 仅保留英文字母/数字/下划线
 * - 驼峰转下划线分隔
 * - 首字符必须是字母
 * - 对 null/undefined/非字符串输入安全返回空串
 */
export function slugifyMapName(input: unknown): string {
  if (input == null) return ''
  if (typeof input !== 'string') {
    // 防御性：把非字符串转成字符串
    try { input = String(input) } catch { return '' }
  }
  if (!input) return ''
  // 1) 驼峰转下划线：MyForest -> My_Forest
  let s = (input as string).replace(/([a-z])([A-Z])/g, '$1_$2')
  // 2) 替换空白与中文为下划线
  s = s.replace(/[\s\u4e00-\u9fa5]+/g, '_')
  // 3) 仅保留 [A-Za-z0-9_]
  s = s.replace(/[^A-Za-z0-9_]/g, '')
  // 4) 合并连续下划线
  s = s.replace(/_+/g, '_')
  // 5) 去除首尾下划线
  s = s.replace(/^_+|_+$/g, '')
  // 6) 首字符必须是字母
  if (s && /^[0-9_]/.test(s)) s = 'M_' + s
  return s
}

/**
 * 生成地图最终在游戏内的引用名（Content Patcher {{ModId}}_短名）
 */
export function buildFinalMapName(shortName: string): string {
  const slug = slugifyMapName(shortName) || 'Map'
  return `{{ModId}}_${slug}`
}

/** 从 .tmx 文件名生成推荐短名（去后缀、驼峰转下划线、清洗） */
export function suggestShortNameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '')
  return slugifyMapName(base) || 'Map'
}

/** 地图英文名 → 中文翻译 */
const mapNameCN: Record<string, string> = {
  // ===== 农场区域 =====
  'Farm': '农场', 'FarmHouse': '农舍', 'Greenhouse': '温室',
  'FarmCave': '农场洞穴', 'Cellar': '酒窖',
  'Backwoods': '后山小径', 'BusStop': '公交站', 'Forest': '森林',
  'Tunnel': '隧道', 'Mountain': '山区',

  // ===== 小镇 =====
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

  // ===== 居民房屋 =====
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

  // ===== 小屋（多人） =====
  'Cabin1': '小屋1', 'Cabin2': '小屋2', 'Cabin3': '小屋3', 'Cabin4': '小屋4',
  'Cabin5': '小屋5', 'Cabin6': '小屋6', 'Cabin7': '小屋7', 'Cabin8': '小屋8',

  // ===== 矿洞 =====
  'Mine': '矿洞', 'Mines': '矿洞',
  'UndergroundMine': '地下矿洞',
  'SkullCave': '骷髅洞穴', 'SkullCavern': '骷髅洞穴',
  'Sewer': '下水道', 'BugLand': '虫洞',
  'SlimeHutch': '史莱姆小屋', 'SlimeCave': '史莱姆洞穴',
  'Desert': '沙漠', 'Club': '赌场', 'Casino': '赌场',
  'QiNutRoom': '齐核桃房间', 'QiClub': '齐俱乐部',
  'AbandonedMine': '废弃矿洞', 'AbandonedMines': '废弃矿洞',

  // ===== 巫婆区域 =====
  'WitchSwamp': '巫婆沼泽', 'WitchHut': '巫婆小屋',
  'WitchWarpCave': '巫婆传送洞', 'WitchGarden': '巫婆花园',

  // ===== 铁路/温泉 =====
  'Railroad': '铁路', 'Spa': '温泉',
  'BathHouse': '澡堂', 'BathHouse_Pool': '澡堂泳池',
  'BathHouse_Entry': '澡堂入口', 'BathHouse_MensLocker': '男更衣室',
  'BathHouse_WomensLocker': '女更衣室',
  'Summit': '山顶',

  // ===== 冒险公会 =====
  'AdventureGuild': '冒险公会', 'MarlonRoom': '马龙房间',

  // ===== 姜岛 =====
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
  'IslandVolcanoDungeon': '姜岛火山地牢', 'VolcanoDungeon0': '火山地牢0',
  'VolcanoDungeon1': '火山地牢1', 'VolcanoDungeon2': '火山地牢2',
  'VolcanoDungeon3': '火山地牢3', 'VolcanoDungeon4': '火山地牢4',
  'VolcanoDungeon5': '火山地牢5',
  'Caldera': '火山口', 'IslandForge': '姜岛锻造台',
  'IslandFieldOffice': '姜岛野外办公室', 'IslandTurtle': '姜岛乌龟',
  'LeoTreeHouse': '雷欧树屋', 'IslandHouse': '姜岛房屋',

  // ===== 电影院 =====
  'MovieTheater': '电影院', 'MovieTheaterConcession': '电影院小卖部',
  'MovieTheaterScreeningRoom': '电影院放映厅',
  'MovieTheaterLobby': '电影院大厅',

  // ===== 其他 =====
  'Cave': '洞穴', 'DeepWoods': '深林',
  'DesertLake': '沙漠湖泊', 'DesertTunnel': '沙漠隧道',
  'ElliottCabin': '艾略特木屋', 'LeahCabin': '莉亚木屋',
  'Tent': '帐篷',
  'Festival': '节日场地',
  'Temp': '临时地图',

  // ===== 节日地图 =====
  'Forest-FlowerFestival': '森林-花舞节', 'Town-EggFestival': '小镇-蛋蛋节',
  'Beach-Luau': '沙滩-夏威夷宴会', 'Forest-MoonlightJamboree': '森林-月光果冻舞',
  'Town-StardewValleyFair': '小镇-星露谷展览会',
  'Mountain-IceFestival': '山区-冰雪节', 'Beach-NightMarket': '沙滩-夜市',
  'Town-FeastOfTheWinterStar': '小镇-冬日星盛宴',

  // ===== 矿洞层数 =====
  'UndergroundMine1': '矿洞1层', 'UndergroundMine2': '矿洞2层',
  'UndergroundMine3': '矿洞3层', 'UndergroundMine4': '矿洞4层',
  'UndergroundMine5': '矿洞5层',

  // ===== 更多建筑 =====
  'Barn': '畜棚', 'Barn2': '大畜棚', 'Barn3': '豪华畜棚',
  'Coop': '鸡舍', 'Coop2': '大鸡舍', 'Coop3': '豪华鸡舍',
  'Mill': '磨坊', 'Silo': '筒仓', 'Shed': '棚屋', 'Shed2': '大棚屋',
  'Well': '水井', 'Stable': '马厩', 'Obelisk': '方尖碑',
  'EarthObelisk': '土之方尖碑', 'WaterObelisk': '水之方尖碑',
  'DesertObelisk': '沙漠方尖碑', 'IslandObelisk': '岛屿方尖碑',
  'GoldClock': '金时钟', 'JunimoHut': '祝尼魔小屋',
}

function getMapCN(name: string): string {
  return mapNameCN[name] ? `${name}（${mapNameCN[name]}）` : name
}

function getMapShortCN(name: string): string {
  return mapNameCN[name] || name
}

type PatchMode = 'ReplaceByLayer' | 'Overlay' | 'Replace'
const patchModeLabels: Record<PatchMode, { labelKey: string; descKey: string; color: string }> = {
  ReplaceByLayer: { labelKey: 'maps.replaceByLayer', descKey: 'maps.replaceByLayerDesc', color: '#60a5fa' },
  Overlay: { labelKey: 'maps.overlay', descKey: 'maps.overlayDesc', color: '#4ade80' },
  Replace: { labelKey: 'maps.replace', descKey: 'maps.replaceDesc', color: '#f87171' },
}

/** 地图分类筛选 */
const mapCategoryFilters = [
  { key: 'all', labelKey: 'maps.filterAll' },
  { key: 'farm', labelKey: 'maps.filterFarm' },
  { key: 'town', labelKey: 'maps.filterTown' },
  { key: 'outdoor', labelKey: 'maps.filterOutdoor' },
  { key: 'indoor', labelKey: 'maps.filterIndoor' },
  { key: 'mine', labelKey: 'maps.filterMine' },
  { key: 'island', labelKey: 'maps.filterIsland' },
  { key: 'festival', labelKey: 'maps.filterFestival' },
  { key: 'special', labelKey: 'maps.filterSpecial' },
] as const

/** 根据地图名推断分类 */
function inferCategory(name: string): string {
  if (/Farm|Greenhouse|Cellar|Barn|Coop|Silo|Shed|Stable|Cabin\d/i.test(name)) return 'farm'
  if (/Town|Manor|SeedShop|Saloon|Blacksmith|JojaMart|Community|Library|Hospital/i.test(name)) return 'town'
  if (/Island|Volcano|Caldera/i.test(name)) return 'island'
  if (/Mine|Skull|Sewer|Slime|Bug/i.test(name)) return 'mine'
  if (/Festival|Flower|Egg|Luau|Moonlight|Fair|Spirit|IceFestival|WinterStar/i.test(name)) return 'festival'
  if (/House|Room|Shop|Tavern|Cave|Bath|Spa|Club|Submarine|Movie|Hut|Tent|Guild|Trailer/i.test(name)) return 'indoor'
  if (/Forest|Beach|Desert|Mountain|Backwoods|BusStop|Railroad|Tunnel|Summit/i.test(name)) return 'outdoor'
  return 'special'
}

export default function MapsPage(): JSX.Element {
  const t = useT()
  /** 强制收窄为 string 的本地 helper */
  const ts = (k: string): string => asString(t, k)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [maps, setMaps] = useState<GameMapInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMap, setSelectedMap] = useState<GameMapInfo | null>(null)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const { unpackedRoot } = useNpcAssets()
  const { registerSnapshot, markDirty } = useProject()

  // ---- 覆盖补丁列表 ----
  const [patches, setPatches] = useState<MapOverlayPatch[]>([])

  // ---- 自定义地图列表 ----
  const [customMaps, setCustomMaps] = useState<CustomMap[]>([])

  // ---- 建筑关联列表 ----
  const [buildings, setBuildings] = useState<BuildingLink[]>([])

  // ---- 预览弹窗 ----
  const [previewMap, setPreviewMap] = useState<GameMapInfo | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // 注册到项目快照（用 ref 持有最新值，避免 deps 包含 patches/customMaps 导致循环）
  const patchesRef = useRef<MapOverlayPatch[]>([])
  patchesRef.current = patches
  useEffect(() => {
    const unreg = registerSnapshot('maps',
      () => patchesRef.current,
      (data: unknown) => { if (Array.isArray(data)) setPatches(data as MapOverlayPatch[]) }
    )
    return unreg
  }, [registerSnapshot])

  const customMapsRef = useRef<CustomMap[]>([])
  customMapsRef.current = customMaps
  useEffect(() => {
    const unreg = registerSnapshot('customMaps',
      () => customMapsRef.current,
      (data: unknown) => { if (Array.isArray(data)) setCustomMaps(data as CustomMap[]) }
    )
    return unreg
  }, [registerSnapshot])

  const buildingsRef = useRef<BuildingLink[]>([])
  buildingsRef.current = buildings
  useEffect(() => {
    const unreg = registerSnapshot('buildings',
      () => buildingsRef.current,
      (data: unknown) => { if (Array.isArray(data)) setBuildings(data as BuildingLink[]) }
    )
    return unreg
  }, [registerSnapshot])

  // ---- 添加自定义地图对话框 ----
  const [showAddMap, setShowAddMap] = useState(false)
  const [addMapForm, setAddMapForm] = useState({
    sourceFilePath: '', fileName: '', mapName: '', displayName: '',
    width: 0, height: 0, tilesheets: [] as string[], layerNames: [] as string[],
    locationType: 'Outdoors' as LocationType,
    music: 'spring',
    isFarm: false,
    lightEnabled: false, lightR: 255, lightG: 255, lightB: 255,
    ambientR: 255, ambientG: 255, ambientB: 255,
    npcSpawnPoints: [] as NPCSpawnPoint[],
  })
  const [selectingMapFile, setSelectingMapFile] = useState(false)

  // 已存在的地图名集合（用于冲突检测）
  const allExistingFinalNames = useMemo(() => {
    const set = new Set<string>()
    maps.forEach(m => set.add(`Maps/${m.name}`))
    customMaps.forEach(cm => {
      // 防御性：旧数据中 mapName 可能为 undefined/null/非字符串
      const safeName = slugifyMapName(cm?.mapName as unknown) || 'Map'
      set.add(`Maps/${safeName}`)
    })
    return set
  }, [maps, customMaps])

  const currentAddMapFinal = buildFinalMapName(addMapForm.mapName)
  // 只检测是否冲突（布尔），文案放到 JSX 内用 ts() 取，避免 useMemo 依赖函数引用
  const currentAddMapConflictExists = useMemo(() => {
    if (!addMapForm.mapName.trim()) return false
    const slug = slugifyMapName(addMapForm.mapName)
    if (!slug) return false
    return allExistingFinalNames.has(`Maps/${slug}`)
  }, [addMapForm.mapName, allExistingFinalNames])

  const handleSelectMapFile = async () => {
    setSelectingMapFile(true)
    try {
      const result = await window.electronAPI?.mapSelectOverlayFile?.()
      if (result) {
        const suggested = suggestShortNameFromFile(result.fileName)
        setAddMapForm(prev => ({
          ...prev,
          sourceFilePath: result.filePath,
          fileName: result.fileName,
          width: result.width,
          height: result.height,
          tilesheets: result.tilesheets,
          layerNames: result.layerNames,
          // ★ 短名只在用户尚未输入时才自动填充（避免覆盖）
          mapName: prev.mapName.trim() ? prev.mapName : suggested,
          displayName: prev.displayName.trim() ? prev.displayName : result.fileName.replace(/\.[^.]+$/, ''),
        }))
      }
    } finally {
      setSelectingMapFile(false)
    }
  }

  const handleAddCustomMap = () => {
    if (!addMapForm.sourceFilePath || !addMapForm.mapName.trim()) return
    if (currentAddMapConflictExists) return
    const slug = slugifyMapName(addMapForm.mapName) || 'Map'
    const cmap: CustomMap = {
      id: `cmap_${Date.now()}`,
      mapName: slug,
      displayName: addMapForm.displayName.trim() || slug,
      sourceFilePath: addMapForm.sourceFilePath,
      fileName: addMapForm.fileName,
      width: addMapForm.width,
      height: addMapForm.height,
      tilesheets: addMapForm.tilesheets,
      layerNames: addMapForm.layerNames,
      locationType: addMapForm.locationType,
      music: addMapForm.music,
      isOutdoors: addMapForm.locationType === 'Outdoors' || addMapForm.locationType === 'Island',
      isFarm: addMapForm.isFarm,
      light: addMapForm.lightEnabled ? { enabled: true, r: addMapForm.lightR, g: addMapForm.lightG, b: addMapForm.lightB } : null,
      ambientLight: { r: addMapForm.ambientR, g: addMapForm.ambientG, b: addMapForm.ambientB },
      npcSpawnPoints: addMapForm.npcSpawnPoints.length > 0 ? addMapForm.npcSpawnPoints : null,
    }
    setCustomMaps(prev => [...prev, cmap])
    markDirty()
    setShowAddMap(false)
    setAddMapForm({
      sourceFilePath: '', fileName: '', mapName: '', displayName: '',
      width: 0, height: 0, tilesheets: [], layerNames: [],
      locationType: 'Outdoors' as LocationType, music: 'spring',
      isFarm: false,
      lightEnabled: false, lightR: 255, lightG: 255, lightB: 255,
      ambientR: 255, ambientG: 255, ambientB: 255,
      npcSpawnPoints: [],
    })
  }

  const handleDeleteCustomMap = (id: string) => {
    setCustomMaps(prev => prev.filter(m => m.id !== id))
    markDirty()
  }

  // ---- 添加补丁对话框状态 ----
  const [showAddPatch, setShowAddPatch] = useState(false)
  const [patchForm, setPatchForm] = useState<{
    sourceFilePath: string
    fromFile: string
    overlayWidth: number
    overlayHeight: number
    overlayTilesheets: string[]
    overlayLayerNames: string[]
    fromAreaX: string
    fromAreaY: string
    fromAreaW: string
    fromAreaH: string
    toAreaX: string
    toAreaY: string
    toAreaW: string
    toAreaH: string
    patchMode: 'ReplaceByLayer' | 'Overlay' | 'Replace'
    logName: string
    // EditMap 新增字段
    setSizeW: string
    setSizeH: string
    addToRight: string
    addToBottom: string
    addTileSheets: TileSheetEntry[]
    setTileProperties: TilePropertyEntry[]
    removeWarps: RemoveWarpEntry[]
    setMapProperties: Array<{ id: string; key: string; value: string }>
  }>({
    sourceFilePath: '', fromFile: '', overlayWidth: 0, overlayHeight: 0,
    overlayTilesheets: [], overlayLayerNames: [],
    fromAreaX: '', fromAreaY: '', fromAreaW: '', fromAreaH: '',
    toAreaX: '', toAreaY: '', toAreaW: '', toAreaH: '',
    patchMode: 'ReplaceByLayer', logName: '',
    setSizeW: '', setSizeH: '', addToRight: '', addToBottom: '',
    addTileSheets: [], setTileProperties: [], removeWarps: [],
    setMapProperties: [],
  })
  const [selectingFile, setSelectingFile] = useState(false)

  // ---- 建筑关联对话框状态 ----
  const [showAddBuilding, setShowAddBuilding] = useState(false)
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null)
  const [buildingForm, setBuildingForm] = useState<{
    displayName: string
    exteriorMap: string
    exteriorX: number
    exteriorY: number
    interiorMap: string
    interiorX: number
    interiorY: number
    interiorExitX: number
    interiorExitY: number
    entryFacing: 'up' | 'down' | 'left' | 'right'
    exitFacing: 'up' | 'down' | 'left' | 'right'
  }>({
    displayName: '', exteriorMap: '', exteriorX: 0, exteriorY: 0,
    interiorMap: '', interiorX: 0, interiorY: 0,
    interiorExitX: 0, interiorExitY: 0,
    entryFacing: 'down', exitFacing: 'down',
  })

  const resetBuildingForm = () => {
    setBuildingForm({
      displayName: '', exteriorMap: '', exteriorX: 0, exteriorY: 0,
      interiorMap: '', interiorX: 0, interiorY: 0,
      interiorExitX: 0, interiorExitY: 0,
      entryFacing: 'down', exitFacing: 'down',
    })
    setEditingBuildingId(null)
  }

  // ---- 建筑关联地图选点状态 ----
  // pickTarget: 'exterior' = 外部入口, 'interiorEntry' = 内部入口, 'interiorExit' = 内部出口
  const [buildingPickTarget, setBuildingPickTarget] = useState<'exterior' | 'interiorEntry' | 'interiorExit' | null>(null)
  const [buildingPickMap, setBuildingPickMap] = useState<GameMapInfo | null>(null)

  /** 启动建筑关联的地图选点 */
  const startBuildingPick = (target: 'exterior' | 'interiorEntry' | 'interiorExit') => {
    const mapName = target === 'exterior' ? buildingForm.exteriorMap : buildingForm.interiorMap
    if (!mapName) return
    // 从原版地图或自定义地图中查找
    const found = maps.find(m => m.name === mapName)
    if (found) {
      setBuildingPickMap(found)
      setBuildingPickTarget(target)
    }
  }

  /** 建筑关联地图选点回调 */
  const handleBuildingPick = (x: number, y: number) => {
    if (buildingPickTarget === 'exterior') {
      setBuildingForm(prev => ({ ...prev, exteriorX: x, exteriorY: y }))
    } else if (buildingPickTarget === 'interiorEntry') {
      setBuildingForm(prev => ({ ...prev, interiorX: x, interiorY: y }))
    } else if (buildingPickTarget === 'interiorExit') {
      setBuildingForm(prev => ({ ...prev, interiorExitX: x, interiorExitY: y }))
    }
    setBuildingPickTarget(null)
    setBuildingPickMap(null)
  }

  const handleAddBuilding = () => {
    if (!buildingForm.displayName.trim() || !buildingForm.exteriorMap || !buildingForm.interiorMap) return
    const newBuilding: BuildingLink = {
      id: editingBuildingId || `bldg_${Date.now()}`,
      ...buildingForm,
    }
    if (editingBuildingId) {
      setBuildings(prev => prev.map(b => b.id === editingBuildingId ? newBuilding : b))
    } else {
      setBuildings(prev => [...prev, newBuilding])
    }
    markDirty()
    setShowAddBuilding(false)
    resetBuildingForm()
  }

  const handleEditBuilding = (b: BuildingLink) => {
    setEditingBuildingId(b.id)
    setBuildingForm({
      displayName: b.displayName,
      exteriorMap: b.exteriorMap,
      exteriorX: b.exteriorX,
      exteriorY: b.exteriorY,
      interiorMap: b.interiorMap,
      interiorX: b.interiorX,
      interiorY: b.interiorY,
      interiorExitX: b.interiorExitX,
      interiorExitY: b.interiorExitY,
      entryFacing: b.entryFacing,
      exitFacing: b.exitFacing,
    })
    setShowAddBuilding(true)
  }

  const handleDeleteBuilding = (id: string) => {
    setBuildings(prev => prev.filter(b => b.id !== id))
    markDirty()
  }

  // 加载地图列表
  const [scanError, setScanError] = useState<string | null>(null)
  const loadMaps = useCallback(async () => {
    if (!unpackedRoot) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setScanError(null)
    try {
      const result = await window.electronAPI?.xnbListMaps(unpackedRoot || undefined)
      if (!cancelled && result?.success) {
        setMaps(result.maps || [])
      } else if (!cancelled) {
        setScanError(result?.error || '扫描失败')
      }
    } catch (e) {
      if (!cancelled) setScanError(String(e))
    }
    if (!cancelled) setLoading(false)
    return () => { cancelled = true }
  }, [unpackedRoot])

  useEffect(() => {
    loadMaps()
  }, [loadMaps])

  // 筛选
  const filteredMaps = useMemo(() => {
    let result: GameMapInfo[]
    if (!search.trim()) {
      result = maps
    } else {
      const q = search.toLowerCase()
      result = maps.filter(m =>
        m.name.toLowerCase().includes(q) ||
        getMapShortCN(m.name).includes(q) ||
        m.tilesheets.some(ts => ts.toLowerCase().includes(q))
      )
    }
    // 分类筛选
    if (categoryFilter !== 'all') {
      result = result.filter(m => inferCategory(m.name) === categoryFilter)
    }
    // 排序：有中文名的地图优先，再按中文名排序
    return result.slice().sort((a, b) => {
      const na = mapNameCN[a.name]
      const nb = mapNameCN[b.name]
      if (na && !nb) return -1
      if (!na && nb) return 1
      if (na && nb) return na.localeCompare(nb, 'zh-CN')
      return a.name.localeCompare(b.name)
    })
  }, [maps, search, categoryFilter])

  // 渲染选中地图的预览图（用于右侧面板）
  useEffect(() => {
    if (!selectedMap) { setMapImageUrl(null); return }
    const map = selectedMap
    let cancelled = false
    setLoadingImage(true)
    async function render() {
      const dataUrl = await window.electronAPI?.mapRender(map.tmxPath, 800)
      if (!cancelled) {
        setMapImageUrl(dataUrl || null)
        setLoadingImage(false)
      }
    }
    render()
    return () => { cancelled = true }
  }, [selectedMap])

  // 渲染弹窗预览图
  useEffect(() => {
    if (!previewMap) { setPreviewImageUrl(null); return }
    const map = previewMap
    let cancelled = false
    setLoadingPreview(true)
    async function render() {
      const dataUrl = await window.electronAPI?.mapRender(map.tmxPath, 1200)
      if (!cancelled) {
        setPreviewImageUrl(dataUrl || null)
        setLoadingPreview(false)
      }
    }
    render()
    return () => { cancelled = true }
  }, [previewMap])

  const handleSelectMap = useCallback((map: GameMapInfo) => {
    setSelectedMap(map)
  }, [])

  // 选择覆盖文件
  const handleSelectOverlayFile = async () => {
    setSelectingFile(true)
    try {
      const result = await window.electronAPI?.mapSelectOverlayFile?.()
      if (result) {
        setPatchForm(prev => ({
          ...prev,
          sourceFilePath: result.filePath,
          fromFile: `assets/${result.fileName}`,
          overlayWidth: result.width,
          overlayHeight: result.height,
          overlayTilesheets: result.tilesheets,
          overlayLayerNames: result.layerNames,
          logName: prev.logName || result.fileName.replace(/\.[^.]+$/, ''),
        }))
      }
    } finally {
      setSelectingFile(false)
    }
  }

  // 提交补丁
  const handleAddPatch = () => {
    if (!selectedMap || !patchForm.sourceFilePath) return

    const fromArea = (patchForm.fromAreaX || patchForm.fromAreaY || patchForm.fromAreaW || patchForm.fromAreaH)
      ? { X: Number(patchForm.fromAreaX) || 0, Y: Number(patchForm.fromAreaY) || 0, Width: Number(patchForm.fromAreaW) || 0, Height: Number(patchForm.fromAreaH) || 0 }
      : null

    const toArea = (patchForm.toAreaX || patchForm.toAreaY || patchForm.toAreaW || patchForm.toAreaH)
      ? { X: Number(patchForm.toAreaX) || 0, Y: Number(patchForm.toAreaY) || 0, Width: Number(patchForm.toAreaW) || 0, Height: Number(patchForm.toAreaH) || 0 }
      : null

    const setSize = (patchForm.setSizeW || patchForm.setSizeH)
      ? { width: Number(patchForm.setSizeW) || 0, height: Number(patchForm.setSizeH) || 0 }
      : null

    const patch: MapOverlayPatch = {
      id: `patch_${Date.now()}`,
      target: `Maps/${selectedMap.name}`,
      fromFile: patchForm.fromFile,
      sourceFilePath: patchForm.sourceFilePath,
      fromArea,
      toArea,
      patchMode: patchForm.patchMode,
      logName: patchForm.logName || selectedMap.name,
      overlayWidth: patchForm.overlayWidth,
      overlayHeight: patchForm.overlayHeight,
      overlayTilesheets: patchForm.overlayTilesheets,
      overlayLayerNames: patchForm.overlayLayerNames,
      setSize,
      addToRight: patchForm.addToRight ? Number(patchForm.addToRight) || null : null,
      addToBottom: patchForm.addToBottom ? Number(patchForm.addToBottom) || null : null,
      addTileSheets: patchForm.addTileSheets.length > 0 ? patchForm.addTileSheets : null,
      setTileProperties: patchForm.setTileProperties.length > 0 ? patchForm.setTileProperties : null,
      removeWarps: patchForm.removeWarps.length > 0 ? patchForm.removeWarps : null,
      setMapProperties: patchForm.setMapProperties.length > 0
        ? Object.fromEntries(patchForm.setMapProperties.filter(p => p.key.trim()).map(p => [p.key, p.value]))
        : null,
    }

    setPatches(prev => [...prev, patch])
    markDirty()
    setShowAddPatch(false)
    resetPatchForm()
  }

  // 删除补丁
  const handleDeletePatch = (id: string) => {
    setPatches(prev => prev.filter(p => p.id !== id))
    markDirty()
  }

  const resetPatchForm = () => {
    setPatchForm({
      sourceFilePath: '', fromFile: '', overlayWidth: 0, overlayHeight: 0,
      overlayTilesheets: [], overlayLayerNames: [],
      fromAreaX: '', fromAreaY: '', fromAreaW: '', fromAreaH: '',
      toAreaX: '', toAreaY: '', toAreaW: '', toAreaH: '',
      patchMode: 'ReplaceByLayer', logName: '',
      setSizeW: '', setSizeH: '', addToRight: '', addToBottom: '',
      addTileSheets: [], setTileProperties: [], removeWarps: [],
      setMapProperties: [],
    })
  }

  // 当前选中地图的补丁
  const currentMapPatches = useMemo(() => {
    if (!selectedMap) return []
    const target = `Maps/${selectedMap.name}`
    return patches.filter(p => p.target === target)
  }, [patches, selectedMap])

  // 所有自定义地图 + 补丁 + 建筑关联的总数
  const myCreationCount = customMaps.length + patches.length + buildings.length

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b themed-border-primary flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg themed-bg-card flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold themed-text-primary">{ts('maps.title')}</h2>
          {myCreationCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 themed-text-secondary">
              {myCreationCount} {ts('maps.creations')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] themed-text-dimmed">
            共 <span className="themed-text-primary font-medium">{maps.length}</span> {ts('maps.vanillaMapCount')}
          </span>
        </div>
      </div>

      {/* 主内容区：可滚动 */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
        {/* ========== 上半: 我的创作 ========== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold themed-text-secondary flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-white" />
              {ts('maps.myCreation')}
              {myCreationCount > 0 && <span className="text-[11px] themed-text-dimmed font-normal">({myCreationCount})</span>}
            </h3>
            {myCreationCount > 0 && (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAddMap(true)}
                  className="text-[11px] themed-text-muted hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg hover:themed-bg-hover transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {ts('maps.addCustomMap')}
                </button>
                {selectedMap && (
                  <button onClick={() => { resetPatchForm(); setShowAddPatch(true) }}
                    className="text-[11px] themed-text-muted hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg hover:themed-bg-hover transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {ts('maps.addOverlayPatch')}
                  </button>
                )}
              </div>
            )}
          </div>

          {customMaps.length === 0 && patches.length === 0 && buildings.length === 0 ? (
            /* 空状态：大卡片创建入口 */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 添加自定义地图大卡片 */}
              <button onClick={() => setShowAddMap(true)}
                className="themed-bg-secondary border themed-border-primary rounded-2xl p-8 flex flex-col items-center justify-center gap-4 themed-border-hover hover:themed-bg-hover transition-all group">
                <div className="w-16 h-16 rounded-2xl themed-bg-card flex items-center justify-center group-hover:themed-bg-active transition-colors border themed-border-active">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" className="group-hover:stroke-white transition-colors">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                    <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold themed-text-primary">{ts('maps.addCustomMap')}</p>
                  <p className="text-xs themed-text-dimmed mt-1.5">{ts('maps.addCustomMapDesc')}</p>
                </div>
              </button>
              {/* 添加覆盖补丁大卡片 */}
              <button onClick={() => { if (selectedMap) { resetPatchForm(); setShowAddPatch(true) } }}
                className="themed-bg-secondary border themed-border-primary rounded-2xl p-8 flex flex-col items-center justify-center gap-4 themed-border-hover hover:themed-bg-hover transition-all group">
                <div className="w-16 h-16 rounded-2xl themed-bg-card flex items-center justify-center group-hover:themed-bg-active transition-colors border themed-border-active">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" className="group-hover:stroke-white transition-colors">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M12 8v8M8 12h8"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold themed-text-primary">{ts('maps.addOverlayPatch')}</p>
                  <p className="text-xs themed-text-dimmed mt-1.5">
                    {selectedMap ? `${ts('maps.addOverlayPatchDesc')} ${getMapShortCN(selectedMap.name)}` : ts('maps.addOverlayPatchSelectMap')}
                  </p>
                </div>
              </button>
              {/* 添加建筑关联大卡片 */}
              <button onClick={() => { resetBuildingForm(); setShowAddBuilding(true) }}
                className="themed-bg-secondary border themed-border-primary rounded-2xl p-8 flex flex-col items-center justify-center gap-4 themed-border-hover hover:themed-bg-hover transition-all group">
                <div className="w-16 h-16 rounded-2xl themed-bg-card flex items-center justify-center group-hover:themed-bg-active transition-colors border themed-border-active">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" className="group-hover:stroke-white transition-colors">
                    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold themed-text-primary">{ts('maps.addBuilding')}</p>
                  <p className="text-xs themed-text-dimmed mt-1.5">{ts('maps.addBuildingDesc')}</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 自定义地图卡片 */}
              {customMaps.length > 0 && (
                <div>
                  <p className="text-[11px] themed-text-dimmed mb-2.5 flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                    </svg>
                    {ts('maps.customMaps')}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {customMaps.map(cmap => {
                      const locType = cmap.locationType || 'Outdoors'
                      const locTypeColors: Record<LocationType, string> = {
                        Outdoors: '#4ade80', Indoor: '#a78bfa', Shed: '#f59e0b', Decor: '#94a3b8', Island: '#38bdf8',
                      }
                      const typeColor = locTypeColors[locType]
                      return (
                        <div key={cmap.id}
                          className="themed-bg-secondary rounded-xl p-4 themed-bg-card-hover transition-all text-left group relative border themed-border-secondary hover:themed-border-active">
                          <button onClick={() => handleDeleteCustomMap(cmap.id)}
                            className="absolute top-2 right-2 themed-text-disabled hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10 p-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                          {/* 自定义地图真实缩略图 */}
                          <CustomMapThumbnail sourceFilePath={cmap.sourceFilePath} typeColor={typeColor} />
                          <p className="text-sm themed-text-secondary font-medium truncate">{cmap.displayName}</p>
                          <p className="text-[10px] themed-text-dimmed mt-0.5 font-mono truncate" title={`Maps/${buildFinalMapName(cmap.mapName)}`}>
                            Maps/{buildFinalMapName(cmap.mapName)}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: typeColor + '20', color: typeColor }}>
                              {ts(`maps.locationType${locType}`)}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full themed-bg-card themed-text-muted">
                              {cmap.width}×{cmap.height}
                            </span>
                            {cmap.tilesheets.length > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full themed-bg-card themed-text-muted">
                                {cmap.tilesheets.length} {ts('maps.tilesheets')}
                              </span>
                            )}
                          </div>
                          {cmap.layerNames.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {cmap.layerNames.slice(0, 3).map((ln, i) => (
                                <span key={i} className="text-[8px] px-1 py-0.5 rounded themed-bg-card themed-text-dimmed">{ln}</span>
                              ))}
                              {cmap.layerNames.length > 3 && (
                                <span className="text-[8px] px-1 py-0.5 rounded themed-bg-card themed-text-dimmed">+{cmap.layerNames.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {/* 追加创建卡片 */}
                    <button onClick={() => setShowAddMap(true)}
                      className="themed-bg-secondary rounded-xl p-4 flex flex-col items-center justify-center gap-2 border border-dashed themed-border-active hover:border-[#666] hover:themed-bg-hover transition-all min-h-[140px]">
                      <div className="w-10 h-10 rounded-full themed-bg-card flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </div>
                      <span className="text-[11px] themed-text-dimmed">{ts('maps.addMap')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 覆盖补丁卡片 */}
              {patches.length > 0 && (
                <div>
                  <p className="text-[11px] themed-text-dimmed mb-2.5 flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M12 8v8M8 12h8"/>
                    </svg>
                    {ts('maps.overlayPatches')}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {patches.map(patch => {
                      const modeInfo = patchModeLabels[patch.patchMode]
                      return (
                        <div key={patch.id}
                          className="themed-bg-secondary rounded-xl p-4 themed-bg-card-hover transition-all text-left group relative border themed-border-secondary hover:themed-border-active">
                          <button onClick={() => handleDeletePatch(patch.id)}
                            className="absolute top-2 right-2 themed-text-disabled hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10 p-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                          <div className="w-12 h-12 rounded-xl bg-blue-900/20 flex items-center justify-center mb-3 border border-blue-800/30">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={modeInfo?.color || '#60a5fa'} strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <path d="M12 8v8M8 12h8"/>
                            </svg>
                          </div>
                          <p className="text-sm themed-text-secondary font-medium truncate">{patch.fromFile.split('/').pop()}</p>
                          <p className="text-[10px] themed-text-dimmed mt-0.5">{ts('maps.target')} {patch.target.replace('Maps/', '')}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: (modeInfo?.color || '#60a5fa') + '20', color: modeInfo?.color || '#60a5fa' }}>
                              {modeInfo ? ts(modeInfo.labelKey) : patch.patchMode}
                            </span>
                            {patch.overlayWidth > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full themed-bg-card themed-text-muted">
                                {patch.overlayWidth}×{patch.overlayHeight}
                              </span>
                            )}
                          </div>
                          {(patch.fromArea || patch.toArea) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {patch.fromArea && (
                                <span className="text-[8px] px-1 py-0.5 rounded themed-bg-card themed-text-dimmed">
                                  {ts('maps.sourceArea')} ({patch.fromArea.X},{patch.fromArea.Y}) {patch.fromArea.Width}×{patch.fromArea.Height}
                                </span>
                              )}
                              {patch.toArea && (
                                <span className="text-[8px] px-1 py-0.5 rounded themed-bg-card themed-text-dimmed">
                                  {ts('maps.targetArea')} ({patch.toArea.X},{patch.toArea.Y}) {patch.toArea.Width}×{patch.toArea.Height}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {/* 追加补丁卡片 */}
                    <button onClick={() => { if (selectedMap) { resetPatchForm(); setShowAddPatch(true) } }}
                      className="themed-bg-secondary rounded-xl p-4 flex flex-col items-center justify-center gap-2 border border-dashed themed-border-active hover:border-[#666] hover:themed-bg-hover transition-all min-h-[140px]">
                      <div className="w-10 h-10 rounded-full themed-bg-card flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </div>
                      <span className="text-[11px] themed-text-dimmed">{ts('maps.addPatch')}</span>
                    </button>
                  </div>
                </div>
              )}

            {/* 建筑关联卡片 */}
            {buildings.length > 0 && (
              <div>
                <p className="text-[11px] themed-text-dimmed mb-2.5 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>
                  </svg>
                  {ts('maps.buildings')}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {buildings.map(b => (
                    <div key={b.id}
                      className="themed-bg-secondary rounded-xl p-4 themed-bg-card-hover transition-all text-left group relative border themed-border-secondary hover:themed-border-active">
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                        <button onClick={() => handleEditBuilding(b)}
                          className="themed-text-disabled hover:text-blue-400 p-1" title={ts('maps.editBuilding')}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteBuilding(b.id)}
                          className="themed-text-disabled hover:text-red-400 p-1" title={ts('maps.deleteBuilding')}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-amber-900/20 flex items-center justify-center mb-3 border border-amber-800/30">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>
                        </svg>
                      </div>
                      <p className="text-sm themed-text-secondary font-medium truncate">{b.displayName}</p>
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400">
                            {ts('maps.buildingEntry')}
                          </span>
                          <span className="text-[10px] themed-text-dimmed font-mono truncate">
                            {getMapShortCN(b.exteriorMap)} ({b.exteriorX},{b.exteriorY})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-900/30 text-purple-400">
                            {ts('maps.buildingExit')}
                          </span>
                          <span className="text-[10px] themed-text-dimmed font-mono truncate">
                            {getMapShortCN(b.interiorMap)} ({b.interiorExitX},{b.interiorExitY})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* 追加建筑关联卡片 */}
                  <button onClick={() => { resetBuildingForm(); setShowAddBuilding(true) }}
                    className="themed-bg-secondary rounded-xl p-4 flex flex-col items-center justify-center gap-2 border border-dashed themed-border-active hover:border-[#666] hover:themed-bg-hover transition-all min-h-[140px]">
                    <div className="w-10 h-10 rounded-full themed-bg-card flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </div>
                    <span className="text-[11px] themed-text-dimmed">{ts('maps.addBuilding')}</span>
                  </button>
                </div>
              </div>
            )}
            </div>
        )}
        </section>

        {/* ========== 下半: 游戏参考素材 ========== */}
        <section>
          <h3 className="text-sm font-semibold themed-text-secondary mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-gray-500" />
            {ts('maps.reference')}
            {!loading && <span className="text-[11px] themed-text-dimmed font-normal">({filteredMaps.length})</span>}
          </h3>

          {/* 左右分栏：左侧地图网格 + 右侧预览面板 */}
          <div className="flex gap-4 items-start">
            {/* 左侧：搜索 + 筛选 + 地图卡片网格 */}
            <div className="flex-1 min-w-0">
              {/* 搜索 + 分类筛选 + 刷新 */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 themed-text-dimmed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={ts('maps.search')}
                    className="w-full themed-bg-primary border themed-border-primary rounded-lg pl-9 pr-3 py-2 text-xs themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555] transition-colors"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {mapCategoryFilters.map(f => (
                    <button key={f.key} onClick={() => setCategoryFilter(f.key)}
                      className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${categoryFilter === f.key ? 'bg-white text-black font-medium' : 'themed-text-muted hover:text-white themed-bg-active'}`}>
                      {ts(f.labelKey)}
                    </button>
                  ))}
                </div>
                {/* 地图数量 + 刷新按钮 */}
                <div className="flex items-center gap-2 ml-auto">
                  {maps.length > 0 && (
                    <span className="text-[10px] themed-text-dimmed">
                      共 {maps.length} 张地图{filteredMaps.length !== maps.length ? ` · 筛选 ${filteredMaps.length}` : ''}
                    </span>
                  )}
                  <button
                    onClick={() => loadMaps()}
                    disabled={loading || !unpackedRoot}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md themed-bg-active themed-text-muted hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="重新扫描解包目录"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''}>
                      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                    </svg>
                    {loading ? '扫描中' : '刷新'}
                  </button>
                </div>
              </div>

              {/* 扫描错误提示 */}
              {scanError && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-300 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>扫描失败：{scanError}</span>
                  <button onClick={() => setScanError(null)} className="ml-auto text-red-400 hover:text-red-300">x</button>
                </div>
              )}

              {/* 原版地图卡片网格 */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 themed-text-dimmed">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-spin mb-3 opacity-40">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  <p className="text-xs">{ts('maps.loading')}</p>
                </div>
              ) : !unpackedRoot ? (
                <div className="flex flex-col items-center justify-center py-16 themed-text-dimmed">
                  <div className="w-16 h-16 rounded-2xl themed-bg-card flex items-center justify-center mb-3">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                  </div>
                  <p className="text-xs themed-text-muted">{ts('maps.unpackFirst')}</p>
                  <p className="text-[10px] themed-text-disabled mt-1">{ts('maps.unpackHint')}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredMaps.map(map => {
                      const patchCount = patches.filter(p => p.target === `Maps/${map.name}`).length
                      const isSelected = selectedMap?.tmxPath === map.tmxPath
                      return (
                        <VanillaMapCard
                          key={map.tmxPath}
                          map={map}
                          isSelected={isSelected}
                          patchCount={patchCount}
                          onClick={() => handleSelectMap(map)}
                          onPreview={() => setPreviewMap(map)}
                        />
                      )
                    })}
                  </div>
                  {!loading && unpackedRoot && filteredMaps.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 themed-text-dimmed">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-30 mb-2">
                        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                        <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
                      </svg>
                      <p className="text-xs">{ts('maps.noMatch')}</p>
                      <button onClick={() => { setSearch(''); setCategoryFilter('all') }}
                        className="text-[11px] themed-text-muted hover:themed-text-secondary mt-2">{ts('maps.clearFilter')}</button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 右侧：选中地图的预览面板（sticky 固定，无需滚动到底部）*/}
            {selectedMap && (
              <div className="w-[420px] flex-shrink-0 sticky top-0 self-start">
                <section className="themed-bg-secondary rounded-2xl border themed-border-secondary overflow-hidden">
                  <div className="px-4 py-3 border-b themed-border-secondary">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold themed-text-primary truncate">{getMapCN(selectedMap.name)}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded themed-bg-card themed-text-muted">
                            {selectedMap.width} × {selectedMap.height} {ts('maps.tiles')}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400">
                            {selectedMap.tilesheets.length} {ts('maps.tilesheets')}
                          </span>
                          {currentMapPatches.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">
                              {currentMapPatches.length} {ts('maps.overlayPatchCount')}
                            </span>
                          )}
                        </div>
                        {/* 贴图集列表 */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {selectedMap.tilesheets.map((ts, i) => (
                            <span key={i} className="text-[9px] px-1 py-0.5 rounded themed-bg-primary themed-text-dimmed font-mono">
                              {ts.split('/').pop()}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => { resetPatchForm(); setShowAddPatch(true) }}
                        className="flex items-center gap-1.5 themed-btn-primary text-[11px] font-medium px-3 py-2 rounded-lg transition-colors flex-shrink-0"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        {ts('maps.addOverlayPatchBtn')}
                      </button>
                    </div>
                  </div>

                  {/* 覆盖补丁列表 */}
                  {currentMapPatches.length > 0 && (
                    <div className="px-4 py-3 border-b themed-border-secondary max-h-[160px] overflow-y-auto">
                      <h4 className="text-[11px] font-medium themed-text-muted mb-2">{ts('maps.overlayPatchesLabel')}</h4>
                      <div className="space-y-1.5">
                        {currentMapPatches.map(patch => {
                          const modeInfo = patchModeLabels[patch.patchMode]
                          return (
                            <div key={patch.id} className="themed-bg-primary rounded-lg px-2.5 py-2 border themed-border-secondary">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={modeInfo?.color || '#888'} strokeWidth="2">
                                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                                      <path d="M12 8v8M8 12h8"/>
                                    </svg>
                                    <span className="text-[11px] themed-text-primary font-medium truncate">{patch.fromFile.split('/').pop()}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                      style={{ backgroundColor: (modeInfo?.color || '#888') + '20', color: modeInfo?.color || '#888' }}>
                                      {modeInfo ? ts(modeInfo.labelKey) : patch.patchMode}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-[9px] themed-text-dimmed">
                                    <span>{ts('maps.target')} {patch.target}</span>
                                    {patch.overlayWidth > 0 && <span>{patch.overlayWidth} × {patch.overlayHeight}</span>}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeletePatch(patch.id)}
                                  className="themed-text-disabled hover:text-red-400 transition-colors ml-1 flex-shrink-0"
                                  title={ts('maps.deletePatch')}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 地图预览图 + 放大预览按钮 */}
                  <div className="flex items-center justify-center p-4 min-h-[200px] relative">
                    {loadingImage ? (
                      <div className="text-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" className="animate-spin mx-auto mb-2">
                          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                        </svg>
                        <p className="text-[11px] themed-text-dimmed">{ts('maps.rendering')}</p>
                      </div>
                    ) : mapImageUrl ? (
                      <div className="relative w-full rounded-lg overflow-hidden shadow-xl shadow-black/40 bg-[#0a0a0a] group">
                        <img
                          src={mapImageUrl}
                          alt={selectedMap.name}
                          className="w-full max-h-[400px] object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        {/* 放大预览按钮 - 点击打开带缩放和坐标显示的模态框 */}
                        <button
                          onClick={() => setPreviewMap(selectedMap)}
                          className="absolute top-2 right-2 themed-bg-active text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-[11px] font-medium shadow-lg"
                          title={ts('maps.preview')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"/>
                          </svg>
                          {ts('maps.preview')}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-14 h-14 mx-auto mb-2 rounded-lg bg-white/5 flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                            <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
                          </svg>
                        </div>
                        <p className="text-xs themed-text-muted font-medium">{ts('maps.renderFailed')}</p>
                        <p className="text-[10px] themed-text-disabled mt-1">{ts('maps.renderFailedHint')}</p>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-t themed-border-secondary">
                    <p className="text-[10px] themed-text-disabled flex items-center gap-1.5">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
                      </svg>
                      点击「{ts('maps.preview')}」放大查看坐标
                    </p>
                  </div>
                </section>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ========== 地图预览弹窗（支持缩放 + 真实坐标显示）========== */}
      {previewMap && (
        <MapPreviewModal
          map={{
            id: previewMap.name,
            name: previewMap.name,
            displayName: getMapCN(previewMap.name),
            category: inferCategory(previewMap.name) as any,
            indoor: false,
            season: 'all',
            description: '',
            imageUrl: previewImageUrl || '',
            warps: [],
            spawns: [],
            forageAreas: [],
            width: previewMap.width,
            height: previewMap.height,
          }}
          tmxPath={previewMap.tmxPath}
          onClose={() => setPreviewMap(null)}
        />
      )}

      {/* ========== 建筑关联地图选点弹窗 ========== */}
      {buildingPickMap && buildingPickTarget && (
        <MapPreviewModal
          map={{
            id: buildingPickMap.name,
            name: buildingPickMap.name,
            displayName: `${getMapCN(buildingPickMap.name)} — ${
              buildingPickTarget === 'exterior' ? '选择外部入口' :
              buildingPickTarget === 'interiorEntry' ? '选择内部入口' : '选择内部出口'
            }`,
            category: inferCategory(buildingPickMap.name) as any,
            indoor: false,
            season: 'all',
            description: '',
            imageUrl: '',
            warps: [],
            spawns: [],
            forageAreas: [],
            width: buildingPickMap.width,
            height: buildingPickMap.height,
          }}
          tmxPath={buildingPickMap.tmxPath}
          onClose={() => { setBuildingPickTarget(null); setBuildingPickMap(null) }}
          onPickTile={handleBuildingPick}
        />
      )}

      {/* ========== 添加自定义地图对话框 ========== */}
      {showAddMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddMap(false)}>
          <div className="themed-bg-secondary rounded-xl border themed-border-primary w-[90vw] max-w-[520px] max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b themed-border-primary flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold themed-text-primary">{ts('maps.addMapTitle')}</h3>
                <p className="text-[11px] themed-text-dimmed mt-0.5">{ts('maps.addMapSubtitle')}</p>
              </div>
              <button onClick={() => setShowAddMap(false)} className="themed-text-dimmed hover:themed-text-secondary transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* 选择地图文件 */}
              <div>
                <label className="text-[11px] themed-text-dimmed block mb-1.5">{ts('maps.mapFile')}</label>
                <button onClick={handleSelectMapFile} disabled={selectingMapFile}
                  className="w-full rounded-lg border border-dashed themed-border-active hover:border-[#666] themed-bg-primary hover:themed-bg-hover transition-colors px-4 py-4 text-left group">
                  {addMapForm.sourceFilePath ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span className="text-sm themed-text-primary font-medium">{addMapForm.fileName}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[10px] themed-text-dimmed">
                        {addMapForm.width > 0 && <span>{addMapForm.width} × {addMapForm.height} {ts('maps.tiles')}</span>}
                        {addMapForm.tilesheets.length > 0 && <span>{addMapForm.tilesheets.length} {ts('maps.tilesheets')}</span>}
                        {addMapForm.layerNames.length > 0 && <span>{addMapForm.layerNames.length} {ts('maps.layers')}</span>}
                      </div>
                      {addMapForm.layerNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {addMapForm.layerNames.map((ln, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded themed-bg-card themed-text-muted">{ln}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" className="mx-auto mb-2 group-hover:stroke-[#888] transition-colors">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                      <p className="text-xs themed-text-dimmed group-hover:themed-text-muted transition-colors">
                        {selectingMapFile ? ts('maps.selecting') : ts('maps.selectMapFile')}
                      </p>
                    </div>
                  )}
                </button>
              </div>

              {/* 地图短名（自动生成最终引用名） */}
              <div>
                <label className="text-[11px] themed-text-dimmed block mb-1.5">{ts('maps.shortName')}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={addMapForm.mapName}
                    onChange={e => setAddMapForm(prev => ({ ...prev, mapName: e.target.value }))}
                    placeholder={ts('maps.shortNamePlaceholder')}
                    className="flex-1 themed-bg-primary border themed-border-primary rounded-lg px-3 py-2 text-xs themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555] transition-colors"
                  />
                  {addMapForm.fileName && (
                    <button
                      type="button"
                      onClick={() => setAddMapForm(prev => ({ ...prev, mapName: suggestShortNameFromFile(prev.fileName) }))}
                      className="text-[10px] themed-text-muted hover:text-white px-2.5 py-2 rounded-lg themed-bg-card hover:themed-bg-active transition-colors flex-shrink-0"
                      title={ts('maps.useFileNameBtn')}
                    >
                      {ts('maps.useFileNameBtn')}
                    </button>
                  )}
                </div>
                {/* 最终引用名预览（只读） */}
                <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded themed-bg-primary border themed-border-secondary">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  <span className="text-[10px] themed-text-dimmed">Maps/</span>
                  <span className="text-[10px] themed-text-secondary font-mono break-all">
                    {currentAddMapFinal}
                  </span>
                </div>
                {currentAddMapConflictExists ? (
                  <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {ts('maps.nameConflict')}
                  </p>
                ) : (
                  <p className="text-[10px] themed-text-disabled mt-1.5">{ts('maps.shortNameHint')}</p>
                )}
              </div>

              {/* 显示名称 */}
              <div>
                <label className="text-[11px] themed-text-dimmed block mb-1.5">{ts('maps.displayName')}</label>
                <input
                  type="text"
                  value={addMapForm.displayName}
                  onChange={e => setAddMapForm(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder={ts('maps.displayNamePlaceholder')}
                  className="w-full themed-bg-primary border themed-border-primary rounded-lg px-3 py-2 text-xs themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555] transition-colors"
                />
              </div>

              {/* 地点类型（与 Data/Locations.Type 对齐） */}
              <div>
                <label className="text-[11px] themed-text-dimmed block mb-1.5">{ts('maps.locationType')}</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {([
                    { key: 'Outdoors', icon: '🌲' },
                    { key: 'Indoor', icon: '🏠' },
                    { key: 'Shed', icon: '🏚️' },
                    { key: 'Decor', icon: '🖼️' },
                    { key: 'Island', icon: '🏝️' },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setAddMapForm(prev => ({ ...prev, locationType: opt.key }))}
                      className={`text-[10px] px-2 py-2 rounded-lg transition-colors flex flex-col items-center gap-0.5 ${
                        addMapForm.locationType === opt.key
                          ? 'bg-white text-black font-medium'
                          : 'themed-bg-card themed-text-muted hover:text-white hover:themed-bg-active'
                      }`}
                      title={ts(`maps.locationType${opt.key}`)}
                    >
                      <span className="text-base leading-none">{opt.icon}</span>
                      <span>{ts(`maps.locationType${opt.key}`)}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] themed-text-disabled mt-1.5">{ts('maps.locationTypeHint')}</p>
              </div>

              {/* 背景音乐（仅户外/岛屿时显示） */}
              {(addMapForm.locationType === 'Outdoors' || addMapForm.locationType === 'Island') && (
                <div>
                  <label className="text-[11px] themed-text-dimmed block mb-1.5">{ts('maps.music')}</label>
                  <select
                    value={addMapForm.music}
                    onChange={e => setAddMapForm(prev => ({ ...prev, music: e.target.value }))}
                    className="w-full themed-bg-primary border themed-border-primary rounded-lg px-3 py-2 text-xs themed-text-secondary focus:outline-none focus:border-[#555]"
                  >
                    <option value="spring">🌸 spring (春)</option>
                    <option value="summer">☀️ summer (夏)</option>
                    <option value="fall">🍂 fall (秋)</option>
                    <option value="winter">❄️ winter (冬)</option>
                    <option value="forest">🌳 forest (森林)</option>
                    <option value="woods">🌲 woods (树林)</option>
                    <option value="town">🏘️ town (小镇)</option>
                    <option value="saloon">🍺 saloon (酒吧)</option>
                    <option value="ocean">🌊 ocean (海洋)</option>
                    <option value="night">🌙 night (夜晚)</option>
                  </select>
                </div>
              )}

              {/* 是否农场 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[11px] themed-text-dimmed block">{ts('maps.isFarm')}</label>
                  <p className="text-[10px] themed-text-disabled mt-0.5">{ts('maps.isFarmHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddMapForm(prev => ({ ...prev, isFarm: !prev.isFarm }))}
                  className={`w-9 h-5 rounded-full transition-colors relative ${addMapForm.isFarm ? 'bg-emerald-500' : 'themed-bg-active'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${addMapForm.isFarm ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* 灯光颜色 */}
              <div className="themed-bg-primary rounded-lg p-3 border themed-border-secondary space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-yellow-900/30 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    </div>
                    <span className="text-xs themed-text-secondary">{ts('maps.light')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddMapForm(prev => ({ ...prev, lightEnabled: !prev.lightEnabled }))}
                    className={`w-9 h-5 rounded-full transition-colors relative ${addMapForm.lightEnabled ? 'bg-emerald-500' : 'themed-bg-active'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${addMapForm.lightEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {addMapForm.lightEnabled && (
                  <div className="grid grid-cols-3 gap-2">
                    {(['lightR', 'lightG', 'lightB'] as const).map((ch, i) => (
                      <div key={ch}>
                        <label className="text-[9px] themed-text-disabled block mb-0.5">{['R', 'G', 'B'][i]}</label>
                        <input type="number" min={0} max={255} value={addMapForm[ch]}
                          onChange={e => setAddMapForm(prev => ({ ...prev, [ch]: Math.min(255, Math.max(0, Number(e.target.value) || 0)) }))}
                          className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                      </div>
                    ))}
                    <div className="col-span-3 flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded border themed-border-primary" style={{ backgroundColor: `rgb(${addMapForm.lightR},${addMapForm.lightG},${addMapForm.lightB})` }} />
                      <span className="text-[9px] themed-text-disabled">rgb({addMapForm.lightR}, {addMapForm.lightG}, {addMapForm.lightB})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 环境光颜色 */}
              <div className="themed-bg-primary rounded-lg p-3 border themed-border-secondary space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-blue-900/30 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                  </div>
                  <span className="text-xs themed-text-secondary">{ts('maps.ambientLight')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['ambientR', 'ambientG', 'ambientB'] as const).map((ch, i) => (
                    <div key={ch}>
                      <label className="text-[9px] themed-text-disabled block mb-0.5">{['R', 'G', 'B'][i]}</label>
                      <input type="number" min={0} max={255} value={addMapForm[ch]}
                        onChange={e => setAddMapForm(prev => ({ ...prev, [ch]: Math.min(255, Math.max(0, Number(e.target.value) || 0)) }))}
                        className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                    </div>
                  ))}
                  <div className="col-span-3 flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded border themed-border-primary" style={{ backgroundColor: `rgb(${addMapForm.ambientR},${addMapForm.ambientG},${addMapForm.ambientB})` }} />
                    <span className="text-[9px] themed-text-disabled">rgb({addMapForm.ambientR}, {addMapForm.ambientG}, {addMapForm.ambientB})</span>
                  </div>
                </div>
              </div>

              {/* NPC生成点 */}
              <div className="themed-bg-primary rounded-lg p-3 border themed-border-secondary space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-purple-900/30 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <span className="text-xs themed-text-secondary">{ts('maps.npcSpawnPoints')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddMapForm(prev => ({
                      ...prev,
                      npcSpawnPoints: [...prev.npcSpawnPoints, { id: `npc_${Date.now()}`, npc: '', x: 0, y: 0, direction: 0 }]
                    }))}
                    className="text-[10px] px-2 py-1 rounded-md themed-bg-card themed-text-muted hover:text-white hover:themed-bg-active transition-colors"
                  >
                    + {ts('maps.addNpcSpawn')}
                  </button>
                </div>
                {addMapForm.npcSpawnPoints.length === 0 && (
                  <p className="text-[10px] themed-text-disabled">{ts('maps.noNpcSpawnPoints')}</p>
                )}
                {addMapForm.npcSpawnPoints.map((sp, idx) => (
                  <div key={sp.id} className="themed-bg-secondary rounded-lg p-2.5 border themed-border-primary space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] themed-text-muted">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setAddMapForm(prev => ({ ...prev, npcSpawnPoints: prev.npcSpawnPoints.filter(s => s.id !== sp.id) }))}
                        className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                      >
                        {ts('maps.remove')}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] themed-text-disabled block mb-0.5">NPC</label>
                        <input type="text" value={sp.npc}
                          onChange={e => setAddMapForm(prev => ({ ...prev, npcSpawnPoints: prev.npcSpawnPoints.map(s => s.id === sp.id ? { ...s, npc: e.target.value } : s) }))}
                          placeholder="Abigail"
                          className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]" />
                      </div>
                      <div>
                        <label className="text-[9px] themed-text-disabled block mb-0.5">{ts('maps.direction')}</label>
                        <select value={sp.direction}
                          onChange={e => setAddMapForm(prev => ({ ...prev, npcSpawnPoints: prev.npcSpawnPoints.map(s => s.id === sp.id ? { ...s, direction: Number(e.target.value) } : s) }))}
                          className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]">
                          <option value={0}>{ts('maps.dirUp')}</option>
                          <option value={1}>{ts('maps.dirRight')}</option>
                          <option value={2}>{ts('maps.dirDown')}</option>
                          <option value={3}>{ts('maps.dirLeft')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] themed-text-disabled block mb-0.5">X</label>
                        <input type="number" value={sp.x}
                          onChange={e => setAddMapForm(prev => ({ ...prev, npcSpawnPoints: prev.npcSpawnPoints.map(s => s.id === sp.id ? { ...s, x: Number(e.target.value) || 0 } : s) }))}
                          className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                      </div>
                      <div>
                        <label className="text-[9px] themed-text-disabled block mb-0.5">Y</label>
                        <input type="number" value={sp.y}
                          onChange={e => setAddMapForm(prev => ({ ...prev, npcSpawnPoints: prev.npcSpawnPoints.map(s => s.id === sp.id ? { ...s, y: Number(e.target.value) || 0 } : s) }))}
                          className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-3 border-t themed-border-primary flex items-center justify-end gap-2">
              <button onClick={() => setShowAddMap(false)} className="px-4 py-2 text-xs themed-text-muted hover:text-white rounded-lg hover:themed-bg-hover transition-colors">{ts('maps.cancel')}</button>
              <button
                onClick={handleAddCustomMap}
                disabled={!addMapForm.sourceFilePath || !addMapForm.mapName.trim() || currentAddMapConflictExists}
                className={`px-5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  addMapForm.sourceFilePath && addMapForm.mapName.trim() && !currentAddMapConflictExists
                    ? 'themed-btn-primary'
                    : 'themed-bg-active themed-text-disabled cursor-not-allowed'
                }`}
              >
                {ts('maps.addMapBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 添加覆盖补丁对话框 ========== */}
      {showAddPatch && selectedMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddPatch(false)}>
          <div className="themed-bg-secondary rounded-xl border themed-border-primary w-[90vw] max-w-[520px] max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* 对话框头部 */}
            <div className="px-5 py-4 border-b themed-border-primary flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold themed-text-primary">{ts('maps.addPatchTitle')}</h3>
                <p className="text-[11px] themed-text-dimmed mt-0.5">{ts('maps.addPatchSubtitle')} <span className="themed-text-secondary">{getMapCN(selectedMap.name)}</span></p>
              </div>
              <button onClick={() => setShowAddPatch(false)} className="themed-text-dimmed hover:themed-text-secondary transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* 表单内容 */}
            <div className="px-5 py-4 space-y-4">
              {/* 选择覆盖文件 */}
              <div>
                <label className="text-[11px] themed-text-dimmed block mb-1.5">{ts('maps.overlayFile')}</label>
                <button
                  onClick={handleSelectOverlayFile}
                  disabled={selectingFile}
                  className="w-full rounded-lg border border-dashed themed-border-active hover:border-[#666] themed-bg-primary hover:themed-bg-hover transition-colors px-4 py-4 text-left group"
                >
                  {patchForm.sourceFilePath ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span className="text-sm themed-text-primary font-medium">{patchForm.fromFile.split('/').pop()}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[10px] themed-text-dimmed">
                        {patchForm.overlayWidth > 0 && <span>{patchForm.overlayWidth} × {patchForm.overlayHeight} {ts('maps.tiles')}</span>}
                        {patchForm.overlayTilesheets.length > 0 && <span>{patchForm.overlayTilesheets.length} {ts('maps.tilesheets')}</span>}
                        {patchForm.overlayLayerNames.length > 0 && <span>{patchForm.overlayLayerNames.length} {ts('maps.layers')}</span>}
                      </div>
                      {patchForm.overlayLayerNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {patchForm.overlayLayerNames.map((ln, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded themed-bg-card themed-text-muted">{ln}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" className="mx-auto mb-2 group-hover:stroke-[#888] transition-colors">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                      <p className="text-xs themed-text-dimmed group-hover:themed-text-muted transition-colors">
                        {selectingFile ? ts('maps.selecting') : ts('maps.selectOverlayFile')}
                      </p>
                    </div>
                  )}
                </button>
              </div>

              {/* 补丁模式 */}
              <div>
                <label className="text-[11px] themed-text-dimmed block mb-1.5">{ts('maps.patchMode')}</label>
                <div className="space-y-1.5">
                  {(Object.keys(patchModeLabels) as PatchMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPatchForm(prev => ({ ...prev, patchMode: mode }))}
                      className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                        patchForm.patchMode === mode
                          ? 'themed-bg-card ring-1 ring-[#555]'
                          : 'themed-bg-primary hover:themed-bg-hover'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                          patchForm.patchMode === mode ? 'border-white' : 'border-[#555]'
                        }`}>
                          {patchForm.patchMode === mode && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-xs themed-text-primary font-medium">{ts(patchModeLabels[mode].labelKey)}</span>
                      </div>
                      <p className="text-[10px] themed-text-dimmed mt-0.5 ml-5">{ts(patchModeLabels[mode].descKey)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 区域设置（可折叠） */}
              <AreaFields form={patchForm} setForm={setPatchForm} />

              {/* 日志名称 */}
              <div>
                <label className="text-[11px] themed-text-dimmed block mb-1.5">{ts('maps.logName')}</label>
                <input
                  type="text"
                  value={patchForm.logName}
                  onChange={e => setPatchForm(prev => ({ ...prev, logName: e.target.value }))}
                  placeholder={ts('maps.logNamePlaceholder')}
                  className="w-full themed-bg-primary border themed-border-primary rounded-lg px-3 py-2 text-xs themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555] transition-colors"
                />
              </div>

              {/* ===== EditMap 高级选项 ===== */}
              <div className="border-t themed-border-primary pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-md bg-cyan-900/30 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </div>
                  <span className="text-xs font-medium themed-text-secondary">{ts('maps.editMapAdvanced')}</span>
                </div>

                {/* 地图尺寸扩展 */}
                <div className="themed-bg-primary rounded-lg p-3 border themed-border-secondary space-y-3 mb-3">
                  <div className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                    <span className="text-[11px] themed-text-secondary">{ts('maps.mapSizeExtension')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] themed-text-disabled block mb-0.5">{ts('maps.setSizeWidth')}</label>
                      <input type="number" min={0} value={patchForm.setSizeW}
                        onChange={e => setPatchForm(prev => ({ ...prev, setSizeW: e.target.value }))}
                        placeholder="—"
                        className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]" />
                    </div>
                    <div>
                      <label className="text-[9px] themed-text-disabled block mb-0.5">{ts('maps.setSizeHeight')}</label>
                      <input type="number" min={0} value={patchForm.setSizeH}
                        onChange={e => setPatchForm(prev => ({ ...prev, setSizeH: e.target.value }))}
                        placeholder="—"
                        className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]" />
                    </div>
                    <div>
                      <label className="text-[9px] themed-text-disabled block mb-0.5">{ts('maps.addToRight')}</label>
                      <input type="number" min={0} value={patchForm.addToRight}
                        onChange={e => setPatchForm(prev => ({ ...prev, addToRight: e.target.value }))}
                        placeholder="0"
                        className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]" />
                    </div>
                    <div>
                      <label className="text-[9px] themed-text-disabled block mb-0.5">{ts('maps.addToBottom')}</label>
                      <input type="number" min={0} value={patchForm.addToBottom}
                        onChange={e => setPatchForm(prev => ({ ...prev, addToBottom: e.target.value }))}
                        placeholder="0"
                        className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]" />
                    </div>
                  </div>
                </div>

                {/* 自定义贴图集 */}
                <div className="themed-bg-primary rounded-lg p-3 border themed-border-secondary space-y-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                      <span className="text-[11px] themed-text-secondary">{ts('maps.addTileSheets')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPatchForm(prev => ({ ...prev, addTileSheets: [...prev.addTileSheets, { id: `ts_${Date.now()}`, id_field: '', imageSource: '', tileWidth: 16, tileHeight: 16 }] }))}
                      className="text-[10px] px-2 py-1 rounded-md themed-bg-card themed-text-muted hover:text-white hover:themed-bg-active transition-colors"
                    >
                      + {ts('maps.addTileSheet')}
                    </button>
                  </div>
                  {patchForm.addTileSheets.length === 0 && (
                    <p className="text-[10px] themed-text-disabled">{ts('maps.noTileSheets')}</p>
                  )}
                  {patchForm.addTileSheets.map((tsEntry, idx) => (
                    <div key={tsEntry.id} className="themed-bg-secondary rounded-lg p-2.5 border themed-border-primary space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] themed-text-muted">#{idx + 1}</span>
                        <button type="button"
                          onClick={() => setPatchForm(prev => ({ ...prev, addTileSheets: prev.addTileSheets.filter(t => t.id !== tsEntry.id) }))}
                          className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                        >{ts('maps.remove')}</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] themed-text-disabled block mb-0.5">ID</label>
                          <input type="text" value={tsEntry.id_field}
                            onChange={e => setPatchForm(prev => ({ ...prev, addTileSheets: prev.addTileSheets.map(t => t.id === tsEntry.id ? { ...t, id_field: e.target.value } : t) }))}
                            placeholder="z_custom_tileset"
                            className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]" />
                        </div>
                        <div>
                          <label className="text-[9px] themed-text-disabled block mb-0.5">{ts('maps.imageSource')}</label>
                          <input type="text" value={tsEntry.imageSource}
                            onChange={e => setPatchForm(prev => ({ ...prev, addTileSheets: prev.addTileSheets.map(t => t.id === tsEntry.id ? { ...t, imageSource: e.target.value } : t) }))}
                            placeholder="assets/tileset.png"
                            className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]" />
                        </div>
                        <div>
                          <label className="text-[9px] themed-text-disabled block mb-0.5">{ts('maps.tileWidth')}</label>
                          <input type="number" min={1} value={tsEntry.tileWidth}
                            onChange={e => setPatchForm(prev => ({ ...prev, addTileSheets: prev.addTileSheets.map(t => t.id === tsEntry.id ? { ...t, tileWidth: Number(e.target.value) || 16 } : t) }))}
                            className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                        </div>
                        <div>
                          <label className="text-[9px] themed-text-disabled block mb-0.5">{ts('maps.tileHeight')}</label>
                          <input type="number" min={1} value={tsEntry.tileHeight}
                            onChange={e => setPatchForm(prev => ({ ...prev, addTileSheets: prev.addTileSheets.map(t => t.id === tsEntry.id ? { ...t, tileHeight: Number(e.target.value) || 16 } : t) }))}
                            className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 图块属性 */}
                <div className="themed-bg-primary rounded-lg p-3 border themed-border-secondary space-y-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      <span className="text-[11px] themed-text-secondary">{ts('maps.setTileProperties')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPatchForm(prev => ({ ...prev, setTileProperties: [...prev.setTileProperties, { id: `tp_${Date.now()}`, layer: 'Back', x: 0, y: 0, properties: {} }] }))}
                      className="text-[10px] px-2 py-1 rounded-md themed-bg-card themed-text-muted hover:text-white hover:themed-bg-active transition-colors"
                    >
                      + {ts('maps.addTileProperty')}
                    </button>
                  </div>
                  {patchForm.setTileProperties.length === 0 && (
                    <p className="text-[10px] themed-text-disabled">{ts('maps.noTileProperties')}</p>
                  )}
                  {patchForm.setTileProperties.map((tp, idx) => (
                    <div key={tp.id} className="themed-bg-secondary rounded-lg p-2.5 border themed-border-primary space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] themed-text-muted">#{idx + 1}</span>
                        <button type="button"
                          onClick={() => setPatchForm(prev => ({ ...prev, setTileProperties: prev.setTileProperties.filter(t => t.id !== tp.id) }))}
                          className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                        >{ts('maps.remove')}</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] themed-text-disabled block mb-0.5">{ts('maps.layer')}</label>
                          <select value={tp.layer}
                            onChange={e => setPatchForm(prev => ({ ...prev, setTileProperties: prev.setTileProperties.map(t => t.id === tp.id ? { ...t, layer: e.target.value } : t) }))}
                            className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]">
                            <option value="Back">Back</option>
                            <option value="Buildings">Buildings</option>
                            <option value="Paths">Paths</option>
                            <option value="Front">Front</option>
                            <option value="AlwaysFront">AlwaysFront</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] themed-text-disabled block mb-0.5">X</label>
                          <input type="number" value={tp.x}
                            onChange={e => setPatchForm(prev => ({ ...prev, setTileProperties: prev.setTileProperties.map(t => t.id === tp.id ? { ...t, x: Number(e.target.value) || 0 } : t) }))}
                            className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                        </div>
                        <div>
                          <label className="text-[9px] themed-text-disabled block mb-0.5">Y</label>
                          <input type="number" value={tp.y}
                            onChange={e => setPatchForm(prev => ({ ...prev, setTileProperties: prev.setTileProperties.map(t => t.id === tp.id ? { ...t, y: Number(e.target.value) || 0 } : t) }))}
                            className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                        </div>
                      </div>
                      {/* 属性键值对 */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] themed-text-disabled">{ts('maps.properties')}</span>
                          <button type="button"
                            onClick={() => {
                              const propKey = `prop_${Date.now()}`
                              setPatchForm(prev => ({
                                ...prev,
                                setTileProperties: prev.setTileProperties.map(t =>
                                  t.id === tp.id ? { ...t, properties: { ...t.properties, [propKey]: '' } } : t
                                )
                              }))
                            }}
                            className="text-[9px] px-1.5 py-0.5 rounded themed-bg-card themed-text-muted hover:text-white transition-colors"
                          >+ {ts('maps.addProperty')}</button>
                        </div>
                        {Object.entries(tp.properties).map(([pk, pv]) => (
                          <div key={pk} className="flex items-center gap-1.5">
                            <input type="text" value={pk}
                              onChange={e => {
                                const oldKey = pk
                                const newKey = e.target.value
                                setPatchForm(prev => ({
                                  ...prev,
                                  setTileProperties: prev.setTileProperties.map(t => {
                                    if (t.id !== tp.id) return t
                                    const { [oldKey]: _, ...rest } = t.properties
                                    return { ...t, properties: { ...rest, [newKey]: pv } }
                                  })
                                }))
                              }}
                              placeholder="Key"
                              className="flex-1 themed-bg-primary border themed-border-primary rounded px-1.5 py-0.5 text-[10px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]" />
                            <span className="text-[10px] themed-text-disabled">=</span>
                            <input type="text" value={pv}
                              onChange={e => setPatchForm(prev => ({
                                ...prev,
                                setTileProperties: prev.setTileProperties.map(t =>
                                  t.id === tp.id ? { ...t, properties: { ...t.properties, [pk]: e.target.value } } : t
                                )
                              }))}
                              placeholder="Value"
                              className="flex-1 themed-bg-primary border themed-border-primary rounded px-1.5 py-0.5 text-[10px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]" />
                            <button type="button"
                              onClick={() => setPatchForm(prev => ({
                                ...prev,
                                setTileProperties: prev.setTileProperties.map(t => {
                                  if (t.id !== tp.id) return t
                                  const { [pk]: _, ...rest } = t.properties
                                  return { ...t, properties: rest }
                                })
                              }))}
                              className="text-[10px] text-red-400 hover:text-red-300"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 移除传送点 */}
                <div className="themed-bg-primary rounded-lg p-3 border themed-border-secondary space-y-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      <span className="text-[11px] themed-text-secondary">{ts('maps.removeWarps')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPatchForm(prev => ({ ...prev, removeWarps: [...prev.removeWarps, { id: `rw_${Date.now()}`, x: 0, y: 0 }] }))}
                      className="text-[10px] px-2 py-1 rounded-md themed-bg-card themed-text-muted hover:text-white hover:themed-bg-active transition-colors"
                    >
                      + {ts('maps.addRemoveWarp')}
                    </button>
                  </div>
                  {patchForm.removeWarps.length === 0 && (
                    <p className="text-[10px] themed-text-disabled">{ts('maps.noRemoveWarps')}</p>
                  )}
                  {patchForm.removeWarps.map((rw, idx) => (
                    <div key={rw.id} className="flex items-center gap-2">
                      <span className="text-[10px] themed-text-muted w-6">#{idx + 1}</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] themed-text-disabled block mb-0.5">X</label>
                          <input type="number" value={rw.x}
                            onChange={e => setPatchForm(prev => ({ ...prev, removeWarps: prev.removeWarps.map(r => r.id === rw.id ? { ...r, x: Number(e.target.value) || 0 } : r) }))}
                            className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                        </div>
                        <div>
                          <label className="text-[9px] themed-text-disabled block mb-0.5">Y</label>
                          <input type="number" value={rw.y}
                            onChange={e => setPatchForm(prev => ({ ...prev, removeWarps: prev.removeWarps.map(r => r.id === rw.id ? { ...r, y: Number(e.target.value) || 0 } : r) }))}
                            className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                        </div>
                      </div>
                      <button type="button"
                        onClick={() => setPatchForm(prev => ({ ...prev, removeWarps: prev.removeWarps.filter(r => r.id !== rw.id) }))}
                        className="text-[10px] text-red-400 hover:text-red-300 transition-colors mt-3"
                      >×</button>
                    </div>
                  ))}
                </div>

                {/* 地图属性 */}
                <div className="themed-bg-primary rounded-lg p-3 border themed-border-secondary space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      <span className="text-[11px] themed-text-secondary">{ts('maps.setMapProperties')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPatchForm(prev => ({ ...prev, setMapProperties: [...prev.setMapProperties, { id: `mp_${Date.now()}`, key: '', value: '' }] }))}
                      className="text-[10px] px-2 py-1 rounded-md themed-bg-card themed-text-muted hover:text-white hover:themed-bg-active transition-colors"
                    >
                      + {ts('maps.addMapProperty')}
                    </button>
                  </div>
                  {patchForm.setMapProperties.length === 0 && (
                    <p className="text-[10px] themed-text-disabled">{ts('maps.noMapProperties')}</p>
                  )}
                  {patchForm.setMapProperties.map((mp, idx) => (
                    <div key={mp.id} className="flex items-center gap-1.5">
                      <input type="text" value={mp.key}
                        onChange={e => setPatchForm(prev => ({ ...prev, setMapProperties: prev.setMapProperties.map(m => m.id === mp.id ? { ...m, key: e.target.value } : m) }))}
                        placeholder="Key"
                        className="flex-1 themed-bg-secondary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]" />
                      <span className="text-[10px] themed-text-disabled">=</span>
                      <input type="text" value={mp.value}
                        onChange={e => setPatchForm(prev => ({ ...prev, setMapProperties: prev.setMapProperties.map(m => m.id === mp.id ? { ...m, value: e.target.value } : m) }))}
                        placeholder="Value"
                        className="flex-1 themed-bg-secondary border themed-border-primary rounded px-2 py-1 text-[11px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]" />
                      <button type="button"
                        onClick={() => setPatchForm(prev => ({ ...prev, setMapProperties: prev.setMapProperties.filter(m => m.id !== mp.id) }))}
                        className="text-[10px] text-red-400 hover:text-red-300"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 对话框底部 */}
            <div className="px-5 py-3 border-t themed-border-primary flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAddPatch(false)}
                className="px-4 py-2 text-xs themed-text-muted hover:text-white rounded-lg hover:themed-bg-hover transition-colors"
              >
                {ts('maps.cancel')}
              </button>
              <button
                onClick={handleAddPatch}
                disabled={!patchForm.sourceFilePath}
                className={`px-5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  patchForm.sourceFilePath
                    ? 'themed-btn-primary'
                    : 'themed-bg-active themed-text-disabled cursor-not-allowed'
                }`}
              >
                {ts('maps.addPatchBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 建筑关联编辑对话框 ========== */}
      {showAddBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowAddBuilding(false); resetBuildingForm() }}>
          <div className="themed-bg-secondary rounded-xl border themed-border-primary w-[90vw] max-w-[600px] max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b themed-border-primary flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold themed-text-primary">
                  {editingBuildingId ? ts('maps.editBuilding') : ts('maps.addBuilding')}
                </h3>
                <p className="text-[11px] themed-text-dimmed mt-0.5">{ts('maps.buildingsDesc')}</p>
              </div>
              <button onClick={() => { setShowAddBuilding(false); resetBuildingForm() }} className="themed-text-dimmed hover:themed-text-secondary transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* 工作原理流程图 */}
              <div className="themed-bg-primary rounded-lg p-3 border themed-border-secondary">
                <p className="text-[10px] font-medium themed-text-secondary mb-2 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  工作原理
                </p>
                <div className="flex items-center justify-between gap-2 text-[9px]">
                  {/* 外部地图 */}
                  <div className="flex-1 text-center">
                    <div className="themed-bg-card rounded-md p-2 border border-emerald-500/20">
                      <div className="text-emerald-300 font-medium mb-0.5">外部地图</div>
                      <div className="themed-text-dimmed">玩家走到入口坐标</div>
                      <div className="text-emerald-400 mt-0.5">→ 传送到内部</div>
                    </div>
                  </div>
                  {/* 箭头 */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" className="flex-shrink-0">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                  {/* 内部地图 */}
                  <div className="flex-1 text-center">
                    <div className="themed-bg-card rounded-md p-2 border border-purple-500/20">
                      <div className="text-purple-300 font-medium mb-0.5">内部地图</div>
                      <div className="themed-text-dimmed">玩家走到出口坐标</div>
                      <div className="text-purple-400 mt-0.5">→ 传送回外部</div>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] themed-text-disabled mt-2 text-center">游戏会自动生成双向传送点，玩家踩到入口/出口坐标即可传送</p>
              </div>

              {/* 建筑名称 */}
              <div>
                <label className="text-[11px] themed-text-dimmed block mb-1.5">{ts('maps.buildingName')} *</label>
                <input type="text" value={buildingForm.displayName} onChange={e => setBuildingForm(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder={ts('maps.buildingNamePlaceholder')}
                  className="w-full themed-bg-primary border themed-border-primary rounded-lg px-3 py-2 text-xs themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555] transition-colors" />
              </div>

              {/* 外部地图 */}
              <div className="themed-bg-primary rounded-lg p-4 border themed-border-secondary space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-900/30 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                      <path d="M3 21h18M5 21V7l7-4 7 4v14"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium themed-text-secondary">{ts('maps.exteriorMap')}</span>
                </div>
                <p className="text-[10px] themed-text-dimmed">{ts('maps.exteriorMapHint')}</p>
                <div>
                  <label className="text-[10px] themed-text-dimmed block mb-1">{ts('maps.selectMap')}</label>
                  <select value={buildingForm.exteriorMap} onChange={e => setBuildingForm(prev => ({ ...prev, exteriorMap: e.target.value }))}
                    className="w-full themed-bg-secondary border themed-border-primary rounded-lg px-3 py-2 text-xs themed-text-secondary focus:outline-none focus:border-[#555]">
                    <option value="">{ts('maps.selectMap')}</option>
                    <optgroup label={ts('maps.vanillaMaps')}>
                      {maps.map(m => (
                        <option key={m.name} value={m.name}>{getMapCN(m.name)}</option>
                      ))}
                    </optgroup>
                    {customMaps.length > 0 && (
                      <optgroup label={`⭐ ${ts('maps.customMaps')}`}>
                        {customMaps.map(cm => {
                          const fullRef = `{{ModId}}_${cm.mapName}`
                          return (
                            <option key={cm.mapName} value={cm.mapName}>
                              {cm.displayName} ({fullRef})
                            </option>
                          )
                        })}
                      </optgroup>
                    )}
                  </select>
                  {/* 显示选中地图的完整游戏引用名 */}
                  {buildingForm.exteriorMap && (
                    <p className="text-[9px] themed-text-dimmed mt-1 flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                      </svg>
                      Maps/{customMaps.some(cm => cm.mapName === buildingForm.exteriorMap) ? `{{ModId}}_${buildingForm.exteriorMap}` : buildingForm.exteriorMap}
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] themed-text-dimmed">{ts('maps.exteriorEntry')}</label>
                    <button
                      type="button"
                      onClick={() => startBuildingPick('exterior')}
                      disabled={!buildingForm.exteriorMap}
                      className="px-2 py-0.5 rounded-md bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/50 border border-cyan-700/40 transition-colors text-[10px] font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="在地图上点击选择入口坐标"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      地图选点
                    </button>
                  </div>
                  <p className="text-[9px] themed-text-disabled mb-1.5">{ts('maps.exteriorEntryHint')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] themed-text-disabled block mb-0.5">X</label>
                      <input type="number" value={buildingForm.exteriorX} onChange={e => setBuildingForm(prev => ({ ...prev, exteriorX: Number(e.target.value) }))}
                        className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1.5 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                    </div>
                    <div>
                      <label className="text-[9px] themed-text-disabled block mb-0.5">Y</label>
                      <input type="number" value={buildingForm.exteriorY} onChange={e => setBuildingForm(prev => ({ ...prev, exteriorY: Number(e.target.value) }))}
                        className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1.5 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] themed-text-dimmed block mb-1">{ts('maps.exitFacing')}</label>
                  <div className="flex gap-1.5">
                    {(['up', 'down', 'left', 'right'] as const).map(f => (
                      <button key={f} onClick={() => setBuildingForm(prev => ({ ...prev, exitFacing: f }))}
                        className={`text-[10px] px-3 py-1.5 rounded-md transition-colors ${
                          buildingForm.exitFacing === f ? 'bg-white text-black font-medium' : 'themed-bg-card themed-text-muted hover:text-white'
                        }`}>
                        {ts(`maps.facing${f.charAt(0).toUpperCase() + f.slice(1)}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 连接箭头 */}
              <div className="flex justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
                  <line x1="12" y1="3" x2="12" y2="18"/><polyline points="6 13 12 19 18 13"/>
                </svg>
              </div>

              {/* 内部地图 */}
              <div className="themed-bg-primary rounded-lg p-4 border themed-border-secondary space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-purple-900/30 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M9 21V12h6v9"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium themed-text-secondary">{ts('maps.interiorMap')}</span>
                </div>
                <p className="text-[10px] themed-text-dimmed">{ts('maps.interiorMapHint')}</p>
                <div>
                  <label className="text-[10px] themed-text-dimmed block mb-1">{ts('maps.selectMap')}</label>
                  <select value={buildingForm.interiorMap} onChange={e => setBuildingForm(prev => ({ ...prev, interiorMap: e.target.value }))}
                    className="w-full themed-bg-secondary border themed-border-primary rounded-lg px-3 py-2 text-xs themed-text-secondary focus:outline-none focus:border-[#555]">
                    <option value="">{ts('maps.selectMap')}</option>
                    <optgroup label={ts('maps.vanillaMaps')}>
                      {maps.map(m => (
                        <option key={m.name} value={m.name}>{getMapCN(m.name)}</option>
                      ))}
                    </optgroup>
                    {customMaps.length > 0 && (
                      <optgroup label={`⭐ ${ts('maps.customMaps')}`}>
                        {customMaps.map(cm => {
                          const fullRef = `{{ModId}}_${cm.mapName}`
                          return (
                            <option key={cm.mapName} value={cm.mapName}>
                              {cm.displayName} ({fullRef})
                            </option>
                          )
                        })}
                      </optgroup>
                    )}
                  </select>
                  {/* 显示选中地图的完整游戏引用名 */}
                  {buildingForm.interiorMap && (
                    <p className="text-[9px] themed-text-dimmed mt-1 flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                      </svg>
                      Maps/{customMaps.some(cm => cm.mapName === buildingForm.interiorMap) ? `{{ModId}}_${buildingForm.interiorMap}` : buildingForm.interiorMap}
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] themed-text-dimmed">{ts('maps.interiorEntry')}</label>
                    <button
                      type="button"
                      onClick={() => startBuildingPick('interiorEntry')}
                      disabled={!buildingForm.interiorMap}
                      className="px-2 py-0.5 rounded-md bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/50 border border-cyan-700/40 transition-colors text-[10px] font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="在地图上点击选择进入后站立坐标"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      地图选点
                    </button>
                  </div>
                  <p className="text-[9px] themed-text-disabled mb-1.5">{ts('maps.interiorEntryHint')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] themed-text-disabled block mb-0.5">X</label>
                      <input type="number" value={buildingForm.interiorX} onChange={e => setBuildingForm(prev => ({ ...prev, interiorX: Number(e.target.value) }))}
                        className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1.5 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                    </div>
                    <div>
                      <label className="text-[9px] themed-text-disabled block mb-0.5">Y</label>
                      <input type="number" value={buildingForm.interiorY} onChange={e => setBuildingForm(prev => ({ ...prev, interiorY: Number(e.target.value) }))}
                        className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1.5 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] themed-text-dimmed">{ts('maps.interiorExit')}</label>
                    <button
                      type="button"
                      onClick={() => startBuildingPick('interiorExit')}
                      disabled={!buildingForm.interiorMap}
                      className="px-2 py-0.5 rounded-md bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/50 border border-cyan-700/40 transition-colors text-[10px] font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="在地图上点击选择出口坐标（走到此处传送回外部）"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      地图选点
                    </button>
                  </div>
                  <p className="text-[9px] themed-text-disabled mb-1.5">{ts('maps.interiorExitHint')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] themed-text-disabled block mb-0.5">X</label>
                      <input type="number" value={buildingForm.interiorExitX} onChange={e => setBuildingForm(prev => ({ ...prev, interiorExitX: Number(e.target.value) }))}
                        className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1.5 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                    </div>
                    <div>
                      <label className="text-[9px] themed-text-disabled block mb-0.5">Y</label>
                      <input type="number" value={buildingForm.interiorExitY} onChange={e => setBuildingForm(prev => ({ ...prev, interiorExitY: Number(e.target.value) }))}
                        className="w-full themed-bg-secondary border themed-border-primary rounded px-2 py-1.5 text-[11px] themed-text-secondary focus:outline-none focus:border-[#555]" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] themed-text-dimmed block mb-1">{ts('maps.entryFacing')}</label>
                  <div className="flex gap-1.5">
                    {(['up', 'down', 'left', 'right'] as const).map(f => (
                      <button key={f} onClick={() => setBuildingForm(prev => ({ ...prev, entryFacing: f }))}
                        className={`text-[10px] px-3 py-1.5 rounded-md transition-colors ${
                          buildingForm.entryFacing === f ? 'bg-white text-black font-medium' : 'themed-bg-card themed-text-muted hover:text-white'
                        }`}>
                        {ts(`maps.facing${f.charAt(0).toUpperCase() + f.slice(1)}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 提示 */}
              <p className="text-[10px] themed-text-disabled flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                {ts('maps.buildingWarpNote')}
              </p>
            </div>

            <div className="px-5 py-3 border-t themed-border-primary flex items-center justify-end gap-2">
              <button onClick={() => { setShowAddBuilding(false); resetBuildingForm() }}
                className="px-4 py-2 text-xs themed-text-muted hover:text-white rounded-lg hover:themed-bg-hover transition-colors">
                {ts('maps.cancel')}
              </button>
              <button onClick={handleAddBuilding}
                disabled={!buildingForm.displayName.trim() || !buildingForm.exteriorMap || !buildingForm.interiorMap}
                className={`px-5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  buildingForm.displayName.trim() && buildingForm.exteriorMap && buildingForm.interiorMap
                    ? 'themed-btn-primary'
                    : 'themed-bg-active themed-text-disabled cursor-not-allowed'
                }`}>
                {ts('maps.addBuildingBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- 地图缩略图（懒加载 + 缓存）----
const thumbnailCache = new Map<string, string>()

function MapThumbnail({ tmxPath, category }: { tmxPath: string; category: string }): JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 懒加载：进入视口才开始渲染
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { rootMargin: '80px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 渲染缩略图（192px 高清渲染，CSS 缩放到 96px 显示，更清晰）
  useEffect(() => {
    if (!visible || !tmxPath) return
    // 先查缓存
    if (thumbnailCache.has(tmxPath)) {
      setUrl(thumbnailCache.get(tmxPath)!)
      return
    }
    let cancelled = false
    setLoading(true)
    window.electronAPI?.mapRender(tmxPath, 192)?.then((dataUrl: string | null) => {
      if (!cancelled && dataUrl) {
        thumbnailCache.set(tmxPath, dataUrl)
        setUrl(dataUrl)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [visible, tmxPath])

  const categoryColors: Record<string, string> = {
    farm: '#4ade80', town: '#f59e0b', outdoor: '#34d399', indoor: '#a78bfa',
    mine: '#f87171', island: '#38bdf8', festival: '#f472b6', special: '#94a3b8',
  }
  const catColor = categoryColors[category] || '#94a3b8'

  return (
    <div ref={containerRef} className="w-full aspect-video rounded-lg themed-bg-card overflow-hidden flex items-center justify-center mb-2.5"
      style={{ borderColor: catColor + '30', borderWidth: '1px' }}>
      {!visible ? (
        /* 未进入视口：显示分类颜色图标 */
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={catColor} strokeWidth="1.5">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
      ) : loading ? (
        /* 渲染中 */
        <div className="w-5 h-5 rounded border border-[#555] border-t-transparent animate-spin" style={{ borderColor: catColor + '60', borderTopColor: 'transparent' }} />
      ) : url ? (
        /* 真实地图缩略图 - 完整显示，不裁剪 */
        <img src={url} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
      ) : (
        /* 渲染失败 */
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      )}
    </div>
  )
}

// ---- 自定义地图缩略图（从用户选择的 .tmx 文件渲染）----
const customThumbnailCache = new Map<string, string>()

function CustomMapThumbnail({ sourceFilePath, typeColor }: { sourceFilePath: string; typeColor: string }): JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { rootMargin: '80px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || !sourceFilePath) return
    if (customThumbnailCache.has(sourceFilePath)) {
      setUrl(customThumbnailCache.get(sourceFilePath)!)
      return
    }
    let cancelled = false
    setLoading(true)
    window.electronAPI?.mapRender(sourceFilePath, 192)?.then((dataUrl: string | null) => {
      if (!cancelled && dataUrl) {
        customThumbnailCache.set(sourceFilePath, dataUrl)
        setUrl(dataUrl)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [visible, sourceFilePath])

  return (
    <div ref={containerRef} className="w-full aspect-video rounded-lg overflow-hidden flex items-center justify-center mb-2.5 relative"
      style={{ borderColor: typeColor + '30', borderWidth: '1px', backgroundColor: typeColor + '10' }}>
      {/* 自定义标记 */}
      <span className="absolute top-1 left-1 z-10 text-[8px] px-1 py-0.5 rounded font-medium"
        style={{ backgroundColor: typeColor + '30', color: typeColor }}>
        自定义
      </span>
      {!visible ? (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={typeColor} strokeWidth="1.5">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
      ) : loading ? (
        <div className="w-5 h-5 rounded border animate-spin" style={{ borderColor: typeColor + '60', borderTopColor: 'transparent' }} />
      ) : url ? (
        <img src={url} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={typeColor} strokeWidth="1.5">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
      )}
    </div>
  )
}

// ---- 原版地图卡片 ----
function VanillaMapCard({ map, isSelected, patchCount, onClick, onPreview }: {
  map: GameMapInfo; isSelected: boolean; patchCount: number; onClick: () => void; onPreview: () => void
}): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const cn = getMapShortCN(map.name)
  const hasCN = mapNameCN[map.name]
  const category = inferCategory(map.name)

  const categoryColors: Record<string, string> = {
    farm: '#4ade80', town: '#f59e0b', outdoor: '#34d399', indoor: '#a78bfa',
    mine: '#f87171', island: '#38bdf8', festival: '#f472b6', special: '#94a3b8',
  }
  const catColor = categoryColors[category] || '#94a3b8'

  return (
    <button
      onClick={onClick}
      className={`themed-bg-secondary rounded-xl p-4 themed-bg-card-hover transition-all text-left group relative border ${
        isSelected ? 'border-white/40 ring-1 ring-white/20' : 'themed-border-secondary hover:themed-border-active'
      }`}
    >
      {/* 选中指示 */}
      {isSelected && (
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-white" />
      )}

      {/* 预览按钮 */}
      <button onClick={(e) => { e.stopPropagation(); onPreview() }}
        className="absolute top-2 right-2 themed-text-disabled hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10 p-1 rounded-md themed-bg-active"
        title={ts('maps.preview')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </button>

      {/* 地图缩略图 */}
      <MapThumbnail tmxPath={map.tmxPath} category={category} />

      {/* 名称 */}
      <p className="text-sm themed-text-secondary font-medium truncate">{cn}</p>
      {hasCN && (
        <p className="text-[10px] themed-text-dimmed truncate font-mono">{map.name}</p>
      )}

      {/* 标签行 */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: catColor + '20', color: catColor }}>
          {mapCategoryFilters.find(f => f.key === category) ? ts(mapCategoryFilters.find(f => f.key === category)!.labelKey) : category}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full themed-bg-card themed-text-muted">
          {map.width}×{map.height}
        </span>
        {map.tilesheets.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full themed-bg-card themed-text-muted">
            {map.tilesheets.length} {ts('maps.tilesheets')}
          </span>
        )}
        {patchCount > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-900/30 text-blue-400">
            {patchCount} {ts('maps.patches')}
          </span>
        )}
      </div>
    </button>
  )
}

// ---- 区域设置组件 ----
function AreaFields({ form, setForm }: {
  form: MapOverlayPatch extends never ? never : {
    fromAreaX: string; fromAreaY: string; fromAreaW: string; fromAreaH: string
    toAreaX: string; toAreaY: string; toAreaW: string; toAreaH: string
  }
  setForm: React.Dispatch<React.SetStateAction<any>>
}): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const t = useT()
  const ts = (k: string): string => asString(t, k)

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[11px] themed-text-dimmed hover:themed-text-secondary transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        {ts('maps.areaSettings')}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 themed-bg-primary rounded-lg p-3 border themed-border-secondary">
          {/* 源区域 */}
          <div>
            <p className="text-[10px] themed-text-dimmed mb-1.5">{ts('maps.sourceAreaLabel')}</p>
            <div className="grid grid-cols-4 gap-2">
              <FieldInput label="X" value={form.fromAreaX} onChange={v => setForm((p: any) => ({ ...p, fromAreaX: v }))} />
              <FieldInput label="Y" value={form.fromAreaY} onChange={v => setForm((p: any) => ({ ...p, fromAreaY: v }))} />
              <FieldInput label={ts('maps.width')} value={form.fromAreaW} onChange={v => setForm((p: any) => ({ ...p, fromAreaW: v }))} />
              <FieldInput label={ts('maps.height')} value={form.fromAreaH} onChange={v => setForm((p: any) => ({ ...p, fromAreaH: v }))} />
            </div>
          </div>

          {/* 目标区域 */}
          <div>
            <p className="text-[10px] themed-text-dimmed mb-1.5">{ts('maps.targetAreaLabel')}</p>
            <div className="grid grid-cols-4 gap-2">
              <FieldInput label="X" value={form.toAreaX} onChange={v => setForm((p: any) => ({ ...p, toAreaX: v }))} />
              <FieldInput label="Y" value={form.toAreaY} onChange={v => setForm((p: any) => ({ ...p, toAreaY: v }))} />
              <FieldInput label={ts('maps.width')} value={form.toAreaW} onChange={v => setForm((p: any) => ({ ...p, toAreaW: v }))} />
              <FieldInput label={ts('maps.height')} value={form.toAreaH} onChange={v => setForm((p: any) => ({ ...p, toAreaH: v }))} />
            </div>
          </div>

          <p className="text-[9px] themed-text-disabled">{ts('maps.coordUnit')}</p>
        </div>
      )}
    </div>
  )
}

function FieldInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <div>
      <label className="text-[9px] themed-text-disabled block mb-0.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        className="w-full themed-bg-hover border themed-border-primary rounded px-2 py-1.5 text-[11px] themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555]"
      />
    </div>
  )
}
