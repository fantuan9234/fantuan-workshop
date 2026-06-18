import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useCustomItems } from '../../data/useCustomItems'
import { IconBox, IconSword, IconBoots, IconHat, IconRing, IconCoin, IconPlate, IconShield, IconBurst, IconTag, IconFile, IconGear, IconDecor, IconResource, IconArtisan, IconFish, IconCrop } from '../../components/Icons'
import { useT, asString } from '../../i18n'
import EditorHeader from '../../components/EditorHeader'
import { UnsavedChangesGuard } from '../../components/useUnsavedChangesGuard'
import { monsters, searchMonsters, monsterLocationLabels, type MonsterInfo } from '../../data/monsterData'

// ===== 物品类型定义 =====
export type ItemDataType = 'object' | 'weapon' | 'boots' | 'hat' | 'ring' | 'bigcraftable' | 'clothing' | 'furniture'

export const itemDataTypeLabels: Record<ItemDataType, { label: string; desc: string; color: string; icon: JSX.Element }> = {
  object: { label: 'items.typeObject', desc: 'items.typeObjectDesc', color: '#94a3b8', icon: <IconBox /> },
  weapon: { label: 'items.typeWeapon', desc: 'items.typeWeaponDesc', color: '#f87171', icon: <IconSword /> },
  boots: { label: 'items.typeBoots', desc: 'items.typeBootsDesc', color: '#a78bfa', icon: <IconBoots /> },
  hat: { label: 'items.typeHat', desc: 'items.typeHatDesc', color: '#fbbf24', icon: <IconHat /> },
  ring: { label: 'items.typeRing', desc: 'items.typeRingDesc', color: '#34d399', icon: <IconRing /> },
  bigcraftable: { label: 'items.typeBigCraftable', desc: 'items.typeBigCraftableDesc', color: '#60a5fa', icon: <IconBox /> },
  clothing: { label: 'items.typeClothing', desc: 'items.typeClothingDesc', color: '#f472b6', icon: <IconDecor /> },
  furniture: { label: 'items.typeFurniture', desc: 'items.typeFurnitureDesc', color: '#fb923c', icon: <IconResource /> },
}

// Object 子类型 (Type 字段)
export const objectSubTypes: Record<string, string> = {
  Basic: 'items.subTypeBasic', Arch: 'items.subTypeArch', Minerals: 'items.subTypeMinerals',
  Quest: 'items.subTypeQuest', Crafting: 'items.subTypeCrafting', Fish: 'items.subTypeFish', Cooking: 'items.subTypeCooking',
  Seeds: 'items.subTypeSeeds', Flower: 'items.subTypeFlower', Vegetable: 'items.subTypeVegetable', Fruit: 'items.subTypeFruit',
  Resource: 'items.subTypeResource', Meat: 'items.subTypeMeat', AnimalProduct: 'items.subTypeAnimalProduct',
  ArtisanGoods: 'items.subTypeArtisanGoods', Fertilizer: 'items.subTypeFertilizer', Bait: 'items.subTypeBait',
  Tackle: 'items.subTypeTackle', MonsterLoot: 'items.subTypeMonsterLoot', Litter: 'items.subTypeLitter',
  interactive: 'items.subTypeInteractive',
}

// Object 分类 (Category 负数) — 完整版
export const objectCategories: Record<string, { label: string; value: number }> = {
  basic: { label: 'items.catBasic', value: 0 },
  gem: { label: 'items.catGem', value: -2 },
  fish: { label: 'items.catFish', value: -4 },
  egg: { label: 'items.catEgg', value: -5 },
  milk: { label: 'items.catMilk', value: -6 },
  cooking: { label: 'items.catCooking', value: -7 },
  crafting: { label: 'items.catCrafting', value: -8 },
  mineral: { label: 'items.catMineral', value: -12 },
  meat: { label: 'items.catMeat', value: -14 },
  metalResource: { label: 'items.catMetalResource', value: -15 },
  buildingResource: { label: 'items.catBuildingResource', value: -16 },
  fertilizer: { label: 'items.catFertilizer', value: -19 },
  junk: { label: 'items.catJunk', value: -20 },
  bait: { label: 'items.catBait', value: -21 },
  tackle: { label: 'items.catTackle', value: -22 },
  decor: { label: 'items.catDecor', value: -24 },
  artisan: { label: 'items.catArtisan', value: -26 },
  syrup: { label: 'items.catSyrup', value: -27 },
  monsterLoot: { label: 'items.catMonsterLoot', value: -28 },
  seeds: { label: 'items.catSeeds', value: -74 },
  vegetable: { label: 'items.catVegetable', value: -75 },
  fruit: { label: 'items.catFruit', value: -79 },
  flower: { label: 'items.catFlower', value: -80 },
  greens: { label: 'items.catGreens', value: -81 },
  ring: { label: 'items.catRing', value: -96 },
}

// 武器类型
export const weaponTypes: Record<number, string> = {
  0: 'items.weaponStabbingSword', 1: 'items.weaponDagger', 2: 'items.weaponClub', 3: 'items.weaponSlashingSword',
}

// Clothing 类型
export const clothingTypes: Record<string, string> = {
  Shirt: 'items.clothingTypeShirt',
  Pants: 'items.clothingTypePants',
}

// Clothing 性别
export const clothingGenders: Record<string, string> = {
  Neutral: 'items.clothingGenderNeutral',
  Male: 'items.clothingGenderMale',
  Female: 'items.clothingGenderFemale',
}

// Furniture 类型
export const furnitureTypes: Record<string, string> = {
  Table: 'items.furnitureTypeTable',
  Chair: 'items.furnitureTypeChair',
  Bed: 'items.furnitureTypeBed',
  Sofa: 'items.furnitureTypeSofa',
  Dresser: 'items.furnitureTypeDresser',
  Bookcase: 'items.furnitureTypeBookcase',
  Lamp: 'items.furnitureTypeLamp',
  Decor: 'items.furnitureTypeDecor',
  Rug: 'items.furnitureTypeRug',
}

// Buff 属性 — 完整版
export const buffAttributes: Record<string, { label: string; desc: string; group: string }> = {
  // 战斗
  Attack: { label: 'items.buffAttack', desc: 'items.buffAttackDesc', group: 'items.buffGroupCombat' },
  AttackMultiplier: { label: 'items.buffAttackMultiplier', desc: 'items.buffAttackMultiplierDesc', group: 'items.buffGroupCombat' },
  CriticalChanceMultiplier: { label: 'items.buffCriticalChanceMultiplier', desc: 'items.buffCriticalChanceMultiplierDesc', group: 'items.buffGroupCombat' },
  CriticalPowerMultiplier: { label: 'items.buffCriticalPowerMultiplier', desc: 'items.buffCriticalPowerMultiplierDesc', group: 'items.buffGroupCombat' },
  Defense: { label: 'items.buffDefense', desc: 'items.buffDefenseDesc', group: 'items.buffGroupCombat' },
  Immunity: { label: 'items.buffImmunity', desc: 'items.buffImmunityDesc', group: 'items.buffGroupCombat' },
  KnockbackMultiplier: { label: 'items.buffKnockbackMultiplier', desc: 'items.buffKnockbackMultiplierDesc', group: 'items.buffGroupCombat' },
  WeaponPrecisionMultiplier: { label: 'items.buffWeaponPrecisionMultiplier', desc: 'items.buffWeaponPrecisionMultiplierDesc', group: 'items.buffGroupCombat' },
  WeaponSpeedMultiplier: { label: 'items.buffWeaponSpeedMultiplier', desc: 'items.buffWeaponSpeedMultiplierDesc', group: 'items.buffGroupCombat' },
  // 移动
  Speed: { label: 'items.buffSpeed', desc: 'items.buffSpeedDesc', group: 'items.buffGroupMovement' },
  MagneticRadius: { label: 'items.buffMagneticRadius', desc: 'items.buffMagneticRadiusDesc', group: 'items.buffGroupMovement' },
  MaxStamina: { label: 'items.buffMaxStamina', desc: 'items.buffMaxStaminaDesc', group: 'items.buffGroupMovement' },
  // 技能
  FarmingLevel: { label: 'items.buffFarmingLevel', desc: 'items.buffFarmingLevelDesc', group: 'items.buffGroupSkills' },
  FishingLevel: { label: 'items.buffFishingLevel', desc: 'items.buffFishingLevelDesc', group: 'items.buffGroupSkills' },
  ForagingLevel: { label: 'items.buffForagingLevel', desc: 'items.buffForagingLevelDesc', group: 'items.buffGroupSkills' },
  MiningLevel: { label: 'items.buffMiningLevel', desc: 'items.buffMiningLevelDesc', group: 'items.buffGroupSkills' },
  CombatLevel: { label: 'items.buffCombatLevel', desc: 'items.buffCombatLevelDesc', group: 'items.buffGroupSkills' },
  LuckLevel: { label: 'items.buffLuckLevel', desc: 'items.buffLuckLevelDesc', group: 'items.buffGroupSkills' },
}

// Buff 接口
export interface ItemBuff {
  id: string
  duration: number
  isDebuff: boolean
  glowColor: string
  attributes: Record<string, number>
}

// ===== 完整的自定义物品数据结构 =====

/** 农作物配置 (Data/Crops) */
export interface CropConfig {
  /** 可种植季节 */
  seasons: string[]
  /** 每阶段生长天数 (如 [3,3,4,5] = 4个阶段, 共15天) */
  daysInPhase: number[]
  /** 再收获天数 (-1=收获后消失, >0=再次收获间隔) */
  regrowDays: number
  /** 需要支架/豆竿 */
  isRaised: boolean
  /** 水田作物 (如水稻) */
  isPaddyCrop: boolean
  /** 收获物品ID (带前缀, 如 "(O)ModId_Item") */
  harvestItemId: string
  /** 最小收获数量 */
  harvestMinStack: number
  /** 最大收获数量 */
  harvestMaxStack: number
  /** 每级农业技能增加的收获数 */
  harvestMaxIncreasePerFarmingLevel: number
  /** 额外收获概率 (0.0-1.0) */
  harvestExtraChance: number
  /** 收获方式 (0=镰刀, 1=手摘) */
  harvestMethod: number
  /** 着色颜色 (可选) */
  tintColor: string
  /** 巨型作物概率 (0=不会产生巨型作物) */
  giantCropChance: number
}

/** 物品获取方式 */
export interface ItemAcquisition {
  /** 商店购买 */
  shop?: {
    shopId: string   // 商店ID，如 Pierre, JojaMart, FishShop, Blacksmith, AdventureShop, Willy, TravelingMerchant
    condition?: string  // 购买条件，如季节、天气等
  }
  /** 合成配方 */
  recipe?: {
    type: 'crafting' | 'cooking'  // 合成/烹饪
    ingredients: Array<{ itemId: string; quantity: number }>  // 材料
    yieldCount: number  // 产出数量
    unlockCondition?: string  // 解锁条件
    time: number  // 合成时间（分钟，-1=即时）
  }
  /** 怪物掉落 */
  monsterDrop?: {
    monsterName: string  // 怪物名称
    chance: number  // 掉落概率 (0-1)
    minCount: number
    maxCount: number
  }
}

export interface CustomItem {
  id: string
  name: string
  displayName: string
  description: string
  imageUrl: string
  color: string
  dataType: ItemDataType

  // --- Object 通用字段 ---
  objectType?: string
  objectCategory?: number
  price: number
  edibility?: number
  isDrink?: boolean
  isFood?: boolean
  buffs?: ItemBuff[]
  canGift: boolean
  canTrash?: boolean
  canBeDropped?: boolean
  specialItem?: boolean
  hasCraftingRecipe?: boolean
  giftToNPCs?: string[]
  excludeFromRandomSale?: boolean
  contextTags?: string[]

  // --- 获取方式 ---
  acquisition?: ItemAcquisition

  // --- 农作物配置 ---
  crop?: CropConfig

  // --- 武器专属字段 ---
  weaponType?: number
  minDamage?: number
  maxDamage?: number
  knockback?: number
  speed?: number
  precision?: number
  defense?: number
  areaOfEffect?: number
  critChance?: number
  critMultiplier?: number
  canBeLostOnDeath?: boolean
  mineBaseLevel?: number
  mineMinLevel?: number
  swingSound?: string
  weaponLevel?: number
  defaultSkin?: number
  skinDuration?: number

  // --- 靴子专属字段 ---
  bootsDefense?: number
  bootsImmunity?: number
  bootsColorIndex?: number

  // --- 帽子专属字段 ---
  hatShowHair?: string
  hatSkipOffset?: boolean
  hatTags?: string

  // --- 大型可制作物品专属字段 ---
  bcFragility?: number
  bcCanBePlacedIndoors?: boolean
  bcCanBePlacedOutdoors?: boolean
  bcIsLamp?: boolean
  bcTexture?: string
  bcSpriteIndex?: number

  // --- 服装专属字段 ---
  clothingType?: 'Shirt' | 'Pants'
  clothingGender?: 'Male' | 'Female' | 'Neutral'
  clothingDyeable?: boolean
  clothingCanBeTrashed?: boolean
  clothingCanBeGivenAsGift?: boolean
  clothingTexture?: string
  clothingSpriteIndex?: number

  // --- 家具专属字段 ---
  furnitureType?: string
  furnitureSizeX?: number
  furnitureSizeY?: number
  furnitureBoxX?: number
  furnitureBoxY?: number
  furnitureBoxWidth?: number
  furnitureBoxHeight?: number
  furnitureRotations?: number[]
  furnitureCanBePlacedIndoors?: boolean
  furnitureCanBePlacedOutdoors?: boolean
  furnitureCanBeRemoved?: boolean
  furnitureIsLamp?: boolean
  furnitureLightRadius?: number
  furnitureTexture?: string
  furnitureSpriteIndex?: number
  furnitureSeatPositions?: Array<{ X: number; Y: number; Direction: number }>

  // --- 鱼类专属字段 ---
  fish?: {
    locations: string[]
    seasons: string[]
    minTime: number
    maxTime: number
    weather: string[]
    difficulty: number
    minSize: number
    maxSize: number
    behavior: string
  }

  // --- 兼容旧数据 ---
  type?: string
  category?: number | string
  quality?: string
  edible?: boolean
}

const dataTypeColors: Record<ItemDataType, string> = {
  object: '#94a3b8', weapon: '#f87171', boots: '#a78bfa', hat: '#fbbf24', ring: '#34d399',
  bigcraftable: '#60a5fa', clothing: '#f472b6', furniture: '#fb923c',
}

// 编辑器 Tab（精简为 3 个，高级收进可折叠面板）
type EditorTab = 'basic' | 'stats' | 'acquisition'
const tabLabelKeys: Record<EditorTab, string> = { basic: 'items.tabBasic', stats: 'items.tabStats', acquisition: 'items.tabAcquisition' }

export default function ItemEditor(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { customItems, updateCustomItem, addCustomItem, getCustomItem } = useCustomItems()
  const t = useT()
  const ts = (k: string): string => asString(t, k)

  const currentItem = getCustomItem(id ?? '')

  // Tab
  const [tab, setTab] = useState<EditorTab>('basic')

  // 基础字段
  const [displayName, setDisplayName] = useState(currentItem?.displayName ?? '')
  const [name, setName] = useState(currentItem?.name ?? '')
  const [description, setDescription] = useState(currentItem?.description ?? '')
  const [imageUrl, setImageUrl] = useState(currentItem?.imageUrl ?? '')
  const [dataType, setDataType] = useState<ItemDataType>(currentItem?.dataType ?? inferDataType(currentItem))
  const [savedToast, setSavedToast] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Object 字段
  const [objectType, setObjectType] = useState(currentItem?.objectType ?? 'Basic')
  const [objectCategory, setObjectCategory] = useState(currentItem?.objectCategory ?? 0)
  const [price, setPrice] = useState(currentItem?.price ?? 0)
  const [edibility, setEdibility] = useState(currentItem?.edibility ?? -300)
  const [isDrink, setIsDrink] = useState(currentItem?.isDrink ?? false)
  const [buffs, setBuffs] = useState<ItemBuff[]>(currentItem?.buffs ?? [])
  const [canGift, setCanGift] = useState(currentItem?.canGift ?? true)
  const [canTrash, setCanTrash] = useState(currentItem?.canTrash ?? true)
  const [canBeDropped, setCanBeDropped] = useState(currentItem?.canBeDropped ?? true)
  const [specialItem, setSpecialItem] = useState(currentItem?.specialItem ?? false)
  const [hasCraftingRecipe, setHasCraftingRecipe] = useState(currentItem?.hasCraftingRecipe ?? false)
  const [isFood, setIsFood] = useState(currentItem?.isFood ?? false)
  const [giftToNPCs, setGiftToNPCs] = useState<string[]>(currentItem?.giftToNPCs ?? [])
  const [excludeFromRandomSale, setExcludeFromRandomSale] = useState(currentItem?.excludeFromRandomSale ?? false)
  const [contextTags, setContextTags] = useState<string[]>(currentItem?.contextTags ?? [])

  // 武器字段
  const [weaponType, setWeaponType] = useState(currentItem?.weaponType ?? 3)
  const [minDamage, setMinDamage] = useState(currentItem?.minDamage ?? 1)
  const [maxDamage, setMaxDamage] = useState(currentItem?.maxDamage ?? 5)
  const [knockback, setKnockback] = useState(currentItem?.knockback ?? 1)
  const [speed, setSpeed] = useState(currentItem?.speed ?? 0)
  const [precision, setPrecision] = useState(currentItem?.precision ?? 0)
  const [defense, setDefense] = useState(currentItem?.defense ?? 0)
  const [areaOfEffect, setAreaOfEffect] = useState(currentItem?.areaOfEffect ?? 0)
  const [critChance, setCritChance] = useState(currentItem?.critChance ?? 0.02)
  const [critMultiplier, setCritMultiplier] = useState(currentItem?.critMultiplier ?? 3)
  const [canBeLostOnDeath, setCanBeLostOnDeath] = useState(currentItem?.canBeLostOnDeath ?? true)
  const [mineBaseLevel, setMineBaseLevel] = useState(currentItem?.mineBaseLevel ?? -1)
  const [mineMinLevel, setMineMinLevel] = useState(currentItem?.mineMinLevel ?? -1)
  const [swingSound, setSwingSound] = useState(currentItem?.swingSound ?? '')
  const [weaponLevel, setWeaponLevel] = useState(currentItem?.weaponLevel ?? 0)
  const [defaultSkin, setDefaultSkin] = useState(currentItem?.defaultSkin ?? 0)
  const [skinDuration, setSkinDuration] = useState(currentItem?.skinDuration ?? 0)

  // 靴子字段
  const [bootsDefense, setBootsDefense] = useState(currentItem?.bootsDefense ?? 0)
  const [bootsImmunity, setBootsImmunity] = useState(currentItem?.bootsImmunity ?? 0)
  const [bootsColorIndex, setBootsColorIndex] = useState(currentItem?.bootsColorIndex ?? 0)

  // 帽子字段
  const [hatShowHair, setHatShowHair] = useState(currentItem?.hatShowHair ?? 'false')
  const [hatSkipOffset, setHatSkipOffset] = useState(currentItem?.hatSkipOffset ?? false)
  const [hatTags, setHatTags] = useState(currentItem?.hatTags ?? '')

  // 大型可制作物品字段
  const [bcFragility, setBcFragility] = useState(currentItem?.bcFragility ?? 0)
  const [bcCanBePlacedIndoors, setBcCanBePlacedIndoors] = useState(currentItem?.bcCanBePlacedIndoors ?? true)
  const [bcCanBePlacedOutdoors, setBcCanBePlacedOutdoors] = useState(currentItem?.bcCanBePlacedOutdoors ?? false)
  const [bcIsLamp, setBcIsLamp] = useState(currentItem?.bcIsLamp ?? false)
  const [bcSpriteIndex, setBcSpriteIndex] = useState(currentItem?.bcSpriteIndex ?? 0)

  // 服装字段
  const [clothingType, setClothingType] = useState<'Shirt' | 'Pants'>(currentItem?.clothingType ?? 'Shirt')
  const [clothingGender, setClothingGender] = useState<'Male' | 'Female' | 'Neutral'>(currentItem?.clothingGender ?? 'Neutral')
  const [clothingDyeable, setClothingDyeable] = useState(currentItem?.clothingDyeable ?? false)
  const [clothingCanBeTrashed, setClothingCanBeTrashed] = useState(currentItem?.clothingCanBeTrashed ?? true)
  const [clothingCanBeGivenAsGift, setClothingCanBeGivenAsGift] = useState(currentItem?.clothingCanBeGivenAsGift ?? true)
  const [clothingSpriteIndex, setClothingSpriteIndex] = useState(currentItem?.clothingSpriteIndex ?? 0)

  // 家具字段
  const [furnitureType, setFurnitureType] = useState(currentItem?.furnitureType ?? 'Decor')
  const [furnitureSizeX, setFurnitureSizeX] = useState(currentItem?.furnitureSizeX ?? 1)
  const [furnitureSizeY, setFurnitureSizeY] = useState(currentItem?.furnitureSizeY ?? 1)
  const [furnitureBoxX, setFurnitureBoxX] = useState(currentItem?.furnitureBoxX ?? 0)
  const [furnitureBoxY, setFurnitureBoxY] = useState(currentItem?.furnitureBoxY ?? 0)
  const [furnitureBoxWidth, setFurnitureBoxWidth] = useState(currentItem?.furnitureBoxWidth ?? 1)
  const [furnitureBoxHeight, setFurnitureBoxHeight] = useState(currentItem?.furnitureBoxHeight ?? 1)
  const [furnitureRotations, setFurnitureRotations] = useState<number[]>(currentItem?.furnitureRotations ?? [0])
  const [furnitureCanBePlacedIndoors, setFurnitureCanBePlacedIndoors] = useState(currentItem?.furnitureCanBePlacedIndoors ?? true)
  const [furnitureCanBePlacedOutdoors, setFurnitureCanBePlacedOutdoors] = useState(currentItem?.furnitureCanBePlacedOutdoors ?? false)
  const [furnitureCanBeRemoved, setFurnitureCanBeRemoved] = useState(currentItem?.furnitureCanBeRemoved ?? true)
  const [furnitureIsLamp, setFurnitureIsLamp] = useState(currentItem?.furnitureIsLamp ?? false)
  const [furnitureLightRadius, setFurnitureLightRadius] = useState(currentItem?.furnitureLightRadius ?? 0)
  const [furnitureSpriteIndex, setFurnitureSpriteIndex] = useState(currentItem?.furnitureSpriteIndex ?? 0)
  const [furnitureSeatPositions, setFurnitureSeatPositions] = useState<Array<{ X: number; Y: number; Direction: number }>>(currentItem?.furnitureSeatPositions ?? [])

  // 鱼类字段
  const [isFish, setIsFish] = useState(!!currentItem?.fish || currentItem?.objectType === 'Fish')
  const [fishLocations, setFishLocations] = useState<string[]>(currentItem?.fish?.locations ?? [])
  const [fishSeasons, setFishSeasons] = useState<string[]>(currentItem?.fish?.seasons ?? [])
  const [fishMinTime, setFishMinTime] = useState(currentItem?.fish?.minTime ?? 600)
  const [fishMaxTime, setFishMaxTime] = useState(currentItem?.fish?.maxTime ?? 2600)
  const [fishWeather, setFishWeather] = useState<string[]>(currentItem?.fish?.weather ?? [])
  const [fishDifficulty, setFishDifficulty] = useState(currentItem?.fish?.difficulty ?? 50)
  const [fishMinSize, setFishMinSize] = useState(currentItem?.fish?.minSize ?? 1)
  const [fishMaxSize, setFishMaxSize] = useState(currentItem?.fish?.maxSize ?? 30)
  const [fishBehavior, setFishBehavior] = useState(currentItem?.fish?.behavior ?? 'Mixed')

  // 获取方式字段
  const [acquisition, setAcquisition] = useState<ItemAcquisition>(currentItem?.acquisition ?? {})

  // 农作物配置字段
  const [isCropSeed, setIsCropSeed] = useState(!!currentItem?.crop)
  const [cropSeasons, setCropSeasons] = useState<string[]>(currentItem?.crop?.seasons ?? ['spring'])
  const [cropDaysInPhase, setCropDaysInPhase] = useState<number[]>(currentItem?.crop?.daysInPhase ?? [1, 3, 4, 2])
  const [cropRegrowDays, setCropRegrowDays] = useState(currentItem?.crop?.regrowDays ?? -1)
  const [cropIsRaised, setCropIsRaised] = useState(currentItem?.crop?.isRaised ?? false)
  const [cropIsPaddyCrop, setCropIsPaddyCrop] = useState(currentItem?.crop?.isPaddyCrop ?? false)
  const [cropHarvestItemId, setCropHarvestItemId] = useState(currentItem?.crop?.harvestItemId ?? '')
  const [cropHarvestMinStack, setCropHarvestMinStack] = useState(currentItem?.crop?.harvestMinStack ?? 1)
  const [cropHarvestMaxStack, setCropHarvestMaxStack] = useState(currentItem?.crop?.harvestMaxStack ?? 1)
  const [cropHarvestMaxIncreasePerFarmingLevel, setCropHarvestMaxIncreasePerFarmingLevel] = useState(currentItem?.crop?.harvestMaxIncreasePerFarmingLevel ?? 0)
  const [cropHarvestExtraChance, setCropHarvestExtraChance] = useState(currentItem?.crop?.harvestExtraChance ?? 0)
  const [cropHarvestMethod, setCropHarvestMethod] = useState(currentItem?.crop?.harvestMethod ?? 1)
  const [cropTintColor, setCropTintColor] = useState(currentItem?.crop?.tintColor ?? '')
  const [cropGiantCropChance, setCropGiantCropChance] = useState(currentItem?.crop?.giantCropChance ?? 0)

  // Buff 展开
  const [expandedBuff, setExpandedBuff] = useState<number>(-1)
  // 标签输入
  const [newTag, setNewTag] = useState('')
  // NPC标签输入
  const [newNpcTag, setNewNpcTag] = useState('')

  // 图片尺寸警告状态
  const [imageWarn, setImageWarn] = useState<string | null>(null)

  // 小白优化：类型选择器折叠状态（默认展开，选择后自动收起）
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(true)
  // 高级（开发者）面板折叠状态（默认收起）
  const [advancedOpen, setAdvancedOpen] = useState(false)
  // 材料下拉搜索
  const [materialSearch, setMaterialSearch] = useState('')
  // 原版物品列表（用于材料下拉）
  const [vanillaMaterials, setVanillaMaterials] = useState<Array<{ id: string; name: string; displayName: string; texture?: string; spriteIndex?: number }>>([])

  // 当 objectType 变为 Seeds 时自动开启作物配置
  useEffect(() => {
    if (dataType === 'object' && objectType === 'Seeds' && !isCropSeed) {
      setIsCropSeed(true)
    }
  }, [dataType, objectType, isCropSeed])

  const handleImageUpload = async () => {
    try {
      const api = (window as any).electronAPI
      if (!api || typeof api.selectImageFile !== 'function') return
      const result = await api.selectImageFile()
      if (!result?.dataUrl) return

      // 检测图片尺寸,非 16 倍数则提示并自动缩放
      const img = new Image()
      img.onload = () => {
        const { width, height } = img
        // 16的倍数且至少16像素(已经是精灵表) → 不处理
        if (width >= 16 && height >= 16 && width % 16 === 0 && height % 16 === 0) {
          setImageUrl(result.dataUrl!)
          setImageWarn(null)
          setDirty(true)
          return
        }
        // 不是合法的精灵表尺寸 → 自动缩放到 16x16
        const canvas = document.createElement('canvas')
        canvas.width = 16
        canvas.height = 16
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setImageUrl(result.dataUrl!)
          setImageWarn(ts('items.imageResizeFail'))
          return
        }
        // 关闭抗锯齿保持像素风
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 0, 0, 16, 16)
        const resizedDataUrl = canvas.toDataURL('image/png')
        setImageUrl(resizedDataUrl)
        setDirty(true)
        setImageWarn(ts('items.imageAutoResized'))
      }
      img.onerror = () => {
        setImageUrl(result.dataUrl!)
        setDirty(true)
        setImageWarn(null)
      }
      img.src = result.dataUrl
    } catch (err) {
      console.error('[ItemEditor] 图片选择失败:', err)
    }
  }

  const handleSave = () => {
    if (!name.trim() || !displayName.trim()) return
    const savedId = currentItem?.id ?? id ?? 'item_' + Date.now()
    const itemToSave: CustomItem = {
      id: savedId, name, displayName, description, imageUrl,
      color: dataTypeColors[dataType], dataType,
      objectType, objectCategory, price, edibility, isDrink, isFood, buffs, canGift, canTrash, canBeDropped, specialItem, hasCraftingRecipe, giftToNPCs, excludeFromRandomSale, contextTags,
      acquisition,
      crop: isCropSeed ? {
        seasons: cropSeasons,
        daysInPhase: cropDaysInPhase,
        regrowDays: cropRegrowDays,
        isRaised: cropIsRaised,
        isPaddyCrop: cropIsPaddyCrop,
        harvestItemId: cropHarvestItemId,
        harvestMinStack: cropHarvestMinStack,
        harvestMaxStack: cropHarvestMaxStack,
        harvestMaxIncreasePerFarmingLevel: cropHarvestMaxIncreasePerFarmingLevel,
        harvestExtraChance: cropHarvestExtraChance,
        harvestMethod: cropHarvestMethod,
        tintColor: cropTintColor,
        giantCropChance: cropGiantCropChance,
      } : undefined,
      weaponType, minDamage, maxDamage, knockback, speed, precision, defense, areaOfEffect, critChance, critMultiplier, canBeLostOnDeath, mineBaseLevel, mineMinLevel, swingSound, weaponLevel, defaultSkin, skinDuration,
      bootsDefense, bootsImmunity, bootsColorIndex,
      hatShowHair, hatSkipOffset, hatTags,
      bcFragility, bcCanBePlacedIndoors, bcCanBePlacedOutdoors, bcIsLamp, bcSpriteIndex,
      clothingType, clothingGender, clothingDyeable, clothingCanBeTrashed, clothingCanBeGivenAsGift, clothingSpriteIndex,
      furnitureType, furnitureSizeX, furnitureSizeY, furnitureBoxX, furnitureBoxY, furnitureBoxWidth, furnitureBoxHeight, furnitureRotations, furnitureCanBePlacedIndoors, furnitureCanBePlacedOutdoors, furnitureCanBeRemoved, furnitureIsLamp, furnitureLightRadius, furnitureSpriteIndex, furnitureSeatPositions,
      fish: isFish ? { locations: fishLocations, seasons: fishSeasons, minTime: fishMinTime, maxTime: fishMaxTime, weather: fishWeather, difficulty: fishDifficulty, minSize: fishMinSize, maxSize: fishMaxSize, behavior: fishBehavior } : undefined,
    }
    if (currentItem) {
      updateCustomItem(savedId, itemToSave)
    } else {
      addCustomItem(itemToSave)
    }
    setSavedToast(true)
    setDirty(false)
    setTimeout(() => setSavedToast(false), 1500)
  }

  // Buff 操作
  const addBuff = () => {
    setBuffs(prev => [...prev, { id: `${name || 'item'}_buff${prev.length + 1}`, duration: 120, isDebuff: false, glowColor: '', attributes: {} }])
    setExpandedBuff(buffs.length)
    setDirty(true)
  }
  const removeBuff = (idx: number) => {
    setBuffs(prev => prev.filter((_, i) => i !== idx))
    if (expandedBuff === idx) setExpandedBuff(-1)
    setDirty(true)
  }
  const updateBuff = (idx: number, field: string, value: unknown) => {
    setBuffs(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b))
    setDirty(true)
  }
  const updateBuffAttr = (buffIdx: number, attrKey: string, value: number) => {
    setBuffs(prev => prev.map((b, i) => {
      if (i !== buffIdx) return b
      const attrs = { ...b.attributes }
      if (value === 0) delete attrs[attrKey]; else attrs[attrKey] = value
      return { ...b, attributes: attrs }
    }))
    setDirty(true)
  }

  // 小白优化：Buff 快速模板
  const applyBuffPreset = (preset: string) => {
    setBuffs(prev => {
      if (prev.length === 0) {
        prev = [{ id: `${name || 'item'}_buff1`, duration: 120, isDebuff: false, glowColor: '', attributes: {} }]
        setExpandedBuff(0)
      }
      const idx = expandedBuff >= 0 ? expandedBuff : 0
      let attrs: Record<string, number> = {}
      switch (preset) {
        case 'strength': attrs = { Attack: 3 }; break
        case 'speed': attrs = { Speed: 1 }; break
        case 'defense': attrs = { Defense: 3 }; break
        case 'luck': attrs = { LuckLevel: 1 }; break
        case 'farming': attrs = { FarmingLevel: 1 }; break
        case 'fishing': attrs = { FishingLevel: 1 }; break
        case 'clear': attrs = {}; break
        default: return prev
      }
      return prev.map((b, i) => i === idx ? { ...b, attributes: attrs } : b)
    })
    setDirty(true)
  }

  // 小白优化：加载原版物品用于材料下拉
  useEffect(() => {
    let cancelled = false
    async function loadMaterials() {
      try {
        const result = await window.electronAPI?.xnbListItems?.()
        if (!cancelled && result?.success && result.items) {
          setVanillaMaterials(result.items.map((it: any) => ({
            id: String(it.id), name: it.name, displayName: it.displayName || it.name,
            texture: it.texture, spriteIndex: it.spriteIndex,
          })))
        }
      } catch { /* 忽略，材料下拉降级为手输 */ }
    }
    loadMaterials()
    return () => { cancelled = true }
  }, [])

  // 小白优化：完成度计算
  const completionRequired = [
    { label: ts('items.displayName'), done: !!displayName.trim() },
    { label: ts('items.englishId'), done: !!name.trim() },
  ]
  const completionOptional = [
    { label: ts('items.desc'), done: !!description.trim() },
    { label: ts('items.upload'), done: !!imageUrl },
  ]
  const requiredDone = completionRequired.filter(c => c.done).length
  const requiredTotal = completionRequired.length
  const allDone = requiredDone === requiredTotal

  // 小白优化：条件预设
  const applyConditionPreset = (preset: string) => {
    const map: Record<string, string> = {
      spring: 'SEASON Spring',
      summer: 'SEASON Summer',
      fall: 'SEASON Fall',
      winter: 'SEASON Winter',
      rainy: 'WEATHER Rain',
      sunny: 'WEATHER Sun',
      year2: 'YEAR 2',
      clear: '',
    }
    if (acquisition.shop) {
      setAcquisition(prev => ({ ...prev, shop: { ...prev.shop!, condition: map[preset] || undefined } }))
      setDirty(true)
    }
  }

  // 标签操作
  const addTag = () => {
    const t = newTag.trim()
    if (t && !contextTags.includes(t)) setContextTags(prev => [...prev, t])
    setNewTag('')
    setDirty(true)
  }
  const removeTag = (idx: number) => { setContextTags(prev => prev.filter((_, i) => i !== idx)); setDirty(true) }

  const typeInfo = itemDataTypeLabels[dataType]
  const isEdible = (dataType === 'object' || dataType === 'ring') && edibility > -300

  return (
    <div className="h-full flex flex-col overflow-hidden" onChange={() => setDirty(true)}>
      {/* 顶栏 */}
      <EditorHeader title={displayName || ts('items.title')} />
      <div className="flex items-center justify-between px-5 py-2 border-b themed-border-primary flex-shrink-0">
        {/* 小白优化：完成度提示 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${(requiredDone / requiredTotal) * 100}%`, backgroundColor: allDone ? '#34d399' : '#fbbf24' }} />
            </div>
            <span className="text-[13px] themed-text-dimmed">{requiredDone}/{requiredTotal}</span>
          </div>
          <span className={`text-[13px] ${allDone ? 'text-green-400' : 'text-amber-400'}`}>
            {allDone ? ts('items.completionReady') : ts('items.completionNotReady')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: typeInfo.color + '20', color: typeInfo.color }}>{ts(typeInfo.label)}</span>
          {savedToast && <span className="text-base text-green-400 animate-pulse">{ts('items.saved')}</span>}
          <button onClick={handleSave} disabled={!allDone}
            className="text-base bg-white text-black font-medium px-4 py-1.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{ts('items.saveItem')}</button>
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ====== 左侧编辑面板 ====== */}
        <div className="w-[420px] flex-shrink-0 flex flex-col border-r themed-border-primary overflow-hidden">
          {/* 小白优化：物品类型选择器 — 2x4 卡片网格，可折叠 */}
          <div className="px-4 pt-3 pb-3 border-b themed-border-secondary">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-[13px] themed-text-disabled">{ts('items.typeSelectorTitle')}</span>
                {/* 当前选中类型徽章 */}
                <span className="text-sm px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1"
                  style={{ backgroundColor: typeInfo.color + '20', color: typeInfo.color }}>
                  <span>{typeInfo.icon}</span>
                  {ts(typeInfo.label)}
                </span>
              </div>
              <button onClick={() => setTypeSelectorOpen(o => !o)}
                className="text-[13px] themed-text-muted hover:themed-text-primary flex items-center gap-0.5 transition-colors">
                {typeSelectorOpen ? ts('items.collapseType') : ts('items.expandType')}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`transition-transform ${typeSelectorOpen ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
            {typeSelectorOpen && (
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(itemDataTypeLabels) as [ItemDataType, typeof itemDataTypeLabels[ItemDataType]][]).map(([key, info]) => (
                  <button key={key} onClick={() => {
                    setDataType(key)
                    if (key === 'ring') { setObjectType('Ring'); setObjectCategory(-96) }
                    if (key === 'object' && objectType === 'Ring') { setObjectType('Basic'); setObjectCategory(-1) }
                    setTab('basic')
                    setTypeSelectorOpen(false)
                  }}
                    className={`p-2 rounded-lg text-left transition-all flex items-start gap-3 ${dataType === key ? '' : 'themed-bg-card hover:bg-white/5'}`}
                    style={dataType === key
                      ? { backgroundColor: info.color + '20', border: `1px solid ${info.color}60` }
                      : { border: '1px solid transparent' }}>
                    <span className="flex-shrink-0 mt-0.5" style={{ color: dataType === key ? info.color : undefined }}>{info.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate"
                        style={{ color: dataType === key ? info.color : undefined }}>{ts(info.label)}</p>
                      <p className="text-sm themed-text-dimmed truncate leading-tight">{ts(info.desc)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tab 切换（精简为 3 个） */}
          <div className="flex border-b themed-border-secondary">
            {(['basic', 'stats', 'acquisition'] as EditorTab[]).map(tabKey => (
              <button key={tabKey} onClick={() => setTab(tabKey)}
                className={`flex-1 py-2 text-base font-medium transition-colors ${tab === tabKey ? 'themed-text-primary border-b-2 border-white' : 'themed-text-muted hover:themed-text-secondary'}`}>
                {ts(tabLabelKeys[tabKey])}
              </button>
            ))}
          </div>

          {/* Tab 内容 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ===== 基本 Tab ===== */}
            {tab === 'basic' && (<>
              {/* 图标上传 */}
              <div className="flex items-center gap-4">
                <button onClick={handleImageUpload} className="group relative w-16 h-16 rounded-xl border-2 border-dashed themed-border-active hover:border-[#666] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                  ) : (
                    <div className="flex flex-col items-center gap-0.5 themed-text-muted group-hover:themed-text-secondary">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <span className="text-sm">{ts('items.upload')}</span>
                    </div>
                  )}
                </button>
                <div className="flex-1 space-y-2">
                  <div>
                    <F label={ts('items.displayName')}><input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={ts('items.displayNamePlaceholder')} className="input" /></F>
                    <p className="text-sm themed-text-dimmed mt-0.5 px-0.5">{ts('items.fieldHintName')}</p>
                  </div>
                  <div>
                    <F label={ts('items.englishId')}><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={ts('items.englishIdPlaceholder')} className="input" /></F>
                    <p className="text-sm themed-text-dimmed mt-0.5 px-0.5">{ts('items.fieldHintEnglishId')}</p>
                  </div>
                </div>
              </div>
              {/* 图片尺寸提示 */}
              <div className="flex items-start gap-3 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[13px] themed-text-secondary leading-relaxed">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5 text-blue-400">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>{ts('items.imageSizeHint')}</span>
              </div>
              {imageWarn && (
                <div className="flex items-start gap-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[13px] text-amber-300 leading-relaxed">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>{imageWarn}</span>
                </div>
              )}
              <div>
                <F label={ts('items.desc')}><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={ts('items.descPlaceholder')} rows={2} className="input resize-none" /></F>
                <p className="text-sm themed-text-dimmed mt-0.5 px-0.5">{ts('items.fieldHintDesc')}</p>
              </div>

              {/* 类型专属基本字段 */}
              {(dataType === 'object') && (
                <div className="space-y-2">
                  <F label={ts('items.objectSubType')}>
                    <select value={objectType} onChange={e => setObjectType(e.target.value)} className="input">
                      {Object.entries(objectSubTypes).map(([k, v]) => <option key={k} value={k}>{ts(v)} ({k})</option>)}
                    </select>
                  </F>
                  <F label={ts('items.category')}>
                    <select value={objectCategory} onChange={e => setObjectCategory(Number(e.target.value))} className="input">
                      {Object.entries(objectCategories).map(([k, v]) => <option key={k} value={v.value}>{ts(v.label)} ({v.value})</option>)}
                    </select>
                  </F>
                </div>
              )}
              {dataType === 'ring' && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[13px] text-emerald-400">{ts('items.ringTypeNote')}</p>
                </div>
              )}
              {dataType === 'weapon' && (
                <F label={ts('items.weaponType')}>
                  <select value={weaponType} onChange={e => setWeaponType(Number(e.target.value))} className="input">
                    {Object.entries(weaponTypes).map(([k, v]) => <option key={k} value={k}>{ts(v)}</option>)}
                  </select>
                </F>
              )}
              {dataType === 'hat' && (
                <F label={ts('items.showHair')}>
                  <select value={hatShowHair} onChange={e => setHatShowHair(e.target.value)} className="input">
                    <option value="false">{ts('items.hatAdapt')}</option>
                    <option value="true">{ts('items.showOriginalHair')}</option>
                    <option value="hide">{ts('items.hideHair')}</option>
                  </select>
                </F>
              )}
              {dataType === 'bigcraftable' && (
                <div className="space-y-2">
                  <F label={ts('items.bcFragility')}>
                    <select value={bcFragility} onChange={e => setBcFragility(Number(e.target.value))} className="input">
                      <option value={0}>{ts('items.bcNotFragile')}</option>
                      <option value={1}>{ts('items.bcFragile')}</option>
                      <option value={2}>{ts('items.bcVeryFragile')}</option>
                    </select>
                  </F>
                </div>
              )}
              {dataType === 'clothing' && (
                <div className="space-y-2">
                  <F label={ts('items.clothingTypeLabel')}>
                    <select value={clothingType} onChange={e => setClothingType(e.target.value as 'Shirt' | 'Pants')} className="input">
                      {Object.entries(clothingTypes).map(([k, v]) => <option key={k} value={k}>{ts(v)}</option>)}
                    </select>
                  </F>
                  <F label={ts('items.clothingGenderLabel')}>
                    <select value={clothingGender} onChange={e => setClothingGender(e.target.value as 'Male' | 'Female' | 'Neutral')} className="input">
                      {Object.entries(clothingGenders).map(([k, v]) => <option key={k} value={k}>{ts(v)}</option>)}
                    </select>
                  </F>
                </div>
              )}
              {dataType === 'furniture' && (
                <div className="space-y-2">
                  <F label={ts('items.furnitureTypeLabel')}>
                    <select value={furnitureType} onChange={e => setFurnitureType(e.target.value)} className="input">
                      {Object.entries(furnitureTypes).map(([k, v]) => <option key={k} value={k}>{ts(v)}</option>)}
                    </select>
                  </F>
                </div>
              )}
            </>)}

            {/* ===== 属性 Tab ===== */}
            {tab === 'stats' && (<>
              {/* 通用: 价格 */}
              <Section title={ts('items.economy')} icon={<IconCoin />}>
                <F label={ts('items.priceCoins')}><NumberInput value={price} onChange={setPrice} className="input" min={0} max={999999} /></F>
                <p className="text-sm themed-text-dimmed px-0.5">{ts('items.fieldHintPrice')}</p>
              </Section>

              {/* Object/Ring: 可食用性 + Buff */}
              {(dataType === 'object' || dataType === 'ring') && (
                <Section title={ts('items.edibleEffect')} icon={<IconPlate />}>
                  <F label={`${ts('items.edibility')}: ${edibility <= -300 ? ts('items.notEdible') : edibility <= 0 ? `${ts('items.harmful')} (${edibility})` : `${ts('items.stamina')}+${Math.floor(edibility * 2.5)} ${ts('items.health')}+${Math.floor(edibility * 1.125)}`}`}>
                    <input type="range" min={-300} max={100} value={edibility} onChange={e => setEdibility(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-[#333] accent-amber-400" />
                    <div className="flex justify-between text-sm themed-text-disabled mt-0.5">
                      <span>{ts('items.notEdibleShort')}</span><span>{edibility}</span><span>{ts('items.highRecovery')}</span>
                    </div>
                  </F>
                  <p className="text-sm themed-text-dimmed px-0.5">{ts('items.fieldHintEdibility')}</p>
                  {isEdible && (
                    <Toggle onDirty={() => setDirty(true)} label={ts('items.isDrink')} value={isDrink} onChange={setIsDrink} />
                  )}
                  {isEdible && (<>
                    <p className="text-[13px] themed-text-secondary font-medium pt-1">{ts('items.buffEffects')}</p>
                    {/* 小白优化：Buff 快速模板 */}
                    <div className="flex flex-wrap gap-1">
                      <span className="text-sm themed-text-dimmed w-full mb-0.5">{ts('items.buffPresets')}:</span>
                      {([['strength', 'items.buffPresetStrength'], ['speed', 'items.buffPresetSpeed'], ['defense', 'items.buffPresetDefense'], ['luck', 'items.buffPresetLuck'], ['farming', 'items.buffPresetFarming'], ['fishing', 'items.buffPresetFishing'], ['clear', 'items.buffPresetClear']] as [string, string][]).map(([key, label]) => (
                        <button key={key} onClick={() => applyBuffPreset(key)}
                          className="text-sm px-2 py-0.5 rounded-full bg-white/5 themed-text-muted hover:bg-white/15 hover:themed-text-primary transition-colors border themed-border-secondary">
                          {ts(label)}
                        </button>
                      ))}
                    </div>
                    {buffs.length === 0 ? (
                      <button onClick={addBuff} className="w-full py-2.5 rounded-lg border border-dashed themed-border-active text-base themed-text-muted hover:themed-text-primary hover:border-[#555] transition-colors">{ts('items.addBuff')}</button>
                    ) : (
                      <div className="space-y-1.5">
                        {buffs.map((buff, bIdx) => (
                          <div key={bIdx} className="rounded-lg border themed-border-secondary overflow-hidden">
                            <button onClick={() => setExpandedBuff(expandedBuff === bIdx ? -1 : bIdx)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="text-[13px] themed-text-secondary font-medium">{buff.id || `${ts('items.buffLabel')} #${bIdx + 1}`}</span>
                                {buff.isDebuff && <span className="text-sm px-1 py-0.5 rounded bg-red-500/20 text-red-400">{ts('items.debuff')}</span>}
                                <span className="text-sm themed-text-disabled">{buff.duration === -2 ? ts('items.dayEnd') : `${buff.duration}${ts('items.minutes')}`}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); removeBuff(bIdx) }} className="text-red-400/50 hover:text-red-400 p-0.5">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`themed-text-disabled transition-transform ${expandedBuff === bIdx ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                              </div>
                            </button>
                            {expandedBuff === bIdx && (
                              <div className="px-3 pb-3 pt-1 border-t themed-border-secondary space-y-2">
                                <F label={ts('items.buffId')}><input type="text" value={buff.id} onChange={e => updateBuff(bIdx, 'id', e.target.value)} className="input" placeholder="如：MyMod_Buff1" /></F>
                                <F label={ts('items.duration')}><NumberInput value={buff.duration} onChange={v => updateBuff(bIdx, 'duration', v)} className="input" /></F>
                                <Toggle onDirty={() => setDirty(true)} label={ts('items.debuffEffect')} value={buff.isDebuff} onChange={v => updateBuff(bIdx, 'isDebuff', v)} />
                                <F label={ts('items.glowColor')}><input type="text" value={buff.glowColor} onChange={e => updateBuff(bIdx, 'glowColor', e.target.value)} className="input" placeholder={ts('items.glowColorPlaceholder')} /></F>
                                <div>
                                  <p className="text-sm themed-text-disabled mb-1">{ts('items.attrBonus')}</p>
                                  {['items.buffGroupCombat', 'items.buffGroupMovement', 'items.buffGroupSkills'].map(group => (
                                    <div key={group}>
                                      <p className="text-sm themed-text-disabled mt-1 mb-0.5 uppercase">{ts(group)}</p>
                                      <div className="grid grid-cols-2 gap-1">
                                        {Object.entries(buffAttributes).filter(([, v]) => v.group === group).map(([attrKey, attrInfo]) => (
                                          <div key={attrKey} className="flex items-center gap-1">
                                            <span className="text-sm themed-text-muted w-12 truncate" title={ts(attrInfo.desc)}>{ts(attrInfo.label)}</span>
                                            <NumberInput value={buff.attributes[attrKey] ?? 0}
                                              onChange={v => updateBuffAttr(bIdx, attrKey, v)}
                                              className="input flex-1 text-[13px] py-0.5" step={attrKey.includes('Multiplier') ? 0.1 : 1} />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        <button onClick={addBuff} className="w-full py-1.5 rounded-lg border border-dashed themed-border-active text-[13px] themed-text-muted hover:themed-text-primary transition-colors">{ts('items.addMore')}</button>
                      </div>
                    )}
                  </>)}
                </Section>
              )}

              {/* 鱼类配置 (Object 类型为 Fish 或手动开启) */}
              {dataType === 'object' && (
                <Section title={ts('items.fishConfig')} icon={<IconFish />}>
                  <Toggle onDirty={() => setDirty(true)} label={ts('items.isFishItem')} value={isFish} onChange={v => {
                    setIsFish(v)
                    if (v) {
                      setObjectType('Fish')
                      setObjectCategory(-4)
                    }
                  }} />
                  {isFish && (<>
                    {/* 出现地点 */}
                    <div>
                      <label className="text-[13px] themed-text-disabled block mb-1">{ts('items.fishLocations')}</label>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {fishLocations.map((loc, idx) => (
                          <span key={idx} className="text-[13px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center gap-1">
                            {loc}
                            <button onClick={() => { setFishLocations(prev => prev.filter((_, i) => i !== idx)); setDirty(true) }} className="text-red-400/60 hover:text-red-400">×</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <select onChange={e => {
                          const v = e.target.value
                          if (v && !fishLocations.includes(v)) setFishLocations(prev => [...prev, v])
                          e.target.value = ''
                        }} className="input flex-1 text-[13px]">
                          <option value="">{ts('items.fishAddLocation')}</option>
                          {['Town', 'Mountain', 'Forest', 'Beach', 'Desert', 'IslandSouth', 'IslandNorth', 'IslandWest', 'Mine', 'UndergroundMine', 'Sewer', 'Woods', 'BugLand', 'Swamp', 'Submarine', 'FishingGame'].filter(l => !fishLocations.includes(l)).map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 出现季节 */}
                    <div>
                      <label className="text-[13px] themed-text-disabled block mb-1">{ts('items.fishSeasons')}</label>
                      <div className="flex flex-wrap gap-1">
                        {['spring', 'summer', 'fall', 'winter'].map(s => {
                          const selected = fishSeasons.includes(s)
                          return (
                            <button key={s} type="button"
                              onClick={() => { setFishSeasons(prev => selected ? prev.filter(x => x !== s) : [...prev, s]); setDirty(true) }}
                              className={`text-[13px] px-2.5 py-1 rounded-full transition-colors ${selected
                                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                                : 'themed-text-muted border themed-border-secondary hover:themed-text-primary'}`}>
                              {ts(`items.fish${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 出没时间 */}
                    <div>
                      <label className="text-[13px] themed-text-disabled block mb-1">{ts('items.fishTimeRange')}</label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <NumberInput value={fishMinTime} onChange={setFishMinTime} className="input text-[13px]" min={600} max={2600} step={100} />
                          <span className="text-sm themed-text-disabled">{ts('items.fishStartTime')}</span>
                        </div>
                        <span className="text-[13px] themed-text-disabled">~</span>
                        <div className="flex-1">
                          <NumberInput value={fishMaxTime} onChange={setFishMaxTime} className="input text-[13px]" min={600} max={2600} step={100} />
                          <span className="text-sm themed-text-disabled">{ts('items.fishEndTime')}</span>
                        </div>
                      </div>
                      <p className="text-sm themed-text-disabled mt-0.5">{ts('items.fishTimeHint')}</p>
                    </div>

                    {/* 天气条件 */}
                    <div>
                      <label className="text-[13px] themed-text-disabled block mb-1">{ts('items.fishWeather')}</label>
                      <div className="flex gap-1">
                        {[{ v: 'sunny', l: ts('items.fishSunny') }, { v: 'rainy', l: ts('items.fishRainy') }].map(opt => {
                          const selected = fishWeather.includes(opt.v)
                          return (
                            <button key={opt.v} type="button"
                              onClick={() => { setFishWeather(prev => selected ? prev.filter(x => x !== opt.v) : [...prev, opt.v]); setDirty(true) }}
                              className={`flex-1 text-[13px] py-1 rounded-md transition-colors ${selected
                                ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                : 'themed-text-muted border themed-border-secondary hover:themed-text-primary'}`}>
                              {opt.l}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 钓鱼难度 */}
                    <F label={`${ts('items.fishDifficulty')}: ${fishDifficulty}`}>
                      <input type="range" min={0} max={100} value={fishDifficulty} onChange={e => setFishDifficulty(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none bg-[#333] accent-cyan-400" />
                      <div className="flex justify-between text-sm themed-text-disabled mt-0.5">
                        <span>{ts('items.fishEasy')}</span><span>{ts('items.fishHard')}</span>
                      </div>
                    </F>

                    {/* 鱼的体型范围 */}
                    <div>
                      <label className="text-[13px] themed-text-disabled block mb-1">{ts('items.fishSizeRange')}</label>
                      <div className="grid grid-cols-2 gap-3">
                        <F label={ts('items.fishMinSize')}><NumberInput value={fishMinSize} onChange={setFishMinSize} className="input" min={1} /></F>
                        <F label={ts('items.fishMaxSize')}><NumberInput value={fishMaxSize} onChange={setFishMaxSize} className="input" min={1} /></F>
                      </div>
                    </div>

                    {/* 游泳行为 */}
                    <F label={ts('items.fishBehavior')}>
                      <select value={fishBehavior} onChange={e => setFishBehavior(e.target.value)} className="input">
                        <option value="Smooth">{ts('items.fishBehaviorSmooth')}</option>
                        <option value="Sink">{ts('items.fishBehaviorSink')}</option>
                        <option value="Floater">{ts('items.fishBehaviorFloater')}</option>
                        <option value="Dart">{ts('items.fishBehaviorDart')}</option>
                        <option value="Mixed">{ts('items.fishBehaviorMixed')}</option>
                      </select>
                    </F>
                  </>)}
                </Section>
              )}

              {/* 农作物配置 (Object 类型且开启了种子标记) */}
              {dataType === 'object' && (
                <Section title={ts('items.cropConfig')} icon={<IconCrop />}>
                  <Toggle onDirty={() => setDirty(true)} label={ts('items.isCropSeed')} value={isCropSeed} onChange={v => {
                    setIsCropSeed(v)
                    if (v && objectType !== 'Seeds') {
                      setObjectType('Seeds')
                      setObjectCategory(-74)
                    }
                  }} />
                  {isCropSeed && (<>
                    {/* 种植季节 */}
                    <div>
                      <label className="text-[13px] themed-text-disabled block mb-1">{ts('items.cropSeasons')}</label>
                      <div className="flex flex-wrap gap-1">
                        {['spring', 'summer', 'fall', 'winter'].map(s => {
                          const seasonLabels: Record<string, string> = {
                            spring: ts('items.cropSpring'),
                            summer: ts('items.cropSummer'),
                            fall: ts('items.cropFall'),
                            winter: ts('items.cropWinter'),
                          }
                          const selected = cropSeasons.includes(s)
                          return (
                            <button key={s} type="button"
                              onClick={() => {
                                setCropSeasons(prev => selected ? prev.filter(x => x !== s) : [...prev, s])
                                setDirty(true)
                              }}
                              className={`text-[13px] px-2.5 py-1 rounded-full transition-colors ${selected
                                ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                                : 'themed-text-muted border themed-border-secondary hover:themed-text-primary'}`}>
                              {seasonLabels[s]}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 生长阶段 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[13px] themed-text-disabled">{ts('items.cropDaysInPhase')}</label>
                        <span className="text-sm themed-text-disabled">{ts('items.cropTotalDays')}: {cropDaysInPhase.reduce((a, b) => a + b, 0)}{ts('items.cropDaysUnit')}</span>
                      </div>
                      <div className="space-y-1">
                        {cropDaysInPhase.map((days, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-sm themed-text-disabled w-10">{ts('items.cropPhase')} {idx + 1}</span>
                            <NumberInput value={days} onChange={v => {
                              const newPhases = [...cropDaysInPhase]
                              newPhases[idx] = Math.max(1, v)
                              setCropDaysInPhase(newPhases)
                              setDirty(true)
                            }} className="input flex-1 text-[13px] py-0.5" min={1} />
                            {cropDaysInPhase.length > 1 && (
                              <button onClick={() => { setCropDaysInPhase(prev => prev.filter((_, i) => i !== idx)); setDirty(true) }}
                                className="text-red-400/60 hover:text-red-400 p-0.5">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => { setCropDaysInPhase(prev => [...prev, 2]); setDirty(true) }}
                          className="w-full py-1 rounded-lg border border-dashed themed-border-active text-[13px] themed-text-muted hover:themed-text-primary transition-colors">{ts('items.cropAddPhase')}</button>
                      </div>
                    </div>

                    {/* 再收获天数 */}
                    <F label={`${ts('items.cropRegrowDays')}: ${cropRegrowDays === -1 ? ts('items.cropNoRegrow') : `${cropRegrowDays}${ts('items.cropDaysUnit')}`}`}>
                      <NumberInput value={cropRegrowDays} onChange={setCropRegrowDays} className="input" min={-1} />
                      <p className="text-sm themed-text-disabled mt-0.5">{ts('items.cropRegrowHint')}</p>
                    </F>

                    {/* 支架/水田 */}
                    <Toggle onDirty={() => setDirty(true)} label={ts('items.cropIsRaised')} value={cropIsRaised} onChange={setCropIsRaised} />
                    <Toggle onDirty={() => setDirty(true)} label={ts('items.cropIsPaddyCrop')} value={cropIsPaddyCrop} onChange={setCropIsPaddyCrop} />

                    {/* 收获物品 */}
                    <F label={ts('items.cropHarvestItemId')}>
                      <input type="text" value={cropHarvestItemId} onChange={e => setCropHarvestItemId(e.target.value)}
                        placeholder="(O){{ModId}}_ItemName" className="input font-mono text-[13px]" />
                      <p className="text-sm themed-text-disabled mt-0.5">{ts('items.cropHarvestItemIdHint')}</p>
                    </F>

                    {/* 收获数量 */}
                    <div className="grid grid-cols-2 gap-3">
                      <F label={ts('items.cropHarvestMinStack')}><NumberInput value={cropHarvestMinStack} onChange={setCropHarvestMinStack} className="input" min={1} /></F>
                      <F label={ts('items.cropHarvestMaxStack')}><NumberInput value={cropHarvestMaxStack} onChange={setCropHarvestMaxStack} className="input" min={1} /></F>
                    </div>

                    {/* 农业等级增加收获 */}
                    <F label={ts('items.cropHarvestFarmingLevel')}><NumberInput value={cropHarvestMaxIncreasePerFarmingLevel} onChange={setCropHarvestMaxIncreasePerFarmingLevel} className="input" min={0} step={0.1} /></F>

                    {/* 额外收获概率 */}
                    <F label={`${ts('items.cropHarvestExtraChance')}: ${(cropHarvestExtraChance * 100).toFixed(0)}%`}>
                      <input type="range" min={0} max={1} step={0.01} value={cropHarvestExtraChance}
                        onChange={e => setCropHarvestExtraChance(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none bg-[#333] accent-green-400" />
                    </F>

                    {/* 收获方式 */}
                    <F label={ts('items.cropHarvestMethod')}>
                      <select value={cropHarvestMethod} onChange={e => setCropHarvestMethod(Number(e.target.value))} className="input">
                        <option value={0}>{ts('items.cropHarvestScythe')}</option>
                        <option value={1}>{ts('items.cropHarvestHand')}</option>
                      </select>
                    </F>

                    {/* 着色颜色 */}
                    <F label={ts('items.cropTintColor')}>
                      <input type="text" value={cropTintColor} onChange={e => setCropTintColor(e.target.value)}
                        placeholder={ts('items.cropTintColorPlaceholder')} className="input" />
                    </F>

                    {/* 巨型作物概率 */}
                    <F label={`${ts('items.cropGiantChance')}: ${(cropGiantCropChance * 100).toFixed(0)}%`}>
                      <input type="range" min={0} max={1} step={0.01} value={cropGiantCropChance}
                        onChange={e => setCropGiantCropChance(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none bg-[#333] accent-amber-400" />
                      <p className="text-sm themed-text-disabled mt-0.5">{ts('items.cropGiantChanceHint')}</p>
                    </F>
                  </>)}
                </Section>
              )}

              {/* 武器属性 */}
              {dataType === 'weapon' && (
                <Section title={ts('items.damage')} icon={<IconSword />}>
                  <div className="grid grid-cols-2 gap-3">
                    <F label={ts('items.minDamage')}><NumberInput value={minDamage} onChange={setMinDamage} className="input" min={0} max={9999} /></F>
                    <F label={ts('items.maxDamage')}><NumberInput value={maxDamage} onChange={setMaxDamage} className="input" min={0} max={9999} /></F>
                  </div>
                  <p className="text-sm themed-text-dimmed px-0.5">{ts('items.fieldHintMinDamage')} / {ts('items.fieldHintMaxDamage')}</p>
                  <F label={`${ts('items.knockback')}: ${knockback}×`}>
                    <input type="range" min={0} max={5} step={0.1} value={knockback} onChange={e => setKnockback(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-[#333] accent-red-400" />
                  </F>
                  <p className="text-sm themed-text-dimmed px-0.5">{ts('items.fieldHintKnockback')}</p>
                  <F label={`${ts('items.attackSpeed')}: ${speed} (${ts('items.speedHint')})`}>
                    <input type="range" min={-10} max={10} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-[#333] accent-orange-400" />
                  </F>
                  <p className="text-sm themed-text-dimmed px-0.5">{ts('items.fieldHintSpeed')}</p>
                </Section>
              )}
              {dataType === 'weapon' && (
                <Section title={ts('items.defenseAndRange')} icon={<IconShield />}>
                  <div className="grid grid-cols-2 gap-3">
                    <F label={ts('items.precision')}><NumberInput value={precision} onChange={setPrecision} className="input" min={0} max={9999} /></F>
                    <F label={ts('items.defensePower')}><NumberInput value={defense} onChange={setDefense} className="input" min={0} max={9999} /></F>
                    <F label={ts('items.attackRange')}><NumberInput value={areaOfEffect} onChange={setAreaOfEffect} className="input" min={0} max={9999} /></F>
                  </div>
                  <p className="text-sm themed-text-dimmed px-0.5">{ts('items.fieldHintPrecision')} / {ts('items.fieldHintDefense')}</p>
                </Section>
              )}
              {dataType === 'weapon' && (
                <Section title={ts('items.crit')} icon={<IconBurst />}>
                  <F label={`${ts('items.critChance')}: ${(critChance * 100).toFixed(0)}%`}>
                    <input type="range" min={0} max={1} step={0.01} value={critChance} onChange={e => setCritChance(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-[#333] accent-yellow-400" />
                  </F>
                  <p className="text-sm themed-text-dimmed px-0.5">{ts('items.fieldHintCritChance')}</p>
                  <F label={`${ts('items.critMultiplier')}: ×${critMultiplier}`}>
                    <input type="range" min={1} max={10} step={0.1} value={critMultiplier} onChange={e => setCritMultiplier(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-[#333] accent-yellow-400" />
                  </F>
                  <p className="text-sm themed-text-dimmed px-0.5">{ts('items.fieldHintCritMultiplier')}</p>
                </Section>
              )}

              {/* 靴子属性 */}
              {dataType === 'boots' && (
                <Section title={ts('items.defenseAttr')} icon={<IconShield />}>
                  <F label={`${ts('items.defenseValue')}: ${bootsDefense}`}>
                    <input type="range" min={0} max={50} value={bootsDefense} onChange={e => setBootsDefense(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-[#333] accent-purple-400" />
                  </F>
                  <F label={`${ts('items.immunityValue')}: ${bootsImmunity}`}>
                    <input type="range" min={0} max={50} value={bootsImmunity} onChange={e => setBootsImmunity(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-[#333] accent-purple-400" />
                  </F>
                  <F label={ts('items.colorIndex')}><NumberInput value={bootsColorIndex} onChange={setBootsColorIndex} className="input" min={0} /></F>
                </Section>
              )}

              {/* 帽子属性 */}
              {dataType === 'hat' && (
                <Section title={ts('items.hatAttr')} icon={<IconHat />}>
                  <Toggle onDirty={() => setDirty(true)} label={ts('items.skipHairOffset')} value={hatSkipOffset} onChange={setHatSkipOffset} />
                  <F label={ts('items.tags')}>
                    <input type="text" value={hatTags} onChange={e => setHatTags(e.target.value)} placeholder="Prismatic" className="input" />
                  </F>
                </Section>
              )}

              {/* 大型可制作物品属性 */}
              {dataType === 'bigcraftable' && (
                <Section title={ts('items.bcPlacementAttr')} icon={<IconBox />}>
                  <Toggle onDirty={() => setDirty(true)} label={ts('items.bcCanBePlacedIndoors')} value={bcCanBePlacedIndoors} onChange={setBcCanBePlacedIndoors} />
                  <Toggle onDirty={() => setDirty(true)} label={ts('items.bcCanBePlacedOutdoors')} value={bcCanBePlacedOutdoors} onChange={setBcCanBePlacedOutdoors} />
                  <Toggle onDirty={() => setDirty(true)} label={ts('items.bcIsLamp')} value={bcIsLamp} onChange={setBcIsLamp} />
                  <F label={ts('items.spriteIndex')}><NumberInput value={bcSpriteIndex} onChange={setBcSpriteIndex} className="input" min={0} /></F>
                </Section>
              )}

              {/* 服装属性 */}
              {dataType === 'clothing' && (
                <Section title={ts('items.clothingAttr')} icon={<IconDecor />}>
                  <Toggle onDirty={() => setDirty(true)} label={ts('items.clothingDyeable')} value={clothingDyeable} onChange={setClothingDyeable} />
                  <Toggle onDirty={() => setDirty(true)} label={ts('items.canTrash')} value={clothingCanBeTrashed} onChange={setClothingCanBeTrashed} />
                  <Toggle onDirty={() => setDirty(true)} label={ts('items.canGift')} value={clothingCanBeGivenAsGift} onChange={setClothingCanBeGivenAsGift} />
                  <F label={ts('items.spriteIndex')}><NumberInput value={clothingSpriteIndex} onChange={setClothingSpriteIndex} className="input" min={0} /></F>
                </Section>
              )}

              {/* 家具属性 */}
              {dataType === 'furniture' && (
                <>
                  <Section title={ts('items.furnitureSizeAttr')} icon={<IconResource />}>
                    <div className="grid grid-cols-2 gap-3">
                      <F label={ts('items.furnitureSizeX')}><NumberInput value={furnitureSizeX} onChange={setFurnitureSizeX} className="input" min={1} /></F>
                      <F label={ts('items.furnitureSizeY')}><NumberInput value={furnitureSizeY} onChange={setFurnitureSizeY} className="input" min={1} /></F>
                    </div>
                    <p className="text-sm themed-text-disabled">{ts('items.furnitureBoxHint')}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <F label={ts('items.furnitureBoxX')}><NumberInput value={furnitureBoxX} onChange={setFurnitureBoxX} className="input" min={0} /></F>
                      <F label={ts('items.furnitureBoxY')}><NumberInput value={furnitureBoxY} onChange={setFurnitureBoxY} className="input" min={0} /></F>
                      <F label={ts('items.furnitureBoxWidth')}><NumberInput value={furnitureBoxWidth} onChange={setFurnitureBoxWidth} className="input" min={1} /></F>
                      <F label={ts('items.furnitureBoxHeight')}><NumberInput value={furnitureBoxHeight} onChange={setFurnitureBoxHeight} className="input" min={1} /></F>
                    </div>
                  </Section>
                  <Section title={ts('items.furniturePlacementAttr')} icon={<IconResource />}>
                    <Toggle onDirty={() => setDirty(true)} label={ts('items.furnitureCanBePlacedIndoors')} value={furnitureCanBePlacedIndoors} onChange={setFurnitureCanBePlacedIndoors} />
                    <Toggle onDirty={() => setDirty(true)} label={ts('items.furnitureCanBePlacedOutdoors')} value={furnitureCanBePlacedOutdoors} onChange={setFurnitureCanBePlacedOutdoors} />
                    <Toggle onDirty={() => setDirty(true)} label={ts('items.furnitureCanBeRemoved')} value={furnitureCanBeRemoved} onChange={setFurnitureCanBeRemoved} />
                    <Toggle onDirty={() => setDirty(true)} label={ts('items.furnitureIsLamp')} value={furnitureIsLamp} onChange={setFurnitureIsLamp} />
                    {furnitureIsLamp && (
                      <F label={ts('items.furnitureLightRadius')}><NumberInput value={furnitureLightRadius} onChange={setFurnitureLightRadius} className="input" min={0} max={20} step={0.5} /></F>
                    )}
                    <F label={ts('items.spriteIndex')}><NumberInput value={furnitureSpriteIndex} onChange={setFurnitureSpriteIndex} className="input" min={0} /></F>
                  </Section>
                  {furnitureType === 'Chair' && (
                    <Section title={ts('items.furnitureSeatAttr')} icon={<IconResource />}>
                      {furnitureSeatPositions.map((seat, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-sm themed-text-disabled">#{idx + 1}</span>
                          <NumberInput value={seat.X} onChange={v => { const s = [...furnitureSeatPositions]; s[idx] = { ...s[idx], X: v }; setFurnitureSeatPositions(s); setDirty(true) }} className="input w-14 text-[13px] py-0.5" />
                          <NumberInput value={seat.Y} onChange={v => { const s = [...furnitureSeatPositions]; s[idx] = { ...s[idx], Y: v }; setFurnitureSeatPositions(s); setDirty(true) }} className="input w-14 text-[13px] py-0.5" />
                          <NumberInput value={seat.Direction} onChange={v => { const s = [...furnitureSeatPositions]; s[idx] = { ...s[idx], Direction: v }; setFurnitureSeatPositions(s); setDirty(true) }} className="input w-14 text-[13px] py-0.5" min={0} max={3} />
                          <button onClick={() => { setFurnitureSeatPositions(prev => prev.filter((_, i) => i !== idx)); setDirty(true) }} className="text-red-400/60 hover:text-red-400 p-0.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      ))}
                      <button onClick={() => { setFurnitureSeatPositions(prev => [...prev, { X: 0, Y: 0, Direction: 0 }]); setDirty(true) }} className="w-full py-1.5 rounded-lg border border-dashed themed-border-active text-[13px] themed-text-muted hover:themed-text-primary transition-colors">{ts('items.furnitureAddSeat')}</button>
                    </Section>
                  )}
                </>
              )}
            </>)}

            {/* ===== 获取方式 Tab ===== */}
            {tab === 'acquisition' && (<>
              {/* 商店购买 */}
              <Section title={ts('items.shopPurchase')} icon={<IconCoin />}>
                <Toggle onDirty={() => setDirty(true)} label={ts('items.canBuyInShop')} value={!!acquisition.shop} onChange={v => setAcquisition(prev => v ? { ...prev, shop: { shopId: 'Pierre' } } : { ...prev, shop: undefined })} />
                {acquisition.shop && (<>
                  <F label={ts('items.shop')}>
                    <select value={acquisition.shop.shopId} onChange={e => setAcquisition(prev => ({ ...prev, shop: { ...prev.shop!, shopId: e.target.value } }))}
                      className="input">
                      <option value="Pierre">{ts('items.shopPierre')}</option>
                      <option value="JojaMart">{ts('items.shopJojaMart')}</option>
                      <option value="FishShop">{ts('items.shopFishShop')}</option>
                      <option value="Blacksmith">{ts('items.shopBlacksmith')}</option>
                      <option value="AdventureShop">{ts('items.shopAdventureShop')}</option>
                      <option value="Carpenter">{ts('items.shopCarpenter')}</option>
                      <option value="AnimalShop">{ts('items.shopAnimalShop')}</option>
                      <option value="TravelingMerchant">{ts('items.shopTravelingMerchant')}</option>
                      <option value="Dresser">{ts('items.shopDresser')}</option>
                      <option value="QiShop">{ts('items.shopQiShop')}</option>
                    </select>
                  </F>
                  <F label={ts('items.buyCondition')}>
                    {/* 小白优化：常用条件预设按钮 */}
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      <span className="text-sm themed-text-dimmed w-full mb-0.5">{ts('items.conditionPresets')}:</span>
                      {([['spring', 'items.condPresetSpring'], ['summer', 'items.condPresetSummer'], ['fall', 'items.condPresetFall'], ['winter', 'items.condPresetWinter'], ['rainy', 'items.condPresetRainy'], ['sunny', 'items.condPresetSunny'], ['year2', 'items.condPresetYear2'], ['clear', 'items.condPresetClear']] as [string, string][]).map(([key, label]) => (
                        <button key={key} type="button" onClick={() => applyConditionPreset(key)}
                          className="text-sm px-2 py-0.5 rounded-full bg-white/5 themed-text-muted hover:bg-white/15 hover:themed-text-primary transition-colors border themed-border-secondary">
                          {ts(label)}
                        </button>
                      ))}
                    </div>
                    <ConditionBuilder
                      value={acquisition.shop.condition ?? ''}
                      onChange={v => setAcquisition(prev => ({ ...prev, shop: { ...prev.shop!, condition: v || undefined } }))}
                    />
                  </F>
                  <p className="text-sm themed-text-disabled">{ts('items.shopSellNote')}</p>
                </>)}
              </Section>

              {/* 合成配方 */}
              {(dataType === 'object' || dataType === 'ring') && (
                <Section title={ts('items.craftingRecipe')} icon={<IconGear />}>
                  <Toggle onDirty={() => setDirty(true)} label={ts('items.canCraft')} value={!!acquisition.recipe} onChange={v => setAcquisition(prev => v ? { ...prev, recipe: { type: 'crafting', ingredients: [{ itemId: '390', quantity: 1 }], yieldCount: 1, time: -1 } } : { ...prev, recipe: undefined })} />
                  {acquisition.recipe && (<>
                    <F label={ts('items.recipeType')}>
                      <select value={acquisition.recipe.type} onChange={e => setAcquisition(prev => ({ ...prev, recipe: { ...prev.recipe!, type: e.target.value as 'crafting' | 'cooking' } }))}
                        className="input">
                        <option value="crafting">{ts('items.recipeCrafting')}</option>
                        <option value="cooking">{ts('items.recipeCooking')}</option>
                      </select>
                    </F>
                    <F label={ts('items.yieldCount')}><NumberInput value={acquisition.recipe.yieldCount} onChange={v => setAcquisition(prev => ({ ...prev, recipe: { ...prev.recipe!, yieldCount: v } }))} className="input" min={1} /></F>
                    <F label={ts('items.craftTime')}><NumberInput value={acquisition.recipe.time} onChange={v => setAcquisition(prev => ({ ...prev, recipe: { ...prev.recipe!, time: v } }))} className="input" emptyValue={-1} /></F>
                    <F label={ts('items.unlockCondition')}>
                      <input type="text" value={acquisition.recipe.unlockCondition ?? ''} onChange={e => setAcquisition(prev => ({ ...prev, recipe: { ...prev.recipe!, unlockCondition: e.target.value || undefined } }))}
                        placeholder={ts('items.unlockConditionPlaceholder')} className="input" />
                    </F>
                    <div>
                      <p className="text-[13px] themed-text-secondary font-medium mb-2">{ts('items.materialList')}</p>
                      {acquisition.recipe.ingredients.map((ing, idx) => (
                        <div key={idx} className="flex items-center gap-3 mb-1.5">
                          {/* 小白优化：材料从原版物品下拉选择，找不到时降级为手输 */}
                          {vanillaMaterials.length > 0 ? (
                            <select value={ing.itemId} onChange={e => {
                              const newIngs = [...acquisition.recipe!.ingredients]
                              newIngs[idx] = { ...newIngs[idx], itemId: e.target.value }
                              setAcquisition(prev => ({ ...prev, recipe: { ...prev.recipe!, ingredients: newIngs } }))
                            }} className="input flex-1 text-[13px] py-1">
                              <option value="">{ts('items.materialSelect')}</option>
                              {vanillaMaterials
                                .filter(m => !materialSearch || m.displayName.toLowerCase().includes(materialSearch.toLowerCase()) || m.name.toLowerCase().includes(materialSearch.toLowerCase()))
                                .slice(0, 200)
                                .map(m => (
                                  <option key={m.id} value={m.id}>{m.displayName} ({m.name}) — ID:{m.id}</option>
                                ))
                              }
                            </select>
                          ) : (
                            <input type="text" value={ing.itemId} onChange={e => {
                              const newIngs = [...acquisition.recipe!.ingredients]
                              newIngs[idx] = { ...newIngs[idx], itemId: e.target.value }
                              setAcquisition(prev => ({ ...prev, recipe: { ...prev.recipe!, ingredients: newIngs } }))
                            }} placeholder={ts('items.itemId')} className="input flex-1 text-[13px] py-1" />
                          )}
                          <NumberInput value={ing.quantity} onChange={v => {
                            const newIngs = [...acquisition.recipe!.ingredients]
                            newIngs[idx] = { ...newIngs[idx], quantity: v }
                            setAcquisition(prev => ({ ...prev, recipe: { ...prev.recipe!, ingredients: newIngs } }))
                          }} className="input w-16 text-[13px] py-1" min={1} />
                          <button onClick={() => {
                            const newIngs = acquisition.recipe!.ingredients.filter((_, i) => i !== idx)
                            setAcquisition(prev => ({ ...prev, recipe: { ...prev.recipe!, ingredients: newIngs } }))
                            setDirty(true)
                          }} className="text-red-400/60 hover:text-red-400 p-0.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      ))}
                      {/* 材料搜索框（仅在有原版数据时显示） */}
                      {vanillaMaterials.length > 0 && (
                        <input type="text" value={materialSearch} onChange={e => setMaterialSearch(e.target.value)}
                          placeholder={ts('items.materialSearch')} className="input w-full text-sm py-1 mb-1.5" />
                      )}
                      <button onClick={() => { setAcquisition(prev => ({ ...prev, recipe: { ...prev.recipe!, ingredients: [...prev.recipe!.ingredients, { itemId: '', quantity: 1 }] } })); setDirty(true) }}
                        className="w-full py-1.5 rounded-lg border border-dashed themed-border-active text-[13px] themed-text-muted hover:themed-text-primary hover:border-[#555] transition-colors">{ts('items.addMaterial')}</button>
                      <p className="text-sm themed-text-disabled mt-1">{ts('items.materialIdHint')}</p>
                    </div>
                  </>)}
                </Section>
              )}

              {/* 怪物掉落 */}
              <Section title={ts('items.monsterDrop')} icon={<IconSword />}>
                <Toggle onDirty={() => setDirty(true)} label={ts('items.canDropFromMonster')} value={!!acquisition.monsterDrop} onChange={v => setAcquisition(prev => v ? { ...prev, monsterDrop: { monsterName: 'Green Slime', chance: 0.05, minCount: 1, maxCount: 1 } } : { ...prev, monsterDrop: undefined })} />
                {acquisition.monsterDrop && (<>
                  <F label={ts('items.monsterName')}>
                    <MonsterPicker
                      value={acquisition.monsterDrop.monsterName}
                      onChange={v => setAcquisition(prev => ({ ...prev, monsterDrop: { ...prev.monsterDrop!, monsterName: v } }))}
                    />
                  </F>
                  <F label={`${ts('items.dropChance')}: ${(acquisition.monsterDrop.chance * 100).toFixed(0)}%`}>
                    <input type="range" min={0.01} max={1} step={0.01} value={acquisition.monsterDrop.chance}
                      onChange={e => setAcquisition(prev => ({ ...prev, monsterDrop: { ...prev.monsterDrop!, chance: Number(e.target.value) } }))}
                      className="w-full h-1.5 rounded-full appearance-none bg-[#333] accent-red-400" />
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label={ts('items.minCount')}><NumberInput value={acquisition.monsterDrop.minCount} onChange={v => setAcquisition(prev => ({ ...prev, monsterDrop: { ...prev.monsterDrop!, minCount: v } }))} className="input" min={1} /></F>
                    <F label={ts('items.maxCount')}><NumberInput value={acquisition.monsterDrop.maxCount} onChange={v => setAcquisition(prev => ({ ...prev, monsterDrop: { ...prev.monsterDrop!, maxCount: v } }))} className="input" min={1} /></F>
                  </div>
                </>)}
              </Section>
            </>)}

            {/* ===== 小白优化：高级（开发者）可折叠面板 — 默认收起，所有 Tab 下可见 ===== */}
            <div className="rounded-xl border themed-border-secondary overflow-hidden">
              <button onClick={() => setAdvancedOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 themed-bg-card hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <IconGear />
                  <span className="text-base themed-text-secondary font-medium">{ts('items.tabAdvancedDev')}</span>
                  <span className="text-sm themed-text-dimmed">{ts('items.advancedDevHint')}</span>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`themed-text-muted transition-transform ${advancedOpen ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {advancedOpen && (
                <div className="p-3 space-y-4 border-t themed-border-secondary">
                  {/* 通用开关 */}
                  <Section title={ts('items.behaviorSwitches')} icon={<IconGear />}>
                    {(dataType === 'object' || dataType === 'ring') && (<>
                      <Toggle onDirty={() => setDirty(true)} label={ts('items.canGift')} value={canGift} onChange={setCanGift} />
                      <Toggle onDirty={() => setDirty(true)} label={ts('items.canTrash')} value={canTrash} onChange={setCanTrash} />
                      <Toggle onDirty={() => setDirty(true)} label={ts('items.canBeDropped')} value={canBeDropped} onChange={setCanBeDropped} />
                      <Toggle onDirty={() => setDirty(true)} label={ts('items.specialItem')} value={specialItem} onChange={setSpecialItem} />
                      <Toggle onDirty={() => setDirty(true)} label={ts('items.hasCraftingRecipe')} value={hasCraftingRecipe} onChange={setHasCraftingRecipe} />
                      <Toggle onDirty={() => setDirty(true)} label={ts('items.isFood')} value={isFood} onChange={setIsFood} />
                      <Toggle onDirty={() => setDirty(true)} label={ts('items.excludeRandomSale')} value={excludeFromRandomSale} onChange={setExcludeFromRandomSale} />
                    </>)}
                    {dataType === 'weapon' && (<>
                      <Toggle onDirty={() => setDirty(true)} label={ts('items.canLostOnDeath')} value={canBeLostOnDeath} onChange={setCanBeLostOnDeath} />
                      <F label={ts('items.mineBaseLevel')}><NumberInput value={mineBaseLevel} onChange={setMineBaseLevel} className="input" emptyValue={-1} /></F>
                      <F label={ts('items.mineMinLevel')}><NumberInput value={mineMinLevel} onChange={setMineMinLevel} className="input" emptyValue={-1} /></F>
                      <F label={ts('items.swingSound')}><input type="text" value={swingSound} onChange={e => setSwingSound(e.target.value)} placeholder={ts('items.swingSoundPlaceholder')} className="input" /></F>
                      <F label={ts('items.weaponLevel')}><NumberInput value={weaponLevel} onChange={setWeaponLevel} className="input" min={0} /></F>
                      <F label={ts('items.defaultSkin')}><NumberInput value={defaultSkin} onChange={setDefaultSkin} className="input" min={0} /></F>
                      <F label={ts('items.skinDuration')}><NumberInput value={skinDuration} onChange={setSkinDuration} className="input" min={0} /></F>
                    </>)}
                  </Section>

                  {/* 上下文标签 */}
                  {(dataType === 'object' || dataType === 'ring') && (
                    <Section title={ts('items.contextTags')} icon={<IconTag />}>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {contextTags.map((tag, idx) => (
                          <span key={idx} className="text-[13px] px-2 py-0.5 rounded-full bg-white/10 themed-text-secondary flex items-center gap-1">
                            {tag}
                            <button onClick={() => removeTag(idx)} className="text-red-400/60 hover:text-red-400">×</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder={ts('items.addTag')} className="input flex-1" />
                        <button onClick={addTag} className="px-3 py-1.5 text-[13px] rounded-lg bg-white/10 themed-text-secondary hover:bg-white/20 transition-colors">+</button>
                      </div>
                      <p className="text-sm themed-text-disabled mt-1">{ts('items.tagHint')}</p>
                    </Section>
                  )}

                  {/* 可送礼NPC */}
                  {(dataType === 'object' || dataType === 'ring') && (
                    <Section title={ts('items.giftToNPCs')} icon={<IconTag />}>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {giftToNPCs.map((npc, idx) => (
                          <span key={idx} className="text-[13px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 flex items-center gap-1">
                            {npc}
                            <button onClick={() => { setGiftToNPCs(prev => prev.filter((_, i) => i !== idx)); setDirty(true) }} className="text-red-400/60 hover:text-red-400">×</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <input type="text" value={newNpcTag} onChange={e => setNewNpcTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const t = newNpcTag.trim(); if (t && !giftToNPCs.includes(t)) { setGiftToNPCs(prev => [...prev, t]); setDirty(true) }; setNewNpcTag('') } }} placeholder={ts('items.addNpcTag')} className="input flex-1" />
                        <button onClick={() => { const t = newNpcTag.trim(); if (t && !giftToNPCs.includes(t)) { setGiftToNPCs(prev => [...prev, t]); setDirty(true) }; setNewNpcTag('') }} className="px-3 py-1.5 text-[13px] rounded-lg bg-white/10 themed-text-secondary hover:bg-white/20 transition-colors">+</button>
                      </div>
                      <p className="text-sm themed-text-disabled mt-1">{ts('items.giftToNPCsHint')}</p>
                    </Section>
                  )}

                  {/* 导出格式提示 */}
                  <Section title={ts('items.dataFormat')} icon={<IconFile />}>
                    <div className="text-[13px] themed-text-disabled space-y-1">
                      <p>{ts('items.targetFile')}: <span className="themed-text-secondary font-mono">{dataType === 'object' || dataType === 'ring' ? 'Data/Objects' : dataType === 'weapon' ? 'Data/Weapons' : dataType === 'boots' ? 'Data/Boots' : dataType === 'hat' ? 'Data/Hats' : dataType === 'bigcraftable' ? 'Data/BigCraftables' : dataType === 'clothing' ? 'Data/Clothing' : 'Data/Furniture'}</span></p>
                      <p>{ts('items.format')}: <span className="themed-text-secondary">{dataType === 'boots' || dataType === 'hat' ? ts('items.slashFormat') : 'JSON Model'}</span></p>
                      <p>{ts('items.typeId')}: <span className="themed-text-secondary font-mono">({dataType === 'object' ? 'O' : dataType === 'weapon' ? 'W' : dataType === 'boots' ? 'B' : dataType === 'hat' ? 'H' : dataType === 'ring' ? 'R' : dataType === 'bigcraftable' ? 'BC' : dataType === 'clothing' ? 'C' : 'F'})</span></p>
                    </div>
                  </Section>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ====== 右侧预览 ====== */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 overflow-y-auto">
          {/* 图标大预览 */}
          <button onClick={handleImageUpload} className="group relative w-28 h-28 rounded-2xl border-2 border-dashed themed-border-active hover:border-[#666] flex items-center justify-center overflow-hidden transition-colors">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
            ) : (
              <div className="flex flex-col items-center gap-1 themed-text-muted group-hover:themed-text-secondary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span className="text-[13px]">{ts('items.uploadIcon')}</span>
              </div>
            )}
          </button>

          {/* 名称+类型 */}
          <div className="text-center">
            <p className="text-base themed-text-primary font-medium">{displayName || ts('items.untitledItem')}</p>
            <p className="text-[13px] themed-text-disabled mt-0.5">{name || 'unnamed'}</p>
          </div>

          {/* 属性预览卡片 */}
          <div className="w-full max-w-[320px] space-y-2 mt-2">
            {/* 价格 */}
            <PreviewRow label={ts('items.priceCoins')} value={`${price} ${ts('items.goldCoins')}`} valueColor="text-amber-400" />

            {/* 武器 */}
            {dataType === 'weapon' && (<>
              <PreviewRow label={ts('items.type')} value={ts(weaponTypes[weaponType]) || ts('items.sword')} />
              <PreviewRow label={ts('items.damage')} value={`${minDamage}~${maxDamage}`} valueColor="text-red-400" />
              <div className="grid grid-cols-3 gap-1.5 bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary text-center">
                <div><p className="text-sm themed-text-disabled">{ts('items.knockbackShort')}</p><p className="text-base themed-text-secondary">{knockback}×</p></div>
                <div><p className="text-sm themed-text-disabled">{ts('items.speedShort')}</p><p className="text-base themed-text-secondary">{speed}</p></div>
                <div><p className="text-sm themed-text-disabled">{ts('items.precisionShort')}</p><p className="text-base themed-text-secondary">{precision}</p></div>
                <div><p className="text-sm themed-text-disabled">{ts('items.defenseShort')}</p><p className="text-base themed-text-secondary">{defense}</p></div>
                <div><p className="text-sm themed-text-disabled">{ts('items.critRateShort')}</p><p className="text-base themed-text-secondary">{(critChance * 100).toFixed(0)}%</p></div>
                <div><p className="text-sm themed-text-disabled">{ts('items.critMultShort')}</p><p className="text-base themed-text-secondary">{critMultiplier}×</p></div>
              </div>
            </>)}

            {/* 食物 */}
            {isEdible && (<>
              <PreviewRow label={ts('items.type')} value={isDrink ? ts('items.drinkType') : ts('items.foodType')} />
              <div className="grid grid-cols-2 gap-1.5 bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary text-center">
                <div><p className="text-sm themed-text-disabled">{ts('items.stamina')}</p><p className="text-base text-green-400 font-medium">{(() => { const v = Math.floor(edibility * 2.5); return v >= 0 ? `+${v}` : `${v}` })()}</p></div>
                <div><p className="text-sm themed-text-disabled">{ts('items.health')}</p><p className="text-base text-red-400 font-medium">{(() => { const v = Math.floor(edibility * 1.125); return v >= 0 ? `+${v}` : `${v}` })()}</p></div>
              </div>
              {buffs.length > 0 && (
                <div className="bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary">
                  <p className="text-sm themed-text-disabled mb-1">{ts('items.buffEffects')}</p>
                  {buffs.map((buff, idx) => (
                    <div key={idx} className="text-[13px] themed-text-secondary flex flex-wrap gap-x-2">
                      {Object.entries(buff.attributes).filter(([, v]) => v !== 0).map(([k, v]) => (
                        <span key={k}>{ts(buffAttributes[k]?.label || k)}{v > 0 ? '+' : ''}{v}</span>
                      ))}
                      <span className="themed-text-disabled">{buff.duration === -2 ? ts('items.day') : `${buff.duration}${ts('items.min')}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </>)}

            {/* 鱼类 */}
            {isFish && dataType === 'object' && (
              <div className="bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary space-y-1.5">
                <p className="text-sm themed-text-disabled font-medium">{ts('items.fishConfig')}</p>
                {fishSeasons.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {fishSeasons.map(s => (
                      <span key={s} className="text-sm px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">{ts(`items.fish${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}</span>
                    ))}
                  </div>
                )}
                {fishLocations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {fishLocations.map(l => (
                      <span key={l} className="text-sm px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">{l}</span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div><p className="text-sm themed-text-disabled">{ts('items.fishDifficulty')}</p><p className="text-base text-cyan-400 font-medium">{fishDifficulty}</p></div>
                  <div><p className="text-sm themed-text-disabled">{ts('items.fishMinSize')}</p><p className="text-base themed-text-secondary">{fishMinSize}cm</p></div>
                  <div><p className="text-sm themed-text-disabled">{ts('items.fishMaxSize')}</p><p className="text-base themed-text-secondary">{fishMaxSize}cm</p></div>
                </div>
                <PreviewRow label={ts('items.fishTimeRange')} value={`${fishMinTime}~${fishMaxTime}`} />
                {fishWeather.length > 0 && <PreviewRow label={ts('items.fishWeather')} value={fishWeather.map(w => w === 'sunny' ? ts('items.fishSunny') : ts('items.fishRainy')).join('/')} />}
                <PreviewRow label={ts('items.fishBehavior')} value={fishBehavior} />
              </div>
            )}

            {/* 农作物预览 */}
            {isCropSeed && dataType === 'object' && (
              <div className="bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">{ts('items.cropTag')}</span>
                  <span className="text-[13px] themed-text-secondary">{cropSeasons.map(s => {
                    const m: Record<string, string> = { spring: ts('items.cropSpring'), summer: ts('items.cropSummer'), fall: ts('items.cropFall'), winter: ts('items.cropWinter') }
                    return m[s] || s
                  }).join('/')}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-center">
                  <div><p className="text-sm themed-text-disabled">{ts('items.cropTotalDaysShort')}</p><p className="text-base text-green-400 font-medium">{cropDaysInPhase.reduce((a, b) => a + b, 0)}</p></div>
                  <div><p className="text-sm themed-text-disabled">{ts('items.cropRegrowShort')}</p><p className="text-base themed-text-secondary">{cropRegrowDays === -1 ? '✗' : `${cropRegrowDays}`}</p></div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {cropIsRaised && <span className="text-sm px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">{ts('items.cropIsRaised')}</span>}
                  {cropIsPaddyCrop && <span className="text-sm px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">{ts('items.cropIsPaddyCrop')}</span>}
                  {cropHarvestMethod === 0 && <span className="text-sm px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">{ts('items.cropHarvestScythe')}</span>}
                  {cropGiantCropChance > 0 && <span className="text-sm px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">{ts('items.cropGiantTag')}</span>}
                </div>
                {cropHarvestItemId && <PreviewRow label={ts('items.cropHarvestLabel')} value={cropHarvestItemId} />}
              </div>
            )}

            {/* 靴子 */}
            {dataType === 'boots' && (
              <div className="grid grid-cols-2 gap-1.5 bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary text-center">
                <div><p className="text-sm themed-text-disabled">{ts('items.defenseValue')}</p><p className="text-base text-purple-400 font-medium">+{bootsDefense}</p></div>
                <div><p className="text-sm themed-text-disabled">{ts('items.immunityValue')}</p><p className="text-base text-purple-400 font-medium">+{bootsImmunity}</p></div>
              </div>
            )}

            {/* 帽子 */}
            {dataType === 'hat' && (
              <div className="bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary space-y-1">
                <PreviewRow label={ts('items.hairLabel')} value={hatShowHair === 'true' ? ts('items.showOriginal') : hatShowHair === 'hide' ? ts('items.hide') : ts('items.adaptHair')} />
                {hatTags && <PreviewRow label={ts('items.tagLabel')} value={hatTags} />}
              </div>
            )}

            {/* 大型可制作物品 */}
            {dataType === 'bigcraftable' && (
              <div className="bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary space-y-1">
                <PreviewRow label={ts('items.bcFragility')} value={bcFragility === 0 ? ts('items.bcNotFragile') : bcFragility === 1 ? ts('items.bcFragile') : ts('items.bcVeryFragile')} />
                <div className="grid grid-cols-2 gap-1.5 text-center">
                  <div><p className="text-sm themed-text-disabled">{ts('items.indoor')}</p><p className="text-base themed-text-secondary">{bcCanBePlacedIndoors ? '✓' : '✗'}</p></div>
                  <div><p className="text-sm themed-text-disabled">{ts('items.outdoor')}</p><p className="text-base themed-text-secondary">{bcCanBePlacedOutdoors ? '✓' : '✗'}</p></div>
                </div>
                {bcIsLamp && <PreviewRow label={ts('items.bcIsLamp')} value="✓" valueColor="text-blue-400" />}
              </div>
            )}

            {/* 服装 */}
            {dataType === 'clothing' && (
              <div className="bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary space-y-1">
                <PreviewRow label={ts('items.type')} value={ts(clothingTypes[clothingType])} />
                <PreviewRow label={ts('items.clothingGenderLabel')} value={ts(clothingGenders[clothingGender])} />
                <div className="flex flex-wrap gap-1">
                  {clothingDyeable && <span className="text-sm px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400">{ts('items.clothingDyeable')}</span>}
                  {clothingCanBeGivenAsGift && <span className="text-sm px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">{ts('items.canGift')}</span>}
                </div>
              </div>
            )}

            {/* 家具 */}
            {dataType === 'furniture' && (
              <div className="bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary space-y-1">
                <PreviewRow label={ts('items.type')} value={ts(furnitureTypes[furnitureType] || furnitureType)} />
                <PreviewRow label={ts('items.furnitureSizeLabel')} value={`${furnitureSizeX}×${furnitureSizeY}`} />
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div><p className="text-sm themed-text-disabled">{ts('items.indoor')}</p><p className="text-base themed-text-secondary">{furnitureCanBePlacedIndoors ? '✓' : '✗'}</p></div>
                  <div><p className="text-sm themed-text-disabled">{ts('items.outdoor')}</p><p className="text-base themed-text-secondary">{furnitureCanBePlacedOutdoors ? '✓' : '✗'}</p></div>
                  <div><p className="text-sm themed-text-disabled">{ts('items.furnitureIsLamp')}</p><p className="text-base themed-text-secondary">{furnitureIsLamp ? '✓' : '✗'}</p></div>
                </div>
                {furnitureIsLamp && <PreviewRow label={ts('items.furnitureLightRadius')} value={`${furnitureLightRadius}`} />}
                {furnitureSeatPositions.length > 0 && <PreviewRow label={ts('items.furnitureSeatAttr')} value={`${furnitureSeatPositions.length} ${ts('items.furnitureSeatCount')}`} />}
              </div>
            )}

            {/* 描述 */}
            {description && (
              <div className="bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary">
                <p className="text-[13px] themed-text-secondary leading-relaxed">{description}</p>
              </div>
            )}

            {/* 获取方式预览 */}
            {(acquisition.shop || acquisition.recipe || acquisition.monsterDrop) && (
              <div className="bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary space-y-1.5">
                <p className="text-sm themed-text-disabled font-medium">{ts('items.acquisition')}</p>
                {acquisition.shop && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">{ts('items.shopTag')}</span>
                    <span className="text-[13px] themed-text-secondary">{
                      { Pierre: ts('items.pierreShop'), JojaMart: ts('items.jojaShop'), FishShop: ts('items.willyShop'), Blacksmith: ts('items.clintShop'), AdventureShop: ts('items.adventurerShop'), Carpenter: ts('items.robinShop'), AnimalShop: ts('items.marnieShop'), TravelingMerchant: ts('items.merchantShop'), Dresser: ts('items.dresserShop'), QiShop: ts('items.qiShop') }[acquisition.shop.shopId] || acquisition.shop.shopId
                    }</span>
                  </div>
                )}
                {acquisition.recipe && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">{acquisition.recipe.type === 'cooking' ? ts('items.cookingTag') : ts('items.craftingTag')}</span>
                    <span className="text-[13px] themed-text-secondary">{acquisition.recipe.ingredients.length}{ts('items.materialsCount')} → {acquisition.recipe.yieldCount}{ts('items.yieldTo')}</span>
                  </div>
                )}
                {acquisition.monsterDrop && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">{ts('items.dropTag')}</span>
                    <span className="text-[13px] themed-text-secondary">{acquisition.monsterDrop.monsterName} ({(acquisition.monsterDrop.chance * 100).toFixed(0)}%)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <UnsavedChangesGuard dirty={dirty} />
    </div>
  )
}

/** 从旧数据推断 dataType */
function inferDataType(item?: CustomItem): ItemDataType {
  if (!item) return 'object'
  if (item.dataType) return item.dataType
  const cat = String(item.category ?? item.type ?? '').toLowerCase()
  if (cat === 'weapons' || cat === 'weapon') return 'weapon'
  if (cat === 'boots' || cat === 'boot') return 'boots'
  if (cat === 'hat' || cat === 'hats') return 'hat'
  if (cat === 'ring' || cat === 'rings') return 'ring'
  if (cat === 'bigcraftable' || cat === 'bigcraftables') return 'bigcraftable'
  if (cat === 'clothing') return 'clothing'
  if (cat === 'furniture') return 'furniture'
  return 'object'
}

// ===== 通用组件 =====
function F({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return <div><label className="text-[13px] themed-text-disabled block mb-0.5">{label}</label>{children}</div>
}

function Toggle({ label, value, onChange, onDirty }: { label: string; value: boolean; onChange: (v: boolean) => void; onDirty?: () => void }): JSX.Element {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-base themed-text-secondary">{label}</span>
      <button onClick={() => { onChange(!value); onDirty?.() }} className={`w-9 h-5 rounded-full transition-colors relative ${value ? 'bg-white/30' : 'bg-[#333]'}`}>
        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${value ? 'left-4' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <h3 className="text-base font-semibold themed-text-secondary mb-2 flex items-center gap-1.5">
        <span className="themed-text-disabled">{icon}</span>{title}
      </h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function PreviewRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }): JSX.Element {
  return (
    <div className="bg-[#1e1e1e] rounded-xl p-3 border themed-border-secondary flex items-center justify-between">
      <span className="text-[13px] themed-text-muted">{label}</span>
      <span className={`text-base font-medium ${valueColor || 'themed-text-secondary'}`}>{value}</span>
    </div>
  )
}

// 数值输入：允许清空（不强制 0），focus 期间不被外部值重写，blur 时再同步
function NumberInput({ value, onChange, className, min, max, step, placeholder, emptyValue = 0 }: {
  value: number
  onChange: (n: number) => void
  className?: string
  min?: number
  max?: number
  step?: number
  placeholder?: string
  emptyValue?: number
}): JSX.Element {
  const [str, setStr] = useState(String(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setStr(String(value))
  }, [value, focused])
  return (
    <input
      type="number"
      value={str}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={e => {
        const v = e.target.value
        setStr(v)
        if (v === '') {
          onChange(emptyValue)
        } else {
          const n = Number(v)
          if (!isNaN(n)) onChange(n)
        }
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setStr(String(value)) }}
      className={className}
    />
  )
}

// ====== 怪物选择器 (可搜索下拉) ======
function MonsterPicker({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  // 关闭弹层 (点击外部)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setKeyword('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = useMemo(() => searchMonsters(keyword).slice(0, 60), [keyword])
  const currentMonster = useMemo(() => monsters.find(m => m.name === value), [value])

  // 按地区分组
  const grouped = useMemo(() => {
    const groups: Record<string, MonsterInfo[]> = {}
    for (const m of filtered) {
      if (!groups[m.location]) groups[m.location] = []
      groups[m.location].push(m)
    }
    return groups
  }, [filtered])

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between gap-3 text-left w-full"
      >
        <span className="flex-1 truncate">
          {currentMonster ? (
            <>
              <span className="themed-text-primary">{currentMonster.displayName}</span>
              <span className="themed-text-disabled ml-1.5 text-[13px]">({currentMonster.name})</span>
            </>
          ) : value ? (
            <span className="themed-text-primary">{value}</span>
          ) : (
            <span className="themed-text-muted">{ts('items.monsterNamePlaceholder')}</span>
          )}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`themed-text-disabled transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-72 rounded-lg border themed-border-secondary bg-[#1a1a1a] shadow-2xl overflow-hidden flex flex-col">
          {/* 搜索框 */}
          <div className="p-2 border-b themed-border-secondary">
            <div className="relative">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="absolute left-2 top-1/2 -translate-y-1/2 themed-text-disabled">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                autoFocus
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder={ts('items.monsterSearchPlaceholder')}
                className="input w-full pl-7 text-base py-1.5"
              />
            </div>
          </div>

          {/* 列表 */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-base themed-text-muted">
                无匹配项 — <button className="text-blue-400 hover:underline"
                  onClick={() => { onChange(keyword.trim()); setOpen(false); setKeyword('') }}>
                  使用 "{keyword}"
                </button>
              </div>
            ) : (
              Object.entries(grouped).map(([loc, list]) => {
                const locInfo = monsterLocationLabels[loc as MonsterInfo['location']]
                return (
                  <div key={loc}>
                    <div className="px-3 py-1.5 text-sm themed-text-disabled sticky top-0 bg-[#1a1a1a] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: locInfo?.color || '#666' }} />
                      {locInfo?.label || loc} <span className="themed-text-disabled">· {list.length}</span>
                    </div>
                    {list.map(m => (
                      <button key={m.name} type="button"
                        onClick={() => { onChange(m.name); setOpen(false); setKeyword('') }}
                        className={`w-full px-3 py-1.5 flex items-center justify-between gap-3 text-left text-base hover:bg-white/5 transition-colors ${value === m.name ? 'bg-white/10' : ''}`}>
                        <span className="flex-1 truncate">
                          <span className="themed-text-primary">{m.displayName}</span>
                          <span className="themed-text-disabled ml-1.5 text-sm">{m.name}</span>
                        </span>
                        {value === m.name && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400 flex-shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ====== 购买条件构建器 ======
type CondType = 'season' | 'dayOfWeek' | 'weather' | 'hearts' | 'skill' | 'year' | 'mail' | 'player' | 'random' | 'custom'

interface CondItem {
  id: string
  type: CondType
  /** 季节(逗号分隔多选): "Spring,Summer" */
  seasons?: string
  /** 星期(逗号分隔多选): "Mon,Tue" */
  days?: string
  /** 天气: "Rain" | "Sun" */
  weather?: string
  /** 好感度数字 */
  hearts?: number
  /** 技能类型 */
  skill?: 'Farming' | 'Mining' | 'Combat' | 'Foraging' | 'Fishing' | 'Luck'
  /** 技能等级 */
  skillLevel?: number
  /** 年份(2 / 3) */
  year?: number
  /** 邮件 ID */
  mail?: string
  /** 玩家性别 */
  player?: 'Male' | 'Female'
  /** 随机概率(0-1) */
  random?: number
  /** 自定义文本 */
  custom?: string
}

// 把单个 CondItem 渲染成游戏可识别的 condition 字符串
function condItemToString(c: CondItem, t: (k: string) => string): string {
  switch (c.type) {
    case 'season': {
      const list = (c.seasons || '').split(',').filter(Boolean)
      if (list.length === 0) return ''
      return list.map(s => `SEASON ${s}`).join('/')
    }
    case 'dayOfWeek': {
      const list = (c.days || '').split(',').filter(Boolean)
      if (list.length === 0) return ''
      return list.map(d => `DAY_OF_WEEK ${d}`).join('/')
    }
    case 'weather':
      if (!c.weather) return ''
      return `WEATHER ${c.weather}`
    case 'hearts':
      return `HEARTS ${c.hearts ?? 0}`
    case 'skill':
      return `${c.skill} Level ${c.skillLevel ?? 0}`
    case 'year':
      return `YEAR ${c.year ?? 2}`
    case 'mail':
      return `MAIL ${c.mail || ''}`
    case 'player':
      return `PLAYER ${c.player || 'Male'}`
    case 'random':
      return `RANDOM ${c.random ?? 0.1}`
    case 'custom':
      return c.custom || ''
    default:
      return ''
  }
}

// 把现有的 condition 字符串解析成 CondItem[]
// 已存在的字符串(比如用户手动输入的复杂表达式)不解析,直接作为 custom 放入
function parseConditionString(str: string): CondItem[] {
  if (!str.trim()) return []
  // 简单解析: 以 / 分隔的所有片段
  const parts = str.split('/').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return []

  // 尝试按类型归组
  const seasons: string[] = []
  const days: string[] = []
  let weather: string | undefined
  let hearts: number | undefined
  let skill: CondItem['skill'] | undefined
  let skillLevel: number | undefined
  let year: number | undefined
  let mail: string | undefined
  let player: 'Male' | 'Female' | undefined
  let random: number | undefined
  const customs: string[] = []

  for (const p of parts) {
    const upper = p.toUpperCase()
    if (upper.startsWith('SEASON ')) {
      seasons.push(p.substring(8).trim())
    } else if (upper.startsWith('DAY_OF_WEEK ')) {
      days.push(p.substring(13).trim())
    } else if (upper.startsWith('WEATHER ')) {
      weather = p.substring(8).trim()
    } else if (upper.startsWith('HEARTS ')) {
      hearts = Number(p.substring(7).trim()) || 0
    } else if (upper.startsWith('YEAR ')) {
      year = Number(p.substring(5).trim()) || 2
    } else if (upper.startsWith('MAIL ')) {
      mail = p.substring(5).trim()
    } else if (upper.startsWith('PLAYER ')) {
      const v = p.substring(7).trim()
      if (v === 'Male' || v === 'Female') player = v
    } else if (upper.startsWith('RANDOM ')) {
      random = Number(p.substring(7).trim()) || 0.1
    } else if (/^(FARMING|MINING|COMBAT|FORAGING|FISHING|LUCK)\s+Level\s+\d+/i.test(p)) {
      const m = p.match(/^(\w+)\s+Level\s+(\d+)/i)
      if (m) {
        skill = m[1] as CondItem['skill']
        skillLevel = Number(m[2])
      }
    } else {
      customs.push(p)
    }
  }

  const items: CondItem[] = []
  let i = 0
  if (seasons.length) items.push({ id: `c${i++}`, type: 'season', seasons: seasons.join(',') })
  if (days.length) items.push({ id: `c${i++}`, type: 'dayOfWeek', days: days.join(',') })
  if (weather) items.push({ id: `c${i++}`, type: 'weather', weather })
  if (hearts !== undefined) items.push({ id: `c${i++}`, type: 'hearts', hearts })
  if (skill && skillLevel !== undefined) items.push({ id: `c${i++}`, type: 'skill', skill, skillLevel })
  if (year !== undefined) items.push({ id: `c${i++}`, type: 'year', year })
  if (mail) items.push({ id: `c${i++}`, type: 'mail', mail })
  if (player) items.push({ id: `c${i++}`, type: 'player', player })
  if (random !== undefined) items.push({ id: `c${i++}`, type: 'random', random })
  for (const c of customs) items.push({ id: `c${i++}`, type: 'custom', custom: c })

  return items
}

function ConditionBuilder({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)

  const [mode, setMode] = useState<'builder' | 'manual'>('builder')
  const [items, setItems] = useState<CondItem[]>(() => parseConditionString(value))

  // 记录上一次主动 emit 的字符串,避免双向同步死循环
  const lastEmittedRef = useRef<string>(value)

  // 外部 value 真正变化时(不是来自本组件 emit)重新解析
  useEffect(() => {
    if (value === lastEmittedRef.current) return
    setItems(parseConditionString(value))
    lastEmittedRef.current = value
  }, [value])

  // items 变化时,把它拼成字符串并抛出去
  useEffect(() => {
    if (mode !== 'builder') return
    const str = items.map(c => condItemToString(c, ts)).filter(Boolean).join('/')
    if (str !== value) {
      lastEmittedRef.current = str
      onChange(str)
    }
    // 这里不依赖 value,避免死循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, mode])

  const addItem = (type: CondType) => {
    const id = `c${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const defaults: Record<CondType, CondItem> = {
      season: { id, type: 'season', seasons: 'Spring' },
      dayOfWeek: { id, type: 'dayOfWeek', days: 'Mon' },
      weather: { id, type: 'weather', weather: 'Rain' },
      hearts: { id, type: 'hearts', hearts: 4 },
      skill: { id, type: 'skill', skill: 'Mining', skillLevel: 1 },
      year: { id, type: 'year', year: 2 },
      mail: { id, type: 'mail', mail: '...' },
      player: { id, type: 'player', player: 'Male' },
      random: { id, type: 'random', random: 0.1 },
      custom: { id, type: 'custom', custom: '' },
    }
    setItems(prev => [...prev, defaults[type]])
  }

  const updateItem = (id: string, patch: Partial<CondItem>) => {
    setItems(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(c => c.id !== id))
  }
  const clearAll = () => {
    setItems([])
    lastEmittedRef.current = ''
    onChange('')
  }

  return (
    <div className="space-y-2">
      {/* 模式切换 */}
      <div className="flex items-center justify-between">
        <span className="text-sm themed-text-disabled">
          {mode === 'builder' ? ts('items.buyConditionBuilder') : ts('items.buyConditionManual')}
        </span>
        <button
          type="button"
          onClick={() => setMode(m => m === 'builder' ? 'manual' : 'builder')}
          className="text-sm themed-text-muted hover:themed-text-primary underline"
        >
          {mode === 'builder' ? ts('items.buyConditionManualSwitch') : ts('items.buyConditionBuilderSwitch')}
        </button>
      </div>

      {mode === 'manual' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="SEASON Spring, Summer/DAY_OF_WEEK Mon"
          rows={2}
          className="input resize-none text-[13px] font-mono"
        />
      ) : (
        <>
          {/* 当前条件 pills */}
          {items.length === 0 ? (
            <div className="py-2 px-3 rounded-lg border border-dashed themed-border-active text-[13px] themed-text-muted text-center">
              {ts('items.buyConditionEmpty')}
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map(c => (
                <div key={c.id} className="rounded-lg border themed-border-secondary bg-[#1a1a1a] p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm themed-text-disabled uppercase tracking-wide">{ts(`items.cond${c.type[0].toUpperCase()}${c.type.slice(1)}` as any) || c.type}</span>
                    <button onClick={() => removeItem(c.id)} className="text-red-400/60 hover:text-red-400">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {/* 条件配置 UI */}
                  {c.type === 'season' && (
                    <div className="flex flex-wrap gap-1">
                      {['Spring', 'Summer', 'Fall', 'Winter'].map(s => {
                        const selected = (c.seasons || '').split(',').includes(s)
                        return (
                          <button key={s} type="button"
                            onClick={() => {
                              const list = (c.seasons || '').split(',').filter(Boolean)
                              const next = selected ? list.filter(x => x !== s) : [...list, s]
                              updateItem(c.id, { seasons: next.join(',') })
                            }}
                            className={`text-[13px] px-2 py-0.5 rounded-full transition-colors ${selected
                              ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                              : 'themed-text-muted border themed-border-secondary hover:themed-text-primary'}`}>
                            {ts(`items.cond${s}` as any) || s}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {c.type === 'dayOfWeek' && (
                    <div className="flex flex-wrap gap-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => {
                        const selected = (c.days || '').split(',').includes(d)
                        return (
                          <button key={d} type="button"
                            onClick={() => {
                              const list = (c.days || '').split(',').filter(Boolean)
                              const next = selected ? list.filter(x => x !== d) : [...list, d]
                              updateItem(c.id, { days: next.join(',') })
                            }}
                            className={`text-[13px] px-2 py-0.5 rounded-full transition-colors ${selected
                              ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                              : 'themed-text-muted border themed-border-secondary hover:themed-text-primary'}`}>
                            {ts(`items.cond${d}` as any) || d}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {c.type === 'weather' && (
                    <div className="flex gap-1">
                      {[{ v: 'Rain', l: ts('items.condRain') }, { v: 'Sun', l: ts('items.condSunny') }].map(opt => (
                        <button key={opt.v} type="button"
                          onClick={() => updateItem(c.id, { weather: opt.v })}
                          className={`flex-1 text-[13px] py-1 rounded-md transition-colors ${c.weather === opt.v
                            ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                            : 'themed-text-muted border themed-border-secondary hover:themed-text-primary'}`}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  )}

                  {c.type === 'hearts' && (
                    <div className="flex items-center gap-3">
                      <input type="range" min={0} max={14} value={c.hearts ?? 0}
                        onChange={e => updateItem(c.id, { hearts: Number(e.target.value) })}
                        className="flex-1 h-1.5 rounded-full appearance-none bg-[#333] accent-pink-400" />
                      <span className="text-[13px] themed-text-primary w-6 text-right">{c.hearts ?? 0}</span>
                    </div>
                  )}

                  {c.type === 'skill' && (
                    <div className="space-y-1.5">
                      <select value={c.skill || 'Farming'} onChange={e => updateItem(c.id, { skill: e.target.value as CondItem['skill'] })}
                        className="input text-[13px] py-1">
                        {(['Farming', 'Mining', 'Combat', 'Foraging', 'Fishing', 'Luck'] as const).map(s => (
                          <option key={s} value={s}>{ts(`items.condSkill${s}` as any) || s}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-3">
                        <input type="range" min={0} max={10} value={c.skillLevel ?? 0}
                          onChange={e => updateItem(c.id, { skillLevel: Number(e.target.value) })}
                          className="flex-1 h-1.5 rounded-full appearance-none bg-[#333] accent-emerald-400" />
                        <span className="text-[13px] themed-text-primary w-6 text-right">Lv{c.skillLevel ?? 0}</span>
                      </div>
                    </div>
                  )}

                  {c.type === 'year' && (
                    <div className="flex gap-1">
                      {[2, 3].map(y => (
                        <button key={y} type="button"
                          onClick={() => updateItem(c.id, { year: y })}
                          className={`flex-1 text-[13px] py-1 rounded-md transition-colors ${c.year === y
                            ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                            : 'themed-text-muted border themed-border-secondary hover:themed-text-primary'}`}>
                          {y === 2 ? ts('items.condYear2') : ts('items.condYear3')}
                        </button>
                      ))}
                    </div>
                  )}

                  {c.type === 'mail' && (
                    <input type="text" value={c.mail || ''}
                      onChange={e => updateItem(c.id, { mail: e.target.value })}
                      placeholder="如: ccVault, willyYear1Finished"
                      className="input text-[13px] py-1 font-mono" />
                  )}

                  {c.type === 'player' && (
                    <div className="flex gap-1">
                      {[{ v: 'Male', l: ts('items.condMale') }, { v: 'Female', l: ts('items.condFemale') }].map(opt => (
                        <button key={opt.v} type="button"
                          onClick={() => updateItem(c.id, { player: opt.v as 'Male' | 'Female' })}
                          className={`flex-1 text-[13px] py-1 rounded-md transition-colors ${c.player === opt.v
                            ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                            : 'themed-text-muted border themed-border-secondary hover:themed-text-primary'}`}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  )}

                  {c.type === 'random' && (
                    <div className="flex items-center gap-3">
                      <input type="range" min={0.01} max={1} step={0.01} value={c.random ?? 0.1}
                        onChange={e => updateItem(c.id, { random: Number(e.target.value) })}
                        className="flex-1 h-1.5 rounded-full appearance-none bg-[#333] accent-yellow-400" />
                      <span className="text-[13px] themed-text-primary w-10 text-right">{Math.round((c.random ?? 0.1) * 100)}%</span>
                    </div>
                  )}

                  {c.type === 'custom' && (
                    <input type="text" value={c.custom || ''}
                      onChange={e => updateItem(c.id, { custom: e.target.value })}
                      placeholder="如: f Pierre 1000"
                      className="input text-[13px] py-1 font-mono" />
                  )}
                </div>
              ))}
              {items.length > 0 && (
                <button onClick={clearAll} type="button"
                  className="w-full text-[13px] py-1 rounded-md themed-text-muted hover:text-red-400 transition-colors">
                  {ts('items.buyConditionClear')}
                </button>
              )}
            </div>
          )}

          {/* 快速添加 */}
          <div className="pt-1">
            <p className="text-sm themed-text-disabled mb-1">{ts('items.buyConditionAdd')}</p>
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={() => addItem('season')}
                className="text-[13px] px-2 py-0.5 rounded-full themed-text-muted border themed-border-secondary hover:themed-text-primary hover:border-amber-500/50 transition-colors">
                {ts('items.buyConditionAddSeason')}
              </button>
              <button type="button" onClick={() => addItem('dayOfWeek')}
                className="text-[13px] px-2 py-0.5 rounded-full themed-text-muted border themed-border-secondary hover:themed-text-primary hover:border-amber-500/50 transition-colors">
                {ts('items.buyConditionAddDay')}
              </button>
              <button type="button" onClick={() => addItem('weather')}
                className="text-[13px] px-2 py-0.5 rounded-full themed-text-muted border themed-border-secondary hover:themed-text-primary hover:border-amber-500/50 transition-colors">
                {ts('items.buyConditionAddWeather')}
              </button>
              <button type="button" onClick={() => addItem('hearts')}
                className="text-[13px] px-2 py-0.5 rounded-full themed-text-muted border themed-border-secondary hover:themed-text-primary hover:border-amber-500/50 transition-colors">
                {ts('items.buyConditionAddHeart')}
              </button>
              <button type="button" onClick={() => addItem('skill')}
                className="text-[13px] px-2 py-0.5 rounded-full themed-text-muted border themed-border-secondary hover:themed-text-primary hover:border-amber-500/50 transition-colors">
                {ts('items.buyConditionAddSkill')}
              </button>
              <button type="button" onClick={() => addItem('year')}
                className="text-[13px] px-2 py-0.5 rounded-full themed-text-muted border themed-border-secondary hover:themed-text-primary hover:border-amber-500/50 transition-colors">
                {ts('items.buyConditionAddYear')}
              </button>
              <button type="button" onClick={() => addItem('mail')}
                className="text-[13px] px-2 py-0.5 rounded-full themed-text-muted border themed-border-secondary hover:themed-text-primary hover:border-amber-500/50 transition-colors">
                {ts('items.buyConditionAddMail')}
              </button>
              <button type="button" onClick={() => addItem('player')}
                className="text-[13px] px-2 py-0.5 rounded-full themed-text-muted border themed-border-secondary hover:themed-text-primary hover:border-amber-500/50 transition-colors">
                {ts('items.buyConditionAddPlayer')}
              </button>
              <button type="button" onClick={() => addItem('random')}
                className="text-[13px] px-2 py-0.5 rounded-full themed-text-muted border themed-border-secondary hover:themed-text-primary hover:border-amber-500/50 transition-colors">
                {ts('items.buyConditionAddRandom')}
              </button>
              <button type="button" onClick={() => addItem('custom')}
                className="text-[13px] px-2 py-0.5 rounded-full themed-text-muted border themed-border-secondary hover:themed-text-primary hover:border-amber-500/50 transition-colors">
                {ts('items.buyConditionAddCustom')}
              </button>
            </div>
          </div>

          {/* 生成结果预览 */}
          {items.length > 0 && (
            <div className="pt-1">
              <p className="text-sm themed-text-disabled mb-0.5">{ts('items.buyConditionPreview')}</p>
              <div className="px-2 py-1.5 rounded-md bg-[#0a0a0a] border themed-border-secondary">
                <code className="text-[13px] font-mono text-emerald-300 break-all">
                  {items.map(c => condItemToString(c, ts)).filter(Boolean).join(' / ') || '(空)'}
                </code>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
