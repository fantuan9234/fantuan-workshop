// ---- 地图数据 ----
// 星露谷物语全部游戏地图（xnb文件名 + 中文名 + 分类）
// 所有尺寸基于游戏 .tmx 文件真实 tile 数 (1 tile = 16×16px)
import React from 'react'
import { IconFarm, IconTown, IconOutdoor, IconIndoor, IconMine, IconFestival } from '../components/Icons'

export interface WarpPoint { id: string; label: string; x: number; y: number; targetMap: string; targetX: number; targetY: number }
export interface SpawnPoint { id: string; npcId: string; x: number; y: number; label: string }
export interface ForageArea { id: string; x: number; y: number; w: number; h: number; label: string }

/** Data/Locations NPC生成点 */
export interface NPCSpawnPoint { id: string; npc: string; x: number; y: number; direction: number }

/** Data/Locations 灯光颜色 */
export interface LightConfig { enabled: boolean; r: number; g: number; b: number }

/** EditMap 自定义贴图集 */
export interface TileSheetEntry { id: string; id_field: string; imageSource: string; tileWidth: number; tileHeight: number }

/** EditMap 图块属性 */
export interface TilePropertyEntry { id: string; layer: string; x: number; y: number; properties: Record<string, string> }

/** EditMap 移除传送点 */
export interface RemoveWarpEntry { id: string; x: number; y: number }

/** 建筑内外关联 — 将外部地图的入口与内部地图的出口连接 */
export interface BuildingLink {
  id: string
  /** 建筑名称 */
  displayName: string
  /** 外部地图（建筑外观所在的地图） */
  exteriorMap: string
  /** 外部地图入口 X 坐标（玩家踩到此处进入建筑） */
  exteriorX: number
  /** 外部地图入口 Y 坐标 */
  exteriorY: number
  /** 内部地图（建筑内部） */
  interiorMap: string
  /** 内部地图入口 X（从外面进来后站的位置） */
  interiorX: number
  /** 内部地图入口 Y */
  interiorY: number
  /** 内部地图出口 X（走到此处传送回外部） */
  interiorExitX: number
  /** 内部地图出口 Y */
  interiorExitY: number
  /** 进入建筑后朝向 */
  entryFacing: 'up' | 'down' | 'left' | 'right'
  /** 离开建筑后朝向 */
  exitFacing: 'up' | 'down' | 'left' | 'right'
}

/** 游戏原始地图信息 */
export interface GameMapInfo {
  /** 地图内部名（即 .xnb 文件名，不含扩展名） */
  name: string
  /** 中文显示名 */
  displayName: string
  /** 地图分类 */
  category: MapCategory
  /** 是否室内地图 */
  indoor: boolean
  /** .xnb 相对路径（相对于 Content/Maps/） */
  xnbPath: string
  /** 简短描述 */
  description?: string
}

/** 用户自定义地图（可编辑） */
export interface MapInfo {
  id: string; name: string; displayName: string; width: number; height: number
  category: MapCategory; indoor: boolean; season: 'all' | 'spring' | 'summer' | 'fall' | 'winter'
  description: string; imageUrl: string
  warps: WarpPoint[]; spawns: SpawnPoint[]; forageAreas: ForageArea[]
}

export type MapCategory = 'town' | 'outdoor' | 'indoor' | 'farm' | 'mine' | 'festival' | 'island' | 'special'

export const mapCategories: { id: MapCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'farm', label: '农场', icon: React.createElement(IconFarm) },
  { id: 'town', label: '城镇', icon: React.createElement(IconTown) },
  { id: 'outdoor', label: '野外', icon: React.createElement(IconOutdoor) },
  { id: 'indoor', label: '室内', icon: React.createElement(IconIndoor) },
  { id: 'mine', label: '矿井', icon: React.createElement(IconMine) },
  { id: 'festival', label: '节日', icon: React.createElement(IconFestival) },
  { id: 'island', label: '姜岛', icon: React.createElement(IconTown) },
  { id: 'special', label: '特殊', icon: React.createElement(IconIndoor) },
]

// ============================================================
// 星露谷物语 全部游戏地图
// ============================================================
export const gameMaps: GameMapInfo[] = [
  // ========== 农场类 ==========
  { name: 'Farm', displayName: '标准农场', category: 'farm', indoor: false, xnbPath: 'Maps/Farm.xnb', description: '经典农场，大面积可耕种土地' },
  { name: 'Farm_Fishing', displayName: '河岸农场', category: 'farm', indoor: false, xnbPath: 'Maps/Farm_Fishing.xnb', description: '适合钓鱼的河岸地形农场' },
  { name: 'Forest', displayName: '森林农场', category: 'farm', indoor: false, xnbPath: 'Maps/Forest.xnb', description: '被森林环绕的农场，有树桩和硬木' },
  { name: 'Mountain', displayName: '山顶农场', category: 'farm', indoor: false, xnbPath: 'Maps/Mountain.xnb', description: '位于矿山西侧的山顶农场' },
  { name: 'Wilderness', displayName: '荒野农场', category: 'farm', indoor: false, xnbPath: 'Maps/Wilderness.xnb', description: '靠近矿井入口的荒野农场' },
  { name: 'FourCorners', displayName: '四角农场', category: 'farm', indoor: false, xnbPath: 'Maps/FourCorners.xnb', description: '被河流分成四块的农场' },
  { name: 'Beach', displayName: '海滩农场', category: 'farm', indoor: false, xnbPath: 'Maps/Beach.xnb', description: '直接临海的沙滩农场' },

  // ========== 城镇 / 户外 ==========
  { name: 'Town', displayName: '鹈鹕镇中心', category: 'town', indoor: false, xnbPath: 'Maps/Town.xnb', description: '小镇主广场和商店区' },
  { name: 'BusStop', displayName: '巴士站', category: 'outdoor', indoor: false, xnbPath: 'Maps/BusStop.xnb', description: '农屋前方的巴士站区域' },
  { name: 'Railroad', displayName: '铁路沿线', category: 'outdoor', indoor: false, xnbPath: 'Maps/Railroad.xnb', description: '铁路、博物馆和隧道入口' },
  { name: 'Backwoods', displayName: '后山', category: 'outdoor', indoor: false, xnbPath: 'Maps/Backwoods.xnb', description: '农场北侧的后山区域' },
  { name: 'Bugs', displayName: '虫洞之地', category: 'special', indoor: false, xnbPath: 'Maps/Bugs.xnb', description: '充满虫子的神秘区域' },
  { name: 'WitchWarpCave', displayName: '女巫传送洞', category: 'special', indoor: true, xnbPath: 'Maps/WitchWarpCave.xnb', description: '女巫小屋内的传送洞穴' },

  // ========== 森林 / 山地 / 海滩 ==========
  { name: 'Forest_1', displayName: '秘密森林', category: 'outdoor', indoor: false, xnbPath: 'Maps/Forest_1.xnb', description: '需要钢斧才能进入的神秘森林' },
  { name: 'Mine', displayName: '矿井入口', category: 'mine', indoor: false, xnbPath: 'Maps/Mine.xnb', description: '矿井的地面入口区域' },
  { name: 'UndergroundMine', displayName: '地下矿坑', category: 'mine', indoor: true, xnbPath: 'Maps/UndergroundMine.xnb', description: '矿井各层通用模板' },
  { name: 'SkullCave', displayName: '骷髅洞穴', category: 'mine', indoor: true, xnbPath: 'Maps/SkullCave.xnb', description: '25层后的深层矿区' },
  { name: 'Beach_Joja', displayName: '海滩 (Joja)', category: 'outdoor', indoor: false, xnbPath: 'Maps/Beach_Joja.xnb', description: 'Joja接管后的废弃海滩' },

  // ========== 室内 - 商店 & 公共建筑 ==========
  { name: 'ScienceHouse', displayName: '实验室', category: 'indoor', indoor: true, xnbPath: 'Maps/ScienceHouse.xnb', description: '德米特鲁斯和玛鲁的研究室' },
  { name: 'AnimalHouse', displayName: '玛妮牧场', category: 'indoor', indoor: true, xnbPath: 'Maps/AnimalHouse.xnb', description: '购买牲畜的地方' },
  { name: 'Blacksmith', displayName: '铁匠铺', category: 'indoor', indoor: true, xnbPath: 'Maps/Blacksmith.xnb', description: '克林特的铁匠铺' },
  { name: 'Carpenter', displayName: '木工店', category: 'indoor', indoor: true, xnbPath: 'Maps/Carpenter.xnb', description: '罗宾的木工店' },
  { name: 'FishShop', displayName: '威利鱼店', category: 'indoor', indoor: true, xnbPath: 'Maps/FishShop.xnb', description: '威利的鱼店（码头）' },
  { name: 'SeedShop', displayName: '皮埃尔杂货店', category: 'indoor', indoor: true, xnbPath: 'Maps/SeedShop.xnb', description: '皮埃尔的种子商店' },
  { name: 'Tavern', displayName: '星露谷酒吧', category: 'indoor', indoor: true, xnbPath: 'Maps/Tavern.xnb', description: '格斯经营的酒吧' },
  { name: 'CommunityCenter', displayName: '社区中心', category: 'indoor', indoor: true, xnbPath: 'Maps/CommunityCenter.xnb', description: '荒废的社区中心' },
  { name: 'JojaMart', displayName: 'Joja超市', category: 'indoor', indoor: true, xnbPath: 'Maps/JojaMart.xnb', description: '大型连锁超市' },
  { name: 'AbandonedJojaMart', displayName: '废弃的Joja超市', category: 'special', indoor: true, xnbPath: 'Maps/AbandonedJojaMart.xnb', description: '完成社区中心后废弃的超市' },
  { name: 'AdventureGuild', displayName: '冒险者公会', category: 'indoor', indoor: true, xnbPath: 'Maps/AdventureGuild.xnb', description: '马龙和阿德丽娜的公会' },
  { name: 'Library', displayName: '博物馆', category: 'indoor', indoor: true, xnbPath: 'Maps/Library.xnb', description: '贡瑟的图书馆兼博物馆' },
  { name: 'ManorHouse', displayName: '刘易斯庄园', category: 'indoor', indoor: true, xnbPath: 'Maps/ManorHouse.xnb', description: '镇长的豪宅' },
  { name: 'Tunnel', displayName: '隧道', category: 'special', indoor: true, xnbPath: 'Maps/Tunnel.xnb', description: '通往...的神秘隧道' },
  { name: 'Sewer', displayName: '下水道', category: 'special', indoor: true, xnbPath: 'Maps/Sewer.xnb', description: '克罗布斯居住的下水道' },
  { name: 'WizardHouse', displayName: '巫师塔地下室', category: 'special', indoor: true, xnbPath: 'Maps/WizardHouse.xnb', description: '巫师拉希努尔德的住所' },
  { name: 'WitchHut', displayName: '女巫小屋', category: 'special', indoor: true, xnbPath: 'Maps/WitchHut.xnb', description: '女巫的神秘小屋' },
  { name: 'Hats', displayName: '帽子鼠小店', category: 'special', indoor: true, xnbPath: 'Maps/Hats.xnb', description: '出售帽子的隐藏商店' },
  { name: 'TractorGarage', displayName: '拖拉机车库', category: 'special', indoor: true, xnbPath: 'Maps/TractorGarage.xnb', description: '拖拉机模组的车库' },

  // ========== 室内 - NPC住宅 ==========
  { name: 'FarmHouse', displayName: '农屋（初始）', category: 'indoor', indoor: true, xnbPath: 'Maps/FarmHouse.xnb', description: '玩家初始农屋' },
  { name: 'FarmHouse1', displayName: '农屋（第一次升级）', category: 'indoor', indoor: true, xnbPath: 'Maps/FarmHouse1.xnb', description: '升级后的农屋，带厨房' },
  { name: 'FarmHouse2', displayName: '农屋（最终版）', category: 'indoor', indoor: true, xnbPath: 'Maps/FarmHouse2.xnb', description: '最终升级农屋，带温室' },
  { name: 'JoshHouse', displayName: '乔什家', category: 'indoor', indoor: true, xnbPath: 'Maps/JoshHouse.xnb', description: '' },
  { name: 'SamHouse', displayName: '山姆家', category: 'indoor', indoor: true, xnbPath: 'Maps/SamHouse.xnb', description: '山姆、文森特和乔迪的家' },
  { name: 'HaleyHouse', displayName: '海莉家', category: 'indoor', indoor: true, xnbPath: 'Maps/HaleyHouse.xnb', description: '海莉和艾米丽的家' },
  { name: 'AlexHouse', displayName: '亚历克斯家', category: 'indoor', indoor: true, xnbPath: 'Maps/AlexHouse.xnb', description: '亚历克斯和伊芙琳的家' },
  { name: 'ElliottHouse', displayName: '艾利奥特家', category: 'indoor', indoor: true, xnbPath: 'Maps/ElliottHouse.xnb', description: '艾利奥特的海边小屋' },
  { name: 'HarveyRoom', displayName: '哈维诊所', category: 'indoor', indoor: true, xnbPath: 'Maps/HarveyRoom.xnb', description: '哈维医生的诊所' },
  { name: 'LeahHouse', displayName: '里奇的小屋', category: 'indoor', indoor: true, xnbPath: 'Maps/LeahHouse.xnb', description: '里奇的小木屋' },
  { name: 'PierreScullRoom', displayName: '皮埃尔密室', category: 'special', indoor: true, xnbPath: 'Maps/PierreScullRoom.xnb', description: '皮埃尔商店后面的秘密房间' },

  // ========== 节日地图 ==========
  { name: 'FlowerDance', displayName: '花舞节', category: 'festival', indoor: false, xnbPath: 'Maps/FlowerDance.xnb', description: '春季24日花舞节场地' },
  { name: 'EggFestival', displayName: '彩蛋节', category: 'festival', indoor: false, xnbPath: 'Maps/EggFestival.xnb', description: '春季13日彩蛋节广场' },
  { name: 'Luau', displayName: '火焰节', category: 'festival', indoor: false, xnbPath: 'Maps/Luau.xnb', description: '夏季11日火焰节海滩' },
  { name: 'DanceOfTheMoonlightJellies', displayName: '水母舞会', category: 'festival', indoor: false, xnbPath: 'Maps/DanceOfTheMoonlightJellies.xnb', description: '夏季28日水母舞会海滩' },
  { name: 'Fair', displayName: '集市', category: 'festival', indoor: false, xnbPath: 'Maps/Fair.xnb', description: '秋季24日集市场地' },
  { name: 'SpiritEve', displayName: '幽灵之夜', category: 'festival', indoor: false, xnbPath: 'Maps/SpiritEve.xnb', description: '秋季27日幽灵之夜森林' },
  { name: 'IceFestival', displayName: '冰钓节', category: 'festival', indoor: false, xnbPath: 'Maps/IceFestival.xnb', description: '冬季8日冰钓节湖泊' },
  { name: 'WinterStar', displayName: '冬季星夜祭', category: 'festival', indoor: false, xnbPath: 'Maps/WinterStar.xnb', description: '冬季25日冬季星夜祭广场' },

  // ========== 姜岛 (Ginger Island) ==========
  { name: 'Island_North', displayName: '姜岛北部', category: 'island', indoor: false, xnbPath: 'Maps/Island_North.xnb', description: '姜岛北部区域，有火山口' },
  { name: 'Island_South', displayName: '姜岛南部', category: 'island', indoor: false, xnbPath: 'Maps/Island_South.xnb', description: '姜岛南部码头区域' },
  { name: 'Island_West', displayName: '姜岛西部', category: 'island', indoor: false, xnbPath: 'Maps/Island_West.xnb', description: '姜岛西部区域' },
  { name: 'Island_East', displayName: '姜岛东部', category: 'island', indoor: false, xnbPath: 'Maps/Island_East.xnb', description: '姜岛东部区域' },
  { name: 'Island_SouthEast', displayName: '姜岛东南', category: 'island', indoor: false, xnbPath: 'Maps/Island_SouthEast.xnb', description: '姜岛东南区域' },
  { name: 'Island_SouthEastCave', displayName: '姜岛东南洞穴', category: 'island', indoor: true, xnbPath: 'Maps/Island_SouthEastCave.xnb', description: '雷欧所在的洞穴' },
  { name: 'Island_Farm', displayName: '姜岛农场', category: 'island', indoor: false, xnbPath: 'Maps/Island_Farm.xnb', description: '姜岛上的可耕种区域' },
  { name: 'Island_FarmHouse', displayName: '姜岛农屋', category: 'island', indoor: true, xnbPath: 'Maps/Island_FarmHouse.xnb', description: '姜岛农场的房屋' },
  { name: 'Island_House', displayName: '姜岛度假屋', category: 'island', indoor: true, xnbPath: 'Maps/Island_House.xnb', description: '姜岛的度假小屋' },
  { name: 'Island_Office', displayName: '姜岛办公室', category: 'island', indoor: true, xnbPath: 'Maps/Island_Office.xnb', description: '蜗牛教授的化石办公室' },
  { name: 'Island_Upgrade', displayName: '姜岛贸易站', category: 'island', indoor: true, xnbPath: 'Maps/Island_Upgrade.xnb', description: '琪琪的贸易站' },
  { name: 'Island_Woods', displayName: '姜岛丛林神龛', category: 'island', indoor: true, xnbPath: 'Maps/Island_Woods.xnb', description: '丛林中的香蕉树神龛' },
  { name: 'Island_West_C1', displayName: '姜岛西洞1层', category: 'island', indoor: true, xnbPath: 'Maps/Island_West_C1.xnb', description: '姜岛西部洞穴第1层' },
  { name: 'Island_Weather', displayName: '姜岛气象站', category: 'island', indoor: true, xnbPath: 'Maps/Island_Weather.xnb', description: '姜岛气象站' },
  { name: 'Island_Mermaid', displayName: '姜岛人鱼区', category: 'island', indoor: false, xnbPath: 'Maps/Island_Mermaid.xnb', description: '人鱼表演区域' },
  { name: 'Island_Shrine', displayName: '姜岛神龛', category: 'island', indoor: true, xnbPath: 'Maps/Island_Shrine.xnb', description: '姜岛香蕉树神龛内部' },
  { name: 'Island_FieldOffice', displayName: '姜岛考察站', category: 'island', indoor: true, xnbPath: 'Maps/Island_FieldOffice.xnb', description: '蜗牛教授的野外考察站' },
  { name: 'LeoTreehouse', displayName: '雷欧树屋', category: 'island', indoor: true, xnbPath: 'Maps/LeoTreehouse.xnb', description: '雷欧居住的树屋' },

  // ========== 火山地牢 ==========
  { name: 'VolcanoDungeon0', displayName: '火山地牢 入口', category: 'mine', indoor: true, xnbPath: 'Maps/VolcanoDungeon0.xnb', description: '火山地牢入口层' },
  { name: 'VolcanoDungeon1', displayName: '火山地牢 第1层', category: 'mine', indoor: true, xnbPath: 'Maps/VolcanoDungeon1.xnb', description: '' },
  { name: 'VolcanoDungeon2', displayName: '火山地牢 第2层', category: 'mine', indoor: true, xnbPath: 'Maps/VolcanoDungeon2.xnb', description: '' },
  { name: 'VolcanoDungeon3', displayName: '火山地牢 第3层', category: 'mine', indoor: true, xnbPath: 'Maps/VolcanoDungeon3.xnb', description: '' },
  { name: 'VolcanoDungeon4', displayName: '火山地牢 第4层', category: 'mine', indoor: true, xnbPath: 'Maps/VolcanoDungeon4.xnb', description: '' },
  { name: 'VolcanoDungeon5', displayName: '火山地牢 第5层', category: 'mine', indoor: true, xnbPath: 'Maps/VolcanoDungeon5.xnb', description: '' },
  { name: 'VolcanoDungeon6', displayName: '火山地牢 第6层', category: 'mine', indoor: true, xnbPath: 'Maps/VolcanoDungeon6.xnb', description: '' },
  { name: 'VolcanoDungeon7', displayName: '火山地牢 第7层', category: 'mine', indoor: true, xnbPath: 'Maps/VolcanoDungeon7.xnb', description: '' },
  { name: 'VolcanoDungeon8', displayName: '火山地牢 第8层', category: 'mine', indoor: true, xnbPath: 'Maps/VolcanoDungeon8.xnb', description: '' },
  { name: 'VolcanoDungeon9', displayName: '火山地牢 第9层', category: 'mine', indoor: true, xnbPath: 'Maps/VolcanoDungeon9.xnb', description: '火山顶部出口' },

  // ========== 特殊地点 ==========
  { name: 'Desert', displayName: '沙漠', category: 'outdoor', indoor: false, xnbPath: 'Maps/Desert.xnb', description: '卡利科沙漠' },
  { name: 'Club', displayName: '赌场', category: 'special', indoor: true, xnbPath: 'Maps/Club.xnb', description: '沙漠中的赌场' },
  { name: 'SandyHouse', displayName: '桑迪的商店', category: 'special', indoor: true, xnbPath: 'Maps/SandyHouse.xnb', description: '沙漠中的桑迪奥特莱斯' },
  { name: 'BathHouse_Entry', displayName: '浴场入口', category: 'special', indoor: true, xnbPath: 'Maps/BathHouse_Entry.xnb', description: '' },
  { name: 'BathHouse_Pool', displayName: '浴池', category: 'special', indoor: true, xnbPath: 'Maps/BathHouse_Pool.xnb', description: '' },
  { name: 'BathHouseLocker', displayName: '浴场更衣室', category: 'special', indoor: true, xnbPath: 'Maps/BathHouseLocker.xnb', description: '' },
  { name: 'BathHouse_WashLockers', displayName: '浴场储物柜', category: 'special', indoor: true, xnbPath: 'Maps/BathHouse_WashLockers.xnb', description: '' },
  { name: 'MovieTheater', displayName: '电影院', category: 'special', indoor: true, xnbPath: 'Maps/MovieTheater.xnb', description: '' },
  { name: 'MovieTheater_Joja', displayName: '电影院 (Joja)', category: 'special', indoor: true, xnbPath: 'Maps/MovieTheater_Joja.xnb', description: '' },
  { name: 'Submarine', displayName: '潜水艇', category: 'special', indoor: true, xnbPath: 'Maps/Submarine.xnb', description: '海滩潜水艇内部' },
  { name: 'MermaidShow', displayName: '人鱼表演后台', category: 'special', indoor: true, xnbPath: 'Maps/MermaidShow.xnb', description: '' },
  { name: 'QiNutRoom', displayName: '齐坚果房间', category: 'special', indoor: true, xnbPath: 'Maps/QiNutRoom.xnb', description: '齐先生的坚果房间' },
  { name: 'MasteryCave', displayName: '精通洞穴', category: 'mine', indoor: true, xnbPath: 'Maps/MasteryCave.xnb', description: '精通系统相关洞穴' },
  { name: 'CalicoEgg', displayName: '卡里科蛋室', category: 'special', indoor: true, xnbPath: 'Maps/CalicoEgg.xnb', description: '' },
]

/** 根据名称查找游戏地图 */
export function findGameMap(name: string): GameMapInfo | undefined {
  return gameMaps.find(m => m.name === name)
}

/** 按分类筛选游戏地图 */
export function getGameMapsByCategory(category: MapCategory | 'all'): GameMapInfo[] {
  if (category === 'all') return gameMaps
  return gameMaps.filter(m => m.category === category)
}

/** 搜索游戏地图（按中文名或xnb名） */
export function searchGameMaps(query: string): GameMapInfo[] {
  if (!query.trim()) return gameMaps
  const q = query.toLowerCase()
  return gameMaps.filter(m =>
    m.displayName.includes(q) ||
    m.name.toLowerCase().includes(q) ||
    m.description?.includes(q)
  )
}

// ============================================================
// 参考地图（兼容旧代码）
// ============================================================
export const referenceMaps: MapInfo[] = [
  {
    id: 'farm', name: 'Farm', displayName: '标准农场',
    width: 80, height: 65, category: 'farm', indoor: false, season: 'all',
    description: '经典农场，大面积可耕种土地（3427 可耕 tiles）',
    imageUrl: './assets/maps/Portraits_Bear.png', // 占位
    warps: [
      { id: 'w1', label: '通往巴士站', x: 76, y: 17, targetMap: 'busstop', targetX: 3, targetY: 23 },
      { id: 'w2', label: '通往森林', x: 0, y: 17, targetMap: 'forest', targetX: 119, targetY: 17 },
    ], spawns: [], forageAreas: [],
  },
]

/** 创建空白新地图 */
export function createEmptyMap(): MapInfo {
  return {
    id: 'map_' + Date.now(), name: 'NewMap', displayName: '新地图',
    width: 40, height: 30, category: 'outdoor', indoor: false, season: 'all',
    description: '', imageUrl: '', warps: [], spawns: [], forageAreas: [],
  }
}
