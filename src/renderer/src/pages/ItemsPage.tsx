import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNpcAssets } from '../data/useNpcAssets'
import { useCustomItems } from '../data/useCustomItems'
import { type CustomItem, type ItemDataType, itemDataTypeLabels } from './items/ItemEditor'
import { useT, asString } from '../i18n'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

/** 从解包数据读取的原版物品 */
interface VanillaItem {
  id: string
  name: string
  displayName: string
  description: string
  type: string
  category: number
  price: number
  texture: string
  spriteIndex: number
}

/** 物品类型映射 — 值为 i18n key */
const typeLabelKeys: Record<string, string> = {
  'Seeds': 'items.subTypeSeeds', 'Basic': 'items.subTypeBasic', 'Vegetable': 'items.subTypeVegetable', 'Fruit': 'items.subTypeFruit',
  'Flower': 'items.subTypeFlower', 'Fish': 'items.subTypeFish', 'Cooking': 'items.subTypeCooking', 'Crafting': 'items.subTypeCrafting',
  'Mineral': 'items.subTypeMineral', 'Minerals': 'items.subTypeMinerals', 'Gem': 'items.catGem', 'Resource': 'items.subTypeResource',
  'MonsterLoot': 'items.subTypeMonsterLoot', 'Meat': 'items.subTypeMeat', 'AnimalProduct': 'items.subTypeAnimalProduct',
  'ArtisanGoods': 'items.subTypeArtisanGoods', 'Fertilizer': 'items.subTypeFertilizer', 'Bait': 'items.subTypeBait', 'Tackle': 'items.subTypeTackle',
  'Litter': 'items.subTypeLitter', 'Quest': 'items.subTypeQuest', 'Ring': 'items.catRing', 'Hat': 'items.typeHat',
  'Boots': 'items.typeBoots', 'Tool': 'items.typeObject', 'Furniture': 'items.catDecor', 'Weapon': 'items.typeWeapon',
  'Clothing': 'items.catDecor', 'Decor': 'items.catDecor',
}

const PAGE_SIZE = 60

export default function ItemsPage(): JSX.Element {
  const navigate = useNavigate()
  const { unpackedRoot } = useNpcAssets()
  const { customItems, addCustomItem, removeCustomItem } = useCustomItems()
  const t = useT()
  /** 强制收窄为 string 的本地 helper */
  const ts = (k: string): string => asString(t, k)

  // ---- 创建自定义物品（直接进编辑器） ----
  const handleCreate = (dataType: ItemDataType = 'object') => {
    const item: CustomItem = {
      id: `item_${Date.now()}`,
      name: ts('items.newItemName'),
      displayName: ts('items.newItemName'),
      description: '',
      dataType,
      price: 0,
      imageUrl: '',
      color: itemDataTypeLabels[dataType].color,
      canGift: true,
      ...(dataType === 'object' ? { objectType: 'Basic', objectCategory: -1, edibility: -300 } : {}),
      ...(dataType === 'weapon' ? { weaponType: 3, minDamage: 1, maxDamage: 5, knockback: 1, speed: 0, precision: 0, defense: 0, areaOfEffect: 0, critChance: 0.02, critMultiplier: 3, canBeLostOnDeath: true } : {}),
      ...(dataType === 'boots' ? { bootsDefense: 0, bootsImmunity: 0, bootsColorIndex: 0 } : {}),
      ...(dataType === 'hat' ? { hatShowHair: 'false', hatSkipOffset: false, hatTags: '' } : {}),
      ...(dataType === 'ring' ? { objectType: 'Ring', objectCategory: -96, edibility: -300 } : {}),
      ...(dataType === 'bigcraftable' ? { bcFragility: 0, bcCanBePlacedIndoors: true, bcCanBePlacedOutdoors: false, bcIsLamp: false, bcSpriteIndex: 0 } : {}),
      ...(dataType === 'clothing' ? { clothingType: 'Shirt', clothingGender: 'Neutral', clothingDyeable: false, clothingCanBeTrashed: true, clothingCanBeGivenAsGift: true, clothingSpriteIndex: 0 } : {}),
      ...(dataType === 'furniture' ? { furnitureType: 'Decor', furnitureSizeX: 1, furnitureSizeY: 1, furnitureBoxX: 0, furnitureBoxY: 0, furnitureBoxWidth: 1, furnitureBoxHeight: 1, furnitureRotations: [0], furnitureCanBePlacedIndoors: true, furnitureCanBePlacedOutdoors: false, furnitureCanBeRemoved: true, furnitureIsLamp: false, furnitureLightRadius: 0, furnitureSpriteIndex: 0, furnitureSeatPositions: [] } : {}),
    }
    addCustomItem(item)
    navigate(`/items/${item.id}`, { state: { newItem: item, allItems: [...customItems, item] } })
  }

  // ---- 原版物品 ----
  const [vanillaItems, setVanillaItems] = useState<VanillaItem[]>([])
  const [unpackedDir, setUnpackedDir] = useState('')
  const [loading, setLoading] = useState(true)
  const [imageCache, setImageCache] = useState<Record<string, string>>({})
  const [loadingImages, setLoadingImages] = useState(false)
  const imageCacheRef = useRef<Record<string, string>>({})
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // 加载原版物品列表
  useEffect(() => {
    if (!unpackedRoot) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    async function load() {
      const result = await window.electronAPI?.xnbListItems?.(unpackedRoot || undefined)
      if (!cancelled && result?.success) {
        setVanillaItems(result.items || [])
        setUnpackedDir(result.unpackedDir || '')
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [unpackedRoot])

  // ---- 筛选 ----
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<string>('all')
  const [page, setPage] = useState(0)

  // 提取所有类型
  const types = useMemo(() => {
    const set = new Set<string>()
    vanillaItems.forEach(i => { if (i.type) set.add(i.type) })
    return [...set].sort()
  }, [vanillaItems])

  const filteredItems = useMemo(() => {
    let items = vanillaItems
    if (activeType !== 'all') items = items.filter(i => i.type === activeType)
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.displayName.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
      )
    }
    return items
  }, [vanillaItems, activeType, search])

  // 当前页物品
  const pagedItems = useMemo(() => {
    return filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  }, [filteredItems, page])
  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE)

  // 切换筛选时重置页码
  useEffect(() => { setPage(0) }, [search, activeType])

  // 批量加载当前页物品贴图
  useEffect(() => {
    if (!unpackedDir || pagedItems.length === 0) return
    const toLoad = pagedItems.filter(i => !imageCacheRef.current[i.id])
    if (toLoad.length === 0) return

    let cancelled = false
    setLoadingImages(true)

    async function batchLoad() {
      const batch = toLoad.map(i => ({ id: i.id, texture: i.texture, spriteIndex: i.spriteIndex }))
      const result = await window.electronAPI?.xnbBatchItemImages?.(unpackedDir, batch)
      if (!cancelled && result) {
        imageCacheRef.current = { ...imageCacheRef.current, ...result }
        setImageCache(prev => ({ ...prev, ...result }))
      }
      if (!cancelled) setLoadingImages(false)
    }

    batchLoad()
    return () => { cancelled = true }
  }, [unpackedDir, pagedItems])

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteTarget(id)
  }

  /** 点击原版物品：以该物品为模板创建自定义物品，直接进入编辑器 */
  const handleVanillaClick = (item: VanillaItem) => {
    const newItem: CustomItem = {
      id: `vanilla_${item.id}_${Date.now()}`,
      name: item.name,
      displayName: item.displayName,
      description: item.description,
      dataType: 'object',
      price: item.price,
      imageUrl: '',
      color: '#888',
      canGift: true,
      objectType: item.type || 'Basic',
      objectCategory: item.category ?? 0,
      edibility: -300,
    }
    addCustomItem(newItem)
    toast(`${ts('items.customCreated')}「${item.displayName}」`, 'success')
    navigate(`/items/${newItem.id}`, { state: { newItem, allItems: [...customItems, newItem] } })
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      removeCustomItem(deleteTarget)
      toast(ts('toast.deleted'), 'success')
      setDeleteTarget(null)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b themed-border-primary flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold themed-text-primary">{ts('items.title')}</h2>
          {customItems.length > 0 && (
            <span className="text-sm px-2 py-0.5 rounded-full bg-white/10 themed-text-secondary">
              {customItems.length} {ts('items.custom')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm themed-text-dimmed">
            {ts('export.totalCount')} <span className="themed-text-primary font-medium">{vanillaItems.length}</span> {ts('items.vanillaCount')}
          </span>
          {loadingImages && (
            <span className="text-xs themed-text-dimmed flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              {ts('items.loadingTextures')}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
        {/* ========== 上半: 我的创作 ========== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold themed-text-secondary flex items-center gap-3">
              <span className="w-1.5 h-5 rounded-full bg-white" />
              {ts('items.myCreation')}
              {customItems.length > 0 && <span className="text-sm themed-text-dimmed font-normal">({customItems.length})</span>}
            </h3>
            {customItems.length > 0 && (
              <button onClick={() => handleCreate()}
                className="text-sm themed-text-muted hover:themed-text-primary flex items-center gap-1 px-3 py-1.5 rounded-lg themed-bg-hover transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {ts('items.newItem')}
              </button>
            )}
          </div>

          {customItems.length === 0 ? (
            /* 空状态：大卡片创建入口 - 按类型选择 */
            <div className="space-y-3">
              <button onClick={() => handleCreate('object')}
                className="w-full themed-bg-secondary border themed-border-primary rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-[#555] hover:bg-[#222] transition-all group">
                <div className="w-16 h-16 rounded-2xl themed-bg-card flex items-center justify-center group-hover:bg-[#333] transition-colors border border-[#3a3a3a]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" className="group-hover:stroke-white transition-colors">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold themed-text-primary">{ts('items.createFirst')}</p>
                  <p className="text-sm themed-text-dimmed mt-1">{ts('items.createFirstDesc')}</p>
                </div>
              </button>
              {/* 快捷创建其他类型 */}
              <div className="grid grid-cols-7 gap-3">
                {([['weapon', 'items.typeWeapon'], ['boots', 'items.typeBoots'], ['hat', 'items.typeHat'], ['ring', 'items.typeRing'], ['bigcraftable', 'items.typeBigCraftable'], ['clothing', 'items.typeClothing'], ['furniture', 'items.typeFurniture']] as [ItemDataType, string][]).map(([dt, labelKey]) => (
                  <button key={dt} onClick={() => handleCreate(dt)}
                    className="themed-bg-secondary border themed-border-primary rounded-xl p-3 flex flex-col items-center gap-1.5 hover:border-[#555] hover:bg-[#222] transition-all group">
                    <div className="w-8 h-8 rounded-lg themed-bg-card flex items-center justify-center" style={{ borderColor: itemDataTypeLabels[dt].color + '40', borderWidth: 1 }}>
                      <span className="text-base font-bold" style={{ color: itemDataTypeLabels[dt].color }}>{ts(labelKey)[0]}</span>
                    </div>
                    <span className="text-base themed-text-secondary group-hover:themed-text-primary transition-colors font-medium">{ts(labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 自定义物品卡片网格 */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {customItems.map(item => {
                const dt = item.dataType || 'object'
                const dtInfo = itemDataTypeLabels[dt]
                const catColor = dtInfo?.color || item.color || '#888'
                return (
                  <button key={item.id} onClick={() => navigate(`/items/${item.id}`)}
                    className="themed-bg-secondary rounded-xl p-4 themed-bg-card-hover transition-all text-left group relative border themed-border-secondary hover:themed-border-active">
                    {/* 删除按钮 */}
                    <button onClick={(e) => handleDeleteCustom(item.id, e)}
                      className="absolute top-2 right-2 themed-text-disabled hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10 p-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                    {/* 图标 */}
                    <div className="w-12 h-12 rounded-xl themed-bg-card flex items-center justify-center mx-auto mb-3 overflow-hidden border-2"
                      style={{ borderColor: catColor + '40' }}>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.displayName} className="w-10 h-10 object-contain" style={{ imageRendering: 'pixelated' }} />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={catColor} strokeWidth="1.5">
                          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                        </svg>
                      )}
                    </div>
                    {/* 名称 */}
                    <p className="text-base themed-text-secondary font-medium truncate text-center">{item.displayName}</p>
                    {/* 标签行 */}
                    <div className="flex items-center justify-center gap-1.5 mt-1.5">
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: catColor + '20', color: catColor }}>
                        {dtInfo ? ts(dtInfo.label) : ts('items.title')}
                      </span>
                      <span className="text-xs themed-text-dimmed">{item.price}g</span>
                    </div>
                  </button>
                )
              })}
              {/* 追加创建卡片 */}
              <button onClick={() => handleCreate()}
                className="themed-bg-secondary rounded-xl p-4 flex flex-col items-center justify-center gap-3 border border-dashed themed-border-active hover:border-[#666] hover:bg-[#222] transition-all min-h-[140px]">
                <div className="w-10 h-10 rounded-full themed-bg-card flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <span className="text-sm themed-text-dimmed">{ts('items.newItem')}</span>
              </button>
            </div>
          )}
        </section>

        {/* ========== 下半: 游戏参考素材 ========== */}
        <section>
          <h3 className="text-base font-semibold themed-text-secondary mb-4 flex items-center gap-3">
            <span className="w-1.5 h-5 rounded-full bg-gray-500" />
            {ts('items.reference')}
            {!loading && <span className="text-sm themed-text-dimmed font-normal">({filteredItems.length})</span>}
          </h3>

          {/* 搜索 + 类型筛选 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={ts('items.search')}
                className="w-full themed-bg-primary border themed-border-primary rounded-lg pl-9 pr-3 py-2 text-sm themed-text-secondary placeholder:themed-text-disabled focus:outline-none focus:border-[#555] transition-colors" />
            </div>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setActiveType('all')}
                className={`text-sm px-2.5 py-1 rounded-md transition-colors ${activeType === 'all' ? 'themed-btn-primary font-medium' : 'themed-text-muted hover:themed-text-primary themed-bg-active'}`}>{ts('items.filterAll')}</button>
              {types.slice(0, 8).map(t => (
                <button key={t} onClick={() => setActiveType(t)}
                  className={`text-sm px-2.5 py-1 rounded-md transition-colors ${activeType === t ? 'themed-btn-primary font-medium' : 'themed-text-muted hover:themed-text-primary themed-bg-active'}`}>
                  {ts(typeLabelKeys[t] || t)}
                </button>
              ))}
              {types.length > 8 && (
                <select value={activeType} onChange={e => setActiveType(e.target.value)}
                  className="text-sm px-2 py-1 rounded-md themed-bg-primary border themed-border-primary themed-text-muted focus:outline-none">
                  <option value="all">{ts('items.moreTypes')}</option>
                  {types.slice(8).map(t => (
                    <option key={t} value={t}>{ts(typeLabelKeys[t] || t)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 物品卡片网格 */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 themed-text-dimmed">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-spin mb-3 opacity-40">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <p className="text-sm">{ts('items.loading')}</p>
            </div>
          ) : !unpackedRoot ? (
            <div className="flex flex-col items-center justify-center py-16 themed-text-dimmed">
              <div className="w-16 h-16 rounded-2xl themed-bg-card flex items-center justify-center mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
              </div>
              <p className="text-sm themed-text-muted">{ts('items.unpackFirst')}</p>
              <p className="text-xs themed-text-disabled mt-1">{ts('items.unpackHint')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {pagedItems.map(item => (
                  <div key={item.id} onClick={() => handleVanillaClick(item)}
                    className="themed-bg-secondary rounded-lg p-2 themed-bg-card-hover transition-colors text-center cursor-pointer group border border-transparent hover:themed-border-primary"
                    title={`${item.displayName}\n${item.description}\n${ts('items.price')}: ${item.price}g`}>
                    <div className="w-9 h-9 rounded-lg themed-bg-card flex items-center justify-center mx-auto mb-1 overflow-hidden">
                      {imageCache[item.id] ? (
                        <img src={imageCache[item.id]} alt={item.displayName} className="w-9 h-9 object-contain" style={{ imageRendering: 'pixelated' }} />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs themed-text-secondary truncate leading-tight">{item.displayName}</p>
                    <p className="text-[11px] themed-text-disabled">{item.price}g</p>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="px-3 py-1.5 text-sm rounded-lg themed-bg-secondary themed-text-secondary themed-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors border themed-border-primary">
                    {ts('items.prevPage')}
                  </button>
                  <span className="text-sm themed-text-dimmed">
                    {page + 1} / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 text-sm rounded-lg themed-bg-secondary themed-text-secondary themed-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors border themed-border-primary">
                    {ts('items.nextPage')}
                  </button>
                </div>
              )}
            </>
          )}
          {!loading && unpackedRoot && filteredItems.length === 0 && (
            <div className="text-center py-12 themed-text-dimmed text-sm">
              <p>{ts('items.noMatch')}</p>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={ts('confirm.deleteTitle')}
        message={ts('confirm.deleteMessage')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
