// 共享地图缩略图组件
// 提供：
//   - 懒加载（IntersectionObserver）
//   - 缓存（模块级 Map，跨组件复用）
//   - 可选红点标记（根据 tile 坐标定位）
// 供 NPCDetailPage 日程编辑、MapsPage 等模块共用
import { useEffect, useRef, useState } from 'react'

/** 模块级缩略图缓存：tmxPath → data URL，跨组件复用避免重复渲染 */
const thumbnailCache = new Map<string, string>()

interface MapThumbnailProps {
  /** .tmx 绝对路径 */
  tmxPath: string
  /** 渲染最大尺寸（px），默认 192（渲染高清再 CSS 缩放更清晰） */
  renderSize?: number
  /** 显示宽度（px），默认 96 */
  displayWidth?: number
  /** 显示高度（px），不传则按图片比例自适应 */
  displayHeight?: number
  /** 红点标记的 tile X 坐标（可选） */
  markerTileX?: number
  /** 红点标记的 tile Y 坐标（可选） */
  markerTileY?: number
  /** 地图宽度（tile 数），用于计算红点位置。不传则从图片 naturalWidth/16 推导 */
  mapWidthTiles?: number
  /** 地图高度（tile 数），用于计算红点位置。不传则从图片 naturalHeight/16 推导 */
  mapHeightTiles?: number
  /** 额外样式类 */
  className?: string
  /** 点击回调 */
  onClick?: () => void
}

export function MapThumbnail({
  tmxPath,
  renderSize = 192,
  displayWidth = 96,
  displayHeight,
  markerTileX,
  markerTileY,
  mapWidthTiles,
  mapHeightTiles,
  className = '',
  onClick,
}: MapThumbnailProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [visible, setVisible] = useState(false)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null)

  // 懒加载：进入视口才渲染
  useEffect(() => {
    if (!tmxPath || !containerRef.current) return
    const el = containerRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '80px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [tmxPath])

  // 渲染缩略图（带缓存）
  useEffect(() => {
    if (!visible || !tmxPath) return
    // 命中缓存直接用
    const cached = thumbnailCache.get(tmxPath)
    if (cached) {
      setDataUrl(cached)
      setFailed(false)
      return
    }
    // 未命中则渲染
    let cancelled = false
    setLoading(true)
    setFailed(false)
    const renderPromise = window.electronAPI?.mapRender?.(tmxPath, renderSize)
    if (!renderPromise) {
      setLoading(false)
      setFailed(true)
      return
    }
    renderPromise.then((url) => {
      if (cancelled) return
      setLoading(false)
      if (url) {
        thumbnailCache.set(tmxPath, url)
        setDataUrl(url)
      } else {
        setFailed(true)
      }
    }).catch(() => {
      if (cancelled) return
      setLoading(false)
      setFailed(true)
    })
    return () => { cancelled = true }
  }, [visible, tmxPath, renderSize])

  // 图片加载完成后记录原始尺寸（用于推导 tile 数）
  const handleImgLoad = () => {
    if (imgRef.current) {
      setImgNaturalSize({
        w: imgRef.current.naturalWidth,
        h: imgRef.current.naturalHeight,
      })
    }
  }

  // 计算红点位置（百分比）
  let dotLeftPercent: number | null = null
  let dotTopPercent: number | null = null
  if (markerTileX !== undefined && markerTileY !== undefined) {
    // 优先用传入的 mapWidthTiles/mapHeightTiles，否则从图片尺寸推导（1 tile = 16px）
    const mw = mapWidthTiles || (imgNaturalSize ? imgNaturalSize.w / 16 : 0)
    const mh = mapHeightTiles || (imgNaturalSize ? imgNaturalSize.h / 16 : 0)
    if (mw > 0 && mh > 0) {
      dotLeftPercent = Math.max(0, Math.min(100, (markerTileX / mw) * 100))
      dotTopPercent = Math.max(0, Math.min(100, (markerTileY / mh) * 100))
    }
  }

  const showDot = dotLeftPercent !== null && dotTopPercent !== null

  return (
    <div
      ref={containerRef}
      className={`relative inline-block bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: displayWidth, height: displayHeight || displayWidth }}
      onClick={onClick}
    >
      {/* 加载中 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
        </div>
      )}
      {/* 渲染失败 / 未解包 */}
      {failed && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 15l5-5 4 4 3-3 6 6" />
          </svg>
          <span className="text-[8px] mt-0.5">无地图</span>
        </div>
      )}
      {/* 缩略图 */}
      {dataUrl && !failed && (
        <img
          ref={imgRef}
          src={dataUrl}
          onLoad={handleImgLoad}
          alt="地图缩略图"
          className="w-full h-full object-contain"
          style={{ imageRendering: 'pixelated' }}
          draggable={false}
        />
      )}
      {/* 红点标记 */}
      {showDot && dataUrl && (
        <>
          {/* 十字准星 */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${dotLeftPercent}%`,
              top: `${dotTopPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* 外圈光晕 */}
            <div className="absolute -inset-2 rounded-full bg-red-500/30 animate-ping" />
            {/* 红点 */}
            <div className="relative w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow-lg" />
          </div>
          {/* 水平准星线 */}
          <div
            className="absolute left-0 right-0 h-px bg-red-500/40 pointer-events-none"
            style={{ top: `${dotTopPercent}%` }}
          />
          {/* 垂直准星线 */}
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500/40 pointer-events-none"
            style={{ left: `${dotLeftPercent}%` }}
          />
        </>
      )}
      {/* 坐标标签 */}
      {showDot && dataUrl && markerTileX !== undefined && markerTileY !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-red-300 px-1 py-0.5 text-center font-mono">
          ({markerTileX}, {markerTileY})
        </div>
      )}
    </div>
  )
}
