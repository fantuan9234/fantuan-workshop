// ---- 导出工具 ----
// 生成符合 Content Patcher 规范的模组文件

import type { ProjectSnapshot } from './ProjectContext'

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
  return {
    npcCount: Object.keys(snap.npcAssets || {}).length,
    portraitCount: Object.values(snap.npcAssets || {}).reduce((s, a) => s + Object.keys(a.portraits || {}).length, 0),
    spriteCount: Object.values(snap.npcAssets || {}).reduce((s, a) => s + Object.keys(a.sprites || {}).length, 0),
    eventCount: Array.isArray(snap.events) ? snap.events.length : 0,
    itemCount: Array.isArray(snap.customItems) ? snap.customItems.length : 0,
    mapCount: Array.isArray(snap.maps) ? snap.maps.length : 0,
    questCount: Array.isArray(snap.quests) ? snap.quests.length : 0,
    npcDataCount: Array.isArray(snap.customNpcs) ? snap.customNpcs.length : 0,
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

  // ======== NPC 肖像 ========
  if (snap.npcAssets) {
    Object.entries(snap.npcAssets).forEach(([npcId, assets]) => {
      const portraitKeys = Object.keys(assets.portraits || {})
      if (portraitKeys.length > 0) {
        // 去重：同一个场景只生成一条 Load（合并所有帧到一张图）
        const sceneNames = ['default', 'beach', 'winter', 'spring', 'summer', 'fall', 'flowerdance', 'eggf', 'fair', 'jellies', 'luau', 'spiritseve', 'winterstar', 'icef', 'winter_indoor', 'winter_outdoor', 'hospital', 'jojamart', 'trenchcoat']
        const addedScenes = new Set<string>()
        portraitKeys.forEach((key) => {
          const [sceneIdx] = key.split('_')
          const scene = sceneNames[Number(sceneIdx)] || 'default'
          const sceneKey = sceneIdx === '0' ? 'default' : scene
          if (addedScenes.has(sceneKey)) return
          addedScenes.add(sceneKey)

          // 自定义NPC使用 {{ModId}}_ 前缀避免与原版冲突
          const isCustomNpc = Array.isArray(snap.customNpcs) && snap.customNpcs.some((n: any) => n.name === npcId || n.id === npcId)
          const npcPrefix = isCustomNpc ? '{{ModId}}_' : ''
          const target = sceneIdx === '0' ? `Portraits/${npcPrefix}${npcId}` : `Portraits/${npcPrefix}${npcId}_${scene}`
          const fromFile = sceneIdx === '0' ? `assets/portraits/${npcId}.png` : `assets/portraits/${npcId}_${scene}.png`
          changes.push({
            LogName: `肖像: ${npcId} ${scene}`,
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
    Object.entries(snap.npcAssets).forEach(([npcId, assets]) => {
      const spriteKeys = Object.keys(assets.sprites || {})
      if (spriteKeys.length > 0) {
        // 去重：同一个 NPC 只需要一条 Load 替换整个行走图
        const addedSprites = new Set<string>()
        spriteKeys.forEach((key) => {
          const [dirId] = key.split('_')
          if (addedSprites.has(npcId)) return
          addedSprites.add(npcId)
          // 自定义NPC使用 {{ModId}}_ 前缀避免与原版冲突
          const isCustomNpc = Array.isArray(snap.customNpcs) && snap.customNpcs.some((n: any) => n.name === npcId || n.id === npcId)
          const npcPrefix = isCustomNpc ? '{{ModId}}_' : ''
          changes.push({
            LogName: `行走图: ${npcId}`,
            Action: 'Load',
            Target: `Characters/${npcPrefix}${npcId}`,
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
    const weaponEntries: Record<string, unknown> = {}
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
      const typeMap: Record<string, string> = {
        story: 'Basic',
        help: 'Basic',
        specialOrder: 'Basic',
        collection: 'Basic',
        custom: 'Basic',
      }
      const questType = typeMap[(quest.type as string) ?? 'custom'] ?? 'Basic'
      const daysLeft = (quest.days as number) > 0 ? (quest.days as number) : -1
      const objectives = (quest.objectives as Array<{ label: string }> | undefined) ?? []
      const objective = objectives.map(o => o.label).join(', ') || ''

      // 金币奖励
      const rewards = quest.rewards as { gold?: number; friendship?: number; items?: Array<{ itemId: string; itemName: string; count: number }> } | undefined
      const moneyReward = rewards?.gold ?? 0

      // 目标字段：如果有物品奖励则用物品ID，否则留空
      let target = ''
      if (rewards?.items && rewards.items.length > 0) {
        target = rewards.items[0].itemId || rewards.items[0].itemName || ''
      }

      // 是否可取消
      const canCancel = quest.canCancel === false ? 'false' : 'true'

      // 格式: type/title/description/objective/target/daysLeft/moneyReward/.../canCancel
      const fields = [
        questType,                                          // 0: type (字符串)
        (quest.displayName as string) || '',                // 1: title
        (quest.description as string) || '',                // 2: description
        objective,                                          // 3: objective text
        target,                                             // 4: target (物品ID/位置名等)
        daysLeft,                                           // 5: days left
        moneyReward,                                        // 6: money reward
        -1,                                                 // 7: reward type (物品奖励类型, -1=无)
        -1,                                                 // 8: reward value
        canCancel,                                          // 9: can cancel
      ]
      const questKey = (quest.name as string) || 'CustomQuest'
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
      // EditMap 新增字段
      if (p.setSize) {
        editMapEntry.SetSize = { Width: (p.setSize as { width: number }).width, Height: (p.setSize as { height: number }).height }
      }
      if (p.addToRight && (p.addToRight as number) > 0) {
        editMapEntry.AddToRight = p.addToRight
      }
      if (p.addToBottom && (p.addToBottom as number) > 0) {
        editMapEntry.AddToBottom = p.addToBottom
      }
      if (Array.isArray(p.addTileSheets) && p.addTileSheets.length > 0) {
        editMapEntry.AddTileSheets = (p.addTileSheets as Array<Record<string, unknown>>).map(ts => ({
          Id: ts.id_field,
          ImageSource: ts.imageSource,
          TileWidth: ts.tileWidth,
          TileHeight: ts.tileHeight,
        }))
      }
      if (Array.isArray(p.setTileProperties) && p.setTileProperties.length > 0) {
        const propsMap: Record<string, Array<{ X: number; Y: number; Properties: Record<string, string> }>> = {}
        for (const tp of p.setTileProperties as Array<Record<string, unknown>>) {
          const layer = (tp.layer as string) || 'Back'
          if (!propsMap[layer]) propsMap[layer] = []
          propsMap[layer].push({
            X: tp.x as number,
            Y: tp.y as number,
            Properties: (tp.properties as Record<string, string>) || {},
          })
        }
        editMapEntry.SetTileProperties = propsMap
      }
      if (Array.isArray(p.removeWarps) && p.removeWarps.length > 0) {
        editMapEntry.RemoveWarps = (p.removeWarps as Array<Record<string, unknown>>).map(rw => ({
          X: rw.x as number,
          Y: rw.y as number,
        }))
      }
      if (p.setMapProperties && typeof p.setMapProperties === 'object' && Object.keys(p.setMapProperties as Record<string, unknown>).length > 0) {
        editMapEntry.SetMapProperties = p.setMapProperties
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
      const entry: Record<string, unknown> = {
        DisplayName: displayName,
        MapPath: `Maps/{{ModId}}_${mapName}`,
        Type: locationType,
        Weather: 'Default',
        Music: (c.music as string) || 'spring',
        MusicContext: 'Default',
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

      // 外部地图 → 内部地图的 warp
      // 格式: "x y TargetMap TargetX TargetY"
      const extWarp = `${extX} ${extY} ${intMap} ${intX} ${intY}`
      if (!exteriorWarps[extMap]) exteriorWarps[extMap] = []
      exteriorWarps[extMap].push(extWarp)

      // 内部地图 → 外部地图的 warp
      const intWarp = `${exitX} ${exitY} ${extMap} ${extX} ${extY}`
      if (!interiorWarps[intMap]) interiorWarps[intMap] = []
      interiorWarps[intMap].push(intWarp)
    })

    // 生成外部地图的 EditMap + AddWarps
    Object.entries(exteriorWarps).forEach(([mapName, warps]) => {
      changes.push({
        LogName: `建筑入口: ${mapName}`,
        Action: 'EditMap',
        Target: `Maps/${mapName}`,
        AddWarps: warps,
      })
    })

    // 生成内部地图的 EditMap + AddWarps
    Object.entries(interiorWarps).forEach(([mapName, warps]) => {
      changes.push({
        LogName: `建筑出口: ${mapName}`,
        Action: 'EditMap',
        Target: `Maps/${mapName}`,
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
      const homeLocation = (n.homeLocation as string) || 'Town'
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
              Location: h.location || homeLocation,
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
      if (canMarry) {
        if (n.spouseRoom) {
          charEntry.SpouseRoom = {
            MapAsset: n.spouseRoom.mapAsset || `{{ModId}}_spouse_rooms`,
            MapSourceRect: {
              X: n.spouseRoom.mapSourceRect?.x ?? 0,
              Y: n.spouseRoom.mapSourceRect?.y ?? 0,
              Width: n.spouseRoom.mapSourceRect?.width ?? 6,
              Height: n.spouseRoom.mapSourceRect?.height ?? 9,
            }
          }
        } else {
          charEntry.SpouseRoom = {
            MapAsset: `{{ModId}}_spouse_rooms`,
            MapSourceRect: { X: 0, Y: 0, Width: 6, Height: 9 }
          }
        }
        // 配偶露台
        if (n.spousePatio) {
          const patioEntry: Record<string, unknown> = {
            MapAsset: n.spousePatio.mapAsset || 'spousePatios',
            MapSourceRect: {
              X: n.spousePatio.mapSourceRect?.x ?? 0,
              Y: n.spousePatio.mapSourceRect?.y ?? 0,
              Width: n.spousePatio.mapSourceRect?.width ?? 4,
              Height: n.spousePatio.mapSourceRect?.height ?? 4,
            }
          }
          if (n.spousePatio.spriteAnimationFrames) {
            patioEntry.SpriteAnimationFrames = n.spousePatio.spriteAnimationFrames
          }
          if (n.spousePatio.spriteAnimationPixelOffset) {
            patioEntry.SpriteAnimationPixelOffset = {
              X: n.spousePatio.spriteAnimationPixelOffset.x,
              Y: n.spousePatio.spriteAnimationPixelOffset.y,
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

      // NPCGiftTastes entry (1.6 JSON model 格式)
      const gt = n.giftTastes as Record<string, string> | undefined
      if (gt && (gt.loved || gt.liked || gt.disliked || gt.hated || gt.neutral)) {
        const giftEntry: Record<string, unknown> = {}
        // 反应文本
        if (gt.loveResponse) giftEntry.LoveResponse = gt.loveResponse
        if (gt.likeResponse) giftEntry.LikeResponse = gt.likeResponse
        if (gt.neutralResponse) giftEntry.NeutralResponse = gt.neutralResponse
        if (gt.dislikeResponse) giftEntry.DislikeResponse = gt.dislikeResponse
        if (gt.hateResponse) giftEntry.HateResponse = gt.hateResponse
        // 物品列表（将空格分隔的ID转为数组，添加 (O) 前缀）
        const toItemArray = (ids: string | undefined) => {
          if (!ids || !ids.trim()) return undefined
          return ids.trim().split(/\s+/).map(id => {
            // 如果已有前缀 (O)/(W) 等则保留，否则添加 (O)
            if (id.startsWith('(')) return id
            return `(O)${id}`
          })
        }
        const lovedItems = toItemArray(gt.loved)
        const likedItems = toItemArray(gt.liked)
        const neutralItems = toItemArray(gt.neutral)
        const dislikedItems = toItemArray(gt.disliked)
        const hatedItems = toItemArray(gt.hated)
        if (lovedItems) giftEntry.LovedItems = lovedItems
        if (likedItems) giftEntry.LikedItems = likedItems
        if (neutralItems) giftEntry.NeutralItems = neutralItems
        if (dislikedItems) giftEntry.DislikedItems = dislikedItems
        if (hatedItems) giftEntry.HatedItems = hatedItems

        giftTasteEntries[modNpcName] = giftEntry
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
        const marriageFilePath = `assets/dialogues/MarriageDialogue${modNpcName}.json`
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
            if (entry.condition) line = `${entry.condition}/`
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
        const filePath = `assets/schedules/${npcName}.json`
        extraFiles.push({
          path: filePath,
          data: JSON.stringify(dayMap, null, 2),
        })
        changes.push({
          LogName: `日程: ${npcName}`,
          Action: 'Load',
          Target: `Characters/Schedules/${npcName}`,
          FromFile: filePath,
        })
      })
    }

    // Characters/Dialogue/{npcName} (使用 Load 加载 JSON 文件，兼容性最佳)
    Object.entries(dialogueEntriesMap).forEach(([npcName, dialogueMap]) => {
      const filePath = `assets/dialogues/${npcName}.json`
      extraFiles.push({
        path: filePath,
        data: JSON.stringify(dialogueMap, null, 2),
      })
      changes.push({
        LogName: `对话: ${npcName}`,
        Action: 'Load',
        Target: `Characters/Dialogue/${npcName}`,
        FromFile: filePath,
      })
    })

    // Characters/Dialogue/rainy (雨天对话，格式: { "NPC名": "对话内容" })
    // 游戏从 rainy.json 文件读取所有NPC的雨天对话
    if (Object.keys(rainyDialogueMap).length > 0) {
      const filePath = 'assets/dialogues/rainy.json'
      extraFiles.push({
        path: filePath,
        data: JSON.stringify(rainyDialogueMap, null, 2),
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

        // 礼物偏好覆盖 (1.6 JSON model 格式)
        if (override.giftTastes) {
          const gt = override.giftTastes
          const giftEntry: Record<string, unknown> = {}
          // 反应文本
          const lines = override.giftTasteLines || {}
          if (lines.loved) giftEntry.LoveResponse = lines.loved
          if (lines.liked) giftEntry.LikeResponse = lines.liked
          if (lines.disliked) giftEntry.DislikeResponse = lines.disliked
          if (lines.hated) giftEntry.HateResponse = lines.hated
          // 物品列表
          const toItemArray = (ids: string | undefined) => {
            if (!ids || !ids.trim()) return undefined
            return ids.trim().split(/\s+/).map(id => {
              if (id.startsWith('(')) return id
              return `(O)${id}`
            })
          }
          const lovedItems = toItemArray(gt.loved)
          const likedItems = toItemArray(gt.liked)
          const neutralItems = toItemArray(gt.neutral)
          const dislikedItems = toItemArray(gt.disliked)
          const hatedItems = toItemArray(gt.hated)
          if (lovedItems) giftEntry.LovedItems = lovedItems
          if (likedItems) giftEntry.LikedItems = likedItems
          if (neutralItems) giftEntry.NeutralItems = neutralItems
          if (dislikedItems) giftEntry.DislikedItems = dislikedItems
          if (hatedItems) giftEntry.HatedItems = hatedItems

          vanillaGiftTasteEntries[npcName] = giftEntry
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
              // 条件命令
              let line = ''
              if (entry.condition) {
                line = `${entry.condition}/`
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
                if (entry.condition) line = `${entry.condition}/`
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
// 格式: 地点/时间范围/条件1/条件2/.../farmer X Y 朝向/NPC名 X Y 朝向/skippable/对话/移动/.../end
// 参考: https://stardewvalleywiki.com/Modding:Event_data
function buildEventScript(ev: Record<string, unknown>): string {
  const parts: string[] = []

  // 1. 地点
  const mapName = ((ev as any).map as string) || 'Town'
  parts.push(mapName)

  // 2. 时间范围 (格式: HHMM HHMM，如 1000 1600)
  const timeStart = ((ev as any).timeStart as string) || '0600'
  const timeEnd = ((ev as any).timeEnd as string) || '2400'
  // 将 "09:00" 格式转为 "0900" 格式
  const ts = timeStart.replace(':', '').replace(/^(\d{4})$/, '$1')
  const te = timeEnd.replace(':', '').replace(/^(\d{4})$/, '$1')
  parts.push(`${ts} ${te}`)

  // 3. 好感度条件 (格式: f 好感度数值，如 f 500 表示2心)
  const heartRequired = Number((ev as any).heartRequired) || 0
  if (heartRequired > 0) {
    parts.push(`f ${heartRequired * 250}`)
  }

  // 4. 季节条件 (s 0=春, s 1=夏, s 2=秋, s 3=冬)
  const season = (ev.season as string) || 'any'
  const seasonMap: Record<string, string> = { spring: '0', summer: '1', fall: '2', winter: '3' }
  if (season !== 'any' && seasonMap[season] !== undefined) {
    parts.push(`s ${seasonMap[season]}`)
  }

  // 5. 天气条件 (w = 雨天)
  const weather = (ev.weather as string) || 'any'
  if (weather === 'rainy') {
    parts.push('w')
  }

  // 6. 玩家位置 (farmer X Y 朝向)
  const farmerX = ((ev as any).farmerX as number) ?? 5
  const farmerY = ((ev as any).farmerY as number) ?? 5
  const farmerFacing = ((ev as any).farmerFacing as number) ?? 2
  parts.push(`farmer ${farmerX} ${farmerY} ${farmerFacing}`)

  // 7. NPC位置 (NPC名 X Y 朝向)
  const npcIds = ev.npcIds as string[] | undefined
  if (npcIds && npcIds.length > 0) {
    const npcX = ((ev as any).npcX as number) ?? 10
    const npcY = ((ev as any).npcY as number) ?? 10
    npcIds.forEach((nid, i) => {
      parts.push(`${nid} ${Number(npcX) + i * 3} ${npcY} 2`)
    })
  }

  // 8. skippable 标记
  parts.push('skippable')

  // 9. 事件步骤转译
  const steps = (ev as any).steps as Array<Record<string, unknown>> | undefined
  if (steps && Array.isArray(steps)) {
    steps.forEach((step: Record<string, unknown>) => {
      const type = step.type as string
      const cfg = (step.config || {}) as Record<string, string>

      switch (type) {
        case 'dialogue': {
          const speaker = cfg.speaker || 'null'
          const text = cfg.text || ''
          // 游戏标准格式: NPC名 "对话内容"
          if (speaker === 'null' || speaker === 'narrator') {
            parts.push(`message "${text}"`)
          } else {
            parts.push(`${speaker} "${text}"`)
          }
          break
        }
        case 'move': {
          const target = cfg.target || 'farmer'
          const x = cfg.x || '0'
          const y = cfg.y || '0'
          // 游戏标准格式: move NPC名 X Y 速度
          parts.push(`move ${target} ${x} ${y} 2`)
          break
        }
        case 'animate': {
          const target = cfg.target || 'farmer'
          const emotion = cfg.emotion || 'neutral'
          // 表情ID映射: 8=疑问, 12=生气, 16=开心, 20=害羞, 28=悲伤
          const emotionMap: Record<string, number> = {
            neutral: 16, surprised: 8, happy: 16, sad: 28,
            angry: 12, shy: 20, love: 20, blush: 20,
          }
          const emoteId = emotionMap[emotion] ?? 16
          parts.push(`emote ${target} ${emoteId}`)
          break
        }
        case 'effect': {
          // 淡入淡出: fade 类型 速度 (0=黑, 1=白)
          parts.push('fade 0 0.007')
          break
        }
        case 'bgm': {
          // 播放音乐: music 音乐ID
          parts.push(`music ${cfg.track || 'spring'}`)
          break
        }
        case 'choice': {
          const question = cfg.question || ''
          const opts = [cfg.choice1, cfg.choice2, cfg.choice3, cfg.choice4].filter(Boolean)
          // 游戏标准格式: choice "问题"/"选项1"/"选项2"
          // 如果有问题文本，先添加问题
          const choiceParts: string[] = []
          if (question) choiceParts.push(`"${question}"`)
          opts.forEach(opt => choiceParts.push(`"${opt}"`))
          parts.push(`choice ${choiceParts.join('/')}`)
          // 分支选项内容
          opts.forEach((opt, i) => {
            parts.push(`"${opt}":`)
            // 简单分支：默认第一个选项加好感
            if (i === 0 && npcIds && npcIds.length > 0) {
              parts.push(`friendship ${npcIds[0]} 50`)
            }
          })
          break
        }
        case 'reward': {
          if (cfg.type === 'friendship' && cfg.npcId && cfg.amount) {
            parts.push(`friendship ${cfg.npcId} ${cfg.amount}`)
          }
          break
        }
        case 'warp': {
          // 传送: warp farmer X Y
          parts.push(`warp farmer ${cfg.x || '0'} ${cfg.y || '0'}`)
          break
        }
        case 'pause': {
          const ms = cfg.ms || '1000'
          parts.push(`pause ${ms}`)
          break
        }
        case 'viewport': {
          const x = cfg.x || '0'
          const y = cfg.y || '0'
          parts.push(`viewport ${x} ${y}`)
          break
        }
        case 'fade': {
          const fadeType = cfg.fadeType || '0'
          const speed = cfg.speed || '0.007'
          parts.push(`fade ${fadeType} ${speed}`)
          break
        }
        case 'jump': {
          const target = cfg.target || 'farmer'
          parts.push(`jump ${target}`)
          break
        }
        case 'addMail': {
          const mailId = cfg.mailId || ''
          if (mailId) parts.push(`addMail ${mailId}`)
          break
        }
        case 'friendship': {
          const npcId = cfg.npcId || ''
          const amount = cfg.amount || '0'
          if (npcId) parts.push(`friendship ${npcId} ${amount}`)
          break
        }
        case 'face': {
          const target = cfg.target || 'farmer'
          const direction = cfg.direction || '2'
          parts.push(`face ${target} ${direction}`)
          break
        }
        case 'sound': {
          const soundId = cfg.soundId || ''
          if (soundId) parts.push(`sound ${soundId}`)
          break
        }
        case 'ambient': {
          const ambientId = cfg.ambientId || ''
          if (ambientId) parts.push(`ambient ${ambientId}`)
          break
        }
        case 'addItem': {
          const itemId = cfg.itemId || ''
          const count = cfg.count || '1'
          if (itemId) parts.push(`addItem ${itemId} ${count}`)
          break
        }
        case 'removeItem': {
          const itemId = cfg.itemId || ''
          const count = cfg.count || '1'
          if (itemId) parts.push(`removeItem ${itemId} ${count}`)
          break
        }
        case 'addQuest': {
          const questId = cfg.questId || ''
          if (questId) parts.push(`addQuest ${questId}`)
          break
        }
        case 'completeQuest': {
          const questId = cfg.questId || ''
          if (questId) parts.push(`completeQuest ${questId}`)
          break
        }
        case 'setMail': {
          const mailId = cfg.mailId || ''
          if (mailId) parts.push(`addMail ${mailId}`)
          break
        }
        case 'setEventSeen': {
          const eventId = cfg.eventId || ''
          if (eventId) parts.push(`addMail ${eventId}`)
          break
        }
        case 'unlockRecipe': {
          const recipeName = cfg.recipeName || ''
          if (recipeName) parts.push(`learnRecipe ${recipeName}`)
          break
        }
        case 'spawn': {
          const target = cfg.target || 'farmer'
          const x = cfg.x || '0'
          const y = cfg.y || '0'
          parts.push(`addActor ${target} ${x} ${y}`)
          break
        }
        case 'remove': {
          const target = cfg.target || 'farmer'
          parts.push(`removeActor ${target}`)
          break
        }
        case 'createObject': {
          const itemId = cfg.itemId || ''
          const x = cfg.x || '0'
          const y = cfg.y || '0'
          if (itemId) parts.push(`createObject ${itemId} ${x} ${y}`)
          break
        }
        case 'destroyObject': {
          const x = cfg.x || '0'
          const y = cfg.y || '0'
          parts.push(`destroyObject ${x} ${y}`)
          break
        }
        case 'text': {
          const text = cfg.text || ''
          parts.push(`textAboveHead farmer "${text}"`)
          break
        }
        case 'message': {
          const text = cfg.text || ''
          parts.push(`message "${text}"`)
          break
        }
        case 'question': {
          const question = cfg.question || ''
          const yesLabel = cfg.yesLabel || 'Yes'
          const noLabel = cfg.noLabel || 'No'
          parts.push(`question null "${question}#${yesLabel}#${noLabel}"`)
          break
        }
        case 'shake': {
          const intensity = cfg.intensity || '10'
          const duration = cfg.duration || '500'
          parts.push(`shake ${intensity} ${duration}`)
          break
        }
        case 'showFrame': {
          const target = cfg.target || 'farmer'
          const frameIndex = cfg.frameIndex || '0'
          parts.push(`showFrame ${target} ${frameIndex}`)
          break
        }
        case 'emote': {
          const target = cfg.target || 'farmer'
          const emoteId = cfg.emoteId || '16'
          parts.push(`emote ${target} ${emoteId}`)
          break
        }
        default: {
          // 保留原始文本
          if (cfg.raw) parts.push(cfg.raw)
        }
      }
    })
  }

  // 10. 结束标记
  parts.push('end')

  return parts.join('/')
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

  const sceneNames = ['default', 'beach', 'winter', 'spring', 'summer', 'fall', 'flowerdance', 'eggf', 'fair', 'jellies', 'luau', 'spiritseve', 'winterstar', 'icef', 'winter_indoor', 'winter_outdoor']

  Object.entries(snap.npcAssets).forEach(([npcId, assets]) => {
    // 肖像：每个场景一个独立文件
    Object.entries(assets.portraits || {}).forEach(([key, dataUrl]) => {
      const [sceneIdx] = key.split('_')
      const scene = sceneNames[Number(sceneIdx)] || 'default'
      const path = sceneIdx === '0' ? `assets/portraits/${npcId}.png` : `assets/portraits/${npcId}_${scene}.png`
      if (!addedPortraits.has(path)) {
        addedPortraits.add(path)
        files.push({ path, dataUrl })
      }
    })

    // 行走图：每个 NPC 一个文件（去重）
    const addedSpriteFiles = new Set<string>()
    Object.entries(assets.sprites || {}).forEach(([key, dataUrl]) => {
      const [dirId] = key.split('_')
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
    await api.writeFile(`${modDir}/manifest.json`, JSON.stringify(manifest, null, 2))
    fileCount++

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
      await api.writeFile(`${modDir}/content.json`, JSON.stringify(finalContent, null, 2))
    } else {
      await api.writeFile(`${modDir}/content.json`, JSON.stringify(content, null, 2))
    }
    fileCount++
    for (const f of extraFiles) {
      await api.writeFile(`${modDir}/${f.path}`, f.data)
      fileCount++
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
    await api.writeFile(`${packDir}/manifest.json`, JSON.stringify(generateManifest(config), null, 2))
    await api.writeFile(`${packDir}/content.json`, JSON.stringify(content, null, 2))
    for (const f of extraFiles) {
      await api.writeFile(`${packDir}/${f.path}`, f.data)
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

    return { success: true, zipPath: zipResult.zipPath }
  } catch (e) {
    return { success: false, zipPath: '', error: String(e) }
  }
}
