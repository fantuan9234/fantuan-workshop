// 地图预览放大模态框
// 设计要点：
// - 只显示真实游戏地图图片，不再绘制人工网格格
// - 鼠标移动时显示一个浮动坐标标签（贴近鼠标），显示真实 tile 和像素坐标
// - 点击地图可拾取坐标（onPickTile 回调）
// - 缩放通过鼠标滚轮 + 顶部缩放控件
// - 顶部实时显示当前 tile 坐标和像素坐标
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
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
}: MapPreviewModalProps): JSX.Element {
  const { width, height, displayName } = map

  const [zoom, setZoom] = useState(1)
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number; px: number; py: number } | null>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const [copiedTile, setCopiedTile] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

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
        const dataUrl = await window.electronAPI?.mapRender(tmxPath, 4000)
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

  const naturalW = width * 16
  const naturalH = height * 16

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(4, z + 0.5))
      else if (e.key === '-') setZoom(z => Math.max(0.5, z - 0.5))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return
    const img = imageRef.current
    const rect = img.getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    // 使用图片实际自然尺寸计算坐标，避免低分辨率拉伸导致偏差
    const nW = img.naturalWidth || width * 16
    const nH = img.naturalHeight || height * 16
    const tW = nW / width
    const tH = nH / height
    const scaleX = nW / rect.width
    const scaleY = nH / rect.height
    const imgPx = localX * scaleX
    const imgPy = localY * scaleY
    const tx = Math.floor(imgPx / tW)
    const ty = Math.floor(imgPy / tH)
    // 像素坐标换算回地图原始像素
    const realPx = imgPx / tW * 16
    const realPy = imgPy / tH * 16
    if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
      setHoverTile({ x: tx, y: ty, px: realPx, py: realPy })
    } else {
      setHoverTile(null)
    }
  }, [width, height])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.2 : 0.2
    setZoom(z => Math.max(0.5, Math.min(4, z + delta)))
  }, [])

  const handleClick = useCallback(() => {
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

  const displayW = naturalW * zoom
  const displayH = naturalH * zoom

  // 十字线定位：基于图片实际自然尺寸与显示尺寸的比例
  const tileDisplayW = displayW / width   // 每个 tile 在显示中的宽度
  const tileDisplayH = displayH / height  // 每个 tile 在显示中的高度

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] rounded-2xl shadow-2xl flex flex-col w-full h-full max-w-[1400px] max-h-[900px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部工具栏 */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#333] flex-shrink-0 bg-[#1e1e1e]">
          <div className="flex items-center gap-2 min-w-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <h2 className="text-sm font-medium text-white truncate">{displayName}</h2>
            <span className="text-[10px] text-gray-500 flex-shrink-0">({width}×{height} tile · {naturalW}×{naturalH}px)</span>
          </div>

          {/* 缩放控件 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}
              className="w-6 h-6 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-sm flex items-center justify-center"
            >−</button>
            <span className="text-[10px] text-gray-400 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(4, z + 0.5))}
              className="w-6 h-6 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-sm flex items-center justify-center"
            >+</button>
            {ZOOM_OPTIONS.map(z => (
              <button
                key={z.value}
                onClick={() => setZoom(z.value)}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  zoom === z.value ? 'bg-white text-black font-medium' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                {z.label}
              </button>
            ))}
            <button
              onClick={() => setZoom(1)}
              className="px-1.5 py-0.5 text-[10px] rounded text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              title="重置"
            >重置</button>
          </div>

          <div className="ml-auto flex items-center gap-3 flex-shrink-0">
            {hoverTile ? (
              <>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-gray-500">tile:</span>
                  <span className="text-white font-mono">({hoverTile.x}, {hoverTile.y})</span>
                  <span className="text-gray-700">|</span>
                  <span className="text-gray-500">px:</span>
                  <span className="text-white font-mono">({Math.floor(hoverTile.px)}, {Math.floor(hoverTile.py)})</span>
                </div>
                {onPickTile && (
                  <span className="text-[10px] text-green-400 animate-pulse">点击拾取</span>
                )}
                <button
                  onClick={() => handleCopy(hoverTile.x, hoverTile.y)}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300"
                >
                  {copiedTile?.x === hoverTile.x && copiedTile?.y === hoverTile.y ? '已复制' : '复制坐标'}
                </button>
              </>
            ) : (
              <span className="text-[10px] text-gray-600">移动鼠标查看坐标</span>
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
          className="flex-1 overflow-auto bg-[#0e0e0e] flex items-center justify-center p-4"
          onWheel={handleWheel}
        >
          {imageUrl && !imgFailed ? (
            <div
              className="relative inline-block"
              style={{ width: displayW, height: displayH }}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt={displayName}
                className={`select-none ${onPickTile ? 'cursor-crosshair' : 'cursor-default'}`}
                style={{ width: displayW, height: displayH, imageRendering: 'pixelated' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverTile(null)}
                onClick={handleClick}
                onError={() => setImgFailed(true)}
                draggable={false}
              />
              {/* 单个 hover 十字线 - 跟随鼠标显示，不画完整网格 */}
              {hoverTile && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: displayW, height: displayH }}
                >
                  <line
                    x1={hoverTile.x * tileDisplayW} y1={0}
                    x2={hoverTile.x * tileDisplayW} y2={displayH}
                    stroke="white" strokeWidth="1" opacity="0.5"
                  />
                  <line
                    x1={0} y1={hoverTile.y * tileDisplayH}
                    x2={displayW} y2={hoverTile.y * tileDisplayH}
                    stroke="white" strokeWidth="1" opacity="0.5"
                  />
                  <rect
                    x={hoverTile.x * tileDisplayW} y={hoverTile.y * tileDisplayH}
                    width={tileDisplayW} height={tileDisplayH}
                    fill="none" stroke="#22d3ee" strokeWidth="2"
                  />
                </svg>
              )}
              {/* hover 时的坐标标签 - 贴近鼠标 */}
              {hoverTile && (
                <div
                  className="absolute pointer-events-none z-10 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg"
                  style={{
                    left: hoverTile.x * tileDisplayW + tileDisplayW + 6,
                    top: hoverTile.y * tileDisplayH - 4,
                  }}
                >
                  ({hoverTile.x}, {hoverTile.y})
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm flex items-center gap-2">
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
        <div className="flex items-center gap-4 px-5 py-2 border-t border-[#333] text-[10px] text-gray-500 flex-shrink-0 bg-[#1e1e1e]">
          <span>· 移动鼠标 = 实时查看 tile / 像素坐标</span>
          <span>· 点击地图{onPickTile ? ' = 拾取坐标' : ''}</span>
          <span>· 滚轮 / 按钮 = 缩放</span>
          <span>· 「复制坐标」= 复制 `x, y` 格式</span>
          <span className="ml-auto text-gray-600">按 ESC 关闭</span>
        </div>
      </div>
    </div>
  )
}
