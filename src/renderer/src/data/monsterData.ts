// 星露谷物语 1.6 怪物列表
// 来源: Stardew Valley Wiki + 游戏 Monsters 数据
// name 字段必须与游戏内 monster 名一致(英文)

export interface MonsterInfo {
  /** 游戏内怪物名 (用作导出 Data/Monsters 的 key) */
  name: string
  /** 中文显示名 */
  displayName: string
  /** 出没地区 */
  location: 'mine' | 'skull_cavern' | 'volcano' | 'woods' | 'desert' | 'island' | 'other' | 'all'
  /** 简短描述 */
  desc?: string
}

export const monsterLocationLabels: Record<MonsterInfo['location'], { label: string; color: string }> = {
  mine: { label: '矿井', color: '#94a3b8' },
  skull_cavern: { label: '骷髅洞穴', color: '#c084fc' },
  volcano: { label: '火山地牢', color: '#f97316' },
  woods: { label: '森林/农场', color: '#4ade80' },
  desert: { label: '沙漠', color: '#fbbf24' },
  island: { label: '姜岛', color: '#38bdf8' },
  other: { label: '其他', color: '#9ca3af' },
  all: { label: '全场景', color: '#f472b6' },
}

export const monsters: MonsterInfo[] = [
  // === 矿井 (The Mines, 1-39 层) ===
  { name: 'Green Slime', displayName: '绿色史莱姆', location: 'mine', desc: '最常见的史莱姆' },
  { name: 'Frost Jelly', displayName: '冰霜史莱姆', location: 'mine', desc: '冰系史莱姆' },
  { name: 'Sludge', displayName: '熔岩史莱姆', location: 'mine', desc: '火系史莱姆' },
  { name: 'Red Sludge', displayName: '红色史莱姆', location: 'mine', desc: '火属性强化的史莱姆' },
  { name: 'Purple Sludge', displayName: '紫色史莱姆', location: 'mine', desc: '暗属性史莱姆' },
  { name: 'Grub', displayName: '蛴螬', location: 'mine', desc: '小型虫类' },
  { name: 'Fly', displayName: '苍蝇', location: 'mine', desc: '小型飞行虫' },
  { name: 'Bug', displayName: '虫子', location: 'mine', desc: '小型地面虫' },
  { name: 'Cave Fly', displayName: '洞穴苍蝇', location: 'mine', desc: '矿井中的苍蝇' },
  { name: 'Bat', displayName: '蝙蝠', location: 'mine', desc: '基础蝙蝠' },
  { name: 'Frost Bat', displayName: '冰霜蝙蝠', location: 'mine', desc: '冰系蝙蝠' },
  { name: 'Lava Bat', displayName: '熔岩蝙蝠', location: 'mine', desc: '火系蝙蝠' },
  { name: 'Duggy', displayName: '地虫', location: 'mine', desc: '挖地的虫子' },
  { name: 'Rock Crab', displayName: '岩石蟹', location: 'mine', desc: '伪装成岩石的蟹' },
  { name: 'Lava Crab', displayName: '熔岩蟹', location: 'mine', desc: '火系岩蟹' },
  { name: 'Stone Golem', displayName: '石头傀儡', location: 'mine', desc: '由石头构成的怪物' },
  { name: 'Wilderness Golem', displayName: '荒野傀儡', location: 'mine', desc: '森林型石头傀儡' },
  { name: 'Dust Spirit', displayName: '尘埃精灵', location: 'mine', desc: '60层以后的飞行怪物' },
  { name: 'Ghost', displayName: '幽灵', location: 'mine', desc: '漂浮的鬼魂' },
  { name: 'Carbon Ghost', displayName: '碳幽灵', location: 'skull_cavern', desc: '骷髅洞穴幽灵' },
  // === 骷髅洞穴 (Skull Cavern, 40+ 沙漠层) ===
  { name: 'Skull', displayName: '骷髅头', location: 'skull_cavern', desc: '头骨型怪物' },
  { name: 'Mummy', displayName: '木乃伊', location: 'skull_cavern', desc: '沙漠古老怪物' },
  { name: 'Big Slime', displayName: '大史莱姆', location: 'skull_cavern', desc: '大型史莱姆' },
  { name: 'Tiger Slime', displayName: '虎纹史莱姆', location: 'skull_cavern', desc: '剧毒史莱姆' },
  { name: 'Armored Bug', displayName: '装甲虫', location: 'skull_cavern', desc: '有护甲的虫' },
  { name: 'Blue Squid', displayName: '蓝色鱿鱼', location: 'skull_cavern', desc: '漂浮的鱿鱼' },
  { name: 'Serpent', displayName: '蛇', location: 'skull_cavern', desc: '沙漠长蛇' },
  { name: 'Royal Serpent', displayName: '皇家蛇', location: 'skull_cavern', desc: '稀有大型蛇' },
  { name: 'Shooter', displayName: '射手', location: 'skull_cavern', desc: '会射击的植物怪' },
  { name: 'Hot Head', displayName: '火球怪', location: 'skull_cavern', desc: '投掷火球的怪物' },
  { name: 'Lava Lurker', displayName: '熔岩潜伏者', location: 'skull_cavern', desc: '可穿越熔岩' },
  { name: 'Sparker', displayName: '电火花', location: 'skull_cavern', desc: '会放电的怪物' },
  { name: 'Magma Sprite', displayName: '熔岩精灵', location: 'skull_cavern', desc: '熔岩中快速移动' },
  { name: 'Magma Duggy', displayName: '熔岩地虫', location: 'skull_cavern', desc: '熔岩版地虫' },
  { name: 'Pepper Rex', displayName: '辣椒霸王龙', location: 'skull_cavern', desc: '稀有大型史前怪物' },
  // === 火山地牢 (Volcano Dungeon) ===
  { name: 'Dwarvish Sentry', displayName: '矮人哨兵', location: 'volcano', desc: '使用电击的矮人' },
  { name: 'False Magma Cap', displayName: '假熔岩菇', location: 'volcano', desc: '伪装成蘑菇的怪物' },
  { name: 'Lava Sprite', displayName: '熔岩精灵(火山)', location: 'volcano', desc: '火山地牢中的精灵' },
  { name: 'Magma Sparker', displayName: '熔岩电火', location: 'volcano', desc: '电火系怪物' },
  { name: 'Tiger Slime (Volcano)', displayName: '虎纹史莱姆(火山)', location: 'volcano', desc: '火山地牢虎纹史莱姆' },
  { name: 'Red Sludge (Volcano)', displayName: '红色史莱姆(火山)', location: 'volcano', desc: '火山地牢红史莱姆' },
  { name: 'Hot Head (Volcano)', displayName: '火球怪(火山)', location: 'volcano', desc: '火山地牢火球怪' },
  { name: 'Magma Cap', displayName: '熔岩菇', location: 'volcano', desc: '蘑菇型怪物' },
  { name: 'Magma Spiker', displayName: '熔岩刺', location: 'volcano', desc: '远程投刺' },
  { name: 'Grub (Volcano)', displayName: '蛴螬(火山)', location: 'volcano', desc: '火山地蛴螬' },
  { name: 'Fly (Volcano)', displayName: '苍蝇(火山)', location: 'volcano', desc: '火山苍蝇' },
  { name: 'Bug (Volcano)', displayName: '虫子(火山)', location: 'volcano', desc: '火山地虫' },
  { name: 'Cave Fly (Volcano)', displayName: '洞穴苍蝇(火山)', location: 'volcano', desc: '火山洞穴苍蝇' },
  { name: 'Bat (Volcano)', displayName: '蝙蝠(火山)', location: 'volcano', desc: '火山蝙蝠' },
  // === 森林/农场 ===
  { name: 'Crow', displayName: '乌鸦', location: 'woods', desc: '偷食种子的鸟' },
  { name: 'Frog', displayName: '青蛙', location: 'woods', desc: '湖边的青蛙' },
  // === 沙漠 ===
  { name: 'Desert Spirit', displayName: '沙漠精灵', location: 'desert', desc: '沙漠怪物' },
  // === 姜岛 (Ginger Island) ===
  { name: 'Coconut Crab', displayName: '椰子蟹', location: 'island', desc: '姜岛螃蟹' },
  { name: 'Island Bat', displayName: '岛屿蝙蝠', location: 'island', desc: '姜岛蝙蝠' },
  { name: 'Island Bug', displayName: '岛屿虫子', location: 'island', desc: '姜岛虫类' },
  { name: 'Island Fly', displayName: '岛屿苍蝇', location: 'island', desc: '姜岛苍蝇' },
  { name: 'Island Frog', displayName: '岛屿青蛙', location: 'island', desc: '姜岛青蛙' },
  { name: 'Island Grub', displayName: '岛屿蛴螬', location: 'island', desc: '姜岛蛴螬' },
  { name: 'Island Slime', displayName: '岛屿史莱姆', location: 'island', desc: '姜岛史莱姆' },
  { name: 'Island Snake', displayName: '岛屿蛇', location: 'island', desc: '姜岛蛇' },
  { name: 'Mango Monster', displayName: '芒果怪', location: 'island', desc: '姜岛水果型怪物' },
  { name: 'Piranha', displayName: '食人鱼', location: 'island', desc: '姜岛水域' },
  { name: 'Squid Kid', displayName: '鱿鱼仔', location: 'island', desc: '会飞的鱿鱼' },
  // === 较稀有/特殊 ===
  { name: 'Krobus', displayName: '科罗布斯', location: 'other', desc: '阴影生物(不可攻击)' },
  { name: 'Shadow Brute', displayName: '暗影暴徒', location: 'skull_cavern', desc: '暗影系物理怪' },
  { name: 'Shadow Shaman', displayName: '暗影萨满', location: 'skull_cavern', desc: '暗影系魔法怪' },
  { name: 'Shadow Sniper', displayName: '暗影狙击手', location: 'skull_cavern', desc: '暗影系远程怪' },
  { name: 'Iridium Bat', displayName: '铱金蝙蝠', location: 'skull_cavern', desc: '稀有强化蝙蝠' },
  { name: 'Iridium Crab', displayName: '铱金蟹', location: 'skull_cavern', desc: '稀有强化蟹' },
  { name: 'Iridium Golem', displayName: '铱金傀儡', location: 'skull_cavern', desc: '稀有强化傀儡' },
  { name: 'Iridium Ghost', displayName: '铱金幽灵', location: 'skull_cavern', desc: '稀有强化幽灵' },
]

/** 按显示名搜索(中文/英文) */
export function searchMonsters(keyword: string): MonsterInfo[] {
  if (!keyword.trim()) return monsters
  const k = keyword.toLowerCase()
  return monsters.filter(m =>
    m.name.toLowerCase().includes(k) ||
    m.displayName.includes(keyword) ||
    (m.desc && m.desc.includes(keyword))
  )
}
