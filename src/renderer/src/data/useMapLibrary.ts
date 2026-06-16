// 共享的地图库 hook
// 提供：
//   - 解包目录中扫描到的真实游戏地图（xnb 解包后的 .tmx）
//   - 项目中的自定义地图
//   - 中文名翻译 + 自动分类
// 供 MapsPage、EventEditor 等模块共用
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNpcAssets } from './useNpcAssets'
import { useProject } from './ProjectContext'

export interface UnpackedMap {
  /** 地图英文名（来自文件名） */
  name: string
  /** .tmx 绝对路径 */
  tmxPath: string
  /** 地图宽（tile 数） */
  width: number
  /** 地图高（tile 数） */
  height: number
}

export interface CustomMap {
  id: string
  mapName: string
  displayName: string
  sourceFilePath: string
  fileName: string
  width: number
  height: number
}

/** 地图英文名 → 中文翻译（精选常用） */
export const mapNameCN: Record<string, string> = {
  Farm: '农场', FarmHouse: '农舍', Greenhouse: '温室',
  FarmCave: '农场洞穴', Cellar: '酒窖',
  Backwoods: '后山', BusStop: '巴士站', Forest: '森林',
  Tunnel: '隧道', Mountain: '山区',
  Town: '小镇', ManorHouse: '庄园', HarveyRoom: '哈维诊所',
  Hospital: '医院', SeedShop: '皮埃尔商店', PierreShop: '皮埃尔商店',
  Blacksmith: '铁匠铺', Saloon: '酒吧', Tavern: '星露谷酒吧',
  LibraryMuseum: '图书馆博物馆', Museum: '博物馆', Library: '图书馆',
  CommunityCenter: '社区中心', JojaMart: 'Joja超市',
  Beach: '海滩', BeachNightMarket: '海滩夜市', NightMarket: '夜市',
  Submarine: '潜水艇',
  ElliottHouse: '艾利奥特家', LeahHouse: '莉亚小屋',
  SamHouse: '山姆家', HaleyHouse: '海莉家',
  AlexHouse: '亚历克斯家', EmilyHouse: '艾米丽家',
  JodiHouse: '乔迪家', MaruHouse: '玛鲁家',
  HarveyRoomHospital: '哈维医院',
  Mine: '矿井', UndergroundMine: '地下矿坑', SkullCave: '骷髅洞穴',
  Sewer: '下水道', Desert: '沙漠',
  Island_North: '姜岛北', Island_South: '姜岛南',
  Island_West: '姜岛西', Island_East: '姜岛东',
  Island_SouthEast: '姜岛东南', Island_Farm: '姜岛农场',
  VolcanoDungeon0: '火山地牢入口', VolcanoDungeon1: '火山第1层',
  VolcanoDungeon2: '火山第2层', VolcanoDungeon3: '火山第3层',
  VolcanoDungeon4: '火山第4层', VolcanoDungeon5: '火山第5层',
  VolcanoDungeon6: '火山第6层', VolcanoDungeon7: '火山第7层',
  VolcanoDungeon8: '火山第8层', VolcanoDungeon9: '火山第9层',
  FlowerDance: '花舞节', EggFestival: '彩蛋节',
  Luau: '海洋节', DanceOfTheMoonlightJellies: '水母舞',
  Fair: '集市', SpiritEve: '万灵节',
  IceFestival: '冰雪节', WinterStar: '冬至星',
  MovieTheater: '电影院', MovieTheater_Joja: '电影院(Joja)',
  BathHouse_Entry: '浴场入口', BathHouse_Pool: '浴池',
  BathHouseLocker: '浴场更衣室', BathHouse_WashLockers: '浴场储物柜',
  Club: '赌场', SandyHouse: '桑迪商店',
  WizardHouse: '巫师塔', WitchHut: '女巫小屋',
  WitchWarpCave: '女巫传送洞', AdventureGuild: '冒险家公会',
  Carpenter: '木匠店', FishShop: '威利鱼店',
  AnimalHouse: '玛妮牧场', ScienceHouse: '实验室',
  TractorGarage: '拖拉机车库', Hats: '帽子店',
  QiNutRoom: '齐坚果房', MasteryCave: '精通洞穴',
  Railroad: '铁路', MermaidShow: '人鱼秀',
  AbandonedJojaMart: '废弃Joja超市',
}

/** 根据地图名推断分类 */
export function inferMapCategory(name: string): 'farm' | 'town' | 'outdoor' | 'indoor' | 'mine' | 'island' | 'festival' | 'special' {
  if (/Farm|Greenhouse|Cellar|Barn|Coop|Silo|Shed|Stable|Cabin\d/i.test(name)) return 'farm'
  if (/Town|Manor|SeedShop|Saloon|Blacksmith|JojaMart|Community|Library|Hospital/i.test(name)) return 'town'
  if (/Island|Volcano|Caldera/i.test(name)) return 'island'
  if (/Mine|Skull|Sewer|Slime|Bug/i.test(name)) return 'mine'
  if (/Festival|Flower|Egg|Luau|Moonlight|Fair|Spirit|IceFestival|WinterStar/i.test(name)) return 'festival'
  if (/House|Room|Shop|Tavern|Cave|Bath|Spa|Club|Submarine|Movie|Hut|Tent/i.test(name)) return 'indoor'
  if (/Forest|Beach|Desert|Mountain|Backwoods|BusStop|Railroad|Tunnel|Summit/i.test(name)) return 'outdoor'
  return 'special'
}

/** 分类中文标签 */
export const mapCategoryLabel: Record<string, string> = {
  all: '全部', farm: '农场', town: '城镇', outdoor: '野外',
  indoor: '室内', mine: '矿洞', island: '姜岛',
  festival: '节日', special: '特殊',
}

/** 地图显示名（带中文翻译） */
export function getMapDisplayName(name: string): string {
  const cn = mapNameCN[name]
  return cn ? `${name}（${cn}）` : name
}

/** 根据地图名选择 .tmx 路径（解包目录中） */
export function buildTmxPath(unpackedRoot: string, name: string): string {
  return `${unpackedRoot}\\Maps\\${name}.tmx`
}

export interface UseMapLibraryResult {
  /** 真实游戏地图（来自 xnb 解包） */
  unpackedMaps: UnpackedMap[]
  /** 自定义地图（用户在 MapsPage 添加的） */
  customMaps: CustomMap[]
  /** 所有地图（解包 + 自定义） */
  allMaps: Array<UnpackedMap | (CustomMap & { tmxPath: string; isCustom: true })>
  /** 加载状态 */
  loading: boolean
  /** 未解包提示 */
  needsUnpack: boolean
  /** 重新加载 */
  reload: () => void
}

export function useMapLibrary(): UseMapLibraryResult {
  const { unpackedRoot } = useNpcAssets()
  const { getFullSnapshot } = useProject()
  const [unpackedMaps, setUnpackedMaps] = useState<UnpackedMap[]>([])
  const [customMaps, setCustomMaps] = useState<CustomMap[]>([])
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // 加载解包地图
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!unpackedRoot) { setUnpackedMaps([]); return }
      setLoading(true)
      const result = await window.electronAPI?.xnbListMaps(unpackedRoot)
      if (cancelled) return
      if (result?.success) {
        setUnpackedMaps((result.maps || []).map((m: any) => ({
          name: m.name,
          tmxPath: m.tmxPath,
          width: m.width,
          height: m.height,
        })))
      } else {
        setUnpackedMaps([])
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [unpackedRoot, reloadKey])

  // 加载自定义地图（从项目快照）
  useEffect(() => {
    const snap = getFullSnapshot()
    setCustomMaps(Array.isArray(snap.customMaps) ? (snap.customMaps as CustomMap[]) : [])
  }, [getFullSnapshot, reloadKey])

  const reload = useCallback(() => setReloadKey(k => k + 1), [])

  const allMaps = useMemo(() => {
    const list: UseMapLibraryResult['allMaps'] = [...unpackedMaps]
    for (const c of customMaps) {
      list.push({
        id: c.id,
        mapName: c.mapName,
        displayName: c.displayName,
        sourceFilePath: c.sourceFilePath,
        fileName: c.fileName,
        width: c.width,
        height: c.height,
        tmxPath: c.sourceFilePath,
        isCustom: true,
      })
    }
    return list
  }, [unpackedMaps, customMaps])

  return {
    unpackedMaps,
    customMaps,
    allMaps,
    loading,
    needsUnpack: !unpackedRoot,
    reload,
  }
}

/** 统一按 name 查找地图（解包 + 自定义） */
export function findMapByName(
  allMaps: UseMapLibraryResult['allMaps'],
  name: string
): (UnpackedMap | (CustomMap & { tmxPath: string; isCustom: true })) | undefined {
  return allMaps.find(m => m.name === name || (m as any).mapName === name)
}
