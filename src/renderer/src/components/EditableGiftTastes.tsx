import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { useNpcAssets } from '../data/useNpcAssets'
import { useProject, type VanillaNpcOverride } from '../data/ProjectContext'
import { useLocale } from '../i18n'
import { GIFT_CATEGORY_IDS, type NPCInfo } from '../data/npcData'

// ─── Types ────────────────────────────────────────

interface VanillaGameItem {
  id: string; name: string; displayName: string; description: string
  type: string; category: number; price: number; texture: string; spriteIndex: number
}

// ─── Constants ────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  '': '其他',
  'Seeds': '种子', 'Basic': '基础', 'Vegetable': '蔬菜', 'Fruit': '水果',
  'Flower': '花卉', 'Fish': '鱼类', 'Cooking': '料理', 'Crafting': '合成',
  'Mineral': '矿物', 'Minerals': '矿物', 'Gem': '宝石', 'Resource': '资源',
  'MonsterLoot': '怪物掉落', 'Meat': '肉类', 'AnimalProduct': '动物制品',
  'ArtisanGoods': '工匠品', 'Fertilizer': '肥料', 'Bait': '鱼饵', 'Tackle': '钓具',
  'Litter': '垃圾', 'Quest': '任务', 'Ring': '戒指', 'Hat': '帽子',
  'Boots': '靴子', 'Tool': '工具', 'Furniture': '家具', 'Weapon': '武器',
  'Clothing': '服装', 'Decor': '装饰',
}

const GIFT_TYPE_WHITELIST = new Set([
  'Fruit', 'Vegetable', 'Flower', 'Fish', 'Cooking', 'ArtisanGoods',
  'AnimalProduct', 'Gem', 'Mineral', 'Minerals', 'Resource', 'Crafting',
  'Ring', 'Hat', 'Boots', 'Weapon', 'Meat', 'MonsterLoot', 'Seeds',
  'Furniture', 'Clothing', 'Decor', 'Bait', 'Tackle', 'Fertilizer',
])

const TYPE_ORDER = [
  'Fruit', 'Vegetable', 'Flower', 'Fish', 'Cooking', 'ArtisanGoods',
  'AnimalProduct', 'Gem', 'Mineral', 'Minerals', 'Resource', 'Crafting',
  'Weapon', 'Ring', 'Hat', 'Boots', 'Furniture', 'Clothing', 'Decor',
  'Meat', 'MonsterLoot', 'Seeds', 'Bait', 'Tackle', 'Fertilizer',
]

const CATEGORY_LABELS: Record<string, string> = {
  '-2': '宝石类', '-4': '鱼类(所有)', '-5': '蛋类', '-6': '奶类',
  '-7': '烹饪原料', '-8': '合成类', '-10': '花卉类', '-12': '矿物类',
  '-14': '肉类', '-15': '金属资源', '-16': '建材类', '-18': '家具类',
  '-20': '垃圾类', '-21': '鱼饵类', '-22': '钓具类', '-24': '烹饪类',
  '-26': '工匠品类', '-27': '糖浆类', '-28': '怪物掉落',
  '-74': '蔬菜类', '-75': '水果类', '-79': '种子类', '-80': '调料类',
  '-81': '采集品类',
}

const GIFT_CATS: { key: 'loved' | 'liked' | 'disliked' | 'hated'; label: string; color: string; borderColor: string; dotColor: string }[] = [
  { key: 'loved',     label: '最爱',   color: 'text-emerald-400', borderColor: 'border-emerald-700/50', dotColor: 'bg-emerald-500' },
  { key: 'liked',     label: '喜欢',   color: 'text-sky-400',    borderColor: 'border-sky-700/50',    dotColor: 'bg-sky-500'    },
  { key: 'disliked',  label: '不喜欢', color: 'text-orange-400', borderColor: 'border-orange-700/50',  dotColor: 'bg-orange-500' },
  { key: 'hated',     label: '讨厌',   color: 'text-red-400',    borderColor: 'border-red-700/50',     dotColor: 'bg-red-500'   },
]

// ─── Helper functions ─────────────────────────────

function getItemDisplayName(id: string, vanillaItems: VanillaGameItem[]): string {
  if (id.startsWith('-')) return CATEGORY_LABELS[id] || '类别' + id
  const item = vanillaItems.find(i => i.id === id)
  return item?.displayName || item?.name || 'ID:' + id
}

function parseGiftSegment(raw: string, segIdx: number): { line: string; ids: string[] } {
  if (!raw) return { line: '', ids: [] }
  const parts = raw.split('/')
  if (parts.length < 8) return { line: '', ids: [] }
  const line = (parts[segIdx - 1] || '').replace(/\^/g, ' / ')
  const idsStr = parts[segIdx] || ''
  const ids = idsStr.trim() ? idsStr.trim().split(/\s+/).filter(Boolean) : []
  return { line, ids }
}

function parseVanillaGiftTastes(input: string | { npcData: string; universal: Record<string, string> } | null | undefined): {
  loved: string; liked: string; disliked: string; hated: string; neutral: string;
  lovedLine: string; likedLine: string; dislikedLine: string; hatedLine: string; neutralLine: string
} | null {
  if (!input) return null
  const raw = typeof input === 'string' ? input : input.npcData
  if (!raw) return null
  const lovedSeg = parseGiftSegment(raw, 1)
  const likedSeg = parseGiftSegment(raw, 3)
  const dislikedSeg = parseGiftSegment(raw, 5)
  const hatedSeg = parseGiftSegment(raw, 7)
  // neutral: 在 SDV 1.6 中 neutral 段位于喜欢前面
  const parts = raw.split('/')
  const neutralIds = parts.length >= 5 ? parts[4] || '' : ''
  return {
    loved: lovedSeg.ids.join(' '),
    liked: likedSeg.ids.join(' '),
    disliked: dislikedSeg.ids.join(' '),
    hated: hatedSeg.ids.join(' '),
    neutral: neutralIds.trim(),
    lovedLine: lovedSeg.line,
    likedLine: likedSeg.line,
    dislikedLine: dislikedSeg.line,
    hatedLine: hatedSeg.line,
    neutralLine: parts.length >= 4 ? (parts[3] || '').replace(/\^/g, ' / ') : '',
  }
}

// ─── Component ────────────────────────────────────

interface Props {
  npc: NPCInfo
  updateCustomNpc: (u: Partial<NPCInfo>) => void
  custom: boolean
}

const EditableGiftTastes = memo(function EditableGiftTastesImpl({ npc, updateCustomNpc, custom }: Props): JSX.Element {
  const { unpackedRoot } = useNpcAssets()
  const { mutateSnapshot, getFullSnapshot } = useProject()
  const locale = useLocale()

  const vanillaOverride = !custom ? (getFullSnapshot().vanillaNpcOverrides || {})[npc.name] : undefined

  const [loved, setLoved] = useState(custom ? (npc.giftTastes?.loved || '') : (vanillaOverride?.giftTastes?.loved || ''))
  const [liked, setLiked] = useState(custom ? (npc.giftTastes?.liked || '') : (vanillaOverride?.giftTastes?.liked || ''))
  const [disliked, setDisliked] = useState(custom ? (npc.giftTastes?.disliked || '') : (vanillaOverride?.giftTastes?.disliked || ''))
  const [hated, setHated] = useState(custom ? (npc.giftTastes?.hated || '') : (vanillaOverride?.giftTastes?.hated || ''))
  const [lovedLine, setLovedLine] = useState(custom ? '' : (vanillaOverride?.giftTasteLines?.loved || ''))
  const [likedLine, setLikedLine] = useState(custom ? '' : (vanillaOverride?.giftTasteLines?.liked || ''))
  const [dislikedLine, setDislikedLine] = useState(custom ? '' : (vanillaOverride?.giftTasteLines?.disliked || ''))
  const [hatedLine, setHatedLine] = useState(custom ? '' : (vanillaOverride?.giftTasteLines?.hated || ''))
  const [vanillaGiftsLoaded, setVanillaGiftsLoaded] = useState(false)

  const [activeCategory, setActiveCategory] = useState<'loved' | 'liked' | 'disliked' | 'hated'>('loved')
  const [giftCategory, setGiftCategory] = useState('全部')
  const [giftSearch, setGiftSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [itemImageCache, setItemImageCache] = useState<Record<string, string>>({})
  const itemImageCacheRef = useRef<Record<string, string>>({})
  const [vanillaItems, setVanillaItems] = useState<VanillaGameItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)

  // Load vanilla gift tastes for vanilla NPCs
  useEffect(() => {
    if (custom || vanillaGiftsLoaded) return
    const currentOverride = (getFullSnapshot().vanillaNpcOverrides || {})[npc.name]
    if (currentOverride?.giftTastes && Object.keys(currentOverride.giftTastes).length > 0) return
    window.electronAPI?.npcReadVanillaGiftTastes?.(unpackedRoot || '', npc.name, locale).then(vanillaData => {
      if (vanillaData) {
        const parsed = parseVanillaGiftTastes(vanillaData)
        if (parsed) {
          if (parsed.loved) setLoved(parsed.loved)
          if (parsed.liked) setLiked(parsed.liked)
          if (parsed.disliked) setDisliked(parsed.disliked)
          if (parsed.hated) setHated(parsed.hated)
          if (parsed.lovedLine) setLovedLine(parsed.lovedLine)
          if (parsed.likedLine) setLikedLine(parsed.likedLine)
          if (parsed.dislikedLine) setDislikedLine(parsed.dislikedLine)
          if (parsed.hatedLine) setHatedLine(parsed.hatedLine)
        }
      }
      setVanillaGiftsLoaded(true)
    }).catch(() => setVanillaGiftsLoaded(true))
  }, [custom, npc.name, unpackedRoot, vanillaGiftsLoaded])

  // Load game items
  useEffect(() => {
    if (!unpackedRoot) { setItemsLoading(false); return }
    let cancelled = false
    setItemsLoading(true)
    async function load() {
      const result = await (window as any).electronAPI?.xnbListItems?.(unpackedRoot)
      if (!cancelled && result?.success && result.items) {
        const seen = new Set<string>()
        const unique = (result.items as VanillaGameItem[]).filter(item => {
          if (seen.has(item.id)) return false
          seen.add(item.id)
          return true
        })
        setVanillaItems(unique)
      }
      if (!cancelled) setItemsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [unpackedRoot])

  // Extract available types
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>()
    vanillaItems.forEach(item => { if (item.type) typeSet.add(item.type) })
    const ordered = TYPE_ORDER.filter(t => typeSet.has(t))
    typeSet.forEach(t => { if (!ordered.includes(t)) ordered.push(t) })
    return ordered
  }, [vanillaItems])

  const categoryTabs = useMemo(() => {
    const tabs: { label: string; type: string }[] = [{ label: '全部', type: '全部' }]
    for (const t of availableTypes) {
      if (!GIFT_TYPE_WHITELIST.has(t)) continue
      tabs.push({ label: TYPE_LABELS[t] || t, type: t })
    }
    return tabs
  }, [availableTypes])

  const persist = () => {
    const gt: Record<string, string> = {}
    if (loved.trim()) gt.loved = loved.trim()
    if (liked.trim()) gt.liked = liked.trim()
    if (disliked.trim()) gt.disliked = disliked.trim()
    if (hated.trim()) gt.hated = hated.trim()
    const gtl: Record<string, string> = {}
    if (lovedLine.trim()) gtl.loved = lovedLine.trim()
    if (likedLine.trim()) gtl.liked = likedLine.trim()
    if (dislikedLine.trim()) gtl.disliked = dislikedLine.trim()
    if (hatedLine.trim()) gtl.hated = hatedLine.trim()
    if (custom) {
      updateCustomNpc({ giftTastes: Object.keys(gt).length > 0 ? gt : undefined })
    } else {
      mutateSnapshot<Record<string, VanillaNpcOverride>>('vanillaNpcOverrides', prev => ({
        ...(prev || {}),
        [npc.name]: {
          ...((prev || {})[npc.name] || {}),
          giftTastes: Object.keys(gt).length > 0 ? gt : undefined,
          giftTasteLines: Object.keys(gtl).length > 0 ? gtl : undefined,
        }
      }))
    }
  }

  const getCategoryValue = (cat: string) =>
    cat === 'loved' ? loved : cat === 'liked' ? liked : cat === 'disliked' ? disliked : hated

  const setCategoryValue = (cat: string, val: string) => {
    if (cat === 'loved') setLoved(val)
    else if (cat === 'liked') setLiked(val)
    else if (cat === 'disliked') setDisliked(val)
    else setHated(val)
  }

  const getCategoryLine = (cat: string) =>
    cat === 'loved' ? lovedLine : cat === 'liked' ? likedLine : cat === 'disliked' ? dislikedLine : hatedLine

  const setCategoryLine = (cat: string, val: string) => {
    if (cat === 'loved') setLovedLine(val)
    else if (cat === 'liked') setLikedLine(val)
    else if (cat === 'disliked') setDislikedLine(val)
    else setHatedLine(val)
  }

  const addItemToCategory = (cat: string, itemId: string) => {
    const currentIds = getCategoryValue(cat)
    const idList = currentIds.split(/\s+/).filter(id => id.trim())
    if (!idList.includes(itemId)) {
      setCategoryValue(cat, [...idList, itemId].join(' '))
      setTimeout(persist, 0)
    }
  }

  const removeItemFromCategory = (cat: string, itemId: string) => {
    const currentIds = getCategoryValue(cat)
    const newList = currentIds.split(/\s+/).filter(id => id.trim() && id !== itemId).join(' ')
    setCategoryValue(cat, newList)
    setTimeout(persist, 0)
  }

  const toggleItemInCategory = (cat: string, itemId: string) => {
    const currentIds = getCategoryValue(cat)
    const idList = currentIds.split(/\s+/).filter(id => id.trim())
    if (idList.includes(itemId)) {
      removeItemFromCategory(cat, itemId)
    } else {
      addItemToCategory(cat, itemId)
    }
  }

  const getSelectedIds = (cat: string) => getCategoryValue(cat).split(/\s+/).filter(id => id.trim())

  const filteredItems = useMemo(() => {
    let list: VanillaGameItem[]
    if (giftCategory === '全部') {
      list = vanillaItems
    } else {
      list = vanillaItems.filter(i => i.type === giftCategory)
    }
    if (giftSearch.trim()) {
      const q = giftSearch.toLowerCase()
      list = list.filter(i =>
        (i.displayName || i.name).toLowerCase().includes(q) ||
        i.id.includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [giftCategory, giftSearch, vanillaItems])

  // Batch load item images
  const loadedItemIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!unpackedRoot || filteredItems.length === 0) return
    const toLoad = filteredItems.filter(item => !itemImageCacheRef.current[item.id] && !loadedItemIdsRef.current.has(item.id))
    if (toLoad.length === 0) return
    toLoad.forEach(item => loadedItemIdsRef.current.add(item.id))
    let cancelled = false
    async function batchLoad() {
      const chunkSize = 40
      for (let i = 0; i < toLoad.length; i += chunkSize) {
        if (cancelled) break
        const chunk = toLoad.slice(i, i + chunkSize)
        const batch = chunk.map(item => ({ id: item.id, texture: item.texture, spriteIndex: item.spriteIndex }))
        const result = await (window as any).electronAPI?.xnbBatchItemImages?.(unpackedRoot, batch)
        if (!cancelled && result) {
          itemImageCacheRef.current = { ...itemImageCacheRef.current, ...result }
          setItemImageCache(prev => ({ ...prev, ...result }))
        }
      }
    }
    batchLoad()
    return () => { cancelled = true }
  }, [unpackedRoot, filteredItems])

  // Determine which category an item belongs to
  const getItemCategory = (itemId: string): string | null => {
    if (getSelectedIds('loved').includes(itemId)) return 'loved'
    if (getSelectedIds('liked').includes(itemId)) return 'liked'
    if (getSelectedIds('disliked').includes(itemId)) return 'disliked'
    if (getSelectedIds('hated').includes(itemId)) return 'hated'
    return null
  }

  const activeIds = getSelectedIds(activeCategory)
  const defaultCatInfo = GIFT_CATS.find(c => c.key === activeCategory)!

  return (
    <div className="bg-[#2a2a2a] rounded-xl p-5">
      {/* ── Category Tabs ── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-gray-300">礼物偏好</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs px-2.5 py-1 rounded themed-bg-card text-gray-400 hover:text-gray-200 border themed-border-primary transition-colors"
          >
            {showAdvanced ? '收起高级' : '高级'}
          </button>
          <button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className="text-xs px-2.5 py-1 rounded bg-purple-900/30 text-purple-300 hover:bg-purple-800/50 border border-purple-700/40 transition-colors"
          >
            {showCategoryPicker ? '收起类别' : '+ 类别'}
          </button>
        </div>
      </div>

      {/* ── Category Picker (collapsible) ── */}
      {showCategoryPicker && (
        <div className="bg-[#1f1f1f] rounded-lg p-3 border border-[#2a2a2a] mb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500">添加到：</span>
            {GIFT_CATS.map(cat => (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  activeCategory === cat.key
                    ? `${cat.color} bg-[#333] border border-current font-bold`
                    : 'bg-[#252525] text-gray-500'
                }`}>
                {cat.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
            {GIFT_CATEGORY_IDS.map(cat => {
              const alreadyAdded = getCategoryValue(activeCategory).split(/\s+/).filter(Boolean).includes(cat.id)
              return (
                <button key={cat.id} onClick={() => {
                  if (!alreadyAdded) {
                    addItemToCategory(activeCategory, cat.id)
                    setTimeout(persist, 0)
                  }
                }}
                  disabled={alreadyAdded}
                  className={`text-xs px-2.5 py-2 rounded text-left transition-colors ${
                    alreadyAdded
                      ? 'bg-[#252525] text-gray-600 cursor-not-allowed'
                      : 'bg-[#242424] text-gray-300 hover:bg-[#333] border border-[#333]'
                  }`}>
                  <div className="font-medium">{cat.label} <span className="text-gray-500">({cat.id})</span></div>
                  <div className="text-[10px] text-gray-500">{cat.desc}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Category Tabs ── */}
      <div className="flex gap-2 mb-3">
        {GIFT_CATS.map(cat => {
          const count = getSelectedIds(cat.key).length
          return (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${
                activeCategory === cat.key
                  ? `${cat.color} bg-[#333] border ${cat.borderColor}`
                  : 'text-gray-500 hover:text-gray-300 bg-[#252525] border border-transparent'
              }`}>
              {cat.label}
              <span className="ml-1 text-gray-500 font-normal">({count})</span>
            </button>
          )
        })}
      </div>

      {/* ── Active Category Items ── */}
      <div className="bg-[#1f1f1f] rounded-lg p-3 border border-[#2a2a2a] mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${defaultCatInfo.color}`}>{defaultCatInfo.label}</span>
          <span className="text-xs text-gray-500">{activeIds.length} 个物品</span>
        </div>

        {activeIds.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {activeIds.map(id => {
              const displayName = getItemDisplayName(id, vanillaItems)
              const isCategory = id.startsWith('-')
              return (
                <span key={id} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                  isCategory
                    ? 'bg-purple-900/40 text-purple-300 border border-purple-700/40'
                    : 'bg-[#252525] text-gray-200 border border-[#333]'
                }`}>
                  {isCategory && <span className="text-[10px] text-purple-400">类</span>}
                  {displayName}
                  <button onClick={() => {
                    removeItemFromCategory(activeCategory, id)
                    setTimeout(persist, 0)
                  }}
                    className="text-gray-500 hover:text-red-400 ml-0.5">&times;</button>
                </span>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-500 mb-2">还没有添加物品，从下方浏览器选择</p>
        )}

        {/* Vanilla dialogue line */}
        {!custom && (
          <div className="mt-2">
            <label className="text-[10px] text-gray-500 block mb-1">{defaultCatInfo.label}回应台词（英文）</label>
            <input type="text"
              value={getCategoryLine(activeCategory)}
              onChange={e => { setCategoryLine(activeCategory, e.target.value); setTimeout(persist, 0) }}
              placeholder="输入NPC收到此类礼物时的英文台词..."
              className="w-full bg-[#242424] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#555]" />
          </div>
        )}

        {/* Advanced: raw ID input */}
        {showAdvanced && (
          <div className="mt-2 pt-2 border-t border-[#2a2a2a]">
            <label className="text-[10px] text-gray-500 block mb-1">物品ID（空格分隔）</label>
            <input type="text"
              value={getCategoryValue(activeCategory)}
              onChange={e => { setCategoryValue(activeCategory, e.target.value); persist() }}
              placeholder="输入物品ID，用空格分隔..."
              className="w-full bg-[#242424] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#555] font-mono" />
          </div>
        )}
      </div>

      {/* ── Item Browser ── */}
      <div className="bg-[#1f1f1f] rounded-lg p-3 border border-[#2a2a2a]">
        {/* Top bar: target category selector + batch actions */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">物品浏览器</span>
            {itemsLoading ? (
              <span className="text-xs text-gray-500">加载中...</span>
            ) : (
              <span className="text-xs text-gray-600">({vanillaItems.length} 个物品)</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-600">点击添加到：</span>
            {GIFT_CATS.map(cat => (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  activeCategory === cat.key
                    ? `${cat.color} bg-[#333] border border-current`
                    : 'text-gray-500 hover:text-gray-300 bg-[#252525] border border-transparent'
                }`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Batch actions */}
        <div className="flex items-center justify-end gap-1.5 mb-2">
          <button
            onClick={() => {
              const toAdd = filteredItems.filter(item => {
                return !getItemCategory(item.id)
              })
              if (toAdd.length === 0) return
              const newIds = [...getSelectedIds(activeCategory), ...toAdd.map(i => i.id)].join(' ')
              setCategoryValue(activeCategory, newIds)
              setTimeout(persist, 0)
            }}
            className="text-xs px-2 py-1 rounded bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50 border border-emerald-700/40 transition-colors"
          >全选到{defaultCatInfo.label}</button>
          <button
            onClick={() => {
              const toRemove = filteredItems.filter(item => getItemCategory(item.id))
              if (toRemove.length === 0) return
              const removeIds = new Set(toRemove.map(i => i.id))
              const filterOut = (list: string) => list.split(/\s+/).filter(id => id.trim() && !removeIds.has(id)).join(' ')
              setLoved(filterOut(loved))
              setLiked(filterOut(liked))
              setDisliked(filterOut(disliked))
              setHated(filterOut(hated))
              setTimeout(persist, 0)
            }}
            className="text-xs px-2 py-1 rounded bg-orange-900/50 text-orange-300 hover:bg-orange-800/50 border border-orange-700/40 transition-colors"
          >移除当前筛选</button>
          <button
            onClick={() => {
              setLoved(''); setLiked(''); setDisliked(''); setHated('')
              setLovedLine(''); setLikedLine(''); setDislikedLine(''); setHatedLine('')
              setTimeout(persist, 0)
            }}
            className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-800/40 border border-red-700/30 transition-colors"
          >清空全部</button>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 mb-2">
          {categoryTabs.map(c => (
            <button key={c.type} onClick={() => setGiftCategory(c.type)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${giftCategory === c.type ? 'bg-white text-black' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input type="text" value={giftSearch} onChange={e => setGiftSearch(e.target.value)}
          placeholder="搜索物品名称或ID..."
          className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#555] mb-2" />

        {/* Item grid - 8 columns */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 max-h-72 overflow-y-auto">
          {itemsLoading && (
            <p className="col-span-full text-sm text-gray-500 text-center py-4">正在从游戏加载物品数据...</p>
          )}
          {!itemsLoading && filteredItems.map(item => {
            const cat = getItemCategory(item.id)
            const catInfo = cat ? GIFT_CATS.find(c => c.key === cat) : null
            const imgSrc = itemImageCache[item.id]
            return (
              <button key={item.id}
                onClick={() => cat ? removeItemFromCategory(cat, item.id) : addItemToCategory(activeCategory, item.id)}
                className={`relative text-xs p-1.5 rounded transition-colors flex flex-col items-center gap-0.5 border ${
                  catInfo
                    ? `${catInfo.dotColor}/10 ${catInfo.borderColor}`
                    : 'bg-[#252525] hover:bg-[#333] text-gray-400 hover:text-white border-transparent'
                }`}
                title={`${item.displayName || item.name}${catInfo ? ' [' + catInfo.label + ']' : ''}\n${item.description || ''}`}>
                {imgSrc ? (
                  <img src={imgSrc} alt={item.name} className="w-8 h-8 object-contain pixelated" loading="lazy" />
                ) : null}
                <span className="truncate w-full text-center leading-tight">{item.displayName || item.name}</span>
                {/* Category indicator dot */}
                {catInfo && (
                  <span className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ${catInfo.dotColor} border border-black/30`} />
                )}
              </button>
            )
          })}
          {!itemsLoading && filteredItems.length === 0 && (
            <p className="col-span-full text-sm text-gray-500 text-center py-4">没有匹配的物品</p>
          )}
        </div>
      </div>
    </div>
  )
})

export default EditableGiftTastes
