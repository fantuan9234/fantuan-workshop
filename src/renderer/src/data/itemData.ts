import React from 'react'
import { IconCrop, IconSeeds, IconForage, IconFish, IconArtisan, IconFood, IconMineral, IconResource, IconWeapon, IconDecor } from '../components/Icons'

export interface ItemInfo {
  id: string
  name: string
  displayName: string
  category: ItemCategory
  sellPrice: number
  quality: 'normal' | 'silver' | 'gold' | 'iridium'
  description: string
  edible: boolean
  canGift: boolean
  imageUrl: string
  color: string
}

export type ItemCategory = 'crops' | 'artisan' | 'foraging' | 'fish' | 'minerals' | 'weapons' | 'food' | 'seeds' | 'resources' | 'decor'

export const itemCategories: { id: ItemCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'crops', label: '农作物', icon: React.createElement(IconCrop) },
  { id: 'seeds', label: '种子', icon: React.createElement(IconSeeds) },
  { id: 'foraging', label: '采集品', icon: React.createElement(IconForage) },
  { id: 'fish', label: '鱼类', icon: React.createElement(IconFish) },
  { id: 'artisan', label: '工匠品', icon: React.createElement(IconArtisan) },
  { id: 'food', label: '料理', icon: React.createElement(IconFood) },
  { id: 'minerals', label: '矿物', icon: React.createElement(IconMineral) },
  { id: 'resources', label: '资源', icon: React.createElement(IconResource) },
  { id: 'weapons', label: '武器', icon: React.createElement(IconWeapon) },
  { id: 'decor', label: '装饰', icon: React.createElement(IconDecor) },
]

const IMG = 'https://stardewvalleywiki.com/mediawiki/images'

// 星露谷Wiki物品图片URL（通过已知MD5哈希映射）
// 格式: /mediawiki/images/{首字符}/{首两字符}/filename.png
// Wiki图片哈希映射 — 全部通过 mediawiki API 验证
const wikiImg = (name: string) => {
  const k: Record<string, string> = {
    // 农作物 crops
    'Parsnip.png': 'd/db', 'Cauliflower.png': 'a/aa', 'Potato.png': 'c/c2',
    'Green_Bean.png': '5/5c', 'Strawberry.png': '6/6d', 'Blueberry.png': '9/9e',
    'Cranberries.png': '6/6e', 'Tomato.png': '9/9d', 'Hot_Pepper.png': 'f/f1',
    'Corn.png': 'f/f8', 'Eggplant.png': '8/8f', 'Pumpkin.png': '6/64',
    'Melon.png': '1/19', 'Starfruit.png': 'd/db', 'Ancient_Fruit.png': '0/01',
    'Wheat.png': 'e/e2', 'Hops.png': '5/59', 'Yam.png': '5/52',
    'Radish.png': 'd/d5', 'Red_Cabbage.png': '2/2d', 'Kale.png': 'd/d1',
    'Artichoke.png': 'd/dd', 'Beet.png': 'a/a4', 'Bok_Choy.png': '4/40',
    'Sunflower.png': '8/81', 'Garlic.png': 'c/cc', 'Amaranth.png': 'f/f6',
    'Cactus_Fruit.png': '3/32', 'Poppy.png': '3/37', 'Rhubarb.png': '6/6e',
    'Grape.png': 'c/c2', 'Coffee_Bean.png': '3/33', 'Tea_Leaves.png': '5/5b',
    'Rice.png': 'd/da',
    // 资源 resources
    'Wood.png': 'd/df', 'Stone.png': 'd/d4', 'Fiber.png': '4/45',
    'Coal.png': 'a/a7', 'Copper_Ore.png': '7/78', 'Iron_Ore.png': '8/87',
    'Gold_Ore.png': 'f/f7', 'Iridium_Ore.png': 'e/e9',
    'Copper_Bar.png': 'f/f1', 'Iron_Bar.png': '6/6c', 'Gold_Bar.png': '4/4e',
    'Iridium_Bar.png': 'c/c4', 'Refined_Quartz.png': '9/98',
    'Sap.png': '7/73', 'Maple_Syrup.png': '6/6a', 'Oak_Resin.png': '4/40',
    'Pine_Tar.png': 'c/ce', 'Battery_Pack.png': '2/25',
    // 种子 seeds
    'Parsnip_Seeds.png': 'd/d3', 'Cauliflower_Seeds.png': 'b/bb',
    'Potato_Seeds.png': '4/44', 'Corn_Seeds.png': 'd/d1',
    'Tomato_Seeds.png': 'e/e3', 'Pepper_Seeds.png': '6/67',
    'Wheat_Seeds.png': '2/2b', 'Radish_Seeds.png': 'b/b1',
    'Melon_Seeds.png': '5/5e', 'Pumpkin_Seeds.png': '9/99',
    'Eggplant_Seeds.png': 'f/f9', 'Cranberry_Seeds.png': 'e/ec',
    'Grape_Starter.png': 'd/de', 'Hops_Starter.png': '9/9b',
    'Bean_Starter.png': '2/26', 'Tulip_Bulb.png': '4/42',
    'Jazz_Seeds.png': '9/95', 'Poppy_Seeds.png': 'a/a2',
    'Spangle_Seeds.png': '8/85', 'Sunflower_Seeds.png': '1/1f',
    'Fairy_Seeds.png': '8/8e', 'Spring_Seeds.png': '3/39',
    'Summer_Seeds.png': 'c/c4', 'Fall_Seeds.png': '5/55',
    'Winter_Seeds.png': 'd/dd',
    // 采集品 foraging
    'Daffodil.png': '4/4b', 'Dandelion.png': 'b/b1', 'Leek.png': '5/57',
    'Wild_Horseradish.png': '9/90', 'Morel.png': 'b/b1', 'Common_Mushroom.png': '2/2e',
    'Salmonberry.png': '5/59', 'Blackberry.png': '2/25',
    'Coconut.png': '2/2f', 'Coral.png': 'b/b1', 'Sea_Urchin.png': 'e/e7',
    'Sweet_Pea.png': 'd/d9', 'Crocus.png': '2/2f', 'Crystal_Fruit.png': '1/16',
    'Fiddlehead_Fern.png': '4/48', 'Truffle.png': 'f/f2',
    // 矿物/宝石 minerals
    'Amethyst.png': '2/2e', 'Topaz.png': 'a/a5', 'Aquamarine.png': 'a/a2',
    'Jade.png': '7/7e', 'Emerald.png': '6/6a', 'Ruby.png': 'a/a9',
    'Diamond.png': 'e/ea', 'Prismatic_Shard.png': '5/56', 'Earth_Crystal.png': '7/74',
    'Quartz.png': 'c/cf', 'Fire_Quartz.png': '5/5b', 'Frozen_Tear.png': 'e/ec',
    // 鱼类 fish
    'Carp.png': 'a/a8', 'Sunfish.png': '5/56', 'Largemouth_Bass.png': '1/11',
    'Bullhead.png': 'd/db', 'Lobster.png': '9/9f', 'Crab.png': '6/63',
    'Cockle.png': 'a/ad', 'Mussel.png': 'a/aa', 'Shrimp.png': '9/91',
    'Snail.png': 'd/d2', 'Periwinkle.png': '1/1d', 'Oyster.png': '5/54',
    'Tuna.png': 'c/c5', 'Sardine.png': '0/04', 'Bream.png': '8/82',
    'Salmon.png': 'c/ca', 'Eel.png': '3/3a', 'Squid.png': '4/4d',
    'Pufferfish.png': '4/47', 'Rainbow_Trout.png': '5/5a', 'Catfish.png': '3/34',
    'Tiger_Trout.png': '0/08',
    // 工匠品 artisan
    'Cheese.png': 'a/a5', 'Goat_Cheese.png': 'c/c8', 'Mayonnaise.png': '4/4e',
    'Duck_Mayonnaise.png': '2/23', 'Wine.png': '6/69', 'Beer.png': 'b/b3',
    'Pale_Ale.png': '7/78', 'Juice.png': 'f/f1', 'Mead.png': '8/84',
    'Jelly.png': '0/05', 'Pickles.png': 'c/c7', 'Caviar.png': '8/89',
    'Cloth.png': '5/51', 'Truffle_Oil.png': '3/3d', 'Coffee.png': 'e/e9',
    'Honey.png': 'c/c6', 'Oil.png': '0/06',
    // 料理 food
    'Fried_Egg.png': '1/18', 'Omelet.png': '1/12', 'Pancakes.png': '6/6b',
    'Bread.png': 'e/e1', 'Salad.png': '7/7e', 'Pizza.png': 'f/f4',
    'Chocolate_Cake.png': '8/87', 'Pink_Cake.png': '3/32', 'Cookie.png': '7/70',
    'Maki_Roll.png': 'b/b6', 'Sashimi.png': '4/41', 'Fried_Calamari.png': '2/25',
    'Fruit_Salad.png': '9/9e', 'Complete_Breakfast.png': '3/3d',
    'Pepper_Poppers.png': '0/08', 'Lobster_Bisque.png': '0/0a',
    'Spaghetti.png': '0/08', 'Cranberry_Sauce.png': '0/0b',
    'Stuffing.png': '9/9a', 'Pumpkin_Soup.png': '5/59',
    'Survival_Burger.png': '8/87', 'Triple_Shot_Espresso.png': '3/36',
    'Farmer_s_Lunch.png': '7/79', 'Crab_Cakes.png': '7/70',
    // 武器 weapons
    'Galaxy_Sword.png': '4/44', 'Wooden_Blade.png': '0/06', 'Obsidian_Edge.png': '7/73',
    'Lava_Katana.png': 'a/a0', 'Insect_Head.png': '3/35',
  }
  return `${IMG}/${k[name] || '0/00'}/${name}`
}

export const referenceItems: ItemInfo[] = [
  // === 农作物 ===
  { id: 'parsnip', name: 'Parsnip', displayName: '防风草', category: 'crops', sellPrice: 35, quality: 'normal', description: '一种和胡萝卜很相似的春季块茎植物，营养丰富。', edible: true, canGift: true, color: '#d4c878', imageUrl: wikiImg('Parsnip.png') },
  { id: 'cauliflower', name: 'Cauliflower', displayName: '花椰菜', category: 'crops', sellPrice: 175, quality: 'normal', description: '价值很高，但生长缓慢。虽然颜色苍白，花簇却饱含营养。', edible: true, canGift: true, color: '#f5f0e8', imageUrl: wikiImg('Cauliflower.png') },
  { id: 'potato', name: 'Potato', displayName: '土豆', category: 'crops', sellPrice: 80, quality: 'normal', description: '一种广泛栽培的块茎植物，几乎可以做成任何菜。', edible: true, canGift: true, color: '#c4a46c', imageUrl: wikiImg('Potato.png') },
  { id: 'green_bean', name: 'Green Bean', displayName: '绿豆', category: 'crops', sellPrice: 40, quality: 'normal', description: '多汁的豆子，有着清凉爽脆的口感。', edible: true, canGift: true, color: '#5a8a3c', imageUrl: wikiImg('Green_Bean.png') },
  { id: 'strawberry', name: 'Strawberry', displayName: '草莓', category: 'crops', sellPrice: 120, quality: 'normal', description: '广受欢迎的浆果，味道甜美，颜色鲜艳。', edible: true, canGift: true, color: '#d43a4a', imageUrl: wikiImg('Strawberry.png') },
  { id: 'blueberry', name: 'Blueberry', displayName: '蓝莓', category: 'crops', sellPrice: 80, quality: 'normal', description: '一种据说能增强夜视能力的流行浆果。', edible: true, canGift: true, color: '#3a5ad4', imageUrl: wikiImg('Blueberry.png') },
  { id: 'cranberries', name: 'Cranberries', displayName: '蔓越莓', category: 'crops', sellPrice: 130, quality: 'normal', description: '这些酸红色浆果是传统的冬季食物。', edible: true, canGift: true, color: '#c83a4a', imageUrl: wikiImg('Cranberries.png') },
  { id: 'tomato', name: 'Tomato', displayName: '番茄', category: 'crops', sellPrice: 60, quality: 'normal', description: '多汁又甜，用途广泛，是很多料理的基础。', edible: true, canGift: true, color: '#d44a3a', imageUrl: wikiImg('Tomato.png') },
  { id: 'hot_pepper', name: 'Hot Pepper', displayName: '辣椒', category: 'crops', sellPrice: 40, quality: 'normal', description: '火辣辣！让夏季的炎热更加炽烈。', edible: true, canGift: true, color: '#d43a3a', imageUrl: wikiImg('Hot_Pepper.png') },
  { id: 'corn', name: 'Corn', displayName: '玉米', category: 'crops', sellPrice: 50, quality: 'normal', description: '最常见的粮食作物之一，甜甜的新鲜玉米棒是夏天的最爱。', edible: true, canGift: true, color: '#d4b83a', imageUrl: wikiImg('Corn.png') },
  { id: 'eggplant', name: 'Eggplant', displayName: '茄子', category: 'crops', sellPrice: 60, quality: 'normal', description: '味道浓郁、营养丰富的番茄近亲。油炸风味绝佳。', edible: true, canGift: true, color: '#6a3ac4', imageUrl: wikiImg('Eggplant.png') },
  { id: 'pumpkin', name: 'Pumpkin', displayName: '南瓜', category: 'crops', sellPrice: 320, quality: 'normal', description: '秋天的象征，可以把里面掏空做成灯笼。', edible: true, canGift: true, color: '#d48a3a', imageUrl: wikiImg('Pumpkin.png') },
  { id: 'melon', name: 'Melon', displayName: '甜瓜', category: 'crops', sellPrice: 250, quality: 'normal', description: '凉爽甜美的夏日佳品。', edible: true, canGift: true, color: '#d43a7a', imageUrl: wikiImg('Melon.png') },
  { id: 'starfruit', name: 'Starfruit', displayName: '杨桃', category: 'crops', sellPrice: 750, quality: 'normal', description: '因果实形状酷似星星而得名，极其多汁，微带酸味。', edible: true, canGift: true, color: '#d4c43a', imageUrl: wikiImg('Starfruit.png') },
  { id: 'ancient_fruit', name: 'Ancient Fruit', displayName: '上古水果', category: 'crops', sellPrice: 550, quality: 'normal', description: '据说已经灭绝了上千年的古老水果。', edible: true, canGift: true, color: '#4a7ab4', imageUrl: wikiImg('Ancient_Fruit.png') },

  // === 资源 ===
  { id: 'wood', name: 'Wood', displayName: '木材', category: 'resources', sellPrice: 2, quality: 'normal', description: '用途广泛的建筑材料，可以通过砍伐树木获得。', edible: false, canGift: false, color: '#8b6b4a', imageUrl: wikiImg('Wood.png') },
  { id: 'stone', name: 'Stone', displayName: '石头', category: 'resources', sellPrice: 2, quality: 'normal', description: '常见的建筑材料。', edible: false, canGift: false, color: '#8a8a8a', imageUrl: wikiImg('Stone.png') },
  { id: 'coal', name: 'Coal', displayName: '煤炭', category: 'resources', sellPrice: 15, quality: 'normal', description: '一种可燃的能源矿石。', edible: false, canGift: false, color: '#2a2a2a', imageUrl: wikiImg('Coal.png') },
  { id: 'copper_ore', name: 'Copper Ore', displayName: '铜矿石', category: 'resources', sellPrice: 5, quality: 'normal', description: '一种常见的矿石，可以熔炼成铜锭。', edible: false, canGift: false, color: '#c47a4a', imageUrl: wikiImg('Copper_Ore.png') },
  { id: 'iron_ore', name: 'Iron Ore', displayName: '铁矿石', category: 'resources', sellPrice: 10, quality: 'normal', description: '一种常见的矿石，可以熔炼成铁锭。', edible: false, canGift: false, color: '#8a8a9a', imageUrl: wikiImg('Iron_Ore.png') },
  { id: 'gold_ore', name: 'Gold Ore', displayName: '金矿石', category: 'resources', sellPrice: 25, quality: 'normal', description: '一种珍贵的矿石，可以熔炼成金锭。', edible: false, canGift: false, color: '#d4b84a', imageUrl: wikiImg('Gold_Ore.png') },
  { id: 'iridium_ore', name: 'Iridium Ore', displayName: '铱矿石', category: 'resources', sellPrice: 100, quality: 'normal', description: '一种奇异的矿石，带有彩虹色的光泽。', edible: false, canGift: false, color: '#7a4ac8', imageUrl: wikiImg('Iridium_Ore.png') },
  { id: 'fiber', name: 'Fiber', displayName: '纤维', category: 'resources', sellPrice: 1, quality: 'normal', description: '从植物中获得的天然材料。', edible: false, canGift: false, color: '#7a9a4a', imageUrl: wikiImg('Fiber.png') },

  // === 矿物/宝石 ===
  { id: 'amethyst', name: 'Amethyst', displayName: '紫水晶', category: 'minerals', sellPrice: 100, quality: 'normal', description: '一种紫色的石英变种。', edible: false, canGift: true, color: '#8a4ac8', imageUrl: wikiImg('Amethyst.png') },
  { id: 'diamond', name: 'Diamond', displayName: '钻石', category: 'minerals', sellPrice: 750, quality: 'normal', description: '一种稀有而珍贵的宝石。', edible: false, canGift: true, color: '#a8d4f8', imageUrl: wikiImg('Diamond.png') },
  { id: 'emerald', name: 'Emerald', displayName: '绿宝石', category: 'minerals', sellPrice: 250, quality: 'normal', description: '一种翠绿色的宝石。', edible: false, canGift: true, color: '#3ad45a', imageUrl: wikiImg('Emerald.png') },
  { id: 'ruby', name: 'Ruby', displayName: '红宝石', category: 'minerals', sellPrice: 250, quality: 'normal', description: '一种珍贵的红色宝石。', edible: false, canGift: true, color: '#d43a4a', imageUrl: wikiImg('Ruby.png') },
  { id: 'topaz', name: 'Topaz', displayName: '黄玉', category: 'minerals', sellPrice: 80, quality: 'normal', description: '一种常见的金色宝石。', edible: false, canGift: true, color: '#d4b84a', imageUrl: wikiImg('Topaz.png') },
  { id: 'jade', name: 'Jade', displayName: '翡翠', category: 'minerals', sellPrice: 200, quality: 'normal', description: '一种淡绿色的观赏宝石。', edible: false, canGift: true, color: '#7ad4a8', imageUrl: wikiImg('Jade.png') },
  { id: 'aquamarine', name: 'Aquamarine', displayName: '海蓝宝石', category: 'minerals', sellPrice: 180, quality: 'normal', description: '一种闪烁海蓝色光泽的宝石。', edible: false, canGift: true, color: '#4ac8d4', imageUrl: wikiImg('Aquamarine.png') },
  { id: 'prismatic_shard', name: 'Prismatic Shard', displayName: '五彩碎片', category: 'minerals', sellPrice: 2000, quality: 'iridium', description: '来源未知的极其罕见且强大的物质。', edible: false, canGift: true, color: '#d47ac8', imageUrl: wikiImg('Prismatic_Shard.png') },
  { id: 'earth_crystal', name: 'Earth Crystal', displayName: '地晶', category: 'minerals', sellPrice: 50, quality: 'normal', description: '在地底深处发现的树脂物质。', edible: false, canGift: true, color: '#7a8b4a', imageUrl: wikiImg('Earth_Crystal.png') },
  { id: 'frozen_tear', name: 'Frozen Tear', displayName: '冰封之泪', category: 'minerals', sellPrice: 75, quality: 'normal', description: '传说中雪怪眼泪结成的晶体。', edible: false, canGift: true, color: '#8ad4f8', imageUrl: wikiImg('Frozen_Tear.png') },

  // === 鱼类 ===
  { id: 'carp', name: 'Carp', displayName: '鲤鱼', category: 'fish', sellPrice: 30, quality: 'normal', description: '一种常见的池塘鱼。', edible: true, canGift: true, color: '#d4a84a', imageUrl: wikiImg('Carp.png') },
  { id: 'largemouth_bass', name: 'Largemouth Bass', displayName: '大口鲈鱼', category: 'fish', sellPrice: 100, quality: 'normal', description: '一种生活在湖泊中的大型鱼类。', edible: true, canGift: true, color: '#5a8a4a', imageUrl: wikiImg('Largemouth_Bass.png') },
  { id: 'salmon', name: 'Salmon', displayName: '三文鱼', category: 'fish', sellPrice: 75, quality: 'normal', description: '喜欢逆流而上产卵的鱼。', edible: true, canGift: true, color: '#d46a4a', imageUrl: wikiImg('Salmon.png') },
  { id: 'tuna', name: 'Tuna', displayName: '金枪鱼', category: 'fish', sellPrice: 100, quality: 'normal', description: '一种生活在海洋中的大型鱼类。', edible: true, canGift: true, color: '#4a6ad4', imageUrl: wikiImg('Tuna.png') },
  { id: 'sardine', name: 'Sardine', displayName: '沙丁鱼', category: 'fish', sellPrice: 40, quality: 'normal', description: '一种常见的海鱼。', edible: true, canGift: true, color: '#8ac4d4', imageUrl: wikiImg('Sardine.png') },
  { id: 'eel', name: 'Eel', displayName: '鳗鱼', category: 'fish', sellPrice: 85, quality: 'normal', description: '一种长而滑溜的鱼。', edible: true, canGift: true, color: '#c4b84a', imageUrl: wikiImg('Eel.png') },
  { id: 'pufferfish', name: 'Pufferfish', displayName: '河豚', category: 'fish', sellPrice: 200, quality: 'normal', description: '碰到威胁时会膨胀变大。', edible: true, canGift: true, color: '#d4c43a', imageUrl: wikiImg('Pufferfish.png') },
  { id: 'rainbow_trout', name: 'Rainbow Trout', displayName: '虹鳟鱼', category: 'fish', sellPrice: 65, quality: 'normal', description: '一种带有彩虹般色彩的淡水鱼。', edible: true, canGift: true, color: '#d47a8a', imageUrl: wikiImg('Rainbow_Trout.png') },

  // === 工匠品 ===
  { id: 'cheese', name: 'Cheese', displayName: '奶酪', category: 'artisan', sellPrice: 200, quality: 'normal', description: '用牛奶制成的奶制品。', edible: true, canGift: true, color: '#d4b84a', imageUrl: wikiImg('Cheese.png') },
  { id: 'mayonnaise', name: 'Mayonnaise', displayName: '蛋黄酱', category: 'artisan', sellPrice: 190, quality: 'normal', description: '看起来很适合涂抹面包。', edible: true, canGift: true, color: '#f5f0d8', imageUrl: wikiImg('Mayonnaise.png') },
  { id: 'wine', name: 'Wine', displayName: '果酒', category: 'artisan', sellPrice: 400, quality: 'normal', description: '在酒桶中缓慢发酵而成，适度饮用有益健康。', edible: true, canGift: true, color: '#7a2a4a', imageUrl: wikiImg('Wine.png') },
  { id: 'beer', name: 'Beer', displayName: '啤酒', category: 'artisan', sellPrice: 200, quality: 'normal', description: '在桶中酿造而成，适度饮用有益健康。', edible: true, canGift: true, color: '#d4a84a', imageUrl: wikiImg('Beer.png') },
  { id: 'jelly', name: 'Jelly', displayName: '果酱', category: 'artisan', sellPrice: 160, quality: 'normal', description: '滑滑的，甜甜的。', edible: true, canGift: true, color: '#d43a7a', imageUrl: wikiImg('Jelly.png') },

  // === 料理 ===
  { id: 'fried_egg', name: 'Fried Egg', displayName: '煎蛋', category: 'food', sellPrice: 35, quality: 'normal', description: '只煎了一面，蛋黄很漂亮。', edible: true, canGift: true, color: '#f5e8c4', imageUrl: wikiImg('Fried_Egg.png') },
  { id: 'pancakes', name: 'Pancakes', displayName: '松饼', category: 'food', sellPrice: 80, quality: 'normal', description: '浇上枫糖浆的双层软松饼。', edible: true, canGift: true, color: '#d4a84a', imageUrl: wikiImg('Pancakes.png') },
  { id: 'bread', name: 'Bread', displayName: '面包', category: 'food', sellPrice: 60, quality: 'normal', description: '烤得脆脆的法式面包。', edible: true, canGift: true, color: '#c4a46c', imageUrl: wikiImg('Bread.png') },
  { id: 'salad', name: 'Salad', displayName: '沙拉', category: 'food', sellPrice: 110, quality: 'normal', description: '一份健康的田园沙拉。', edible: true, canGift: true, color: '#5a8a3a', imageUrl: wikiImg('Salad.png') },
  { id: 'pizza', name: 'Pizza', displayName: '披萨', category: 'food', sellPrice: 300, quality: 'normal', description: '备受欢迎，芝士味很重。', edible: true, canGift: true, color: '#d47a4a', imageUrl: wikiImg('Pizza.png') },
  { id: 'chocolate_cake', name: 'Chocolate Cake', displayName: '巧克力蛋糕', category: 'food', sellPrice: 200, quality: 'normal', description: '用钻石打发的松软蛋糕，配料丰富。', edible: true, canGift: true, color: '#5a3a2a', imageUrl: wikiImg('Chocolate_Cake.png') },
  { id: 'cookie', name: 'Cookie', displayName: '饼干', category: 'food', sellPrice: 140, quality: 'normal', description: '非常有嚼劲。', edible: true, canGift: true, color: '#c48a4a', imageUrl: wikiImg('Cookie.png') },
  { id: 'sashimi', name: 'Sashimi', displayName: '生鱼片', category: 'food', sellPrice: 75, quality: 'normal', description: '切成薄片的生鱼。', edible: true, canGift: true, color: '#d46a4a', imageUrl: wikiImg('Sashimi.png') },
  { id: 'maki_roll', name: 'Maki Roll', displayName: '卷寿司', category: 'food', sellPrice: 220, quality: 'normal', description: '用海苔包裹着鱼和米饭。', edible: true, canGift: true, color: '#3a5a2a', imageUrl: wikiImg('Maki_Roll.png') },
  { id: 'complete_breakfast', name: 'Complete Breakfast', displayName: '完美早餐', category: 'food', sellPrice: 350, quality: 'normal', description: '你会准备好迎接一整天的能量！', edible: true, canGift: true, color: '#d4a84a', imageUrl: wikiImg('Complete_Breakfast.png') },

  // === 采集品 ===
  { id: 'daffodil', name: 'Daffodil', displayName: '黄水仙', category: 'foraging', sellPrice: 30, quality: 'normal', description: '春天的传统花朵，是很好的礼物。', edible: true, canGift: true, color: '#d4c43a', imageUrl: wikiImg('Daffodil.png') },
  { id: 'dandelion', name: 'Dandelion', displayName: '蒲公英', category: 'foraging', sellPrice: 40, quality: 'normal', description: '虽然只是野花，但做成沙拉很好吃。', edible: true, canGift: true, color: '#d4c84a', imageUrl: wikiImg('Dandelion.png') },
  { id: 'leek', name: 'Leek', displayName: '韭葱', category: 'foraging', sellPrice: 60, quality: 'normal', description: '大葱的美味近亲。', edible: true, canGift: true, color: '#7a9a4a', imageUrl: wikiImg('Leek.png') },
  { id: 'wild_horseradish', name: 'Wild Horseradish', displayName: '野山葵', category: 'foraging', sellPrice: 50, quality: 'normal', description: '春天野生的辛辣根茎。', edible: true, canGift: true, color: '#c48a4a', imageUrl: wikiImg('Wild_Horseradish.png') },
  { id: 'morel', name: 'Morel', displayName: '龙葵', category: 'foraging', sellPrice: 150, quality: 'normal', description: '因其独特的坚果味而备受推崇。', edible: true, canGift: true, color: '#8a7a5a', imageUrl: wikiImg('Morel.png') },
  { id: 'common_mushroom', name: 'Common Mushroom', displayName: '普通蘑菇', category: 'foraging', sellPrice: 40, quality: 'normal', description: '带有一丝坚果味的普通蘑菇。', edible: true, canGift: true, color: '#a8907a', imageUrl: wikiImg('Common_Mushroom.png') },
  { id: 'salmonberry', name: 'Salmonberry', displayName: '美洲大树莓', category: 'foraging', sellPrice: 5, quality: 'normal', description: '带森林味道的春季浆果。', edible: true, canGift: true, color: '#d44a5a', imageUrl: wikiImg('Salmonberry.png') },
  { id: 'truffle', name: 'Truffle', displayName: '松露', category: 'foraging', sellPrice: 625, quality: 'iridium', description: '一种美味的蘑菇，有独特的香气。', edible: true, canGift: true, color: '#5a3a2a', imageUrl: wikiImg('Truffle.png') },

  // === 种子 ===
  { id: 'parsnip_seeds', name: 'Parsnip Seeds', displayName: '防风草种子', category: 'seeds', sellPrice: 20, quality: 'normal', description: '春天播种，4天成熟。', edible: false, canGift: true, color: '#d4a84a', imageUrl: wikiImg('Parsnip_Seeds.png') },
  { id: 'cauliflower_seeds', name: 'Cauliflower Seeds', displayName: '花椰菜种子', category: 'seeds', sellPrice: 80, quality: 'normal', description: '春天播种，12天成熟。', edible: false, canGift: true, color: '#f5f0e8', imageUrl: wikiImg('Cauliflower_Seeds.png') },
  { id: 'potato_seeds', name: 'Potato Seeds', displayName: '土豆种子', category: 'seeds', sellPrice: 50, quality: 'normal', description: '春天播种，6天成熟。', edible: false, canGift: true, color: '#c4a46c', imageUrl: wikiImg('Potato_Seeds.png') },
  { id: 'melon_seeds', name: 'Melon Seeds', displayName: '甜瓜种子', category: 'seeds', sellPrice: 80, quality: 'normal', description: '夏天播种，12天成熟。', edible: false, canGift: true, color: '#d43a7a', imageUrl: wikiImg('Melon_Seeds.png') },
  { id: 'pumpkin_seeds', name: 'Pumpkin Seeds', displayName: '南瓜种子', category: 'seeds', sellPrice: 100, quality: 'normal', description: '秋天播种，13天成熟。', edible: false, canGift: true, color: '#d48a3a', imageUrl: wikiImg('Pumpkin_Seeds.png') },
  { id: 'corn_seeds', name: 'Corn Seeds', displayName: '玉米种子', category: 'seeds', sellPrice: 150, quality: 'normal', description: '夏天或秋天播种，14天成熟，之后每4天再收获。', edible: false, canGift: true, color: '#d4b83a', imageUrl: wikiImg('Corn_Seeds.png') },
  { id: 'wheat_seeds', name: 'Wheat Seeds', displayName: '小麦种子', category: 'seeds', sellPrice: 10, quality: 'normal', description: '夏天或秋天播种，4天成熟。', edible: false, canGift: true, color: '#d4c84a', imageUrl: wikiImg('Wheat_Seeds.png') },

  // === 武器 ===
  { id: 'galaxy_sword', name: 'Galaxy Sword', displayName: '银河剑', category: 'weapons', sellPrice: 650, quality: 'iridium', description: '传说中的神剑，由星辰之力铸成。', edible: false, canGift: false, color: '#7ac8d4', imageUrl: wikiImg('Galaxy_Sword.png') },
  { id: 'wooden_blade', name: 'Wooden Blade', displayName: '木剑', category: 'weapons', sellPrice: 100, quality: 'normal', description: '用木头削成的简单剑。', edible: false, canGift: false, color: '#8b6b4a', imageUrl: wikiImg('Wooden_Blade.png') },
  { id: 'obsidian_edge', name: 'Obsidian Edge', displayName: '黑曜利刃', category: 'weapons', sellPrice: 300, quality: 'normal', description: '边缘锋利得令人难以置信。', edible: false, canGift: false, color: '#2a2a3a', imageUrl: wikiImg('Obsidian_Edge.png') },
  { id: 'lava_katana', name: 'Lava Katana', displayName: '熔岩武士刀', category: 'weapons', sellPrice: 500, quality: 'normal', description: '一把散发着熔岩热量的强力刀刃。', edible: false, canGift: false, color: '#d43a2a', imageUrl: wikiImg('Lava_Katana.png') },
]
