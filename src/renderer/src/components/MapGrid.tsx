// 地图网格组件 - 可复用于 MapEditor 和 EventEditor
// 无背景图时用棋盘色块代替，始终显示正确的 tile 网格
// 支持坐标拾取模式：点击格子回调 tile 坐标
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { MapInfo, WarpPoint, SpawnPoint, ForageArea } from '../data/mapData'

interface MapGridProps {
  map: MapInfo
  warps?: WarpPoint[]
  spawns?: SpawnPoint[]
  forageAreas?: ForageArea[]
  /** 是否交互（坐标拾取 / 点击添加标记） */
  interactive?: boolean
  clickMode?: 'none' | 'warp' | 'spawn' | 'forage'
  onGridClick?: (x: number, y: number) => void
  /** 坐标拾取模式：点击格子回调 tile(x,y)，视觉高亮 */
  pickingMode?: boolean
  onPickTile?: (x: number, y: number) => void
  /** 紧凑模式，给 EventEditor 预览用 */
  compact?: boolean
  /** 是否有真实渲染的地图图片（来自 mapRender API） */
  hasRealImage?: boolean
}

export default function MapGrid({ map, warps = [], spawns = [], forageAreas = [], interactive = false, clickMode = 'none', onGridClick, pickingMode = false, onPickTile, compact = false, hasRealImage = false }: MapGridProps): JSX.Element {
  const { width, height, imageUrl, displayName, category } = map
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const [pickedTile, setPickedTile] = useState<{ x: number; y: number } | null>(null)
  const isActive = interactive || pickingMode

  // 自适应缩放
  const autoZoom = useMemo(() => {
    const panelW = (wrapperRef.current?.clientWidth ?? 700) - 24
    const fitZoom = Math.floor(panelW / width)
    return compact
      ? Math.max(3, Math.min(8, Math.floor(500 / width)))
      : Math.max(4, Math.min(16, fitZoom))
  }, [width, height, compact])

  const [zoom, setZoom] = useState(autoZoom)
  useEffect(() => { setZoom(autoZoom) }, [autoZoom])

  const cellSize = zoom + 1

  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${width}, ${zoom}px)`,
    gridTemplateRows: `repeat(${height}, ${zoom}px)`,
    gap: '1px',
  }), [width, height, zoom])

  const categoryColor = useMemo(() => {
    const map: Record<string, string> = {
      farm: '#3b5e2b', town: '#5a4a3a', outdoor: '#2e4a2e',
      indoor: '#3a3040', mine: '#2a2020', festival: '#4a3060',
    }
    return map[category] || '#2a2a2a'
  }, [category])

  const handleImgError = useCallback(() => setImgFailed(true), [])

  const handleTileClick = useCallback((x: number, y: number) => {
    if (pickingMode) {
      setPickedTile({ x, y })
      onPickTile?.(x, y)
    } else if (interactive) {
      onGridClick?.(x, y)
    }
  }, [pickingMode, interactive, onPickTile, onGridClick])

  return (
    <div className={`flex flex-col bg-[#1a1a1a] rounded-xl overflow-hidden ${pickingMode ? 'ring-2 ring-[#555]' : ''}`}>
      {/* 拾取模式横幅 */}
      {pickingMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2a] border-b border-[#444] text-[10px] text-gray-400 flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          点击地图格子拾取坐标
          {pickedTile && <span className="text-gray-300 font-mono ml-auto">已选: ({pickedTile.x}, {pickedTile.y})</span>}
        </div>
      )}

      {/* 工具栏：仅非紧凑模式显示 */}
      {!compact && (
        <div className="flex items-center gap-3 px-4 py-2 bg-[#111] border-b border-[#333] text-[10px] text-gray-500 flex-shrink-0">
          <span>{width}×{height} 格 ({width * 16}×{height * 16}px)</span>
          <span className="text-gray-700">|</span>
          <span>{zoom}px/格 (1格=16px)</span>
          <span className="ml-auto">
            {warps.length > 0 && <span className="text-gray-400 ml-1">{warps.length}传送</span>}
            {spawns.length > 0 && <span className="text-gray-400 ml-1">{spawns.length}NPC</span>}
            {forageAreas.length > 0 && <span className="text-gray-400 ml-1">{forageAreas.length}采集</span>}
            {hoverTile && <span className="text-gray-400 ml-2">({hoverTile.x}, {hoverTile.y}) / ({hoverTile.x * 16}, {hoverTile.y * 16}px)</span>}
          </span>
        </div>
      )}

      {/* 网格区域 */}
      <div ref={wrapperRef} className={`flex-1 overflow-auto flex items-start justify-center p-3 ${interactive && clickMode !== 'none' ? 'ring-1 ring-[#555]' : ''}`}>
        <div className="relative" style={{ minWidth: width * cellSize, minHeight: height * cellSize }}>
          {/* 背景图 / 默认色块 */}
          {imageUrl && !imgFailed ? (
            <img src={imageUrl} alt={displayName}
              className={`absolute inset-0 w-full h-full object-fill pointer-events-none ${hasRealImage ? 'opacity-90' : 'opacity-20'}`}
              onError={handleImgError}
            />
          ) : (
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: categoryColor }}>
              <svg className="absolute inset-0 w-full h-full opacity-10">
                <defs>
                  <pattern id={`mg-${map.id}`} width={cellSize * 4} height={cellSize * 4} patternUnits="userSpaceOnUse">
                    <rect width={cellSize * 4} height={cellSize * 4} fill="none" />
                    <rect x={0} y={0} width={cellSize * 2} height={cellSize * 2} fill="rgba(255,255,255,0.03)" />
                    <rect x={cellSize * 2} y={cellSize * 2} width={cellSize * 2} height={cellSize * 2} fill="rgba(255,255,255,0.03)" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#mg-${map.id})`} />
              </svg>
            </div>
          )}

          {/* Tile 网格 */}
          <div style={gridStyle}>
            {Array.from({ length: width * height }).map((_, i) => {
              const x = i % width
              const y = Math.floor(i / width)
              const hasWarp = warps.some(w => w.x === x && w.y === y)
              const hasSpawn = spawns.some(s => s.x === x && s.y === y)
              const hasForage = forageAreas.some(f => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h)
              const isPicked = pickedTile?.x === x && pickedTile?.y === y
              const isHighlighted = pickingMode && hoverTile?.x === x && hoverTile?.y === y
              // 有真实地图图片时，默认格子透明，仅标记/高亮格子有颜色
              const baseBg = hasRealImage
                ? 'bg-transparent'
                : hasWarp ? 'bg-[#555]' : hasSpawn ? 'bg-[#666]' : hasForage ? 'bg-[#3a3a3a]' : 'bg-[#2a2a2a]'
              return (
                <div key={i}
                  className={`rounded-[1px] transition-all duration-75 ${isActive ? 'cursor-crosshair' : ''} relative ${
                    isPicked ? 'bg-gray-300 z-10 ring-2 ring-gray-400' : 
                    isHighlighted ? 'bg-white/30 ring-1 ring-white/50 z-10' :
                    hasWarp ? 'bg-[#555]/60' : hasSpawn ? 'bg-[#666]/60' : hasForage ? 'bg-[#3a3a3a]/40' :
                    baseBg
                  } ${isActive ? 'hover:ring-1 hover:ring-white/60 hover:z-10' : ''}`}
                  onMouseEnter={() => isActive && setHoverTile({ x, y })}
                  onMouseLeave={() => isActive && setHoverTile(null)}
                  onClick={() => isActive && handleTileClick(x, y)}
                  title={isActive ? `(${x}, ${y})${hasWarp ? ' [传送]' : ''}${hasSpawn ? ' [NPC]' : ''}${hasForage ? ' [采集]' : ''}` : undefined}
                />
              )
            })}
          </div>

          {/* 拾取的坐标十字线 */}
          {pickedTile && (
            <svg className="absolute inset-0 pointer-events-none z-20" style={{ width: width * cellSize, height: height * cellSize }}>
              <line x1={0} y1={pickedTile.y * cellSize + cellSize / 2} x2={width * cellSize} y2={pickedTile.y * cellSize + cellSize / 2} stroke="#888" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <line x1={pickedTile.x * cellSize + cellSize / 2} y1={0} x2={pickedTile.x * cellSize + cellSize / 2} y2={height * cellSize} stroke="#888" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <circle cx={pickedTile.x * cellSize + cellSize / 2} cy={pickedTile.y * cellSize + cellSize / 2} r="6" fill="#888" stroke="#fff" strokeWidth="2" />
            </svg>
          )}

          {/* 采集区 SVG */}
          {forageAreas.length > 0 && (
            <svg className="absolute inset-0 pointer-events-none" style={{ width: width * cellSize, height: height * cellSize }}>
              {forageAreas.map(f => (
                <rect key={f.id} x={f.x * cellSize} y={f.y * cellSize}
                  width={f.w * cellSize} height={f.h * cellSize}
                  fill="#88888820" stroke="#888" strokeWidth="1.5" rx="2" />
              ))}
            </svg>
          )}

          {/* 传送点 / NPC 标记 */}
          {(warps.length > 0 || spawns.length > 0) && !pickingMode && (
            <div className="absolute inset-0 pointer-events-none" style={{ fontSize: `${Math.max(zoom - 2, 5)}px` }}>
              {warps.map(w => (
                <div key={w.id} className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: w.x * cellSize, top: w.y * cellSize }}>
                  <svg width={Math.max(zoom + 1, 8)} height={Math.max(zoom + 1, 8)} viewBox="0 0 24 24" fill="#888" className="opacity-90">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                  {zoom >= 8 && <span className="text-gray-400 ml-0.5 text-[8px]">{w.label}</span>}
                </div>
              ))}
              {spawns.map(s => (
                <div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: s.x * cellSize, top: s.y * cellSize }}>
                  <svg width={Math.max(zoom + 2, 8)} height={Math.max(zoom + 2, 8)} viewBox="0 0 24 24" fill="#aaa" className="opacity-90">
                    <polygon points="12,2 22,22 2,22" />
                  </svg>
                  {zoom >= 8 && <span className="text-gray-400 ml-0.5 text-[8px]">{s.label}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
