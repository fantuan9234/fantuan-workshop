// ---- 任务数据 ----
import React from 'react'
import { IconStory, IconHelp, IconSpecialOrder, IconCollection, IconCustom } from '../components/Icons'

export type QuestType = 'story' | 'help' | 'specialOrder' | 'collection' | 'custom'
export type ObjectiveType = 'collect' | 'deliver' | 'kill' | 'fish' | 'talk' | 'craft' | 'mine' | 'custom'

export interface QuestObjective {
  id: string
  type: ObjectiveType
  label: string           // 玩家可见描述，如 "收集10个蓝莓"
  targetId: string        // 目标物品/怪物/NPC ID
  targetName: string      // 目标名称
  count: number
}

export interface QuestReward {
  gold: number
  friendship: number      // 与触发NPC的好感度
  items: { itemId: string; itemName: string; count: number }[]
}

export interface QuestInfo {
  id: string
  name: string
  displayName: string
  type: QuestType
  description: string
  triggerNpcId: string     // 触发NPC
  triggerNpcName: string
  heartRequired: number    // 需要好感心数
  season: 'all' | 'spring' | 'summer' | 'fall' | 'winter'
  days: number             // 任务期限(天), 0=无限制
  objectives: QuestObjective[]
  rewards: QuestReward
  introText: string        // 任务介绍对话框
  completeText: string     // 任务完成对话框
  canCancel?: boolean      // 是否可以取消任务（默认true）
}

export const questTypeLabels: Record<QuestType, string> = {
  story: '主线剧情',
  help: '求助任务',
  specialOrder: '特殊订单',
  collection: '收集任务',
  custom: '自定义',
}

export const questTypeIcons: Record<QuestType, React.ReactNode> = {
  story: <IconStory />,
  help: <IconHelp />,
  specialOrder: <IconSpecialOrder />,
  collection: <IconCollection />,
  custom: <IconCustom />,
}

/** SVG图标组件，用于替代emoji */
export const questTypeSvgIcons: Record<QuestType, JSX.Element> = {
  story: <IconStory />,
  help: <IconHelp />,
  specialOrder: <IconSpecialOrder />,
  collection: <IconCollection />,
  custom: <IconCustom />,
}

export const objectiveTypeLabels: Record<ObjectiveType, string> = {
  collect: '收集物品',
  deliver: '送货',
  kill: '击杀怪物',
  fish: '钓鱼',
  talk: '对话',
  craft: '制作',
  mine: '采矿',
  custom: '自定义',
}

export const questCategories = [
  { id: 'story' as const, label: '主线', icon: React.createElement(IconStory) },
  { id: 'help' as const, label: '求助', icon: React.createElement(IconHelp) },
  { id: 'specialOrder' as const, label: '特殊订单', icon: React.createElement(IconSpecialOrder) },
  { id: 'collection' as const, label: '收集', icon: React.createElement(IconCollection) },
]

// ---- 参考任务库 ----
export const referenceQuests: QuestInfo[] = [
  {
    id: 'intro',
    name: 'Introduction',
    displayName: '新手引导',
    type: 'story',
    description: '认识鹈鹕镇的居民们',
    triggerNpcId: 'lewis',
    triggerNpcName: '刘易斯',
    heartRequired: 0,
    season: 'all',
    days: 0,
    objectives: [
      { id: 'o1', type: 'talk', label: '与28位居民打招呼', targetId: '', targetName: '全镇居民', count: 28 },
    ],
    rewards: { gold: 100, friendship: 0, items: [] },
    introText: '欢迎来到鹈鹕镇！我是镇长刘易斯。去和镇上的每个人都打个招呼吧，认识一下你的新邻居们。',
    completeText: '看来你已经认识了镇上的大部分人。欢迎来到鹈鹕镇，希望你喜欢这里！',
  },
  {
    id: 'howToFarm',
    name: 'HowToFarm',
    displayName: '学会种地',
    type: 'story',
    description: '学习基本的农耕技巧',
    triggerNpcId: 'robin',
    triggerNpcName: '罗宾',
    heartRequired: 0,
    season: 'all',
    days: 0,
    objectives: [
      { id: 'o1', type: 'craft', label: '制作稻草人', targetId: 'Scarecrow', targetName: '稻草人', count: 1 },
      { id: 'o2', type: 'collect', label: '收获防风草', targetId: 'Parsnip', targetName: '防风草', count: 1 },
    ],
    rewards: { gold: 100, friendship: 0, items: [{ itemId: 'ParsnipSeeds', itemName: '防风草种子', count: 15 }] },
    introText: '农场那边看起来不错！我先教你一些基础的农耕技巧——先做个稻草人保护你的庄稼，再收获一些防风草。',
    completeText: '很好，你已经掌握了基本的农耕技巧。这些种子送给你，去种下你的第一批庄稼吧。',
  },
  {
    id: 'ratProblem',
    name: 'RatProblem',
    displayName: '鼠患',
    type: 'help',
    description: '社区中心的老鼠问题需要解决',
    triggerNpcId: 'lewis',
    triggerNpcName: '刘易斯',
    heartRequired: 0,
    season: 'all',
    days: 0,
    objectives: [
      { id: 'o1', type: 'kill', label: '击杀10只史莱姆', targetId: 'GreenSlime', targetName: '绿色史莱姆', count: 10 },
    ],
    rewards: { gold: 500, friendship: 30, items: [{ itemId: 'Stone', itemName: '石头', count: 50 }] },
    introText: '矿井那边报告说有些史莱姆跑出来了，你能帮我们去清理一下吗？',
    completeText: '干得好！那些史莱姆已经清理干净了。这是给你的报酬。',
  },
  {
    id: 'cropResearch',
    name: 'CropResearch',
    displayName: '作物研究',
    type: 'help',
    description: '德米特里厄斯需要一些作物做研究',
    triggerNpcId: 'demetrius',
    triggerNpcName: '德米特里厄斯',
    heartRequired: 1,
    season: 'spring',
    days: 5,
    objectives: [
      { id: 'o1', type: 'collect', label: '收获一个甜瓜', targetId: 'Melon', targetName: '甜瓜', count: 1 },
    ],
    rewards: { gold: 550, friendship: 50, items: [] },
    introText: '我正在研究本地的作物品种。你能帮我带一个新鲜的甜瓜来吗？',
    completeText: '完美！这个甜瓜的品种非常纯正。你的农业技术很不错。',
  },
  {
    id: 'rockRefill',
    name: 'RockRefill',
    displayName: '石头需求',
    type: 'help',
    description: '罗宾需要石头来建造新建筑',
    triggerNpcId: 'robin',
    triggerNpcName: '罗宾',
    heartRequired: 1,
    season: 'all',
    days: 7,
    objectives: [
      { id: 'o1', type: 'collect', label: '收集20块石头', targetId: 'Stone', targetName: '石头', count: 20 },
    ],
    rewards: { gold: 300, friendship: 30, items: [] },
    introText: '我最近接了一个建筑项目，但石头不够用了。你能帮我带20块石头来吗？',
    completeText: '太好了，这些石头正好够用。谢谢你的帮忙！',
  },
  {
    id: 'jodiRequest',
    name: 'JodiRequest',
    displayName: '乔迪的请求',
    type: 'help',
    description: '乔迪需要一条新鲜的大嘴鲈鱼',
    triggerNpcId: 'jodi',
    triggerNpcName: '乔迪',
    heartRequired: 2,
    season: 'all',
    days: 2,
    objectives: [
      { id: 'o1', type: 'fish', label: '钓一条大嘴鲈鱼', targetId: 'LargemouthBass', targetName: '大嘴鲈鱼', count: 1 },
    ],
    rewards: { gold: 500, friendship: 50, items: [] },
    introText: '今晚想做一顿特别的海鲜晚餐，但总是钓不到大嘴鲈鱼。你能帮我吗？',
    completeText: '太好了！这条鱼看起来很新鲜。今晚的晚餐终于有着落了。',
  },
  {
    id: 'aquaticRefill',
    name: 'AquaticRefill',
    displayName: '水域研究',
    type: 'specialOrder',
    description: '威利委托调查本地水域',
    triggerNpcId: 'willy',
    triggerNpcName: '威利',
    heartRequired: 3,
    season: 'all',
    days: 7,
    objectives: [
      { id: 'o1', type: 'fish', label: '钓任意鱼10条', targetId: '', targetName: '任何鱼类', count: 10 },
      { id: 'o2', type: 'deliver', label: '运送海鲜杂烩', targetId: 'SeafoamPudding', targetName: '海鲜杂烩', count: 1 },
    ],
    rewards: { gold: 1200, friendship: 80, items: [{ itemId: 'CrabPot', itemName: '蟹笼', count: 3 }] },
    introText: '我代表渔具店发起一项水域研究。需要了解本地鱼类数量和烹饪利用情况。',
    completeText: '这份数据非常有价值！看来本地水域还很健康。这几个蟹笼你拿着。',
  },
  {
    id: 'islandIngredients',
    name: 'IslandIngredients',
    displayName: '热带风味',
    type: 'specialOrder',
    description: '收集姜岛的特殊食材',
    triggerNpcId: 'gus',
    triggerNpcName: '格斯',
    heartRequired: 4,
    season: 'summer',
    days: 14,
    objectives: [
      { id: 'o1', type: 'collect', label: '收集金色核桃', targetId: 'GoldenWalnut', targetName: '金色核桃', count: 20 },
      { id: 'o2', type: 'collect', label: '收集姜', targetId: 'Ginger', targetName: '姜', count: 10 },
      { id: 'o3', type: 'collect', label: '收集芒果', targetId: 'Mango', targetName: '芒果', count: 5 },
    ],
    rewards: { gold: 2500, friendship: 100, items: [{ itemId: 'TropicalCurry', itemName: '热带咖喱', count: 5 }] },
    introText: '我想在餐吧推出一些热带风味的新菜品！你能帮我去姜岛收集一些食材吗？',
    completeText: '太棒了！这些食材足够我做一批新菜品了。这道热带咖喱你尝尝，味道很不错！',
  },
  {
    id: 'museumCollection',
    name: 'MuseumCollection',
    displayName: '博物馆捐献',
    type: 'collection',
    description: '向博物馆捐献文物和矿物',
    triggerNpcId: 'gunther',
    triggerNpcName: '冈瑟',
    heartRequired: 0,
    season: 'all',
    days: 0,
    objectives: [
      { id: 'o1', type: 'mine', label: '找到5种矿物', targetId: '', targetName: '任意矿物', count: 5 },
      { id: 'o2', type: 'collect', label: '找到5种古物', targetId: '', targetName: '任意古物', count: 5 },
    ],
    rewards: { gold: 500, friendship: 30, items: [{ itemId: 'WarriorRing', itemName: '战士戒指', count: 1 }] },
    introText: '博物馆正在扩展收藏！如果你在冒险中找到了什么有趣的矿物或古物，请捐给我们。',
    completeText: '这些藏品太棒了！博物馆因为你变得更加丰富多彩。请收下这份礼物。',
  },
  {
    id: 'communityCenter',
    name: 'CommunityCenter',
    displayName: '社区中心复兴',
    type: 'story',
    description: '完成社区中心各房间的收集包',
    triggerNpcId: 'wizard',
    triggerNpcName: '法师',
    heartRequired: 0,
    season: 'all',
    days: 0,
    objectives: [
      { id: 'o1', type: 'collect', label: '完成工艺室收集包', targetId: 'Bundle', targetName: '工艺室收集包', count: 1 },
      { id: 'o2', type: 'collect', label: '完成食品储藏室收集包', targetId: 'Bundle', targetName: '食品储藏室收集包', count: 1 },
      { id: 'o3', type: 'collect', label: '完成鱼缸收集包', targetId: 'Bundle', targetName: '鱼缸收集包', count: 1 },
      { id: 'o4', type: 'collect', label: '完成公告板收集包', targetId: 'Bundle', targetName: '公告板收集包', count: 1 },
    ],
    rewards: { gold: 2000, friendship: 100, items: [{ itemId: 'Stardrop', itemName: '星之果实', count: 1 }] },
    introText: '社区中心有一种奇怪的能量...如果你能完成那些金色卷轴上的收集包，或许能唤醒它。',
    completeText: '社区中心焕然一新！小镇的每个人都感激你的贡献。请收下这颗星之果实。',
  },
  {
    id: 'willyBoat',
    name: 'WillyBoat',
    displayName: '修理旧船',
    type: 'story',
    description: '帮助威利修理通往姜岛的船',
    triggerNpcId: 'willy',
    triggerNpcName: '威利',
    heartRequired: 2,
    season: 'all',
    days: 0,
    objectives: [
      { id: 'o1', type: 'collect', label: '收集200块硬木', targetId: 'Hardwood', targetName: '硬木', count: 200 },
      { id: 'o2', type: 'collect', label: '收集5块铱锭', targetId: 'IridiumBar', targetName: '铱锭', count: 5 },
      { id: 'o3', type: 'collect', label: '收集5个电池组', targetId: 'BatteryPack', targetName: '电池组', count: 5 },
    ],
    rewards: { gold: 5000, friendship: 150, items: [{ itemId: 'Pearl', itemName: '珍珠', count: 1 }] },
    introText: '我有一艘旧船，如果能修好它，就能带你去姜岛了！但这些材料不太容易找...',
    completeText: '船修好了！随时准备启航。这趟姜岛之旅就当我们给你的谢礼。',
  },
  {
    id: 'emeraldHunt',
    name: 'EmeraldHunt',
    displayName: '祖母绿之约',
    type: 'help',
    description: '艾米丽需要一颗祖母绿',
    triggerNpcId: 'emily',
    triggerNpcName: '艾米丽',
    heartRequired: 3,
    season: 'all',
    days: 1,
    objectives: [
      { id: 'o1', type: 'mine', label: '找到一颗祖母绿', targetId: 'Emerald', targetName: '祖母绿', count: 1 },
    ],
    rewards: { gold: 600, friendship: 60, items: [] },
    introText: '我正在做一个手工艺品，需要一颗祖母绿作为点睛之笔。你能帮我在矿井里找找吗？',
    completeText: '哇，这颗祖母绿太美了！正好配我的手工作品。谢谢你！',
  },
  {
    id: 'winterStar',
    name: 'WinterStar',
    displayName: '冬日星辰',
    type: 'specialOrder',
    description: '冬日星盛宴的筹备工作',
    triggerNpcId: 'lewis',
    triggerNpcName: '刘易斯',
    heartRequired: 1,
    season: 'winter',
    days: 3,
    objectives: [
      { id: 'o1', type: 'deliver', label: '捐赠一份料理', targetId: 'Cooking', targetName: '任意料理', count: 1 },
      { id: 'o2', type: 'deliver', label: '捐赠一份礼物', targetId: '', targetName: '任意物品', count: 1 },
    ],
    rewards: { gold: 300, friendship: 50, items: [{ itemId: 'TeaSet', itemName: '茶具套装', count: 1 }] },
    introText: '冬日星盛宴快到了！我们正在征集料理和礼物。你能贡献一些吗？',
    completeText: '你的贡献让盛宴更加丰盛了。请收下这份茶具套装作为感谢。',
  },
  {
    id: 'springOnion',
    name: 'SpringOnionHunt',
    displayName: '春季野菜采集',
    type: 'help',
    description: '玛妮需要春季野葱喂鸡',
    triggerNpcId: 'marnie',
    triggerNpcName: '玛妮',
    heartRequired: 1,
    season: 'spring',
    days: 3,
    objectives: [
      { id: 'o1', type: 'collect', label: '采集15根春季野葱', targetId: 'SpringOnion', targetName: '春季野葱', count: 15 },
    ],
    rewards: { gold: 200, friendship: 30, items: [{ itemId: 'Egg', itemName: '鸡蛋', count: 6 }] },
    introText: '我的鸡最爱吃春季野葱了，你能帮我去森林里采一些来吗？',
    completeText: '这些野葱看起来很新鲜！鸡们一定会喜欢的。送你几个鸡蛋做早餐。',
  },
]

export function createEmptyQuest(): QuestInfo {
  return {
    id: 'quest_' + Date.now(),
    name: 'NewQuest',
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
    canCancel: true,
  }
}
