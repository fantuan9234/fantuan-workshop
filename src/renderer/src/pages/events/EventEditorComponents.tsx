/**
 * EventEditor 可复用子组件
 * 包含：Field / Field2 / CoordField / PickButton / 图标组件
 *       SearchableNpcSelect / SearchableMapSelect
 * 从 EventEditor.tsx 中提取以减小文件体积
 */
import { useState, useRef, useEffect, useMemo } from 'react'
import { type NPCInfo } from '../../data/npcData'
import { getMapDisplayName, inferMapCategory, mapCategoryLabel } from '../../data/useMapLibrary'

// ===== 布局组件 =====

export function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return <div><label className="text-sm themed-text-dimmed block mb-1">{label}</label>{children}</div>
}

export function Field2({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return <div><label className="text-xs themed-text-dimmed block mb-0.5">{label}</label>{children}</div>
}

export function CoordField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <div>
      <label className="text-[11px] themed-text-dimmed block mb-0.5">{label}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-sm themed-text-primary focus:outline-none focus:border-[#555]" min={0} />
    </div>
  )
}

export function PickButton({ isActive, onStart, onStop }: { isActive: boolean; onStart: () => void; onStop: () => void }): JSX.Element {
  return (
    <button
      onClick={isActive ? onStop : onStart}
      className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
        isActive
          ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30'
          : 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/50 border border-cyan-700/40'
      }`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      {isActive ? '取消拾取' : '地图选点'}
    </button>
  )
}

// ===== 图标组件 =====

export function ChevronUp(): JSX.Element {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
}

export function ChevronDown(): JSX.Element {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
}

export function Trash(): JSX.Element {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
}

// ===== 可搜索的NPC选择器 =====

export function SearchableNpcSelect({ placeholder, npcs, onSelect, searchValue, onSearchChange }: {
  placeholder: string
  npcs: NPCInfo[]
  onSelect: (id: string) => void
  searchValue: string
  onSearchChange: (v: string) => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = (id: string) => {
    onSelect(id)
    onSearchChange('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="input text-sm themed-text-muted cursor-pointer flex items-center justify-between"
      >
        <span className={npcs.length === 0 ? 'themed-text-disabled' : ''}>{placeholder}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full themed-bg-primary border themed-border-primary rounded-lg shadow-xl max-h-64 flex flex-col">
          <div className="p-2 border-b themed-border-secondary">
            <div className="relative">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2 top-1/2 -translate-y-1/2 themed-text-dimmed">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={searchValue}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="搜索NPC名称..."
                className="w-full pl-7 pr-2 py-1 text-sm themed-bg-card border themed-border-primary rounded themed-text-primary focus:outline-none focus:border-[#555]"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {npcs.length === 0 ? (
              <div className="px-3 py-4 text-xs themed-text-disabled text-center">无匹配NPC</div>
            ) : (
              npcs.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleSelect(n.id)}
                  className="w-full px-3 py-1.5 text-left text-sm themed-text-secondary hover:themed-bg-active transition-colors flex items-center gap-3"
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: n.color || '#888' }} />
                  <span className="font-medium">{n.displayName}</span>
                  <span className="themed-text-dimmed text-[11px]">({n.name})</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ===== 可搜索的地图选择器 =====

export function SearchableMapSelect({ value, onChange, allMaps, needsUnpack, searchValue, onSearchChange }: {
  value: string
  onChange: (v: string) => void
  allMaps: Array<{ name: string; width: number; height: number; tmxPath: string }>
  needsUnpack: boolean
  searchValue: string
  onSearchChange: (v: string) => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // 按分类分组并应用搜索过滤
  const filteredMaps = useMemo(() => {
    const categories = ['farm', 'town', 'outdoor', 'indoor', 'mine', 'island', 'festival', 'special'] as const
    const kw = searchValue.trim().toLowerCase()
    return categories.map(cat => {
      let items = allMaps.filter(m => inferMapCategory(m.name) === cat)
      if (kw) {
        items = items.filter(m => {
          const display = getMapDisplayName(m.name).toLowerCase()
          return display.includes(kw) || m.name.toLowerCase().includes(kw)
        })
      }
      return { cat, items }
    }).filter(g => g.items.length > 0)
  }, [allMaps, searchValue])

  const selectedDisplayName = value ? getMapDisplayName(value) : ''

  const handleSelect = (name: string) => {
    onChange(name)
    onSearchChange('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => !needsUnpack && setOpen(!open)}
        className={`input text-sm flex items-center justify-between ${needsUnpack ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={!value ? 'themed-text-muted' : 'themed-text-primary'}>
          {needsUnpack ? '（请先在「资源管理」中解包游戏素材）' : (value ? selectedDisplayName : '选择触发地图...')}
        </span>
        {!needsUnpack && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </div>
      {open && !needsUnpack && (
        <div className="absolute z-50 mt-1 w-full themed-bg-primary border themed-border-primary rounded-lg shadow-xl max-h-64 flex flex-col">
          <div className="p-2 border-b themed-border-secondary">
            <div className="relative">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2 top-1/2 -translate-y-1/2 themed-text-dimmed">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={searchValue}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="搜索地图名称..."
                className="w-full pl-7 pr-2 py-1 text-sm themed-bg-card border themed-border-primary rounded themed-text-primary focus:outline-none focus:border-[#555]"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredMaps.length === 0 ? (
              <div className="px-3 py-4 text-xs themed-text-disabled text-center">无匹配地图</div>
            ) : (
              filteredMaps.map(({ cat, items }) => (
                <div key={cat}>
                  <div className="px-3 py-1 text-[11px] themed-text-dimmed font-medium bg-[#1a1a1a]/50">{mapCategoryLabel[cat]}</div>
                  {items.map(m => (
                    <button
                      key={m.name}
                      onClick={() => handleSelect(m.name)}
                      className={`w-full px-3 py-1.5 text-left text-sm transition-colors flex items-center justify-between gap-3 ${
                        value === m.name ? 'themed-bg-active themed-text-primary' : 'themed-text-secondary hover:themed-bg-active'
                      }`}
                    >
                      <span className="font-medium">{getMapDisplayName(m.name)}</span>
                      <span className="themed-text-dimmed text-[11px]">{m.name}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
