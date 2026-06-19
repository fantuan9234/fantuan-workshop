// 地图预览放大模态框
// 设计要点：
// - 只显示真实游戏地图图片，不再绘制人工网格
// - 鼠标移动时显示一个浮动坐标标签（贴近鼠标），显示真实 tile 和像素坐标
// - 点击地图可拾取坐标（onPickTile 回调）
// - 缩放通过鼠标滚轮 + 顶部缩放控件（使用 transform: scale，不拉伸图片像素）
// - 长按左键拖动可平移查看地图不同区域
// - 顶部实时显示当前 tile 坐标和像素坐标
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { MapInfo } from '../data/mapData'

interface MapPreviewModalProps {
  map: MapInfo
  imageUrl?: string | null
  imageLoading?: boolean
  /** 传入 tmxPath 时，模态框自行渲染高分辨率图片（优先于 imageUrl） */
  tmxPath?: string
  onClose: () => void
  /** 点击某个 tile 后回调（用于把坐标写回事件步骤） */
  onPickTile?: (x: number, y: number) => void
  /** 在预览图上显示玩家初始位置标记 */
  farmerPos?: { x: number; y: number }
  /** 在预览图上显示NPC初始位置标记 */
  npcPositions?: Array<{ id: string; displayName: string; x: number; y: number; color: string }>
  /** 在预览图上显示地图入口点标记（金色箭头） */
  entryPos?: { x: number; y: number }
}

const ZOOM_OPTIONS = [
  { value: 1, label: '1x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 4, label: '4x' },
]

export default function MapPreviewModal({
  map, imageUrl: imageUrlProp, imageLoading: imageLoadingProp, tmxPath, onClose, onPickTile,
  farmerPos, npcPositions, entryPos,
}: MapPreviewModalProps): JSX.Element {
  const { width, height, displayName } = map

  const [zoom, setZoom] = useState(1)
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number; px: number; py: number } | null>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const [copiedTile, setCopiedTile] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // 拖动平移状态
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  // 区分点击和拖动：拖动距离超过阈值则不触发点击拾取
  const dragMoved = useRef(false)

  // 高分辨率图片渲染（当 tmxPath 传入时）
  const [hdImageUrl, setHdImageUrl] = useState<string | null>(null)
  const [hdLoading, setHdLoading] = useState(false)

  useEffect(() => {
    if (!tmxPath) return
    let cancelled = false
    setHdLoading(true)
    async function render() {
      try {
        // 渲染高分辨率图片：maxSize 用 4000，确保大地图也清晰
        const dataUrl = await window.electronAPI?.mapRender(tmxPath!, 4000)
        if (!cancelled) {
          setHdImageUrl(dataUrl || null)
          setHdLoading(false)
        }
      } catch {
        if (!cancelled) {
          setHdImageUrl(null)
          setHdLoading(false)
        }
      }
    }
    render()
    return () => { cancelled = true }
  }, [tmxPath])

  // 优先使用高分辨率图片
  const imageUrl = tmxPath ? hdImageUrl : (imageUrlProp || null)
  const imageLoading = tmxPath ? hdLoading : (imageLoadingProp ?? false)

  // 图片实际自然像素尺寸：图片加载后从 img.naturalWidth/Height 获取
  // 回退值用 width*16 / height*16（假设 16px/tile），图片加载后会纠正
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null)

  const naturalW = imgNaturalSize?.w ?? width * 16
  const naturalH = imgNaturalSize?.h ?? height * 16

  // 图片加载完成后：记录实际自然尺寸 + 自适应计算初始缩放
  const [imgLoaded, setImgLoaded] = useState(false)
  useEffect(() => {
    if (!imgLoaded || !containerRef.current || !imageRef.current) return
    const img = imageRef.current
    // 记录图片实际自然尺寸（TMX 渲染可能不是 16px/tile）
    const actualW = img.naturalWidth || width * 16
    const actualH = img.naturalHeight || height * 16
    setImgNaturalSize({ w: actualW, h: actualH })
    const container = containerRef.current
    const cw = container.clientWidth
    const ch = container.clientHeight
    if (cw <= 0 || ch <= 0) return
    // 计算让图片完整显示在容器内的最大缩放（contain 模式）
    const fitZoom = Math.min(cw / actualW, ch / actualH)
    const initZoom = Math.max(0.5, Math.min(4, fitZoom))
    setZoom(initZoom)
    setPan({ x: 0, y: 0 })
  }, [imgLoaded, width, height])

  // ESC 关闭 / +/- 缩放
  // 打开模态框时锁定 body 滚动，关闭时恢复
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(8, z + 0.5))
      else if (e.key === '-') setZoom(z => Math.max(0.5, z - 0.5))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return
    const img = imageRef.current
    const rect = img.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    // 使用已跟踪的图片实际自然尺寸（与 displayW/displayH 一致）
    const nW = naturalW
    const nH = naturalH
    const tW = nW / width   // 每个 tile 在图片中的像素宽度
    const tH = nH / height  // 每个 tile 在图片中的像素高度
    const scaleX = nW / rect.width
    const scaleY = nH / rect.height
    const imgPx = localX * scaleX
    const imgPy = localY * scaleY
    const tx = Math.floor(imgPx / tW)
    const ty = Math.floor(imgPy / tH)
    // 像素坐标换算回地图原始像素（16px/tile 的游戏像素）
    const realPx = imgPx / tW * 16
    const realPy = imgPy / tH * 16
    if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
      setHoverTile({ x: tx, y: ty, px: realPx, py: realPy })
    } else {
      setHoverTile(null)
    }
  }, [width, height, naturalW, naturalH])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.2 : 0.2
    setZoom(z => Math.max(0.5, Math.min(8, z + delta)))
  }, [])

  // 用原生 addEventListener 注册非被动滚轮监听，确保 preventDefault 生效，避免页面滚动
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // 长按左键拖动平移
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return  // 仅左键
    setIsDragging(true)
    dragMoved.current = false
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    }
  }, [pan])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true
      setPan({
        x: dragStart.current.panX + dx,
        y: dragStart.current.panY + dy,
      })
    }
    const onUp = () => {
      setIsDragging(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  const handleClick = useCallback(() => {
    // 拖动后不触发点击拾取
    if (dragMoved.current) {
      dragMoved.current = false
      return
    }
    if (hoverTile && onPickTile) {
      onPickTile(hoverTile.x, hoverTile.y)
    }
  }, [hoverTile, onPickTile])

  const handleCopy = useCallback(async (x: number, y: number) => {
    try {
      await navigator.clipboard.writeText(`${x}, ${y}`)
      setCopiedTile({ x, y })
      setTimeout(() => setCopiedTile(null), 1200)
    } catch { /* ignore */ }
  }, [])

  // 使用 transform: scale 进行缩放，不改变图片的 width/height，避免像素拉伸
  // 图片原始尺寸保持 naturalW × naturalH，通过 transform 缩放显示
  const displayW = naturalW
  const displayH = naturalH

  // 十字线定位：基于图片实际自然尺寸与缩放比例
  const tileDisplayW = displayW / width   // 每个 tile 在原始尺寸中的宽度
  const tileDisplayH = displayH / height  // 每个 tile 在原始尺寸中的高度

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        className="bg-[#1a1a1a] rounded-2xl shadow-2xl flex flex-col w-full max-w-[1400px] max-h-[calc(100vh-32px)] overflow-hidden"
        style={{ height: 'min(900px, calc(100vh - 32px))' }}
      >
        {/* 顶部工具栏 */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#333] flex-shrink-0 bg-[#1e1e1e]">
          <div className="flex items-center gap-3 min-w-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <h2 className="text-base font-medium text-white truncate">{displayName}</h2>
            <span className="text-xs text-gray-500 flex-shrink-0">({width}×{height} tile · {naturalW}×{naturalH}px)</span>
          </div>

          {/* 缩放控件 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}
              className="w-6 h-6 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-base flex items-center justify-center"
            >−</button>
            <span className="text-xs text-gray-400 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(8, z + 0.5))}
              className="w-6 h-6 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-base flex items-center justify-center"
            >+</button>
            {ZOOM_OPTIONS.map(z => (
              <button
                key={z.value}
                onClick={() => setZoom(z.value)}
                className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                  zoom === z.value ? 'bg-white text-black font-medium' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                {z.label}
              </button>
            ))}
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
              className="px-1.5 py-0.5 text-xs rounded text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              title="重置缩放和位置"
            >重置</button>
          </div>

          <div className="ml-auto flex items-center gap-3 flex-shrink-0">
            {hoverTile ? (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500">tile:</span>
                  <span className="text-white font-mono">({hoverTile.x}, {hoverTile.y})</span>
                  <span className="text-gray-700">|</span>
                  <span className="text-gray-500">px:</span>
                  <span className="text-white font-mono">({Math.floor(hoverTile.px)}, {Math.floor(hoverTile.py)})</span>
                </div>
                {onPickTile && (
                  <span className="text-xs text-green-400 animate-pulse">点击拾取</span>
                )}
                <button
                  onClick={() => handleCopy(hoverTile.x, hoverTile.y)}
                  className="text-xs px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300"
                >
                  {copiedTile?.x === hoverTile.x && copiedTile?.y === hoverTile.y ? '已复制' : '复制坐标'}
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-600">移动鼠标查看坐标</span>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#2a2a2a]"
              title="关闭 (ESC)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* 地图区域（仅显示真实图片，无人工网格） */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-hidden bg-[#0e0e0e] relative"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {imageUrl && !imgFailed ? (
            <>
              {/* 地图图片容器：只对图片做 scale 缩放，不缩放叠加层 */}
              <div
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  width: displayW,
                  height: displayH,
                }}
                onMouseDown={handleMouseDown}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={displayName}
                  className={`select-none block ${onPickTile ? 'cursor-crosshair' : ''}`}
                  style={{ width: displayW, height: displayH, imageRendering: 'pixelated' }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoverTile(null)}
                  onClick={handleClick}
                  onError={() => setImgFailed(true)}
                  onLoad={() => setImgLoaded(true)}
                  draggable={false}
                />
              </div>
              {/* hover 十字线和高亮方框：放在 scale 容器外，用缩放后的坐标渲染
                  这样方框尺寸 = tileDisplayW * zoom，strokeWidth 始终是固定像素 */}
              {hoverTile && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
                    width: displayW * zoom,
                    height: displayH * zoom,
                  }}
                >
                  <svg
                    className="absolute inset-0"
                    style={{ width: displayW * zoom, height: displayH * zoom, overflow: 'visible' }}
                  >
                    <line
                      x1={hoverTile.x * tileDisplayW * zoom} y1={0}
                      x2={hoverTile.x * tileDisplayW * zoom} y2={displayH * zoom}
                      stroke="white" strokeWidth="1" opacity="0.5"
                    />
                    <line
                      x1={0} y1={hoverTile.y * tileDisplayH * zoom}
                      x2={displayW * zoom} y2={hoverTile.y * tileDisplayH * zoom}
                      stroke="white" strokeWidth="1" opacity="0.5"
                    />
                    <rect
                      x={hoverTile.x * tileDisplayW * zoom} y={hoverTile.y * tileDisplayH * zoom}
                      width={tileDisplayW * zoom} height={tileDisplayH * zoom}
                      fill="none" stroke="#22d3ee" strokeWidth="2"
                    />
                  </svg>
                  {/* hover 时的坐标标签 - 贴近方框右下角，字号固定不缩放 */}
                  <div
                    className="absolute z-10 bg-black/80 text-white text-xs font-mono px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap"
                    style={{
                      left: hoverTile.x * tileDisplayW * zoom + tileDisplayW * zoom + 6,
                      top: hoverTile.y * tileDisplayH * zoom - 4,
                    }}
                  >
                    ({hoverTile.x}, {hoverTile.y})
                  </div>
                </div>
              )}

              {/* 角色初始位置标记（玩家/NPC） */}
              {(farmerPos || (npcPositions && npcPositions.length > 0) || entryPos) && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
                    width: displayW * zoom,
                    height: displayH * zoom,
                  }}
                >
                  {/* 玩家标记 */}
                  {farmerPos && (
                    <div
                      className="absolute flex items-center gap-1"
                      style={{
                        left: farmerPos.x * tileDisplayW * zoom,
                        top: farmerPos.y * tileDisplayH * zoom,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <div className="w-5 h-5 rounded-full bg-green-500/80 border-2 border-white shadow-lg flex items-center justify-center text-[8px] font-bold text-white">玩</div>
                      <span className="text-[11px] text-white font-medium drop-shadow-lg bg-black/50 px-1 py-0.5 rounded whitespace-nowrap">玩家</span>
                    </div>
                  )}
                  {/* NPC标记 */}
                  {npcPositions?.map(npc => (
                    <div
                      key={npc.id}
                      className="absolute flex items-center gap-1"
                      style={{
                        left: npc.x * tileDisplayW * zoom,
                        top: npc.y * tileDisplayH * zoom,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: npc.color || '#a855f7' }}
                      >N</div>
                      <span className="text-[11px] text-white font-medium drop-shadow-lg bg-black/50 px-1 py-0.5 rounded whitespace-nowrap">{npc.displayName}</span>
                    </div>
                  ))}
                  {/* 地图入口点标记（金色箭头） */}
                  {entryPos && (
                    <div
                      className="absolute flex items-center gap-1"
                      style={{
                        left: entryPos.x * tileDisplayW * zoom,
                        top: entryPos.y * tileDisplayH * zoom,
                        transform: 'translate(-50%, -50%)',
                      }}
                      title="进入此地图时的入口位置"
                    >
                      <span className="text-base drop-shadow-lg opacity-85">🚪</span>
                      <span className="text-[11px] text-yellow-300 font-medium drop-shadow-lg bg-black/50 px-1 py-0.5 rounded whitespace-nowrap">入口</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-base flex items-center gap-3 absolute inset-0 flex items-center justify-center">
              {imageLoading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  加载地图...
                </>
              ) : (
                '暂无该地图图片'
              )}
            </div>
          )}
        </div>

        {/* 底部信息栏 */}
        <div className="flex items-center gap-4 px-5 py-2 border-t border-[#333] text-xs text-gray-500 flex-shrink-0 bg-[#1e1e1e]">
          <span>· 移动鼠标 = 实时查看 tile / 像素坐标</span>
          <span>· 点击地图{onPickTile ? ' = 拾取坐标' : ''}</span>
          <span>· 滚轮 / 按钮 = 缩放</span>
          <span>· 长按左键拖动 = 平移查看</span>
          <span>· 「复制坐标」= 复制 `x, y` 格式</span>
          <span className="ml-auto text-gray-600">按 ESC 关闭</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
