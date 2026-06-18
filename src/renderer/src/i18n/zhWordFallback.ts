/**
 * 通用英文单词 → 中文映射（二级回退）
 * 用于描述和未能精确匹配的物品名
 */
const wordMap: Record<string, string> = {
  // 常用物品类名词
  'Fish': '鱼',
  'Mineral': '矿物',
  'Gem': '宝石',
  'Crop': '农作物',
  'Fruit': '水果',
  'Vegetable': '蔬菜',
  'Flower': '花卉',
  'Seed': '种子',
  'Tree': '树',
  'Plant': '植物',
  'Ore': '矿石',
  'Bar': '锭',
  'Ring': '戒指',
  'Hat': '帽子',
  'Boot': '靴子',
  'Shoe': '鞋子',
  'Weapon': '武器',
  'Sword': '剑',
  'Dagger': '匕首',
  'Club': '棍棒',
  'Hammer': '锤',
  'Bow': '弓',
  'Shirt': '衬衫',
  'Pants': '裤子',
  'Clothing': '服装',
  'Furniture': '家具',
  'Table': '桌子',
  'Chair': '椅子',
  'Bed': '床',
  'Lamp': '灯具',
  'Rug': '地毯',
  'Chest': '箱子',
  'Fence': '围栏',
  'Floor': '地板',
  'Wallpaper': '壁纸',
  'Cooking': '烹饪',
  'Crafting': '合成',
  'Recipe': '配方',
  'Bait': '鱼饵',
  'Tackle': '钓具',
  'Junk': '垃圾',
  'Trash': '垃圾',
  'Quest': '任务',
  'Artifact': '古物',
  'Fossil': '化石',

   // 颜色
  'Red': '红色',
  'Blue': '蓝色',
  'Green': '绿色',
  'Yellow': '黄色',
  'Orange': '橙色',
  'Purple': '紫色',
  'Pink': '粉色',
  'Brown': '棕色',
  'Black': '黑色',
  'White': '白色',
  'Gray': '灰色',
  'Dark': '深色',
  'Light': '浅色',

  // 材质/属性
  'Wooden': '木制',
  'Wood': '木',
  'Stone': '石头',
  'Iron': '铁',
  'Copper': '铜',
  'Gold': '金',
  'Silver': '银',
  'Iridium': '铱',
  'Crystal': '水晶',
  'Glass': '玻璃',
  'Clay': '粘土',
  'Fiber': '纤维',
  'Leather': '皮革',
  'Silk': '丝绸',
  'Cloth': '布料',
  'Steel': '钢',
  'Diamond': '钻石',
  'Ruby': '红宝石',
  'Emerald': '绿宝石',
  'Amethyst': '紫水晶',
  'Topaz': '黄玉',
  'Jade': '翡翠',
  'Aquamarine': '海蓝宝石',
  'Prismatic': '五彩',
  'Radioactive': '放射性',
  'Galaxy': '银河',
  'Infinity': '无限',
  'Dragon': '龙',
  'Dwarf': '矮人',
  'Elf': '精灵',
  'Elvish': '精灵',
  'Magic': '魔法',
  'Cursed': '被诅咒',
  'Enchanted': '附魔',
  'Prehistoric': '史前',
  'Frozen': '冰冻',
  'Molten': '熔融',
  'Lava': '熔岩',
  'Obsidian': '黑曜石',
  'Strange': '奇怪',
  'Mysterious': '神秘',
  'Rusty': '生锈',
  'Broken': '破碎',
  'Soggy': '湿透',
  'Dried': '干燥',
  'Pickled': '腌制',
  'Smoked': '烟熏',
  'Fried': '煎',
  'Baked': '烤',
  'Roasted': '烤',
  'Grilled': '烤',
  'Fresh': '新鲜',
  'Wild': '野生',
  'Common': '普通',
  'Deluxe': '高级',
  'Quality': '优质',
  'Basic': '基础',
  'Heavy': '重型',
  'Mini': '迷你',
  'Large': '大',
  'Small': '小',
  'Tiny': '微小',
  'Giant': '巨大',
  'Super': '超级',
  'Hyper': '超速',
  'Ancient': '上古',
  'Void': '虚空',
  'Solar': '太阳',
  'Ghost': '幽灵',

  // 自然类
  'Earth': '大地',
  'Fire': '火',
  'Water': '水',
  'Wind': '风',
  'Ice': '冰',
  'Thunder': '雷',
  'Star': '星',
  'Moon': '月',
  'Sun': '太阳',
  'Sky': '天空',
  'Ocean': '海洋',
  'Sea': '海',
  'River': '河流',
  'Lake': '湖',
  'Forest': '森林',
  'Mountain': '山',
  'Desert': '沙漠',
  'Island': '岛屿',
  'Swamp': '沼泽',
  'Cave': '洞穴',
  'Mine': '矿井',

   // 生物
  'Bird': '鸟',
  'Bear': '熊',
  'Wolf': '狼',
  'Fox': '狐狸',
  'Cat': '猫',
  'Dog': '狗',
  'Rabbit': '兔子',
  'Duck': '鸭子',
  'Chicken': '鸡',
  'Cow': '牛',
  'Goat': '山羊',
  'Sheep': '羊',
  'Pig': '猪',
  'Horse': '马',
  'Frog': '青蛙',
  'Snake': '蛇',
  'Lizard': '蜥蜴',
  'Bug': '虫子',
  'Insect': '昆虫',
  'Slime': '史莱姆',
  'Bat': '蝙蝠',
  'Spider': '蜘蛛',
  'Skull': '头骨',
  'Bone': '骨头',

  // 食物
  'Soup': '汤',
  'Stew': '炖菜',
  'Salad': '沙拉',
  'Bread': '面包',
  'Cake': '蛋糕',
  'Pie': '派',
  'Cookie': '饼干',
  'Candy': '糖果',
  'Juice': '果汁',
  'Tea': '茶',
  'Coffee': '咖啡',
  'Beer': '啤酒',
  'Wine': '酒',
  'Milk': '牛奶',
  'Cheese': '奶酪',
  'Egg': '蛋',
  'Meat': '肉',
  'Shrimp': '虾',
  'Crab': '螃蟹',
  'Lobster': '龙虾',
  'Sushi': '寿司',
  'Rice': '米饭',
  'Noodle': '面条',
  'Pizza': '披萨',
  'Burger': '汉堡',
  'Sandwich': '三明治',
  'Toast': '吐司',
  'Pancake': '薄煎饼',
  'Omelet': '煎蛋卷',
  'Jam': '果酱',
  'Jelly': '果冻',
  'Honey': '蜂蜜',
  'Syrup': '糖浆',
  'Oil': '油',
  'Butter': '黄油',
  'Sauce': '酱',
  'Spice': '香料',
  'Herb': '草药',

  // 数词/修饰
  'First': '第一',
  'Second': '第二',
  'Third': '第三',
  'Fourth': '第四',
  'I': '一',
  'II': '二',
  'III': '三',
  'IV': '四',

  // 季节
  'Spring': '春季',
  'Summer': '夏季',
  'Fall': '秋季',
  'Winter': '冬季',

  // 方向
  'North': '北',
  'South': '南',
  'East': '东',
  'West': '西',
  'Up': '上',
  'Down': '下',
  'Left': '左',
  'Right': '右',

  // 通用
  'Normal': '普通',
  'Hard': '困难',
  'Easy': '简单',
  'Strong': '强力',
  'Weak': '虚弱',
  'Fast': '快速',
  'Slow': '缓慢',
  'Hot': '热',
  'Cold': '冷',
  'Warm': '温暖',
  'Dry': '干燥',
  'Wet': '湿润',
  'Sweet': '甜',
  'Sour': '酸',
  'Bitter': '苦',
  'Spicy': '辣',
  'Salty': '咸',
  'Rich': '丰富',
  'Poor': '贫乏',
  'Royal': '皇家',
  'Grand': '宏伟',
  'Master': '大师',
  'Expert': '专家',
  'Beginner': '初学者',
  'Decorative': '装饰',
  'Ornamental': '装饰性',
}

/**
 * 通用英文短语 → 中文映射（低置信度回退）
 */
const phraseMap: Record<string, string> = {
  'Stardew Valley': '星露谷物语',
  'Stardrop': '星之果实',
  'Starfruit': '杨桃',
  'Ancient Fruit': '上古水果',
  'Cactus Fruit': '仙人掌果',
  'Crystal Fruit': '水晶果',
  'Ancient Seed': '上古种子',
  'Strange Bun': '奇怪的包子',
  'Strange Doll': '奇怪玩偶',
  'Treasure Chest': '大宝箱',
  'Treasure Totem': '宝藏图腾',
  'Secret Note': '秘密纸条',
  'Mermaid Pendant': '美人鱼吊坠',
  'Wedding Ring': '结婚戒指',
  'Friendship 101': '友谊入门',
  'Woodcutter Weekly': '伐木工周刊',
  'Mining Monthly': '采矿月刊',
  'Crab Cakes': '蟹黄糕',
  'Crab Pot': '蟹笼',
  'Fish Taco': '鱼卷',
  'Fish Stew': '炖鱼',
  'Cranberry Sauce': '蔓越莓酱',
  'Squid Ink': '鱿鱼墨汁',
  'Spider Web': '蜘蛛网',
  'Bug Meat': '虫肉',
  'Bat Wing': '蝙蝠翅膀',
  'Solar Essence': '太阳精华',
  'Void Essence': '虚空精华',
  'Bone Fragment': '骨头碎片',
  'Battery Pack': '电池组',
  'Battery': '电池',
}

/**
 * 对输入文本应用通用英文 → 中文回退
 *
 * 策略：
 * 1. 先查短语精确匹配
 * 2. 对每个单词单独查 wordMap
 * 3. 如果全部是已知单词则返回组合结果
 * 4. 否则返回 null 表示无法翻译
 */
export function genericTranslate(text: string): string | null {
  if (!text) return null

  const trimmed = text.trim()

  // 短语精确匹配
  if (phraseMap[trimmed]) return phraseMap[trimmed]

  // 尝试全小写匹配
  const lowered = trimmed.toLowerCase()
  for (const [phrase, cn] of Object.entries(phraseMap)) {
    if (phrase.toLowerCase() === lowered) return cn
  }

  // 按空格分割，逐个单词翻译
  const words = trimmed.split(/\s+/)
  const translatedParts: string[] = []
  let allKnown = true

  for (const word of words) {
    if (!word) continue
    // 去掉标点
    const clean = word.replace(/[.,!?;:'"()\-]/g, '')
    if (!clean) {
      translatedParts.push(word)
      continue
    }
    // 查 wordMap (忽略大小写)
    const cn = wordMap[clean] || wordMap[clean.toLowerCase()] || wordMap[capitalize(clean.toLowerCase())]
    if (cn) {
      translatedParts.push(cn)
    } else {
      allKnown = false
      translatedParts.push(word)
    }
  }

  if (allKnown && translatedParts.length > 0) {
    return translatedParts.join('')
  }

  // 无法完整翻译
  return null
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
