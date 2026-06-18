// ---- 导出工具 ----
// 生成符合 Content Patcher 规范的模组文件

import type { ProjectSnapshot } from './ProjectContext'
import { buildEventScript as buildEventScriptShared } from './eventData'

// NPC 场景后缀映射（和 npcData.sceneTypes 完全对齐）
const NPC_SCENE_SUFFIXES: Record<number, string> = {
  0: '', 1: '_Beach', 2: '_Winter', 3: '_Spring', 4: '_Summer', 5: '_Fall',
  6: '_FlowerDance', 7: '_EggF', 8: '_Fair', 9: '_Jellies', 10: '_Luau',
  11: '_SpiritsEve', 12: '_WinterStar', 13: '_IceF', 14: '_Winter_Indoor',
  15: '_Winter_Outdoor', 16: '_Hospital', 17: '_JojaMart', 18: '_Trenchcoat',
}

export interface ExportConfig {
  modName: string
  author: string
  version: string
  description: string
}

interface ExportStats {
  npcCount: number
  portraitCount: number
  spriteCount: number
  eventCount: number
  itemCount: number
  mapCount: number
  questCount: number
  npcDataCount: number
  mailCount: number
}

export function calcStats(snap: ProjectSnapshot): ExportStats {
  const customNpcCount = Array.isArray(snap.customNpcs) ? snap.customNpcs.length : 0
  const npcAssetCount = Object.keys(snap.npcAssets || {}).length
  const vanillaOverrideCount = Object.keys(snap.vanillaNpcOverrides || {}).length
  // 去重：npcAssets 和 customNpcs 可能有重叠，加上 vanillaNpcOverrides
  const customNpcIds = new Set(snap.customNpcs?.map((n: any) => n.id || n.name).filter(Boolean) || [])
  const assetIds = new Set(Object.keys(snap.npcAssets || {}))
  const allNpcIds = new Set([...customNpcIds, ...assetIds, ...Object.keys(snap.vanillaNpcOverrides || {})])
  return {
    npcCount: allNpcIds.size,
    portraitCount: Object.values(snap.npcAssets || {}).reduce((s, a) => s + Object.keys(a.portraits || {}).length, 0),
    spriteCount: Object.values(snap.npcAssets || {}).reduce((s, a) => s + Object.keys(a.sprites || {}).length, 0),
    eventCount: Array.isArray(snap.events) ? snap.events.length : 0,
    itemCount: Array.isArray(snap.customItems) ? snap.customItems.length : 0,
    mapCount: Array.isArray(snap.maps) ? snap.maps.length : 0,
    questCount: Array.isArray(snap.quests) ? snap.quests.length : 0,
    npcDataCount: customNpcCount,
    mailCount: Array.isArray(snap.mails) ? snap.mails.length : 0,
  }
}

// ---- 生成 manifest.json ----
function generateManifest(cfg: ExportConfig): Record<string, unknown> {
  const author = (cfg.author || 'user').replace(/[^a-zA-Z0-9_.]/g, '') || 'user'
  const modName = (cfg.modName || 'MyMod').replace(/[^a-zA-Z0-9]/g, '') || 'MyMod'
  const safeId = `${author}.${modName}`
  return {
    Name: cfg.modName || 'My Stardew Mod',
    Author: cfg.author || 'Author',
    Version: cfg.version || '1.0.0',
    Description: cfg.description || 'Created with 饭团工坊',
    UniqueID: safeId,
    UpdateKeys: [],
    ContentPackFor: {
      UniqueID: 'Pathoschild.ContentPatcher',
      MinimumVersion: '2.0.0'
    }
  }
}

// ---- 生成 content.json ----
function generateContent(snap: ProjectSnapshot, config?: ExportConfig): {
  content: Record<string, unknown>
  extraFiles: Array<{ path: string; data: string }>
} {
  const changes: Record<string, unknown>[] = []
  const extraFiles: Array<{ path: string; data: string }> = []

  // 计算真实的 UniqueID（与 manifest.json 一致）
  // 文件保存时使用真实 ID，但 content.json 中保留 {{ModId}} 占位符以保持可移植性
  const author = (config?.author || 'user').replace(/[^a-zA-Z0-9_.]/g, '') || 'user'
  const modName = (config?.modName || 'MyMod').replace(/[^a-zA-Z0-9]/g, '') || 'MyMod'
  const safeId = `${author}.${modName}`
  // 工具函数：把 {{ModId}} 替换为真实 UniqueID（用于文件路径/JSON 内容 key）
  const resolveModId = (s: string): string => s.replace(/\{\{ModId\}\}/g, safeId)

  // 预收集自定义NPC名称和ID集合（用于后续判断是否需要在事件中加 {{ModId}}_ 前缀）
  const customNpcNames = new Set<string>()
  const customNpcIds = new Set<string>()
  if (Array.isArray(snap.customNpcs)) {
    snap.customNpcs.forEach((n: any) => {
      if (n.name) customNpcNames.add(n.name)
      if (n.id) customNpcIds.add(n.id)
    })
  }
  // 预收集自定义地图名集合（用于判断NPC homeLocation是否需加 {{ModId}}_ 前缀）
  const customMapNames = new Set<string>()
  if (Array.isArray(snap.customMaps)) {
    snap.customMaps.forEach((cmap: any) => {
      const shortName = (cmap.mapName as string) || ''
      if (shortName) customMapNames.add(shortName)
    })
  }

  // ======== NPC 肖像 ========
  if (snap.npcAssets) {
    // 场景名映射：索引 → 游戏使用的首字母大写后缀（与 NPC_SCENE_SUFFIXES 一致）
    // 星露谷游戏实际使用首字母大写后缀（如 Portraits/Abigail_Beach）
    const sceneSuffixMap: Record<number, string> = NPC_SCENE_SUFFIXES
    Object.entries(snap.npcAssets).forEach(([npcId, assets]) => {
      // 跳过自定义NPC：自定义NPC的肖像 Load 在 customNpcs 循环中统一生成，避免重复
      if (customNpcNames.has(npcId) || customNpcIds.has(npcId)) return

      const portraitKeys = Object.keys(assets.portraits || {})
      if (portraitKeys.length > 0) {
        // 去重：同一个场景只生成一条 Load（合并所有帧到一张图）
        const addedScenes = new Set<string>()
        portraitKeys.forEach((key) => {
          const [sceneIdx] = key.split('_')
          const sceneIdxNum = Number(sceneIdx)
          const suffix = sceneSuffixMap[sceneIdxNum] ?? ''
          const sceneKey = String(sceneIdxNum)
          if (addedScenes.has(sceneKey)) return
          addedScenes.add(sceneKey)

          // 使用首字母大写后缀（与游戏实际路径一致）
          const target = `Portraits/${npcId}${suffix}`
          const fromFile = `assets/portraits/${npcId}${suffix}.png`
          changes.push({
            LogName: `肖像: ${npcId} ${suffix || 'default'}`,
            Action: 'Load',
            Target: target,
            FromFile: fromFile
          })
        })
      }
    })
  }

  // ======== NPC 行走图 ========
  if (snap.npcAssets) {
    // 复用前面收集的自定义NPC集合（作用域问题，重新收集）
    const customNpcNames = new Set<string>()
    Object.entries(snap.npcAssets).forEach(([npcId, assets]) => {
      // 跳过自定义NPC：自定义NPC的行走图 Load 在 customNpcs 循环中统一生成，避免重复
      if (customNpcNames.has(npcId) || customNpcIds.has(npcId)) return

      const spriteKeys = Object.keys(assets.sprites || {})
      if (spriteKeys.length > 0) {
        // 去重：同一个 NPC 只需要一条 Load 替换整个行走图
        const addedSprites = new Set<string>()
        spriteKeys.forEach((key) => {
          if (addedSprites.has(npcId)) return
          addedSprites.add(npcId)
          changes.push({
            LogName: `行走图: ${npcId}`,
            Action: 'Load',
            Target: `Characters/${npcId}`,
            FromFile: `assets/sprites/${npcId}.png`
          })
        })
      }
    })
  }

  // ======== 自定义物品贴图 Load 条目 ========
  const modNameSafe = (config?.modName || 'MyMod').replace(/[<>:"/\\|?*]/g, '_')
  if (Array.isArray(snap.customItems)) {
    snap.customItems.forEach((item: unknown) => {
      const it = item as Record<string, unknown>
      const itemId = (it.id as string) || ''
      const imageUrl = (it.imageUrl as string) || ''
      if (!itemId || !imageUrl.startsWith('data:')) return

      // 使用 Mods/{{ModId}} 格式注册游戏内部资源名，Content Patcher 运行时自动替换为模组 UniqueID
      changes.push({
        LogName: `物品贴图: ${itemId}`,
        Action: 'Load',
        Target: `Mods/{{ModId}}/assets/items/${itemId}`,
        FromFile: `assets/items/${itemId}.png`
      })
    })
  }

  // ======== 自定义物品 (按类型分文件) ========
  if (Array.isArray(snap.customItems) && snap.customItems.length > 0) {
    // 按 dataType 分组
    const objectEntries: Record<string, unknown> = {}
    const weaponEntries: Record<string, Record<string, unknown>> = {}
    const bootsEntries: Record<string, string> = {}
    const hatEntries: Record<string, string> = {}
    const bigCraftableEntries: Record<string, unknown> = {}
    const clothingEntries: Record<string, unknown> = {}
    const furnitureEntries: Record<string, unknown> = {}
    const fishEntries: Record<string, unknown> = {}

    snap.customItems.forEach((item: unknown) => {
      const it = item as Record<string, unknown>
      const rawId = (it.id as string) || `custom_${Date.now()}`
      const dataType = (it.dataType as string) || 'object'
      const name = (it.name as string) || (it.displayName as string) || '未命名物品'
      const displayName = (it.displayName as string) || name
      const description = (it.description as string) || ''
      const price = (it.price as number) || 0
      const hasCustomTexture = !!(it.imageUrl as string)?.startsWith('data:')
      // 使用 Mods/{{ModId}} 格式作为自定义贴图路径（与 Load Target 一致）
      const customTexturePath = hasCustomTexture ? `Mods/{{ModId}}/assets/items/${rawId}` : ''
      // 物品 ID 使用 {{ModId}}_ 前缀，符合 CP 官方最佳实践，避免与其他模组冲突
      const objId = `{{ModId}}_${rawId}`

      switch (dataType) {
        case 'ring': {
          // 戒指 → Data/Objects — JSON model 格式，但强制设置 Ring 类别和类型
          // 星露谷中戒指属于 Data/Objects，Category=-96, Type='Ring'
          const entry: Record<string, unknown> = {
            Name: objId,
            DisplayName: displayName,
            Description: description,
            Type: 'Ring',
            Category: -96,  // 戒指类别
            Price: price,
            Texture: hasCustomTexture ? customTexturePath : 'Maps/springobjects',
            SpriteIndex: 0,
            Edibility: -300,  // 戒指不可食用
            CanBeGivenAsGift: true,
            CanBeTrashed: true,
          }

          // 上下文标签
          const ctxTags = it.contextTags as string[] | undefined
          if (ctxTags && ctxTags.length > 0) {
            entry.ContextTags = ctxTags
          }

          // 排除随机商店出售
          if (it.excludeFromRandomSale) {
            entry.ExcludeFromRandomSale = true
          }

          objectEntries[objId] = entry
          break
        }
        case 'weapon': {
          // Data/Weapons — JSON model 格式
          // 数值 clamp 到 int32 安全范围，防止 CP 转换失败
          const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
          const mineBase = (it.mineBaseLevel as number) ?? -1
          const mineMin = (it.mineMinLevel as number) ?? -1
          weaponEntries[objId] = {
            Name: objId,
            DisplayName: displayName,
            Description: description,
            Type: (it.weaponType as number) ?? 3,
            MinDamage: clamp((it.minDamage as number) ?? 1, 0, 9999),
            MaxDamage: clamp((it.maxDamage as number) ?? 5, 0, 9999),
            Knockback: (it.knockback as number) ?? 1,
            Speed: (it.speed as number) ?? 0,
            Precision: clamp((it.precision as number) ?? 0, 0, 9999),
            Defense: clamp((it.defense as number) ?? 0, 0, 9999),
            AreaOfEffect: clamp((it.areaOfEffect as number) ?? 0, 0, 9999),
            CritChance: (it.critChance as number) ?? 0.02,
            CritMultiplier: (it.critMultiplier as number) ?? 3,
            CanBeLostOnDeath: (it.canBeLostOnDeath as boolean) ?? true,
            MineBaseLevel: mineBase,
            MineMinLevel: mineMin,
            Texture: hasCustomTexture ? customTexturePath : 'TileSheets/weapons',
            SpriteIndex: 0,
          }

          // 武器挥动音效
          const swingSound = (it.swingSound as string) || ''
          if (swingSound) {
            weaponEntries[objId].SwingSound = swingSound
          }

          // 武器等级
          const weaponLevel = (it.weaponLevel as number) ?? 0
          if (weaponLevel > 0) {
            weaponEntries[objId].Level = weaponLevel
          }

          // 默认皮肤
          const defaultSkin = (it.defaultSkin as number) ?? 0
          if (defaultSkin > 0) {
            weaponEntries[objId].DefaultSkin = defaultSkin
          }

          // 皮肤动画时长
          const skinDuration = (it.skinDuration as number) ?? 0
          if (skinDuration > 0) {
            weaponEntries[objId].SkinDuration = skinDuration
          }
          break
        }
        case 'boots': {
          // Data/Boots — 斜杠分隔字符串格式
          // Name/Description/Price/Defense/Immunity/ColorIndex/DisplayName/ColorTexture/SpriteIndex/Texture
          const defense = (it.bootsDefense as number) ?? 0
          const immunity = (it.bootsImmunity as number) ?? 0
          const colorIndex = (it.bootsColorIndex as number) ?? 0
          bootsEntries[objId] = [
            objId,          // 0: Name (best practice: match the ID)
            description,    // 1: Description
            price,          // 2: Price (unused, calculated from defense+immunity)
            defense,        // 3: Added Defense
            immunity,       // 4: Added Immunity
            colorIndex,     // 5: Color Index
            displayName,    // 6: Display Name
            '',             // 7: Color Texture (empty = default)
            '0',            // 8: Sprite Index
            hasCustomTexture ? customTexturePath : '',  // 9: Texture (empty = default)
          ].join('/')
          break
        }
        case 'hat': {
          // Data/Hats — 斜杠分隔字符串格式
          // name/description/showRealHair/skipHairstyleOffset/tags/displayName/spriteIndex/textureName
          const showHair = (it.hatShowHair as string) ?? 'false'
          const skipOffset = (it.hatSkipOffset as boolean) ? 'true' : 'false'
          const tags = (it.hatTags as string) ?? ''
          hatEntries[objId] = [
            objId,          // 0: name (best practice: match the ID)
            description,    // 1: description
            showHair,       // 2: show real hair
            skipOffset,     // 3: skip hairstyle offset
            tags,           // 4: tags
            displayName,    // 5: display name
            '0',            // 6: sprite index
            hasCustomTexture ? customTexturePath : '',  // 7: texture name (empty = default)
          ].join('/')
          break
        }
        case 'bigcraftable': {
          // Data/BigCraftables — JSON model 格式
          bigCraftableEntries[objId] = {
            Name: objId,
            DisplayName: displayName,
            Description: description,
            Price: price,
            Fragility: (it.bcFragility as number) ?? 0,
            CanBePlacedIndoors: (it.bcCanBePlacedIndoors as boolean) ?? true,
            CanBePlacedOutdoors: (it.bcCanBePlacedOutdoors as boolean) ?? false,
            IsLamp: (it.bcIsLamp as boolean) ?? false,
            Texture: hasCustomTexture ? customTexturePath : 'TileSheets/Craftables',
            SpriteIndex: (it.bcSpriteIndex as number) ?? 0,
          }
          break
        }
        case 'clothing': {
          // Data/Clothing — JSON model 格式
          clothingEntries[objId] = {
            Name: objId,
            DisplayName: displayName,
            Description: description,
            Price: price,
            ClothingType: (it.clothingType as string) ?? 'Shirt',
            Gender: (it.clothingGender as string) ?? 'Neutral',
            Dyeable: (it.clothingDyeable as boolean) ?? false,
            CanBeTrashed: (it.clothingCanBeTrashed as boolean) ?? true,
            CanBeGivenAsGift: (it.clothingCanBeGivenAsGift as boolean) ?? true,
            Texture: hasCustomTexture ? customTexturePath : 'Characters/Farmer/' + ((it.clothingType as string) === 'Pants' ? 'pants' : 'shirts'),
            SpriteIndex: (it.clothingSpriteIndex as number) ?? 0,
          }
          break
        }
        case 'furniture': {
          // Data/Furniture — JSON model 格式
          const fType = (it.furnitureType as string) ?? 'Decor'
          const fEntry: Record<string, unknown> = {
            Name: objId,
            DisplayName: displayName,
            Description: description,
            Type: fType,
            Price: price,
            Size: { X: (it.furnitureSizeX as number) ?? 1, Y: (it.furnitureSizeY as number) ?? 1 },
            Box: { X: (it.furnitureBoxX as number) ?? 0, Y: (it.furnitureBoxY as number) ?? 0, Width: (it.furnitureBoxWidth as number) ?? 1, Height: (it.furnitureBoxHeight as number) ?? 1 },
            Rotations: (it.furnitureRotations as number[]) ?? [0],
            CanBePlacedIndoors: (it.furnitureCanBePlacedIndoors as boolean) ?? true,
            CanBePlacedOutdoors: (it.furnitureCanBePlacedOutdoors as boolean) ?? false,
            CanBeRemoved: (it.furnitureCanBeRemoved as boolean) ?? true,
            IsLamp: (it.furnitureIsLamp as boolean) ?? false,
            Texture: hasCustomTexture ? customTexturePath : 'TileSheets/Furniture',
            SpriteIndex: (it.furnitureSpriteIndex as number) ?? 0,
          }
          if ((it.furnitureIsLamp as boolean)) {
            fEntry.LightRadius = (it.furnitureLightRadius as number) ?? 0
          }
          // 椅子座位
          const seats = it.furnitureSeatPositions as Array<{ X: number; Y: number; Direction: number }> | undefined
          if (fType === 'Chair' && seats && seats.length > 0) {
            fEntry.SeatPositions = seats
          }
          furnitureEntries[objId] = fEntry
          break
        }
        default: {
          // Data/Objects — JSON model 格式 (包括 object 和 ring)
          const entry: Record<string, unknown> = {
            Name: objId,
            DisplayName: displayName,
            Description: description,
            Type: (it.objectType as string) || 'Basic',
            Category: (it.objectCategory as number) ?? 0,
            Price: price,
            Texture: hasCustomTexture ? customTexturePath : 'Maps/springobjects',
            SpriteIndex: 0,
            Edibility: (it.edibility as number) ?? -300,
            CanBeGivenAsGift: (it.canGift as boolean) ?? true,
            CanBeTrashed: (it.canTrash as boolean) ?? true,
          }

          // 食物标记
          if (it.isFood) {
            entry.IsFood = true
          }

          // 饮品标记
          if (it.isDrink) {
            entry.IsDrink = true
          }

          // 可丢弃标记 (默认 true，仅 false 时写入)
          if (it.canBeDropped === false) {
            entry.CanBeDropped = false
          }

          // 特殊/任务物品
          if (it.specialItem) {
            entry.SpecialItem = true
          }

          // 有合成配方
          if (it.hasCraftingRecipe) {
            entry.HasCraftingRecipe = true
          }

          // 可送礼NPC列表
          const giftNpcs = it.giftToNPCs as string[] | undefined
          if (giftNpcs && giftNpcs.length > 0) {
            entry.GiftToNPCs = giftNpcs
          }

          // 排除随机商店出售
          if (it.excludeFromRandomSale) {
            entry.ExcludeFromRandomSale = true
          }

          // Buffs (食物增益)
          const buffs = it.buffs as Array<Record<string, unknown>> | undefined
          if (buffs && buffs.length > 0) {
            entry.Buffs = buffs.map(buff => {
              const buffEntry: Record<string, unknown> = {
                Id: buff.id || `buff_${Date.now()}`,
                Duration: buff.duration ?? 120,
              }
              // 减益标记
              if (buff.isDebuff) {
                buffEntry.IsDebuff = true
              }
              // 发光颜色
              if (buff.glowColor && String(buff.glowColor).trim()) {
                buffEntry.GlowColor = String(buff.glowColor).trim()
              }
              const attrs = buff.attributes as Record<string, number> | undefined
              if (attrs && Object.keys(attrs).some(k => attrs[k] !== 0)) {
                const customAttrs: Record<string, number> = {}
                Object.entries(attrs).forEach(([k, v]) => {
                  if (v !== 0) customAttrs[k] = v
                })
                if (Object.keys(customAttrs).length > 0) {
                  buffEntry.CustomAttributes = customAttrs
                }
              }
              return buffEntry
            })
          }

          // 上下文标签
          const ctxTags = it.contextTags as string[] | undefined
          if (ctxTags && ctxTags.length > 0) {
            entry.ContextTags = ctxTags
          }

          objectEntries[objId] = entry

          // 鱼类数据 — 如果物品有 fish 字段，生成 Data/Fish 条目
          const fishData = it.fish as Record<string, unknown> | undefined
          if (fishData) {
            const fishLocations = (fishData.locations as string[]) || []
            const fishSeasons = (fishData.seasons as string[]) || []
            const fishMinTime = (fishData.minTime as number) ?? 600
            const fishMaxTime = (fishData.maxTime as number) ?? 2600
            const fishWeather = (fishData.weather as string[]) || []
            const fishDifficulty = (fishData.difficulty as number) ?? 50
            const fishMinSize = (fishData.minSize as number) ?? 1
            const fishMaxSize = (fishData.maxSize as number) ?? 30
            const fishBehavior = (fishData.behavior as string) || 'Mixed'

            fishEntries[objId] = {
              DisplayName: displayName,
              Locations: fishLocations.length > 0 ? fishLocations : ['Town'],
              Seasons: fishSeasons.length > 0 ? fishSeasons : ['spring'],
              MinTime: fishMinTime,
              MaxTime: fishMaxTime,
              Weather: fishWeather.length > 0 ? fishWeather : ['sunny', 'rainy'],
              Difficulty: fishDifficulty,
              MinSize: fishMinSize,
              MaxSize: fishMaxSize,
              Behavior: fishBehavior,
            }
          }

          break
        }
      }
    })

    // 按类型分别生成 EditData 条目
    if (Object.keys(objectEntries).length > 0) {
      changes.push({
        LogName: '自定义物品数据',
        Action: 'EditData',
        Target: 'Data/Objects',
        Entries: objectEntries
      })
    }
    if (Object.keys(weaponEntries).length > 0) {
      changes.push({
        LogName: '自定义武器数据',
        Action: 'EditData',
        Target: 'Data/Weapons',
        Entries: weaponEntries
      })
    }
    if (Object.keys(bootsEntries).length > 0) {
      changes.push({
        LogName: '自定义靴子数据',
        Action: 'EditData',
        Target: 'Data/Boots',
        Entries: bootsEntries
      })
    }
    if (Object.keys(hatEntries).length > 0) {
      changes.push({
        LogName: '自定义帽子数据',
        Action: 'EditData',
        Target: 'Data/Hats',
        Entries: hatEntries
      })
    }
    if (Object.keys(bigCraftableEntries).length > 0) {
      changes.push({
        LogName: '自定义大型可制作物品数据',
        Action: 'EditData',
        Target: 'Data/BigCraftables',
        Entries: bigCraftableEntries
      })
    }
    if (Object.keys(clothingEntries).length > 0) {
      changes.push({
        LogName: '自定义服装数据',
        Action: 'EditData',
        Target: 'Data/Clothing',
        Entries: clothingEntries
      })
    }
    if (Object.keys(furnitureEntries).length > 0) {
      changes.push({
        LogName: '自定义家具数据',
        Action: 'EditData',
        Target: 'Data/Furniture',
        Entries: furnitureEntries
      })
    }
    if (Object.keys(fishEntries).length > 0) {
      changes.push({
        LogName: '自定义鱼类数据',
        Action: 'EditData',
        Target: 'Data/Fish',
        Entries: fishEntries
      })
    }

    // ======== 物品获取方式 ========
    // 商店购买 → Data/Shops EditData
    const shopItems: Record<string, Array<{ Id: string; ItemId: string; Condition?: string }>> = {}
    // 合成配方 → Data/CraftingRecipes / Data/CookingRecipes
    const craftingRecipes: Record<string, string> = {}
    const cookingRecipes: Record<string, string> = {}
    // 怪物掉落 → Data/Monsters EditData
    const monsterDrops: Record<string, { ItemsToDrop: string }> = {}

    // 物品类型 → QualifiedItemId 前缀映射
    const typePrefixMap: Record<string, string> = {
      object: '(O)',
      weapon: '(W)',
      boots: '(B)',
      hat: '(H)',
      ring: '(R)',
      bigcraftable: '(BC)',
      clothing: '(C)',
      furniture: '(F)',
    }

    snap.customItems.forEach((item: unknown) => {
      const it = item as Record<string, unknown>
      const rawId = (it.id as string) || ''
      const dataType = (it.dataType as string) || 'object'
      // 物品 ID 使用 {{ModId}}_ 前缀，与 Entries key 保持一致
      const objId = `{{ModId}}_${rawId}`
      const qualifiedId = `${typePrefixMap[dataType] || '(O)'}${objId}`
      const acq = it.acquisition as Record<string, unknown> | undefined
      if (!acq) return

      // 商店购买
      const shop = acq.shop as Record<string, unknown> | undefined
      if (shop) {
        const shopId = (shop.shopId as string) || 'Pierre'
        const condition = shop.condition as string | undefined
        if (!shopItems[shopId]) shopItems[shopId] = []
        shopItems[shopId].push({
          Id: `${modNameSafe}_${rawId}`,
          ItemId: qualifiedId,
          ...(condition ? { Condition: condition } : {})
        })
      }

      // 合成/烹饪配方
      const recipe = acq.recipe as Record<string, unknown> | undefined
      if (recipe) {
        const ingredients = (recipe.ingredients as Array<Record<string, unknown>>) || []
        const yieldCount = (recipe.yieldCount as number) ?? 1
        const unlockCondition = (recipe.unlockCondition as string) || ''
        const time = (recipe.time as number) ?? -1
        // 格式: 材料ID 数量/材料ID 数量/产出物品ID/产出数量/是否默认解锁/合成时间/解锁条件
        const ingredientStr = ingredients.map(ing => `${ing.itemId || '0'} ${ing.quantity || 1}`).join(' ')
        const recipeStr = `${ingredientStr}/${objId}/${yieldCount}/${unlockCondition ? 'false' : 'true'}/${time}/${unlockCondition}`
        if (recipe.type === 'cooking') {
          cookingRecipes[objId] = recipeStr
        } else {
          craftingRecipes[objId] = recipeStr
        }
      }

      // 怪物掉落
      const monsterDrop = acq.monsterDrop as Record<string, unknown> | undefined
      if (monsterDrop) {
        const monsterName = (monsterDrop.monsterName as string) || ''
        const chance = (monsterDrop.chance as number) ?? 0.05
        const minCount = (monsterDrop.minCount as number) ?? 1
        const maxCount = (monsterDrop.maxCount as number) ?? 1
        if (monsterName) {
          // 怪物掉落格式: QualifiedItemId 最小数量 最大数量 掉落概率（需要带类型前缀）
          const dropStr = `${qualifiedId} ${minCount} ${maxCount} ${chance}`
          if (!monsterDrops[monsterName]) {
            monsterDrops[monsterName] = { ItemsToDrop: dropStr }
          } else {
            monsterDrops[monsterName].ItemsToDrop += ` ${dropStr}`
          }
        }
      }
    })

    // 生成商店 EditData 条目 (使用 Data/Shops + TargetField + Entries 格式)
    // CP 的 TargetField 指向含 ID 的列表时，用 Entries 添加/替换条目（兼容 Format 2.7.0+）
    Object.entries(shopItems).forEach(([shopId, items]) => {
      const entries: Record<string, unknown> = {}
      items.forEach(item => {
        entries[item.Id] = {
          Id: item.Id,
          ItemId: item.ItemId,
          ...(item.Condition ? { Condition: item.Condition } : {})
        }
      })
      changes.push({
        LogName: `商店物品: ${shopId}`,
        Action: 'EditData',
        Target: 'Data/Shops',
        TargetField: [shopId, 'Items'],
        Entries: entries,
      })
    })

    // 生成合成配方条目
    if (Object.keys(craftingRecipes).length > 0) {
      changes.push({
        LogName: '自定义合成配方',
        Action: 'EditData',
        Target: 'Data/CraftingRecipes',
        Entries: craftingRecipes
      })
    }

    // 生成烹饪配方条目
    if (Object.keys(cookingRecipes).length > 0) {
      changes.push({
        LogName: '自定义烹饪配方',
        Action: 'EditData',
        Target: 'Data/CookingRecipes',
        Entries: cookingRecipes
      })
    }

    // 生成怪物掉落条目
    Object.entries(monsterDrops).forEach(([monsterName, data]) => {
      changes.push({
        LogName: `怪物掉落: ${monsterName}`,
        Action: 'EditData',
        Target: 'Data/Monsters',
        Entries: { [monsterName]: data }
      })
    })

    // ======== 农作物数据 (Data/Crops) ========
    const cropEntries: Record<string, unknown> = {}
    snap.customItems.forEach((item: unknown) => {
      const it = item as Record<string, unknown>
      const crop = it.crop as Record<string, unknown> | undefined
      if (!crop) return

      const rawId = (it.id as string) || ''
      const objId = `{{ModId}}_${rawId}`
      const seasons = (crop.seasons as string[]) || ['spring']
      const daysInPhase = (crop.daysInPhase as number[]) || [1, 3, 4, 2]

      // 收获物品ID：如果用户留空，默认使用种子对应的物品ID（去掉 _Seed 后缀）
      let harvestItemId = (crop.harvestItemId as string) || ''
      if (!harvestItemId) {
        // 默认收获物品 = 种子物品本身 (O){{ModId}}_id
        harvestItemId = `(O)${objId}`
      }
      // 如果用户输入的是不带前缀的ID，自动添加 (O) 前缀
      if (harvestItemId && !harvestItemId.startsWith('(')) {
        harvestItemId = `(O)${harvestItemId}`
      }

      const cropEntry: Record<string, unknown> = {
        Seasons: seasons,
        DaysInPhase: daysInPhase,
        RegrowDays: (crop.regrowDays as number) ?? -1,
        IsRaised: (crop.isRaised as boolean) ?? false,
        IsPaddyCrop: (crop.isPaddyCrop as boolean) ?? false,
        HarvestItemId: harvestItemId,
        HarvestMinStack: (crop.harvestMinStack as number) ?? 1,
        HarvestMaxStack: (crop.harvestMaxStack as number) ?? 1,
        HarvestMaxIncreasePerFarmingLevel: (crop.harvestMaxIncreasePerFarmingLevel as number) ?? 0,
        HarvestExtraChance: (crop.harvestExtraChance as number) ?? 0,
        HarvestMethod: (crop.harvestMethod as number) ?? 1,
        SpriteIndex: 0,
        Texture: 'TileSheets/Crops',
      }

      // 可选字段
      const tintColor = (crop.tintColor as string) || ''
      if (tintColor) {
        cropEntry.TintColor = tintColor
      }

      const giantCropChance = (crop.giantCropChance as number) ?? 0
      if (giantCropChance > 0) {
        cropEntry.GiantCropChance = giantCropChance
      }

      cropEntries[objId] = cropEntry
    })

    if (Object.keys(cropEntries).length > 0) {
      changes.push({
        LogName: '自定义农作物数据',
        Action: 'EditData',
        Target: 'Data/Crops',
        Entries: cropEntries
      })
    }
  }

  // ======== 事件 (按地图分组，Target 为 Data/Events/{mapName}) ========
  if (Array.isArray(snap.events) && snap.events.length > 0) {
    // 按地图分组事件
    const eventsByMap: Record<string, Record<string, string>> = {}
    snap.events.forEach((event: unknown) => {
      const ev = event as Record<string, unknown>
      const evId = (ev.id as string) || ''
      const mapName = ((ev as any).map as string) || 'Town'
      // 生成标准 event 命令串
      const script = buildEventScript(ev)
      if (!eventsByMap[mapName]) eventsByMap[mapName] = {}
      eventsByMap[mapName][evId] = script
    })
    // 每个地图生成一条 EditData
    Object.entries(eventsByMap).forEach(([mapName, eventEntries]) => {
      if (Object.keys(eventEntries).length > 0) {
        changes.push({
          LogName: `自定义事件: ${mapName}`,
          Action: 'EditData',
          Target: `Data/Events/${mapName}`,
          Entries: eventEntries
        })
      }
    })
  }

  // ======== 自定义邮件 (Data/mail) ========
  if (Array.isArray(snap.mails) && snap.mails.length > 0) {
    const mailEntries: Record<string, unknown> = {}
    snap.mails.forEach((mail: unknown) => {
      const m = mail as Record<string, unknown>
      const mailId = (m.id as string) || ''
      const text = (m.text as string) || ''
      const attachments = m.attachments as Array<{ itemId: string; count: number }> | undefined
      const gold = (m.gold as number) || 0
      const recipe = (m.recipe as string) || ''
      const forceOpen = (m.forceOpen as boolean) || false
      const trigger = (m.trigger as string) || ''

      const entry: Record<string, unknown> = {
        Text: text,
      }

      // 附件：物品列表，ItemId 需要带 (O) 前缀
      if (attachments && attachments.length > 0) {
        entry.Attachments = attachments.map(a => ({
          ItemId: a.itemId.startsWith('(') ? a.itemId : `(O)${a.itemId}`,
          Count: a.count || 1,
        }))
      }

      // 金币附件
      if (gold > 0) {
        entry.Gold = gold
      }

      // 配方解锁
      if (recipe) {
        entry.Recipe = recipe
      }

      // 强制打开
      if (forceOpen) {
        entry.ForceOpen = true
      }

      // 触发条件（自动发送）
      if (trigger) {
        entry.Trigger = trigger
      }

      mailEntries[`{{ModId}}_${mailId}`] = entry
    })

    if (Object.keys(mailEntries).length > 0) {
      changes.push({
        LogName: '自定义邮件',
        Action: 'EditData',
        Target: 'Data/mail',
        Entries: mailEntries,
      })
    }
  }

  // ======== 自定义任务 (Data/Quests) ========
  if (Array.isArray(snap.quests) && snap.quests.length > 0) {
    const questEntries: Record<string, string> = {}
    for (const q of snap.quests) {
      const quest = q as Record<string, unknown>
      // 任务类型映射：UI类型 → 游戏字符串类型
      // 参考 Stardew Valley 1.6 Data/Quests 格式
      const typeMap: Record<string, string> = {
        story: 'Basic',           // 0: 主线故事
        help: 'ItemDelivery',     // 5: 送货/帮助
        specialOrder: 'Special',  // 3: 特殊订单
        collection: 'Resource',   // 1: 收集资源
        custom: 'Basic',          // 默认
      }
      const questType = typeMap[(quest.type as string) ?? 'custom'] ?? 'Basic'
      const daysLeft = (quest.days as number) > 0 ? (quest.days as number) : -1
      const objectives = (quest.objectives as Array<{ label?: string; type?: string; targetId?: string; targetName?: string; count?: number }> | undefined) ?? []

      // 目标文本：拼接所有目标的用户可见描述
      const objective = objectives.map(o => o.label || '').filter(Boolean).join(', ') || ''

      // 目标物品ID/数量：取第一个目标作为主要目标（游戏要求单一目标字段）
      const primaryObj = objectives[0]
      const targetItemId = primaryObj?.targetId || ''
      const targetCount = primaryObj?.count && primaryObj.count > 0 ? primaryObj.count : 1

      // 奖励配置
      const rewards = quest.rewards as { gold?: number; friendship?: number; items?: Array<{ itemId: string; itemName: string; count: number }> } | undefined
      const moneyReward = rewards?.gold ?? 0
      const rewardItems = rewards?.items ?? []

      // 奖励类型映射：0=无, 1=金币, 2=物品
      // 优先级：物品 > 金币 > 无
      let rewardType = 0
      let rewardValue = 0
      let rewardItemId = '0'
      if (rewardItems.length > 0) {
        rewardType = 2  // 物品奖励
        rewardValue = rewardItems[0].count || 1
        rewardItemId = rewardItems[0].itemId || '0'
      } else if (moneyReward > 0) {
        rewardType = 1  // 金币奖励
        rewardValue = moneyReward
      }

      // 是否可取消
      const canCancel = quest.canCancel === false ? 'false' : 'true'

      // Stardew Valley 1.6 Data/Quests 完整字段格式（23字段，斜杠分隔）
      // 字段索引:
      // 0: type (任务类型字符串)
      // 1: title (任务标题)
      // 2: description (任务描述)
      // 3: objective (目标文本)
      // 4: target (目标物品ID或怪物名)
      // 5: daysLeft (剩余天数, -1=无限制)
      // 6: moneyReward (金币奖励)
      // 7: rewardType (奖励类型: 0=无, 1=金币, 2=物品)
      // 8: rewardValue (奖励值: 物品数量或金币数)
      // 9: canCancel (是否可取消)
      // 10: objectiveType (目标类型: -1=默认)
      // 11: objectiveItemCount (目标物品数量)
      // 12: objectiveItemId (目标物品ID)
      // 13: friendshipReward (好感度奖励)
      // 14: bountyReward (赏金奖励, -1=无)
      // 15: rewardItemId (奖励物品ID)
      // 16: rewardItemCount (奖励物品数量)
      // 17: rewardItemQuality (奖励物品品质)
      // 18: hasBounty (是否有赏金, false/true)
      // 19: questChain (任务链, 空字符串=无)
      // 20: questChainQuestId (任务链下一任务ID, -1=无)
      // 21: questChainCompleteMail (任务链完成邮件, 空字符串=无)
      // 22: questChainPreventAccept (任务链阻止接受, false/true)
      const friendshipReward = rewards?.friendship ?? 0
      const fields = [
        questType,                                          // 0: type
        (quest.displayName as string) || '',                // 1: title
        (quest.description as string) || '',                // 2: description
        objective,                                          // 3: objective text
        targetItemId,                                       // 4: target (目标物品ID)
        daysLeft,                                           // 5: days left
        moneyReward,                                        // 6: money reward
        rewardType,                                         // 7: reward type (0=无, 1=金币, 2=物品)
        rewardValue,                                        // 8: reward value
        canCancel,                                          // 9: can cancel
        -1,                                                 // 10: objectiveType (-1=默认)
        targetCount,                                        // 11: objectiveItemCount
        targetItemId,                                       // 12: objectiveItemId
        friendshipReward,                                   // 13: friendshipReward
        -1,                                                 // 14: bountyReward (-1=无)
        rewardItemId,                                       // 15: rewardItemId
        rewardType === 2 ? rewardValue : 0,                 // 16: rewardItemCount
        0,                                                  // 17: rewardItemQuality (0=普通)
        rewardType === 2 ? 'true' : 'false',                // 18: hasBounty
        '',                                                 // 19: questChain
        -1,                                                 // 20: questChainQuestId
        '',                                                 // 21: questChainCompleteMail
        'false',                                            // 22: questChainPreventAccept
      ]
      // 任务 key 必须加 {{ModId}}_ 前缀，避免覆盖原版任务
      const questBaseName = (quest.name as string) || 'CustomQuest'
      const questKey = `{{ModId}}_${questBaseName}`
      questEntries[questKey] = fields.join('/')
    }

    if (Object.keys(questEntries).length > 0) {
      changes.push({
        LogName: '自定义任务',
        Action: 'EditData',
        Target: 'Data/Quests',
        Entries: questEntries,
      })
    }
  }

  // ======== NPC对话 (Characters/Dialogue) ========
  if (snap.npcDialogues) {
    // 建立 custom_id → npcName 的映射表（自定义NPC的id是custom_xxx，需要转成实际名字）
    const idToName: Record<string, string> = {}
    if (Array.isArray(snap.customNpcs)) {
      snap.customNpcs.forEach((n: any) => {
        if (n.id && n.name) idToName[n.id as string] = n.name as string
      })
    }
    Object.entries(snap.npcDialogues).forEach(([npcId, dialogueMap]) => {
      const entries = Object.keys(dialogueMap)
      if (entries.length > 0) {
        // 自定义NPC使用custom_id，映射为实际NPC名；否则直接用（如默认NPC "abigail"）
        const targetName = idToName[npcId] || npcId
        changes.push({
          LogName: `对话: ${targetName}`,
          Action: 'EditData',
          Target: `Characters/Dialogue/${targetName}`,
          Entries: dialogueMap
        })
      }
    })
  }

  // ======== 地图覆盖补丁 (EditMap) ========
  if (Array.isArray(snap.maps) && snap.maps.length > 0) {
    snap.maps.forEach((patch: unknown) => {
      const p = patch as Record<string, unknown>
      // fromFile 指向 assets/maps/ 下的实际文件
      const fileName = (p.fromFile as string).split('/').pop() || 'map.tmx'
      const editMapEntry: Record<string, unknown> = {
        LogName: (p.logName as string) || '地图覆盖',
        Action: 'EditMap',
        Target: p.target as string,
        FromFile: `assets/maps/${fileName}`,
      }
      if (p.patchMode && p.patchMode !== 'ReplaceByLayer') {
        editMapEntry.PatchMode = p.patchMode
      }
      if (p.fromArea) {
        editMapEntry.FromArea = p.fromArea
      }
      if (p.toArea) {
        editMapEntry.ToArea = p.toArea
      }
      // 注意: CP 没有 SetSize/AddToRight/AddToBottom 字段。CP 自动扩展地图（patch 超出边界即可）
      // 注意: CP 没有 AddTileSheets 字段。CP 自动处理源地图中的贴图集引用
      if (Array.isArray(p.setTileProperties) && p.setTileProperties.length > 0) {
        // CP 的 EditMap 使用 MapTiles 数组格式，每个元素指定 Position/Layer/SetProperties
        const mapTiles: Array<Record<string, unknown>> = []
        for (const tp of p.setTileProperties as Array<Record<string, unknown>>) {
          mapTiles.push({
            Position: { X: tp.x as number, Y: tp.y as number },
            Layer: (tp.layer as string) || 'Back',
            SetProperties: (tp.properties as Record<string, string>) || {},
          })
        }
        editMapEntry.MapTiles = mapTiles
      }
      // 注意: CP 没有 RemoveWarps 字段。如需移除传送点，请使用 MapProperties 将 Warp 设为 null
      if (p.setMapProperties && typeof p.setMapProperties === 'object' && Object.keys(p.setMapProperties as Record<string, unknown>).length > 0) {
        editMapEntry.MapProperties = p.setMapProperties
      }
      changes.push(editMapEntry)
    })
  }

  // ======== 自定义地图 (Load) ========
  if (Array.isArray(snap.customMaps) && snap.customMaps.length > 0) {
    snap.customMaps.forEach((cmap: unknown) => {
      const c = cmap as Record<string, unknown>
      const fileName = (c.fileName as string) || 'map.tmx'
      const mapName = (c.mapName as string) || 'CustomMap'
      changes.push({
        LogName: `自定义地图: ${c.displayName || mapName}`,
        Action: 'Load',
        Target: `Maps/{{ModId}}_${mapName}`,
        FromFile: `assets/maps/${fileName}`,
      })
    })

    // 为自定义地图添加 Data/Locations 条目
    const locationEntries: Record<string, unknown> = {}
    snap.customMaps.forEach((cmap: unknown) => {
      const c = cmap as Record<string, unknown>
      const mapName = (c.mapName as string) || 'CustomMap'
      const displayName = (c.displayName as string) || mapName
      // 优先使用新字段 locationType（'Outdoors' | 'Indoor' | 'Shed' | 'Decor' | 'Island'）
      // 回退到旧字段 indoor（boolean）
      const locationType = (c.locationType as string)
        || ((c.indoor as boolean) ? 'Indoor' : 'Outdoors')
      // SDV 1.6 Data/Locations.Type 要求的是 C# class 全名，不是分类字符串
      const csharpTypeMap: Record<string, string> = {
        'Outdoors': 'StardewValley.GameLocation',
        'Indoor': 'StardewValley.GameLocation',
        'Shed': 'StardewValley.Locations.DecoratableLocation',
        'Decor': 'StardewValley.GameLocation',
        'Island': 'StardewValley.GameLocation',
      }
      const csharpType = csharpTypeMap[locationType] || 'StardewValley.GameLocation'
      const entry: Record<string, unknown> = {
        DisplayName: displayName,
        CreateOnLoad: {
          MapPath: `Maps/{{ModId}}_${mapName}`,
        },
        Type: csharpType,
        Weather: 'Default',
        Music: (c.music as string) || 'spring',
      }
      // IsOutdoors（从 locationType 推导或显式设置）
      if (c.isOutdoors !== undefined) {
        entry.IsOutdoors = c.isOutdoors as boolean
      } else {
        entry.IsOutdoors = locationType === 'Outdoors' || locationType === 'Island'
      }
      // IsFarm
      if (c.isFarm) {
        entry.IsFarm = true
      }
      // Light
      if (c.light && typeof c.light === 'object') {
        const light = c.light as { enabled?: boolean; r: number; g: number; b: number }
        if (light.enabled) {
          entry.Light = { Enabled: true, R: light.r, G: light.g, B: light.b }
        }
      }
      // AmbientLight
      if (c.ambientLight && typeof c.ambientLight === 'object') {
        const al = c.ambientLight as { r: number; g: number; b: number }
        entry.AmbientLight = { R: al.r, G: al.g, B: al.b }
      }
      // NPCSpawnPoints
      if (Array.isArray(c.npcSpawnPoints) && c.npcSpawnPoints.length > 0) {
        entry.NPCSpawnPoints = (c.npcSpawnPoints as Array<Record<string, unknown>>).map(sp => ({
          NPC: sp.npc as string,
          X: sp.x as number,
          Y: sp.y as number,
          Direction: sp.direction as number,
        }))
      }
      locationEntries[`{{ModId}}_${mapName}`] = entry
    })
    if (Object.keys(locationEntries).length > 0) {
      changes.push({
        LogName: '自定义地点',
        Action: 'EditData',
        Target: 'Data/Locations',
        Entries: locationEntries,
      })
    }
  }

  // ======== 建筑关联 (EditMap + AddWarps) ========
  if (Array.isArray(snap.buildings) && snap.buildings.length > 0) {
    // customMapNames 已在函数顶部计算，直接使用 resolveMapRef 工具函数
    /** 将地图短名转为完整的游戏内引用名（自定义地图加 {{ModId}}_ 前缀，原版地图不变） */
    const resolveMapRef = (name: string): string => {
      if (customMapNames.has(name)) return `{{ModId}}_${name}`
      return name
    }

    // 按外部地图分组，同一地图的 warp 合并到一条 EditMap
    const exteriorWarps: Record<string, string[]> = {}
    const interiorWarps: Record<string, string[]> = {}

    snap.buildings.forEach((b: unknown) => {
      const bldg = b as Record<string, unknown>
      const extMap = (bldg.exteriorMap as string) || ''
      const intMap = (bldg.interiorMap as string) || ''
      const extX = (bldg.exteriorX as number) ?? 0
      const extY = (bldg.exteriorY as number) ?? 0
      const intX = (bldg.interiorX as number) ?? 0
      const intY = (bldg.interiorY as number) ?? 0
      const exitX = (bldg.interiorExitX as number) ?? 0
      const exitY = (bldg.interiorExitY as number) ?? 0
      const displayName = (bldg.displayName as string) || '建筑'

      if (!extMap || !intMap) return

      // warp 格式: "x y TargetMap TargetX TargetY"
      // 目标地图名需转为完整引用（自定义地图 + {{ModId}}_ 前缀）
      const extWarp = `${extX} ${extY} ${resolveMapRef(intMap)} ${intX} ${intY}`
      if (!exteriorWarps[extMap]) exteriorWarps[extMap] = []
      exteriorWarps[extMap].push(extWarp)

      const intWarp = `${exitX} ${exitY} ${resolveMapRef(extMap)} ${extX} ${extY}`
      if (!interiorWarps[intMap]) interiorWarps[intMap] = []
      interiorWarps[intMap].push(intWarp)
    })

    // 生成外部地图的 EditMap + AddWarps（Target 也需要用完整引用名）
    Object.entries(exteriorWarps).forEach(([mapName, warps]) => {
      changes.push({
        LogName: `建筑入口: ${mapName}`,
        Action: 'EditMap',
        Target: `Maps/${resolveMapRef(mapName)}`,
        AddWarps: warps,
      })
    })

    // 生成内部地图的 EditMap + AddWarps
    Object.entries(interiorWarps).forEach(([mapName, warps]) => {
      changes.push({
        LogName: `建筑出口: ${mapName}`,
        Action: 'EditMap',
        Target: `Maps/${resolveMapRef(mapName)}`,
        AddWarps: warps,
      })
    })
  }

  // ======== 自定义NPC数据 ========
  if (Array.isArray(snap.customNpcs) && snap.customNpcs.length > 0) {
    const npcEntries: Record<string, unknown> = {}
    const giftTasteEntries: Record<string, unknown> = {}
    const scheduleEntriesMap: Record<string, Record<string, string>> = {}
    const dialogueEntriesMap: Record<string, Record<string, string>> = {}
    const rainyDialogueMap: Record<string, string> = {}

    snap.customNpcs.forEach((npc: unknown) => {
      const n = npc as Record<string, unknown>
      const npcName = (n.name as string) || ''
      const npcId = (n.id as string) || ''
      const displayName = (n.displayName as string) || npcName
      // 自定义NPC使用 {{ModId}}_ 前缀避免与原版冲突
      const modNpcName = `{{ModId}}_${npcName}`

      // Data/Characters entry (1.6 完整字段)
      const rawHomeLocation = (n.homeLocation as string) || 'Town'
      // 如果家所在地是自定义地图，加 {{ModId}}_ 前缀
      const homeLocation = customMapNames.has(rawHomeLocation) ? `{{ModId}}_${rawHomeLocation}` : rawHomeLocation
      const homeTileX = (n.homeTileX as number) ?? 0
      const homeTileY = (n.homeTileY as number) ?? 0
      const gender = (n.gender as string) === 'male' ? 'Male' : 'Female'
      const manner = (n.manner as string) || 'Neutral'
      const socialAnxiety = (n.socialAnxiety as string) || 'Neutral'
      const optimism = (n.optimism as string) || 'Neutral'
      const canMarry = !!n.canMarry

      const charEntry: Record<string, unknown> = {
        DisplayName: displayName,
        HomeRegion: (n.homeRegion as string) || 'Town',
        Gender: gender,
        Age: (n.age as string) || 'Adult',
        Manner: manner,
        SocialAnxiety: socialAnxiety,
        Optimism: optimism,
        BirthSeason: (n.birthSeason as string) || 'spring',
        BirthDay: (n.birthDay as number) || 1,
        IsDarkSkinned: !!n.isDarkSkinned,
        Home: n.homeAddresses && Array.isArray(n.homeAddresses) && n.homeAddresses.length > 0
          ? n.homeAddresses.map((h: any) => ({
              Id: h.id || 'Default',
              Condition: h.condition ?? null,
              Location: h.location 
                ? (customMapNames.has(h.location) ? `{{ModId}}_${h.location}` : h.location)
                : homeLocation,
              Tile: { X: h.tile?.x ?? homeTileX, Y: h.tile?.y ?? homeTileY },
              Direction: h.direction || 'down',
            }))
          : [{ Id: 'Default', Condition: null, Location: homeLocation, Tile: { X: homeTileX, Y: homeTileY }, Direction: 'down' }],
        CanSocialize: true,
        CanReceiveGifts: true,
        CanBeRomanced: canMarry,
        CanVisitIsland: (n.canVisitIsland as boolean) ?? true,
        Calendar: 'AlwaysShown',
        SocialTab: 'UnknownUntilMet',
        SpawnIfMissing: true,
        IntroductionsQuest: true,
        TextureName: modNpcName,
      }

      // 可选字段
      if ((n as any).introduceAt) {
        charEntry.IntroduceAt = (n as any).introduceAt
      }

      // 配偶房间（可婚NPC） - 支持自定义偏移
      const spouseRoom = n.spouseRoom as { mapAsset?: string; mapSourceRect?: { x: number; y: number; width: number; height: number } } | undefined
      const spousePatio = n.spousePatio as { mapAsset?: string; mapSourceRect?: { x: number; y: number; width: number; height: number }; spriteAnimationFrames?: unknown; spriteAnimationPixelOffset?: { x: number; y: number } } | undefined
      if (canMarry) {
        if (spouseRoom) {
          charEntry.SpouseRoom = {
            MapAsset: spouseRoom.mapAsset || `{{ModId}}_spouse_rooms`,
            MapSourceRect: {
              X: spouseRoom.mapSourceRect?.x ?? 0,
              Y: spouseRoom.mapSourceRect?.y ?? 0,
              Width: spouseRoom.mapSourceRect?.width ?? 6,
              Height: spouseRoom.mapSourceRect?.height ?? 9,
            }
          }
        } else {
          charEntry.SpouseRoom = {
            MapAsset: `{{ModId}}_spouse_rooms`,
            MapSourceRect: { X: 0, Y: 0, Width: 6, Height: 9 }
          }
        }
        // 配偶露台
        if (spousePatio) {
          const patioEntry: Record<string, unknown> = {
            MapAsset: spousePatio.mapAsset || 'spousePatios',
            MapSourceRect: {
              X: spousePatio.mapSourceRect?.x ?? 0,
              Y: spousePatio.mapSourceRect?.y ?? 0,
              Width: spousePatio.mapSourceRect?.width ?? 4,
              Height: spousePatio.mapSourceRect?.height ?? 4,
            }
          }
          if (spousePatio.spriteAnimationFrames) {
            patioEntry.SpriteAnimationFrames = spousePatio.spriteAnimationFrames
          }
          if (spousePatio.spriteAnimationPixelOffset) {
            patioEntry.SpriteAnimationPixelOffset = {
              X: spousePatio.spriteAnimationPixelOffset.x,
              Y: spousePatio.spriteAnimationPixelOffset.y,
            }
          }
          charEntry.SpousePatio = patioEntry
        }
      }

      // Appearance 动态外观
      if (n.appearance && Array.isArray(n.appearance) && n.appearance.length > 0) {
        charEntry.Appearance = n.appearance.map((app: any) => {
          const entry: Record<string, unknown> = {
            Id: app.id || 'Default',
            Precedence: app.precedence ?? 0,
            Weight: app.weight ?? 1,
          }
          if (app.season) entry.Season = app.season
          if (app.isIslandAttire) entry.IsIslandAttire = true
          if (app.portraitSprite) entry.PortraitSprite = app.portraitSprite
          else entry.Portrait = `Portraits/${modNpcName}`
          if (app.sprite) entry.Sprite = app.sprite
          else entry.Sprite = `Characters/${modNpcName}`
          return entry
        })
      } else {
        charEntry.Appearance = [
          {
            Id: 'Default',
            Portrait: `Portraits/${modNpcName}`,
            Sprite: `Characters/${modNpcName}`,
          }
        ]
      }

      // 社交功能字段
      if (n.canSocialize !== undefined) charEntry.CanSocialize = n.canSocialize
      if (n.canReceiveGifts !== undefined) charEntry.CanReceiveGifts = n.canReceiveGifts
      if (n.canCommentOnPurchasedShopItems !== undefined) charEntry.CanCommentOnPurchasedShopItems = n.canCommentOnPurchasedShopItems
      if (n.canGreetNearbyCharacters !== undefined) charEntry.CanGreetNearbyCharacters = n.canGreetNearbyCharacters
      if (n.calendar) charEntry.Calendar = n.calendar
      if (n.socialTab) charEntry.SocialTab = n.socialTab
      if (n.spouseAdopts !== undefined) charEntry.SpouseAdopts = n.spouseAdopts
      if (n.spouseWantsChildren !== undefined) charEntry.SpouseWantsChildren = n.spouseWantsChildren
      if (n.spouseGiftJealousy !== undefined) charEntry.SpouseGiftJealousy = n.spouseGiftJealousy
      if (n.spouseGiftJealousyFriendshipChange !== undefined) charEntry.SpouseGiftJealousyFriendshipChange = n.spouseGiftJealousyFriendshipChange
      if (n.introductionsQuest !== undefined) charEntry.IntroductionsQuest = n.introductionsQuest
      if (n.itemDeliveryQuests !== undefined) charEntry.ItemDeliveryQuests = n.itemDeliveryQuests
      if (n.perfectionScore !== undefined) charEntry.PerfectionScore = n.perfectionScore
      if (n.endSlideShow) charEntry.EndSlideShow = n.endSlideShow
      if (n.language) charEntry.Language = n.language

      // 人际关系
      if (n.friendsAndFamily && Object.keys(n.friendsAndFamily).length > 0) {
        charEntry.FriendsAndFamily = n.friendsAndFamily
      }

      // 解锁条件
      if (n.unlockConditions) charEntry.UnlockConditions = n.unlockConditions
      if (n.spawnIfMissing !== undefined) charEntry.SpawnIfMissing = n.spawnIfMissing

      // 外观细节
      if (n.textureName) charEntry.TextureName = n.textureName
      if (n.size) charEntry.Size = n.size
      if (n.breather !== undefined) charEntry.Breather = n.breather
      if (n.shadow) charEntry.Shadow = n.shadow
      if (n.emoteOffset) charEntry.EmoteOffset = n.emoteOffset
      if (n.shakePortraits) charEntry.ShakePortraits = n.shakePortraits
      if (n.kissSpriteIndex !== undefined) charEntry.KissSpriteIndex = n.kissSpriteIndex
      if (n.kissSpriteFacingDirection !== undefined) charEntry.KissSpriteFacingDirection = n.kissSpriteFacingDirection

      npcEntries[modNpcName] = charEntry

      // NPCGiftTastes entry (SDV 1.6 string format)
      // Data/NPCGiftTastes 是 Dictionary<string, string>，格式为 "Love|id1 id2/Like|id1 id2/Neutral|id1 id2/Dislike|id1 id2/Hate|id1 id2"
      const gt = n.giftTastes as Record<string, string> | undefined
      if (gt && (gt.loved || gt.liked || gt.disliked || gt.hated || gt.neutral)) {
        const toItemString = (ids: string | undefined): string => {
          if (!ids || !ids.trim()) return ''
          return ids.trim().split(/\s+/).map(id => {
            // 去掉任何 (O)/(W)/(F) 等前缀
            if (id.startsWith('(')) return id.replace(/^\([A-Z]+\)/, '')
            return id
          }).join(' ')
        }
        // SDV 1.6 格式: "Love|items/Like|items/Neutral|items/Dislike|items/Hate|items"
        // 不省略任何类别，即使为空也保留（防止游戏解析出错）
        const parts: string[] = []
        parts.push(`Love|${toItemString(gt.loved)}`)
        parts.push(`Like|${toItemString(gt.liked)}`)
        parts.push(`Neutral|${toItemString(gt.neutral)}`)
        parts.push(`Dislike|${toItemString(gt.disliked)}`)
        parts.push(`Hate|${toItemString(gt.hated)}`)
        giftTasteEntries[modNpcName] = parts.join('/')
      }

      // Schedule entry - support both old array format and new per-day Record format
      const schedule = n.schedule as Array<{ time: string; location: string; tileX: number; tileY: number; facing: number }> | Record<string, Array<{ time: string; location: string; tileX: number; tileY: number; facing: number }>> | undefined
      if (schedule) {
        let scheduleMap: Record<string, Array<{ time: string; location: string; tileX: number; tileY: number; facing: number }>>
        if (Array.isArray(schedule)) {
          scheduleMap = { spring: schedule }
        } else {
          scheduleMap = schedule
        }
        const npcScheduleEntries: Record<string, string> = {}
        Object.entries(scheduleMap).forEach(([dayKey, entries]) => {
          if (!entries || entries.length === 0) return
          const lines = entries.map((entry: any) => {
            // GOTO 命令：导出为 "GOTO <target>"
            if (entry.goto) return `GOTO ${entry.goto}`
            // 条件命令：游戏格式为 "NOT friendship <npc> <hearts> <time> <loc> <x> <y> <facing>"
            // 条件和日程在同一行，用空格分隔
            let line = ''
            if (entry.condition) {
              line = `${entry.condition} `
            }
            line += `${entry.time} ${entry.location} ${Number(entry.tileX) || 0} ${Number(entry.tileY) || 0} ${entry.facing}`
            if (entry.command) line += ` ${entry.command}`
            return line
          })
          // 兼容旧数据：将 "default" 键展开为四个季节键
          if (dayKey === 'default') {
            for (const season of ['spring', 'summer', 'fall', 'winter']) {
              if (!scheduleMap[season] || scheduleMap[season].length === 0) {
                npcScheduleEntries[season] = lines.join('/')
              }
            }
          } else {
            // 新格式：spring, spring_Mon, summer_rain 等键直接使用
            npcScheduleEntries[dayKey] = lines.join('/')
          }
        })
        if (Object.keys(npcScheduleEntries).length > 0) {
          scheduleEntriesMap[modNpcName] = npcScheduleEntries
        }
      }

      // Dialogue entry — 将 rain 键分离到 rainy.json（游戏雨天对话格式）
      const dialogues = n.dialogues as Record<string, string> | undefined
      if (dialogues && Object.keys(dialogues).length > 0) {
        // 分离 rain 键：游戏从 Characters/Dialogue/rainy.json 读取雨天对话
        // 格式: { "NPC名": "对话内容" }
        if (dialogues['rain']) {
          rainyDialogueMap[modNpcName] = dialogues['rain']
        }
        // 其余对话放入普通对话文件
        const normalDialogues = { ...dialogues }
        delete normalDialogues['rain']
        if (Object.keys(normalDialogues).length > 0) {
          dialogueEntriesMap[modNpcName] = normalDialogues
        }
      }

      // 自定义NPC必须有 Introduction 对话，否则游戏右键交互会卡死（嗡嗡声）
      // 如果用户没有设置任何对话，自动生成一条 Introduction
      if (!dialogueEntriesMap[modNpcName]) {
        dialogueEntriesMap[modNpcName] = {
          'Introduction': '$u "你好！我是' + displayName + '，很高兴认识你！"'
        }
      }

      // 订婚对话 (Data/EngagementDialogue)
      if (n.engagementDialogue && Array.isArray(n.engagementDialogue)) {
        const engagementEntries: Record<string, string> = {
          [`${modNpcName}0`]: n.engagementDialogue[0] || '',
          [`${modNpcName}1`]: n.engagementDialogue[1] || '',
        }
        changes.push({
          LogName: `订婚对话: ${displayName}`,
          Action: 'EditData',
          Target: 'Data/EngagementDialogue',
          Entries: engagementEntries,
        })
      }

      // 婚后日常对话 (Characters/Dialogue/MarriageDialogueNPC名)
      if (n.marriageDialogue && Object.keys(n.marriageDialogue).length > 0) {
        // 文件路径用真实 UniqueID 替换 {{ModId}}
        const resolvedModNpcName = resolveModId(modNpcName)
        const marriageFilePath = `assets/dialogues/MarriageDialogue${resolvedModNpcName}.json`
        extraFiles.push({
          path: marriageFilePath,
          data: JSON.stringify(n.marriageDialogue, null, 2),
        })
        changes.push({
          LogName: `婚后对话: ${displayName}`,
          Action: 'EditData',
          Target: `Characters/Dialogue/MarriageDialogue${modNpcName}`,
          Entries: n.marriageDialogue,
        })
      }

      // 婚后日程
      if (n.marriageSchedule && Object.keys(n.marriageSchedule).length > 0) {
        const marriageScheduleEntries: Record<string, string> = {}
        Object.entries(n.marriageSchedule).forEach(([dayKey, entries]) => {
          if (!entries || entries.length === 0) return
          const lines = entries.map((entry: any) => {
            if (entry.goto) return `GOTO ${entry.goto}`
            let line = ''
            // 条件与日程条目之间用空格分隔（星露谷日程格式要求）
            if (entry.condition) line = `${entry.condition} `
            line += `${entry.time} ${entry.location} ${Number(entry.tileX) || 0} ${Number(entry.tileY) || 0} ${entry.facing}`
            if (entry.command) line += ` ${entry.command}`
            return line
          })
          marriageScheduleEntries[dayKey] = lines.join('/')
        })
        if (Object.keys(marriageScheduleEntries).length > 0) {
          // 合并到主日程文件
          if (scheduleEntriesMap[modNpcName]) {
            Object.assign(scheduleEntriesMap[modNpcName], marriageScheduleEntries)
          } else {
            scheduleEntriesMap[modNpcName] = marriageScheduleEntries
          }
        }
      }

      // Portrait Load entries (多场景，使用 {{ModId}}_ 前缀)
      const portraits = n.portraits as Record<string, string> | undefined
      if (portraits && Object.keys(portraits).length > 0) {
        Object.entries(portraits).forEach(([sceneIdx]) => {
          const idx = Number(sceneIdx)
          const suffix = NPC_SCENE_SUFFIXES[idx] || ''
          changes.push({
            LogName: `肖像: ${displayName}${suffix ? ' ' + suffix : ''}`,
            Action: 'Load',
            Target: `Portraits/${modNpcName}${suffix}`,
            FromFile: `assets/portraits/${npcName}${suffix}.png`,
          })
        })
      } else if (n.portraitUrl) {
        // 兼容旧格式：单张肖像
        changes.push({
          LogName: `肖像: ${displayName}`,
          Action: 'Load',
          Target: `Portraits/${modNpcName}`,
          FromFile: `assets/portraits/${npcName}.png`
        })
      }

      // Sprite Load entries (多场景，使用 {{ModId}}_ 前缀)
      const sprites = n.sprites as Record<string, string> | undefined
      if (sprites && Object.keys(sprites).length > 0) {
        Object.entries(sprites).forEach(([sceneIdx]) => {
          const idx = Number(sceneIdx)
          const suffix = NPC_SCENE_SUFFIXES[idx] || ''
          changes.push({
            LogName: `行走图: ${displayName}${suffix ? ' ' + suffix : ''}`,
            Action: 'Load',
            Target: `Characters/${modNpcName}${suffix}`,
            FromFile: `assets/sprites/${npcName}${suffix}.png`,
          })
        })
      } else if (n.spriteUrl) {
        // 兼容旧格式：单张行走图
        changes.push({
          LogName: `行走图: ${displayName}`,
          Action: 'Load',
          Target: `Characters/${modNpcName}`,
          FromFile: `assets/sprites/${npcName}.png`
        })
      }
    })

    // Data/Characters
    if (Object.keys(npcEntries).length > 0) {
      changes.push({
        LogName: '自定义NPC数据',
        Action: 'EditData',
        Target: 'Data/Characters',
        Entries: npcEntries
      })
    }

    // Data/NPCGiftTastes
    if (Object.keys(giftTasteEntries).length > 0) {
      changes.push({
        LogName: '自定义NPC喜好',
        Action: 'EditData',
        Target: 'Data/NPCGiftTastes',
        Entries: giftTasteEntries
      })
    }

    // Characters/Schedules/{npcName} (使用 Load 加载 JSON 文件，兼容性最佳)
    if (Object.keys(scheduleEntriesMap).length > 0) {
      Object.entries(scheduleEntriesMap).forEach(([npcName, dayMap]) => {
        // 文件路径用真实 UniqueID 替换 {{ModId}}，content.json 保留 {{ModId}} 占位符
        const resolvedNpcName = resolveModId(npcName)
        const filePath = `assets/schedules/${resolvedNpcName}.json`
        extraFiles.push({
          path: filePath,
          data: JSON.stringify(dayMap, null, 2),
        })
        changes.push({
          LogName: `日程: ${resolvedNpcName}`,
          Action: 'Load',
          Target: `Characters/Schedules/${npcName}`,
          FromFile: filePath,
        })
      })
    }

    // Characters/Dialogue/{npcName} (使用 Load 加载 JSON 文件，兼容性最佳)
    Object.entries(dialogueEntriesMap).forEach(([npcName, dialogueMap]) => {
      // 文件路径用真实 UniqueID 替换 {{ModId}}，content.json 保留 {{ModId}} 占位符
      const resolvedNpcName = resolveModId(npcName)
      const filePath = `assets/dialogues/${resolvedNpcName}.json`
      extraFiles.push({
        path: filePath,
        data: JSON.stringify(dialogueMap, null, 2),
      })
      changes.push({
        LogName: `对话: ${resolvedNpcName}`,
        Action: 'Load',
        Target: `Characters/Dialogue/${npcName}`,
        FromFile: filePath,
      })
    })

    // Characters/Dialogue/rainy (雨天对话，格式: { "NPC名": "对话内容" })
    // 游戏从 rainy.json 文件读取所有NPC的雨天对话，文件内容是游戏直接读取的，必须用真实 UniqueID
    if (Object.keys(rainyDialogueMap).length > 0) {
      const filePath = 'assets/dialogues/rainy.json'
      // 把 key 中的 {{ModId}} 替换为真实 UniqueID
      const resolvedRainyMap: Record<string, string> = {}
      Object.entries(rainyDialogueMap).forEach(([k, v]) => {
        resolvedRainyMap[resolveModId(k)] = v
      })
      extraFiles.push({
        path: filePath,
        data: JSON.stringify(resolvedRainyMap, null, 2),
      })
      changes.push({
        LogName: '雨天对话',
        Action: 'Load',
        Target: 'Characters/Dialogue/rainy',
        FromFile: filePath,
      })
    }

    // ========== 原版NPC覆盖数据导出 ==========
    const vanillaOverrides = snap.vanillaNpcOverrides as Record<string, import('./ProjectContext').VanillaNpcOverride> | undefined
    if (vanillaOverrides && Object.keys(vanillaOverrides).length > 0) {
      const vanillaGiftTasteEntries: Record<string, unknown> = {}
      const vanillaScheduleEntriesMap: Record<string, Record<string, string>> = {}
      const vanillaDialogueEntriesMap: Record<string, Record<string, string>> = {}
      const vanillaRainyDialogueMap: Record<string, string> = {}

      for (const [npcName, override] of Object.entries(vanillaOverrides)) {
        if (!override) continue

        // 礼物偏好覆盖 (SDV 1.6 string format)
        if (override.giftTastes) {
          const gt = override.giftTastes
          const toItemString = (ids: string | undefined): string => {
            if (!ids || !ids.trim()) return ''
            return ids.trim().split(/\s+/).map(id => {
              if (id.startsWith('(')) return id.replace(/^\([A-Z]+\)/, '')
              return id
            }).join(' ')
          }
          // SDV 1.6 格式: "Love|items/Like|items/Neutral|items/Dislike|items/Hate|items"
          const parts: string[] = []
          parts.push(`Love|${toItemString(gt.loved)}`)
          parts.push(`Like|${toItemString(gt.liked)}`)
          parts.push(`Neutral|${toItemString(gt.neutral)}`)
          parts.push(`Dislike|${toItemString(gt.disliked)}`)
          parts.push(`Hate|${toItemString(gt.hated)}`)
          vanillaGiftTasteEntries[npcName] = parts.join('/')
        }

        // 日程覆盖
        if (override.schedule) {
          const scheduleMap = override.schedule as Record<string, Array<{ time: string; location: string; tileX: number; tileY: number; facing: number; command?: string }>>
          const npcScheduleEntries: Record<string, string> = {}
          Object.entries(scheduleMap).forEach(([dayKey, entries]) => {
            if (!entries || entries.length === 0) return
            const lines = entries.map((entry: any) => {
              // GOTO 命令
              if (entry.goto) return `GOTO ${entry.goto}`
              // 条件命令：条件与日程条目之间用空格分隔（星露谷日程格式要求）
              let line = ''
              if (entry.condition) {
                line = `${entry.condition} `
              }
              line += `${entry.time} ${entry.location} ${Number(entry.tileX) || 0} ${Number(entry.tileY) || 0} ${entry.facing}`
              if (entry.command) line += ` ${entry.command}`
              return line
            })
            if (dayKey === 'default') {
              for (const season of ['spring', 'summer', 'fall', 'winter']) {
                if (!scheduleMap[season] || scheduleMap[season].length === 0) {
                  npcScheduleEntries[season] = lines.join('/')
                }
              }
            } else {
              npcScheduleEntries[dayKey] = lines.join('/')
            }
          })
          if (Object.keys(npcScheduleEntries).length > 0) {
            vanillaScheduleEntriesMap[npcName] = npcScheduleEntries
          }
        }

        // 对话覆盖
        if (override.dialogues && Object.keys(override.dialogues).length > 0) {
          if (override.dialogues['rain']) {
            vanillaRainyDialogueMap[npcName] = override.dialogues['rain']
          }
          const normalDialogues = { ...override.dialogues }
          delete normalDialogues['rain']
          if (Object.keys(normalDialogues).length > 0) {
            vanillaDialogueEntriesMap[npcName] = normalDialogues
          }
        }

        // 原版NPC属性修改 (使用 Fields 模式只修改指定字段)
        if (override.characterFields && Object.keys(override.characterFields).length > 0) {
          const fields: Record<string, unknown> = {}
          const cf = override.characterFields
          if (cf.BirthSeason) fields.BirthSeason = cf.BirthSeason
          if (cf.BirthDay !== undefined) fields.BirthDay = cf.BirthDay
          if (cf.Manner) fields.Manner = cf.Manner
          if (cf.SocialAnxiety) fields.SocialAnxiety = cf.SocialAnxiety
          if (cf.Optimism) fields.Optimism = cf.Optimism
          if (cf.Gender) fields.Gender = cf.Gender
          if (cf.Age) fields.Age = cf.Age
          if (cf.HomeRegion) fields.HomeRegion = cf.HomeRegion
          if (cf.IsDarkSkinned !== undefined) fields.IsDarkSkinned = cf.IsDarkSkinned
          if (cf.CanSocialize !== undefined) fields.CanSocialize = cf.CanSocialize
          if (cf.CanBeRomanced !== undefined) fields.CanBeRomanced = cf.CanBeRomanced
          if (cf.CanVisitIsland !== undefined) fields.CanVisitIsland = cf.CanVisitIsland
          if (cf.Calendar) fields.Calendar = cf.Calendar
          if (cf.SocialTab) fields.SocialTab = cf.SocialTab
          if (cf.SpouseAdopts !== undefined) fields.SpouseAdopts = cf.SpouseAdopts
          if (cf.SpouseWantsChildren !== undefined) fields.SpouseWantsChildren = cf.SpouseWantsChildren
          if (cf.SpouseGiftJealousy !== undefined) fields.SpouseGiftJealousy = cf.SpouseGiftJealousy
          if (cf.SpouseGiftJealousyFriendshipChange !== undefined) fields.SpouseGiftJealousyFriendshipChange = cf.SpouseGiftJealousyFriendshipChange
          if (cf.PerfectionScore !== undefined) fields.PerfectionScore = cf.PerfectionScore
          if (cf.EndSlideShow) fields.EndSlideShow = cf.EndSlideShow
          if (cf.FriendsAndFamily && Object.keys(cf.FriendsAndFamily).length > 0) fields.FriendsAndFamily = cf.FriendsAndFamily

          if (Object.keys(fields).length > 0) {
            changes.push({
              LogName: `原版NPC属性: ${npcName}`,
              Action: 'EditData',
              Target: 'Data/Characters',
              Fields: { [npcName]: fields },
            })
          }
        }

        // 原版NPC婚姻系统
        if (override.marriage) {
          const marriageFields: Record<string, unknown> = {}
          if (override.marriage.spouseRoom) {
            marriageFields.SpouseRoom = {
              MapAsset: override.marriage.spouseRoom.mapAsset || 'spouseRooms',
              MapSourceRect: {
                X: override.marriage.spouseRoom.mapSourceRect?.x ?? 0,
                Y: override.marriage.spouseRoom.mapSourceRect?.y ?? 0,
                Width: override.marriage.spouseRoom.mapSourceRect?.width ?? 6,
                Height: override.marriage.spouseRoom.mapSourceRect?.height ?? 9,
              }
            }
          }
          if (override.marriage.spousePatio) {
            const patioEntry: Record<string, unknown> = {
              MapAsset: override.marriage.spousePatio.mapAsset || 'spousePatios',
              MapSourceRect: {
                X: override.marriage.spousePatio.mapSourceRect?.x ?? 0,
                Y: override.marriage.spousePatio.mapSourceRect?.y ?? 0,
                Width: override.marriage.spousePatio.mapSourceRect?.width ?? 4,
                Height: override.marriage.spousePatio.mapSourceRect?.height ?? 4,
              }
            }
            if (override.marriage.spousePatio.spriteAnimationFrames) {
              patioEntry.SpriteAnimationFrames = override.marriage.spousePatio.spriteAnimationFrames
            }
            if (override.marriage.spousePatio.spriteAnimationPixelOffset) {
              patioEntry.SpriteAnimationPixelOffset = {
                X: override.marriage.spousePatio.spriteAnimationPixelOffset.x,
                Y: override.marriage.spousePatio.spriteAnimationPixelOffset.y,
              }
            }
            marriageFields.SpousePatio = patioEntry
          }
          if (Object.keys(marriageFields).length > 0) {
            marriageFields.CanBeRomanced = true
            changes.push({
              LogName: `原版NPC婚姻: ${npcName}`,
              Action: 'EditData',
              Target: 'Data/Characters',
              Fields: { [npcName]: marriageFields },
            })
          }

          // 订婚对话
          if (override.marriage.engagementDialogue) {
            changes.push({
              LogName: `原版订婚对话: ${npcName}`,
              Action: 'EditData',
              Target: 'Data/EngagementDialogue',
              Entries: {
                [`${npcName}0`]: override.marriage.engagementDialogue[0] || '',
                [`${npcName}1`]: override.marriage.engagementDialogue[1] || '',
              },
            })
          }

          // 婚后对话
          if (override.marriage.marriageDialogue && Object.keys(override.marriage.marriageDialogue).length > 0) {
            changes.push({
              LogName: `原版婚后对话: ${npcName}`,
              Action: 'EditData',
              Target: `Characters/Dialogue/MarriageDialogue${npcName}`,
              Entries: override.marriage.marriageDialogue,
            })
          }

          // 婚后日程
          if (override.marriage.marriageSchedule && Object.keys(override.marriage.marriageSchedule).length > 0) {
            const marriageScheduleEntries: Record<string, string> = {}
            Object.entries(override.marriage.marriageSchedule).forEach(([dayKey, entries]) => {
              if (!entries || entries.length === 0) return
              const lines = entries.map((entry: any) => {
                if (entry.goto) return `GOTO ${entry.goto}`
                let line = ''
                // 条件与日程条目之间用空格分隔（星露谷日程格式要求）
                if (entry.condition) line = `${entry.condition} `
                line += `${entry.time} ${entry.location} ${Number(entry.tileX) || 0} ${Number(entry.tileY) || 0} ${entry.facing}`
                if (entry.command) line += ` ${entry.command}`
                return line
              })
              marriageScheduleEntries[dayKey] = lines.join('/')
            })
            if (Object.keys(marriageScheduleEntries).length > 0) {
              // 合并到原版日程
              if (vanillaScheduleEntriesMap[npcName]) {
                Object.assign(vanillaScheduleEntriesMap[npcName], marriageScheduleEntries)
              } else {
                vanillaScheduleEntriesMap[npcName] = marriageScheduleEntries
              }
            }
          }
        }

        // 原版NPC外观动态切换
        if (override.appearance && Array.isArray(override.appearance) && override.appearance.length > 0) {
          // 使用 Fields 模式添加 Appearance
          changes.push({
            LogName: `原版NPC外观: ${npcName}`,
            Action: 'EditData',
            Target: 'Data/Characters',
            Fields: {
              [npcName]: {
                Appearance: override.appearance.map((app: any) => {
                  const entry: Record<string, unknown> = {
                    Id: app.id || 'Default',
                    Precedence: app.precedence ?? 0,
                    Weight: app.weight ?? 1,
                  }
                  if (app.season) entry.Season = app.season
                  if (app.isIslandAttire) entry.IsIslandAttire = true
                  if (app.portraitSprite) entry.PortraitSprite = app.portraitSprite
                  if (app.sprite) entry.Sprite = app.sprite
                  return entry
                }),
              },
            },
          })
        }
      }

      // 原版NPC礼物偏好
      if (Object.keys(vanillaGiftTasteEntries).length > 0) {
        changes.push({
          LogName: '原版NPC喜好覆盖',
          Action: 'EditData',
          Target: 'Data/NPCGiftTastes',
          Entries: vanillaGiftTasteEntries
        })
      }

      // 原版NPC日程
      Object.entries(vanillaScheduleEntriesMap).forEach(([npcName, dayMap]) => {
        changes.push({
          LogName: `原版日程: ${npcName}`,
          Action: 'EditData',
          Target: `Characters/Schedules/${npcName}`,
          Entries: dayMap,
        })
      })

      // 原版NPC对话
      Object.entries(vanillaDialogueEntriesMap).forEach(([npcName, dialogueMap]) => {
        changes.push({
          LogName: `原版对话: ${npcName}`,
          Action: 'EditData',
          Target: `Characters/Dialogue/${npcName}`,
          Entries: dialogueMap,
        })
      })

      // 原版NPC雨天对话
      if (Object.keys(vanillaRainyDialogueMap).length > 0) {
        changes.push({
          LogName: '原版雨天对话',
          Action: 'EditData',
          Target: 'Characters/Dialogue/rainy',
          Entries: vanillaRainyDialogueMap,
        })
      }
    }
  }

  // ======== 高级功能：全局 When 条件 + Priority ========
  if (snap.whenConditions && Object.keys(snap.whenConditions).length > 0) {
    changes.forEach(change => {
      if (!change.When) {
        (change as Record<string, unknown>).When = { ...snap.whenConditions }
      }
    })
  }
  if (snap.patchPriority && snap.patchPriority !== 'Normal') {
    changes.forEach(change => {
      (change as Record<string, unknown>).Priority = snap.patchPriority
    })
  }

  return {
    content: {
      Format: '2.9.0',
      ...(snap.configSchema && Object.keys(snap.configSchema).length > 0 ? { ConfigSchema: snap.configSchema } : {}),
      ...(snap.dynamicTokens && snap.dynamicTokens.length > 0 ? { DynamicTokens: snap.dynamicTokens } : {}),
      Changes: changes
    },
    extraFiles
  }
}

// 构建事件脚本字符串 (星露谷物语标准事件格式)
// 实际逻辑已提取到 eventData.ts 的 buildEventScript，保证编辑器预览与导出一致
// 此处叠加自定义NPC ID 的 {{ModId}}_ 前缀处理，确保事件中的自定义NPC引用在游戏中可识别
function buildEventScript(ev: Record<string, unknown>): string {
  // 深拷贝 ev，避免修改原数据
  const processed: Record<string, unknown> = { ...ev }

  // 1. NPC IDs 列表：为自定义NPC加 {{ModId}}_ 前缀
  if (Array.isArray(processed.npcIds)) {
    processed.npcIds = (processed.npcIds as string[]).map(id =>
      customNpcNames.has(id) ? `{{ModId}}_${id}` : id
    )
  }

  // 2. NPC 独立初始位置：为自定义NPC加 {{ModId}}_ 前缀
  if (Array.isArray(processed.npcPositions)) {
    processed.npcPositions = (processed.npcPositions as Array<Record<string, unknown>>).map(pos => ({
      ...pos,
      npcId: customNpcNames.has(pos.npcId as string) ? `{{ModId}}_${pos.npcId}` : pos.npcId
    }))
  }

  // 3. 步骤中的NPC引用：对话发言人(speaker)、互动目标(target)
  if (Array.isArray(processed.steps)) {
    processed.steps = (processed.steps as Array<Record<string, unknown>>).map(step => {
      if (!step.config) return step
      const cfg = { ...(step.config as Record<string, string>) }
      if (cfg.speaker && customNpcNames.has(cfg.speaker)) {
        cfg.speaker = `{{ModId}}_${cfg.speaker}`
      }
      if (cfg.target && customNpcNames.has(cfg.target)) {
        cfg.target = `{{ModId}}_${cfg.target}`
      }
      return { ...step, config: cfg }
    })
  }

  return buildEventScriptShared(processed as Parameters<typeof buildEventScriptShared>[0])
}

// ---- 收集所有需要导出的图片文件 ----
interface ImageFile {
  path: string
  dataUrl: string
}

function collectImages(snap: ProjectSnapshot): ImageFile[] {
  const files: ImageFile[] = []

  if (!snap.npcAssets) return files

  const addedPortraits = new Set<string>()

  // 场景后缀映射：与 NPC_SCENE_SUFFIXES 完全对齐（19个场景，索引 0-18）
  // 使用首字母大写后缀，与游戏实际路径和 content.json 生成逻辑一致
  const sceneNames = ['', '_Beach', '_Winter', '_Spring', '_Summer', '_Fall', '_FlowerDance', '_EggF', '_Fair', '_Jellies', '_Luau', '_SpiritsEve', '_WinterStar', '_IceF', '_Winter_Indoor', '_Winter_Outdoor', '_Hospital', '_JojaMart', '_Trenchcoat']

  Object.entries(snap.npcAssets).forEach(([npcId, assets]) => {
    // 肖像：每个场景一个独立文件
    Object.entries(assets.portraits || {}).forEach(([key, dataUrl]) => {
      const [sceneIdx] = key.split('_')
      const sceneIdxNum = Number(sceneIdx)
      const suffix = sceneNames[sceneIdxNum] ?? ''
      // 使用首字母大写后缀，与 content.json 的 FromFile 路径一致
      const path = `assets/portraits/${npcId}${suffix}.png`
      if (!addedPortraits.has(path)) {
        addedPortraits.add(path)
        files.push({ path, dataUrl })
      }
    })

    // 行走图：每个 NPC 一个文件（去重）
    const addedSpriteFiles = new Set<string>()
    Object.entries(assets.sprites || {}).forEach(([key, dataUrl]) => {
      const path = `assets/sprites/${npcId}.png`
      if (!addedSpriteFiles.has(path)) {
        addedSpriteFiles.add(path)
        files.push({ path, dataUrl })
      }
    })
  })

  // 自定义物品图标
  if (Array.isArray(snap.customItems)) {
    snap.customItems.forEach((item: unknown) => {
      const it = item as Record<string, unknown>
      if (it.imageUrl && typeof it.imageUrl === 'string' && it.imageUrl.startsWith('data:')) {
        files.push({
          path: `assets/items/${it.id}.png`,
          dataUrl: it.imageUrl as string
        })
      }
    })
  }

  // 自定义NPC肖像和行走图（多场景）
  if (Array.isArray(snap.customNpcs)) {
    snap.customNpcs.forEach((npc: unknown) => {
      const n = npc as Record<string, unknown>
      const npcName = (n.name as string) || ''
      // 多场景肖像
      const portraits = n.portraits as Record<string, string> | undefined
      if (portraits) {
        Object.entries(portraits).forEach(([sceneIdx, dataUrl]) => {
          if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
            const suffix = NPC_SCENE_SUFFIXES[Number(sceneIdx)] || ''
            files.push({
              path: `assets/portraits/${npcName}${suffix}.png`,
              dataUrl
            })
          }
        })
      } else if (n.portraitUrl && typeof n.portraitUrl === 'string' && n.portraitUrl.startsWith('data:')) {
        // 兼容旧格式
        files.push({ path: `assets/portraits/${npcName}.png`, dataUrl: n.portraitUrl as string })
      }
      // 多场景行走图
      const sprites = n.sprites as Record<string, string> | undefined
      if (sprites) {
        Object.entries(sprites).forEach(([sceneIdx, dataUrl]) => {
          if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
            const suffix = NPC_SCENE_SUFFIXES[Number(sceneIdx)] || ''
            files.push({
              path: `assets/sprites/${npcName}${suffix}.png`,
              dataUrl
            })
          }
        })
      } else if (n.spriteUrl && typeof n.spriteUrl === 'string' && n.spriteUrl.startsWith('data:')) {
        // 兼容旧格式
        files.push({ path: `assets/sprites/${npcName}.png`, dataUrl: n.spriteUrl as string })
      }
    })
  }

  return files
}

// ---- 主导出函数 ----
export async function performExport(
  snap: ProjectSnapshot,
  config: ExportConfig,
  gameDir?: string | null,
  onProgress?: (step: string, current: number, total: number) => void
): Promise<{ success: boolean; modDir: string; fileCount: number; error?: string }> {
  const api = (window as any).electronAPI
  if (!api) return { success: false, modDir: '', fileCount: 0, error: 'electronAPI 不可用' }

  // 1. 选择导出目录（传入已知游戏目录以定位 Mods）
  const baseDir = await api.selectExportDir(gameDir || undefined)
  if (!baseDir) return { success: false, modDir: '', fileCount: 0, error: '未选择目录' }

  onProgress?.('创建目录结构...', 1, 5)

  const modNameSafe = (config.modName || 'MyMod').replace(/[<>:"/\\|?*]/g, '_')
  const modDir = `${baseDir}/[CP] ${modNameSafe}`
  let fileCount = 0

  try {
    // 2. 创建目录结构
    await api.mkdir(modDir)
    await api.mkdir(`${modDir}/assets`)
    await api.mkdir(`${modDir}/assets/portraits`)
    await api.mkdir(`${modDir}/assets/sprites`)
    await api.mkdir(`${modDir}/assets/items`)
    await api.mkdir(`${modDir}/assets/schedules`)
    await api.mkdir(`${modDir}/assets/dialogues`)

    onProgress?.('写入配置文件...', 2, 5)

    // 3. 写入 manifest.json
    const manifest = generateManifest(config)
    const manifestOk = await api.writeFile(`${modDir}/manifest.json`, JSON.stringify(manifest, null, 2))
    if (manifestOk) fileCount++
    // 4. 写入 content.json + 额外文件
    const { content, extraFiles } = generateContent(snap, config)

    // ======== 高级功能：文件拆分 (Include) ========
    if (snap.splitContentFiles) {
      // 将 changes 按类别拆分到不同文件
      const mainChanges: Record<string, unknown>[] = []
      const categoryMap: Record<string, Record<string, unknown>[]> = {}

      const changes = (content.Changes as Record<string, unknown>[]) || []
      changes.forEach((change: Record<string, unknown>) => {
        const action = change.Action as string
        const target = change.Target as string
        let category = 'other'

        if (action === 'Load' && typeof target === 'string' && target.startsWith('Portraits/')) {
          category = 'portraits'
        } else if (action === 'Load' && typeof target === 'string' && target.startsWith('Characters/')) {
          category = 'sprites'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Objects')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Weapons')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Boots')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Hats')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/BigCraftables')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Clothing')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Furniture')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Fish')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Crops')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Shops')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/CraftingRecipes')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/CookingRecipes')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Monsters')) {
          category = 'items'
        } else if (action === 'Load' && typeof target === 'string' && target.startsWith('Mods/')) {
          category = 'items'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Events')) {
          category = 'events'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Characters')) {
          category = 'npcs'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/NPCGiftTastes')) {
          category = 'npcs'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/EngagementDialogue')) {
          category = 'npcs'
        } else if (action === 'Load' && typeof target === 'string' && target.startsWith('Characters/Schedules')) {
          category = 'npcs'
        } else if (action === 'Load' && typeof target === 'string' && target.startsWith('Characters/Dialogue')) {
          category = 'npcs'
        } else if (action === 'EditMap' || action === 'Load' && typeof target === 'string' && target.startsWith('Maps/')) {
          category = 'maps'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Locations')) {
          category = 'maps'
        } else if (action === 'EditData' && typeof target === 'string' && target.startsWith('Data/Quests')) {
          category = 'quests'
        }

        if (category !== 'other') {
          if (!categoryMap[category]) categoryMap[category] = []
          categoryMap[category].push(change)
        } else {
          mainChanges.push(change)
        }
      })

      // 写入拆分后的文件
      const splitContentBase: Record<string, unknown> = { Format: content.Format }
      if (content.ConfigSchema) splitContentBase.ConfigSchema = content.ConfigSchema
      if (content.DynamicTokens) splitContentBase.DynamicTokens = content.DynamicTokens

      // 主 content.json 只保留 Include 条目 + other 类别的 changes
      const includeChanges: Record<string, unknown>[] = []
      Object.entries(categoryMap).forEach(([category, catChanges]) => {
        if (catChanges.length === 0) return
        const fileName = `assets/${category}.json`
        const catContent = { Format: content.Format, Changes: catChanges }
        extraFiles.push({
          path: fileName,
          data: JSON.stringify(catContent, null, 2)
        })
        includeChanges.push({
          Action: 'Include',
          FromFile: fileName
        })
      })

      const finalContent = {
        ...splitContentBase,
        Changes: [...includeChanges, ...mainChanges]
      }
      const contentOk = await api.writeFile(`${modDir}/content.json`, JSON.stringify(finalContent, null, 2))
      if (contentOk) fileCount++
    } else {
      const contentOk = await api.writeFile(`${modDir}/content.json`, JSON.stringify(content, null, 2))
      if (contentOk) fileCount++
    }
    let extraFilesOk = true
    for (const f of extraFiles) {
      const ok = await api.writeFile(`${modDir}/${f.path}`, f.data)
      if (ok) fileCount++
      else extraFilesOk = false
    }

    // ======== 高级功能：i18n 文件 ========
    if (snap.enableI18n && snap.i18nEntries) {
      await api.mkdir(`${modDir}/i18n`)
      for (const [lang, entries] of Object.entries(snap.i18nEntries)) {
        if (Object.keys(entries).length > 0) {
          await api.writeFile(`${modDir}/i18n/${lang}.json`, JSON.stringify(entries, null, 2))
          fileCount++
        }
      }
    }

    onProgress?.('写入资源文件...', 3, 5)

    // 5. 写入图片文件
    const images = collectImages(snap)
    for (let i = 0; i < images.length; i++) {
      onProgress?.(`写入图片 (${i + 1}/${images.length})...`, 4, 5)
      const img = images[i]
      if (img.dataUrl.startsWith('data:text/')) {
        // 文本文件用 writeFile
        const base64 = img.dataUrl.split(',')[1]
        if (base64) {
          const text = decodeURIComponent(escape(atob(base64)))
          const ok = await api.writeFile(`${modDir}/${img.path}`, text)
          if (ok) fileCount++
        }
      } else {
        const ok = await api.writeBinaryFile(`${modDir}/${img.path}`, img.dataUrl)
        if (ok) fileCount++
      }
    }

    // 6. 复制地图覆盖文件（.tmx + 贴图集 PNG）
    if (Array.isArray(snap.maps) && snap.maps.length > 0) {
      await api.mkdir(`${modDir}/assets/maps`)
      for (const patch of snap.maps) {
        const p = patch as Record<string, unknown>
        if (p.sourceFilePath && typeof p.sourceFilePath === 'string') {
          const result = await api.mapCopyOverlayAsset?.(p.sourceFilePath, `${modDir}/assets/maps`)
          if (result?.success) {
            fileCount += result.copiedFiles.length
          }
        }
      }
    }

    // 7. 复制自定义地图文件
    if (Array.isArray(snap.customMaps) && snap.customMaps.length > 0) {
      await api.mkdir(`${modDir}/assets/maps`)
      for (const cmap of snap.customMaps) {
        const c = cmap as Record<string, unknown>
        if (c.sourceFilePath && typeof c.sourceFilePath === 'string') {
          const result = await api.mapCopyOverlayAsset?.(c.sourceFilePath, `${modDir}/assets/maps`)
          if (result?.success) {
            fileCount += result.copiedFiles.length
          }
        }
      }
    }

    onProgress?.('完成', 5, 5)
  } catch (e) {
    return { success: false, modDir, fileCount, error: String(e) }
  }

  // 兜底校验：核心文件必须写入成功，否则视为失败
  // 场景：isPathAllowed 未放行（如游戏目录未自动检测）时所有 writeFile 静默返回 false
  if (fileCount === 0) {
    return {
      success: false,
      modDir,
      fileCount: 0,
      error: `写入失败：所选目录 "${baseDir}" 不在允许范围内（manifest.json 写入被拒绝）。请尝试选择游戏目录下的 Mods 文件夹，或重启应用后再试。`
    }
  }

  return { success: true, modDir, fileCount }
}

// ---- 一键打包为 .zip ----
export async function exportAsZip(
  snap: ProjectSnapshot,
  config: ExportConfig,
  gameDir?: string | null,
  onProgress?: (step: string, current: number, total: number) => void
): Promise<{ success: boolean; zipPath: string; error?: string }> {
  const api = (window as any).electronAPI
  if (!api) return { success: false, zipPath: '', error: 'electronAPI 不可用' }

  const tmpDir = await api.getTempDir?.() || (await api.selectExportDir())
  if (!tmpDir) return { success: false, zipPath: '', error: '无法创建临时目录' }

  onProgress?.('创建目录结构...', 1, 5)

  const modNameSafe = (config.modName || 'MyMod').replace(/[<>:"/\\|?*]/g, '_')
  const packDir = `${tmpDir}/[CP] ${modNameSafe}`

  try {
    await api.mkdir(packDir)
    await api.mkdir(`${packDir}/assets`)
    await api.mkdir(`${packDir}/assets/portraits`)
    await api.mkdir(`${packDir}/assets/sprites`)
    await api.mkdir(`${packDir}/assets/items`)
    await api.mkdir(`${packDir}/assets/schedules`)
    await api.mkdir(`${packDir}/assets/dialogues`)

    onProgress?.('写入配置文件...', 2, 5)

    const { content, extraFiles } = generateContent(snap, config)
    let zipFileCount = 0
    const manifestOk = await api.writeFile(`${packDir}/manifest.json`, JSON.stringify(generateManifest(config), null, 2))
    if (manifestOk) zipFileCount++
    const contentOk = await api.writeFile(`${packDir}/content.json`, JSON.stringify(content, null, 2))
    if (contentOk) zipFileCount++
    for (const f of extraFiles) {
      const ok = await api.writeFile(`${packDir}/${f.path}`, f.data)
      if (ok) zipFileCount++
    }

    onProgress?.('写入资源文件...', 3, 5)

    const images = collectImages(snap)
    for (let i = 0; i < images.length; i++) {
      onProgress?.(`写入图片 (${i + 1}/${images.length})...`, 4, 5)
      const img = images[i]
      if (img.dataUrl.startsWith('data:text/')) {
        const base64 = img.dataUrl.split(',')[1]
        if (base64) {
          const text = decodeURIComponent(escape(atob(base64)))
          await api.writeFile(`${packDir}/${img.path}`, text)
        }
      } else {
        await api.writeBinaryFile(`${packDir}/${img.path}`, img.dataUrl)
      }
    }

    // 复制地图覆盖文件
    if (Array.isArray(snap.maps) && snap.maps.length > 0) {
      await api.mkdir(`${packDir}/assets/maps`)
      for (const patch of snap.maps) {
        const p = patch as Record<string, unknown>
        if (p.sourceFilePath && typeof p.sourceFilePath === 'string') {
          await api.mapCopyOverlayAsset?.(p.sourceFilePath, `${packDir}/assets/maps`)
        }
      }
    }

    // 复制自定义地图文件
    if (Array.isArray(snap.customMaps) && snap.customMaps.length > 0) {
      await api.mkdir(`${packDir}/assets/maps`)
      for (const cmap of snap.customMaps) {
        const c = cmap as Record<string, unknown>
        if (c.sourceFilePath && typeof c.sourceFilePath === 'string') {
          await api.mapCopyOverlayAsset?.(c.sourceFilePath, `${packDir}/assets/maps`)
        }
      }
    }

    onProgress?.('打包 ZIP...', 5, 5)

    // 调用主进程打包 zip
    const zipResult = await api.packToZip?.(packDir)
    if (!zipResult) return { success: false, zipPath: '', error: '用户取消或打包失败' }
    if (zipResult.error) return { success: false, zipPath: '', error: zipResult.error }

    if (zipFileCount === 0) {
      return { success: false, zipPath: '', error: '写入失败：临时目录不在允许范围内，文件全部写入被拒绝。' }
    }

    return { success: true, zipPath: zipResult.zipPath }
  } catch (e) {
    return { success: false, zipPath: '', error: String(e) }
  }
}
