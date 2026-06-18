import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { defaultNPCs, sceneTypes, type NPCInfo } from '../../data/npcData'
import { useNpcAssets } from '../../data/useNpcAssets'
import { useCustomNpcs } from '../../data/useCustomNpcs'

const DEFAULT_SPRITE_SCENES = [0, 1, 2] // 默认、沙滩、冬日

// 场景文件名后缀映射
const SCENE_SUFFIXES: Record<number, string> = {
  0: '', 1: '_Beach', 2: '_Winter', 3: '_Spring', 4: '_Summer', 5: '_Fall',
  6: '_FlowerDance', 7: '_EggF', 8: '_Fair', 9: '_Jellies', 10: '_Luau',
  11: '_SpiritsEve', 12: '_WinterStar', 13: '_IceF', 14: '_Winter_Indoor',
  15: '_Winter_Outdoor', 16: '_Hospital', 17: '_JojaMart', 18: '_Trenchcoat',
}

// 星露谷行走图规格：4行（下右左上）×4列（帧动画）
const DIR_LAYOUT = [
  { id: 'walk_down', label: '向下走', row: 0 },
  { id: 'walk_right', label: '向右走', row: 1 },
  { id: 'walk_up', label: '向上走', row: 2 },
  { id: 'walk_left', label: '向左走', row: 3 },
]

export default function NPCSpriteEditor(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isCustomRoute = (location.state as { isCustom?: boolean })?.isCustom || id?.startsWith('custom_')
  const npc = defaultNPCs.find((n) => n.id === id)

  // 自定义NPC路径
  if (isCustomRoute || !npc) {
    return <CustomSpriteEditor npcId={id!} navigate={navigate} />
  }

  // 原版NPC逻辑
  return <VanillaSpriteEditor npc={npc} navigate={navigate} />
}

// ---- 原版NPC行走图编辑器 ----
function VanillaSpriteEditor({ npc, navigate }: { npc: NPCInfo; navigate: ReturnType<typeof useNavigate> }): JSX.Element {
  const { assets, gameDir, unpackedRoot, setGameDir, setSpriteFrame, resetAllSprites } = useNpcAssets()
  const [activeScenes, setActiveScenes] = useState<number[]>(DEFAULT_SPRITE_SCENES)
  const [showAddPanel, setShowAddPanel] = useState(false)
  // 每个场景的原始行走图 data URL（从游戏目录读取）
  const [sceneSpriteUrls, setSceneSpriteUrls] = useState<Record<number, string>>({})

  // 从游戏解包目录读取各场景行走图
  useEffect(() => {
    const loadScenes = async () => {
      const urls: Record<number, string> = {}
      for (const sceneIdx of activeScenes) {
        const suffix = SCENE_SUFFIXES[sceneIdx] || ''
        if (unpackedRoot) {
          // 优先从解包目录读取（高分辨率）
          const path = `${unpackedRoot}\\Characters\\${npc.name}${suffix}.png`
          const url = await window.electronAPI?.readGameFile(path)
          if (url) urls[sceneIdx] = url
        }
        // 如果解包目录不可用或读取失败，使用本地静态文件作为 fallback
        if (!urls[sceneIdx]) {
          const staticPath = `./assets/maps/Characters_${npc.name}${suffix}.png`
          urls[sceneIdx] = staticPath
        }
      }
      setSceneSpriteUrls(prev => ({ ...prev, ...urls }))
    }
    loadScenes()
  }, [unpackedRoot, npc.name, activeScenes])

  const handleImportGameDir = async () => {
    const dir = await window.electronAPI?.selectGameDir()
    if (dir) setGameDir(dir)
  }

  const handleAddScene = (sceneIdx: number) => {
    if (!activeScenes.includes(sceneIdx)) {
      setActiveScenes(prev => [...prev, sceneIdx].sort((a, b) => a - b))
    }
    setShowAddPanel(false)
  }

  const handleRemoveScene = (sceneIdx: number) => {
    if (sceneIdx === 0) return
    setActiveScenes(prev => prev.filter(s => s !== sceneIdx))
  }

  const npcAssets = assets[npc.id]
  const customSprites = npcAssets?.sprites ?? {}
  const hasCustom = Object.keys(customSprites).length > 0

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-y-auto">
      {/* 顶部 */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <button onClick={() => navigate(`/npc/${npc.id}`)} className="inline-flex items-center gap-1.5 text-base text-gray-400 hover:text-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          {npc.displayName}
        </button>
        <span className="text-gray-600">/</span>
        <span className="text-base text-white font-medium">编辑行走图</span>
        {hasCustom && <span className="text-sm px-2 py-0.5 rounded-full bg-[#3a3a3a] text-gray-400">已替换</span>}
        <div className="ml-auto flex items-center gap-3">
          {gameDir && <span className="text-xs text-gray-500 truncate max-w-[200px] inline-flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>{gameDir.split(/[/\\]/).pop()}</span>}
          <button onClick={handleImportGameDir}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors bg-[#3a3a3a] text-gray-400 hover:bg-[#444]`}>
            {gameDir ? '更换目录' : '导入游戏目录'}
          </button>
        </div>
      </div>

      {/* 未导入提示 */}
      {!gameDir && (
        <div className="mb-4 bg-[#1a1a1a] border border-[#444] rounded-lg p-4 flex items-start gap-3 flex-shrink-0">
          <span className="text-gray-400 flex-shrink-0 mt-0.5"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg></span>
          <div>
            <p className="text-base text-gray-300 font-medium">需要导入游戏目录来加载行走图</p>
            <p className="text-sm text-gray-500 mt-1">点击右上角"导入游戏目录"，选择星露谷安装路径</p>
          </div>
        </div>
      )}

      {/* 场景列表 */}
      <div className="space-y-4 flex-1">
        {activeScenes.map(sceneIdx => (
          <SpriteSceneGroup
            key={sceneIdx}
            sceneIdx={sceneIdx}
            sceneName={sceneTypes[sceneIdx]}
            npcId={npc.id}
            npcName={npc.name}
            gameSpriteUrl={sceneSpriteUrls[sceneIdx]}
            customSprites={customSprites}
            canRemove={sceneIdx !== 0}
            onRemove={() => handleRemoveScene(sceneIdx)}
            setSpriteFrame={setSpriteFrame}
            resetAllSprites={resetAllSprites}
          />
        ))}

        {/* 添加场景按钮 */}
        <div className="relative">
          <button onClick={() => setShowAddPanel(!showAddPanel)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-[#333] text-base text-gray-500 hover:text-gray-300 hover:border-[#555] transition-colors flex items-center justify-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            添加场景
          </button>
          {showAddPanel && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-[#2a2a2a] rounded-xl border border-[#444] p-3 z-20 shadow-xl max-h-[300px] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                {sceneTypes.map((name, idx) => (
                  <button key={idx}
                    onClick={() => handleAddScene(idx)}
                    disabled={activeScenes.includes(idx)}
                    className={`text-sm px-2 py-2 rounded-lg transition-colors text-left ${
                      activeScenes.includes(idx)
                        ? 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed'
                        : 'text-gray-300 hover:bg-[#3a3a3a]'
                    }`}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- 原版NPC场景组：一个场景的完整行走图编辑 ----
function SpriteSceneGroup({ sceneIdx, sceneName, npcId, npcName, gameSpriteUrl, customSprites, canRemove, onRemove, setSpriteFrame, resetAllSprites }: {
  sceneIdx: number; sceneName: string; npcId: string; npcName: string
  gameSpriteUrl?: string; customSprites: Record<string, string>
  canRemove: boolean; onRemove: () => void
  setSpriteFrame: (npcId: string, dir: string, frame: number, dataUrl: string) => void
  resetAllSprites: (npcId: string, dir: string) => void
}): JSX.Element {
  const sceneKey = sceneIdx === 0 ? '' : `${sceneIdx}_`
  const hasCustom = DIR_LAYOUT.some(d => customSprites[`${sceneKey}${d.id}_0`])

  const handleReplaceAll = (dataUrl: string) => {
    for (const d of DIR_LAYOUT) setSpriteFrame(npcId, `${sceneKey}${d.id}`, 0, dataUrl)
  }

  const handleResetAll = () => {
    for (const d of DIR_LAYOUT) resetAllSprites(npcId, `${sceneKey}${d.id}`)
  }

  // 显示用URL：优先自定义，否则游戏目录读取的
  const displayUrl = customSprites[`${sceneKey}walk_down_0`] || gameSpriteUrl

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 relative">
      {/* 场景标题 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-gray-200 flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          {sceneName}
          {hasCustom && <span className="text-xs px-1.5 py-0.5 rounded bg-[#3a3a3a] text-gray-400">已替换</span>}
        </h3>
        {canRemove && (
          <button onClick={onRemove} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-[#2a2a2a]">
            移除
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 左侧：完整 spritesheet 预览 */}
        <div className="w-full lg:w-[200px] flex flex-col items-center gap-3 flex-shrink-0">
          <div className="overflow-hidden rounded-lg border border-[#333] bg-[#111]" style={{ aspectRatio: '1/2', width: '128px' }}>
            {displayUrl ? (
              <img src={displayUrl} alt={`${npcName} ${sceneName}`}
                className="w-full h-full object-cover object-top" style={{ imageRendering: 'pixelated' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                {gameSpriteUrl === undefined ? '加载中...' : '无图'}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 w-full">
            <button className="relative flex-1 text-sm text-gray-400 hover:text-white py-2 rounded-lg border border-[#3a3a3a] hover:border-[#555] transition-colors overflow-hidden text-center">
              替换整张
              <input type="file" accept="image/png,image/webp,image/jpeg"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => handleReplaceAll(r.result as string); r.readAsDataURL(f); e.target.value = '' }} />
            </button>
            {hasCustom && (
              <button onClick={handleResetAll} className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg border border-[#444] hover:border-[#666] transition-colors">重置</button>
            )}
          </div>
        </div>

        {/* 右侧：4个方向动画帧展示 */}
        {displayUrl && (
          <div className="flex-1 grid grid-cols-2 gap-3">
            {DIR_LAYOUT.map((dir) => {
              const customUrl = customSprites[`${sceneKey}${dir.id}_0`]
              const src = customUrl || gameSpriteUrl
              return (
                <DirectionCard key={dir.id} label={dir.label} row={dir.row}
                  spriteUrl={src} isCustom={!!customUrl}
                  onReset={customUrl ? () => resetAllSprites(npcId, `${sceneKey}${dir.id}`) : undefined} />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- 方向卡片 ----
function DirectionCard({ label, row, spriteUrl, isCustom, onReset }: {
  label: string; row: number; spriteUrl: string | null | undefined
  isCustom: boolean; onReset?: () => void
}): JSX.Element {
  return (
    <div className={`bg-[#111] rounded-lg p-3 border-2 transition-all ${isCustom ? 'border-[#555]' : 'border-transparent hover:border-[#333]'}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm text-gray-400">{label}</h4>
        {isCustom && <button onClick={onReset} className="text-[11px] text-gray-500 hover:text-gray-300 px-1 py-0.5 rounded hover:bg-[#2a2a2a] transition-colors">重置</button>}
      </div>
      <div className="flex items-center justify-center min-h-[64px]">
        {spriteUrl ? (
          <div className="flex gap-[2px]">
            {[0, 1, 2, 3].map((col) => (
              <div key={col} className="w-6 h-12 overflow-hidden bg-[#0a0a0a] rounded" style={{ imageRendering: 'pixelated' }}>
                <img src={spriteUrl} alt=""
                  className="block"
                  style={{
                    width: 'auto', height: 'auto',
                    maxWidth: 'none',
                    objectFit: 'none',
                    objectPosition: `-${col * 16}px -${row * 32}px`,
                    imageRendering: 'pixelated',
                    transform: 'scale(1.5)',
                    transformOrigin: 'top left',
                  }} />
              </div>
            ))}
          </div>
        ) : (
          <span className="text-gray-600 text-sm">无图</span>
        )}
      </div>
    </div>
  )
}

// ---- 自定义NPC行走图编辑器 ----
function CustomSpriteEditor({ npcId, navigate }: {
  npcId: string
  navigate: ReturnType<typeof useNavigate>
}): JSX.Element {
  const { customNpcs, updateCustomNpc } = useCustomNpcs()
  const { unpackedRoot } = useNpcAssets()

  // 直接从context读取最新NPC数据（context常驻，不会因页面切换丢失）
  const npcFromCtx = customNpcs.find(n => n.id === npcId) || null
  // 用 ref 缓存 npc，防止 customNpcs 短暂为空时（如 restoreSnapshot 竞态）导致 npc 变 null
  const npcRef = useRef(npcFromCtx)
  if (npcFromCtx) npcRef.current = npcFromCtx
  const npc = npcRef.current
  const [activeScenes, setActiveScenes] = useState<number[]>(DEFAULT_SPRITE_SCENES)
  const [showAddPanel, setShowAddPanel] = useState(false)
  // 解包目录中的原始行走图（用于预览参考）
  const [unpackSprites, setUnpackSprites] = useState<Record<number, string>>({})

  // 初始化已设置的场景
  useEffect(() => {
    if (npc?.sprites) {
      const scenes = Object.keys(npc.sprites).map(Number).filter(n => !isNaN(n))
      if (scenes.length > 0) setActiveScenes([...new Set([0, 1, 2, ...scenes])].sort((a, b) => a - b))
    }
  }, [npcId]) // 只在npcId变化时初始化

  // 从解包目录读取行走图作为参考（优先用 NPC 自己的名字，找不到再 fallback 到 Abigail）
  useEffect(() => {
    const loadRef = async () => {
      const urls: Record<number, string> = {}
      const myName = npc?.name || 'Abigail'
      const refNames = [myName, 'Abigail']
      for (const sceneIdx of DEFAULT_SPRITE_SCENES) {
        const suffix = SCENE_SUFFIXES[sceneIdx] || ''
        if (unpackedRoot) {
          for (const name of refNames) {
            const path = `${unpackedRoot}\\Characters\\${name}${suffix}.png`
            const url = await window.electronAPI?.readGameFile(path)
            if (url) { urls[sceneIdx] = url; break }
          }
        }
        // 如果解包目录不可用或读取失败，使用本地静态文件作为 fallback
        if (!urls[sceneIdx]) {
          for (const name of refNames) {
            const staticPath = `./assets/maps/Characters_${name}${suffix}.png`
            urls[sceneIdx] = staticPath
            break
          }
        }
      }
      setUnpackSprites(urls)
    }
    loadRef()
  }, [unpackedRoot, npc?.name])

  const sprites = npc?.sprites || {}

  const pickImage = async (): Promise<{ filePath: string; dataUrl: string } | null> => {
    try {
      const api = (window as any).electronAPI
      if (!api || typeof api.selectImageFile !== 'function') return null
      const result = await api.selectImageFile()
      return result || null
    } catch (err) {
      console.error('[pickImage] 异常:', err)
      return null
    }
  }

  const handleSelectSprite = async (sceneIdx: number) => {
    const result = await pickImage()
    if (!result) return
    updateCustomNpc(npcId, {
      sprites: { ...(npc?.sprites || {}), [String(sceneIdx)]: result.dataUrl },
      spriteFilePaths: { ...(npc?.spriteFilePaths || {}), [String(sceneIdx)]: result.filePath },
    })
  }

  const handleDeleteSprite = (sceneIdx: number) => {
    const existing = { ...(npc?.sprites || {}) }
    const existingPaths = { ...(npc?.spriteFilePaths || {}) }
    delete existing[String(sceneIdx)]
    delete existingPaths[String(sceneIdx)]
    updateCustomNpc(npcId, {
      sprites: Object.keys(existing).length > 0 ? existing : undefined,
      spriteFilePaths: Object.keys(existingPaths).length > 0 ? existingPaths : undefined,
    })
  }

  if (!npc) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-base">自定义NPC 未找到</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-base text-gray-400 hover:underline">返回</button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-y-auto">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <button onClick={() => navigate(`/npc/${npcId}?tab=portrait`)}
          className="inline-flex items-center gap-1.5 text-base text-gray-400 hover:text-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          {npc.displayName}
        </button>
        <span className="text-gray-600">/</span>
        <span className="text-base text-white font-medium">编辑行走图</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
          自定义NPC
        </span>
      </div>

      {/* 场景列表 */}
      <div className="space-y-6 flex-1 pb-4">
        {activeScenes.map(sceneIdx => (
          <CustomSpriteSceneGroup
            key={sceneIdx}
            sceneName={sceneTypes[sceneIdx]}
            sceneIdx={sceneIdx}
            spriteUrl={sprites[String(sceneIdx)]}
            unpackPreviewUrl={unpackSprites[sceneIdx]}
            onSelect={() => handleSelectSprite(sceneIdx)}
            onDelete={() => handleDeleteSprite(sceneIdx)}
            canRemove={sceneIdx !== 0}
            onRemove={() => setActiveScenes(prev => prev.filter(s => s !== sceneIdx))}
          />
        ))}

        {/* 添加场景 */}
        {!showAddPanel ? (
          <button onClick={() => setShowAddPanel(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-[#333] text-base text-gray-500 hover:text-gray-300 hover:border-[#555] transition-colors flex items-center justify-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            添加场景
          </button>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 space-y-3">
            <p className="text-base text-gray-300 font-medium">选择要添加的场景</p>
            <div className="grid grid-cols-3 gap-3">
              {sceneTypes.map((name, idx) => (
                <button key={idx}
                  onClick={() => { setActiveScenes(prev => [...prev, idx].sort((a, b) => a - b)); setShowAddPanel(false) }}
                  disabled={activeScenes.includes(idx)}
                  className={`text-sm px-2 py-2 rounded-lg transition-colors text-left ${
                    activeScenes.includes(idx)
                      ? 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed'
                      : 'text-gray-300 hover:bg-[#3a3a3a]'
                  }`}>
                  {name}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAddPanel(false)}
              className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- 自定义NPC单个场景行走图组 ----
function CustomSpriteSceneGroup({
  sceneName, sceneIdx, spriteUrl, unpackPreviewUrl, onSelect, onDelete, canRemove, onRemove
}: {
  sceneName: string; sceneIdx: number; spriteUrl?: string; unpackPreviewUrl?: string
  onSelect: () => void; onDelete: () => void
  canRemove: boolean; onRemove: () => void
}): JSX.Element {
  // 显示优先级：自定义图片 > 解包参考图
  const displayUrl = spriteUrl || unpackPreviewUrl
  const isUnpackPreview = !spriteUrl && !!unpackPreviewUrl

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 relative">
      {/* 场景标题 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-gray-200 flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          {sceneName}
          {spriteUrl && <span className="text-xs px-1.5 py-0.5 rounded bg-[#3a3a3a] text-gray-400">已设置</span>}
          {isUnpackPreview && <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#333] text-gray-500">参考预览</span>}
        </h3>
        {canRemove && (
          <button onClick={onRemove} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-[#2a2a2a]">
            移除
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 左侧：完整行走图预览 */}
        <div className="w-full lg:w-[200px] flex flex-col items-center gap-3 flex-shrink-0">
          <div className={`overflow-hidden rounded-lg border bg-[#111] ${spriteUrl ? 'border-[#555]' : unpackPreviewUrl ? 'border-dashed border-[#444]' : 'border-dashed border-[#333]'}`}
            style={{ aspectRatio: '1/2', width: '128px' }}>
            {displayUrl ? (
              <img src={displayUrl} alt={`${sceneName} 行走图`}
                className={`w-full h-full object-cover object-top ${isUnpackPreview ? 'opacity-50' : ''}`}
                style={{ imageRendering: 'pixelated' }} />
            ) : (
              <div onClick={onSelect} className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-gray-400 transition-colors cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span className="text-xs">点击选择</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 w-full">
            <button onClick={onSelect}
              className="flex-1 text-sm text-gray-400 hover:text-white py-2 rounded-lg border border-[#3a3a3a] hover:border-[#555] transition-colors text-center">
              替换整张
            </button>
            {spriteUrl && (
              <button onClick={onDelete}
                className="text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded-lg border border-[#444] hover:border-red-800 transition-colors">
                删除
              </button>
            )}
          </div>
        </div>

        {/* 右侧：始终显示4个方向动画帧 */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          {DIR_LAYOUT.map((dir) => (
            <div key={dir.id}
              className={`bg-[#111] rounded-lg p-3 border-2 ${spriteUrl ? 'border-[#555]' : unpackPreviewUrl ? 'border-dashed border-[#444]' : 'border-dashed border-[#333]'}`}>
              <h4 className="text-sm text-gray-400 mb-2">{dir.label}</h4>
              <div className="flex items-center justify-center min-h-[64px]">
                {displayUrl ? (
                  /* 有图：4帧动画裁切 */
                  <div className={`flex gap-[2px] ${isUnpackPreview ? 'opacity-50' : ''}`}>
                    {[0, 1, 2, 3].map((col) => (
                      <div key={col} className="w-6 h-12 overflow-hidden bg-[#0a0a0a] rounded"
                        style={{ imageRendering: 'pixelated' }}>
                        <img src={displayUrl} alt=""
                          className="block"
                          style={{
                            width: 'auto', height: 'auto',
                            maxWidth: 'none',
                            objectFit: 'none',
                            objectPosition: `-${col * 16}px -${dir.row * 32}px`,
                            imageRendering: 'pixelated',
                            transform: 'scale(1.5)',
                            transformOrigin: 'top left',
                          }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 无图：占位 */
                  <span className="text-gray-600 text-sm">等待上传</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
