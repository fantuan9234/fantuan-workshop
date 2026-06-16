import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { defaultNPCs, expressionLabels, sceneTypes, type NPCInfo } from '../../data/npcData'
import { useNpcAssets } from '../../data/useNpcAssets'
import { useCustomNpcs } from '../../data/useCustomNpcs'

const DEFAULT_SCENES = [0, 1, 2] // 默认、沙滩、冬日

// 场景肖像文件名后缀
const PORTRAIT_SUFFIXES: Record<number, string> = {
  0: '', 1: '_Beach', 2: '_Winter', 3: '_Spring', 4: '_Summer', 5: '_Fall',
  6: '_FlowerDance', 7: '_EggF', 8: '_Fair', 9: '_Jellies', 10: '_Luau',
  11: '_SpiritsEve', 12: '_WinterStar', 13: '_IceF', 14: '_Winter_Indoor',
  15: '_Winter_Outdoor', 16: '_Hospital', 17: '_JojaMart', 18: '_Trenchcoat',
}

export default function NPCPortraitEditor(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isCustomRoute = (location.state as { isCustom?: boolean })?.isCustom || id?.startsWith('custom_')
  const npc = defaultNPCs.find((n) => n.id === id)

  // 自定义NPC路径
  if (isCustomRoute || !npc) {
    return <CustomPortraitEditor npcId={id!} navigate={navigate} />
  }

  // 原版NPC逻辑
  return <VanillaPortraitEditor npc={npc} navigate={navigate} />
}

// ---- 原版NPC肖像编辑器 ----
function VanillaPortraitEditor({ npc, navigate }: { npc: NPCInfo; navigate: ReturnType<typeof useNavigate> }): JSX.Element {
  const {
    assets,
    gameDir,
    unpackedRoot,
    setGameDir,
    setPortrait,
    replaceAllPortrait,
    resetAllPortraits
  } = useNpcAssets()
  const [activeScenes, setActiveScenes] = useState<number[]>(DEFAULT_SCENES)
  const [showAddPanel, setShowAddPanel] = useState(false)
  // 每个场景的原始肖像 data URL（从游戏目录读取）
  const [scenePortraitUrls, setScenePortraitUrls] = useState<Record<number, string>>({})

  // 从游戏解包目录读取各场景肖像
  useEffect(() => {
    const loadScenes = async () => {
      const urls: Record<number, string> = {}
      for (const sceneIdx of activeScenes) {
        const suffix = PORTRAIT_SUFFIXES[sceneIdx] || ''
        if (unpackedRoot) {
          // 优先从解包目录读取（高分辨率）
          const path = `${unpackedRoot}\\Portraits\\${npc.name}${suffix}.png`
          const url = await window.electronAPI?.readGameFile(path)
          if (url) urls[sceneIdx] = url
        }
        // 如果解包目录不可用或读取失败，使用本地静态文件作为 fallback
        if (!urls[sceneIdx]) {
          const staticPath = `/assets/maps/Portraits_${npc.name}${suffix}.png`
          urls[sceneIdx] = staticPath
        }
      }
      setScenePortraitUrls(prev => ({ ...prev, ...urls }))
    }
    loadScenes()
  }, [unpackedRoot, npc.name, activeScenes])

  // 自动将已有数据的场景加入显示列表
  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const npcAssets = assets[npc.id]
    if (!npcAssets?.portraits) return
    const scenesWithData = new Set(DEFAULT_SCENES)
    Object.keys(npcAssets.portraits).forEach(key => {
      const [sceneIdx] = key.split('_')
      scenesWithData.add(Number(sceneIdx))
    })
    setActiveScenes(Array.from(scenesWithData).sort((a, b) => a - b))
  }, [])

  const handleImportGameDir = async () => {
    const dir = await window.electronAPI?.selectGameDir()
    if (dir) setGameDir(dir)
  }

  const npcAssets = assets[npc.id]
  const customCount = npcAssets?.portraits ? Object.keys(npcAssets.portraits).length : 0

  return (
    <div className="p-4 md:p-8 h-full flex flex-col">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <button
          onClick={() => navigate(`/npc/${npc.id}`)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {npc.displayName}
        </button>
        <span className="text-gray-600">/</span>
        <span className="text-sm text-white font-medium">编辑肖像</span>
        {customCount > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#3a3a3a] text-gray-400">
            {customCount} 项已替换
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {gameDir && <span className="text-[10px] text-gray-500 truncate max-w-[200px] inline-flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>{gameDir.split(/[/\\]/).pop()}</span>}
          <button onClick={handleImportGameDir}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors bg-[#3a3a3a] text-gray-400 hover:bg-[#444]`}>
            {gameDir ? '更换目录' : '导入游戏目录'}
          </button>
        </div>
      </div>

      {/* 游戏目录未导入提示 */}
      {!gameDir && (
        <div className="mb-4 bg-[#1a1a1a] border border-[#444] rounded-lg p-4 flex items-start gap-3 flex-shrink-0">
          <span className="text-gray-400 flex-shrink-0 mt-0.5"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg></span>
          <div>
            <p className="text-sm text-gray-300 font-medium">肖像需要从你的星露谷游戏目录中读取</p>
            <p className="text-xs text-gray-500 mt-1">点击右上角"导入游戏目录"，选择星露谷安装路径</p>
          </div>
        </div>
      )}

      {/* 肖像网格区域 */}
      <div className="flex-1 overflow-y-auto space-y-8 pb-4">
        {activeScenes.map(sceneIdx => (
          <PortraitSceneGroup
            key={sceneIdx}
            scene={sceneTypes[sceneIdx]}
            sceneIdx={sceneIdx}
            npcId={npc.id}
            npcName={npc.displayName}
            gamePortraitUrl={scenePortraitUrls[sceneIdx]}
            customPortraits={npcAssets?.portraits ?? {}}
            onSetPortrait={(exprIdx, url) => setPortrait(npc.id, sceneIdx, exprIdx, url)}
            onReplaceAll={(url) => replaceAllPortrait(npc.id, sceneIdx, url)}
            onResetAll={() => resetAllPortraits(npc.id, sceneIdx)}
            onRemove={() => setActiveScenes(prev => prev.filter(s => s !== sceneIdx))}
            canRemove={!DEFAULT_SCENES.includes(sceneIdx)}
          />
        ))}

        {/* 添加场景 */}
        {!showAddPanel ? (
          <button
            onClick={() => setShowAddPanel(true)}
            className="w-full border border-dashed border-[#444] rounded-xl p-4 flex items-center justify-center gap-2 text-sm text-gray-400 hover:border-[#666] hover:text-gray-300 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            添加场景
          </button>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 space-y-3">
            <p className="text-sm text-gray-300 font-medium">选择要添加的场景</p>
            <div className="flex flex-wrap gap-2">
              {sceneTypes.map((scene, idx) => (
                !activeScenes.includes(idx) && (
                  <button
                    key={idx}
                    onClick={() => { setActiveScenes(prev => [...prev, idx].sort((a, b) => a - b)); setShowAddPanel(false) }}
                    className="text-xs px-3 py-1.5 rounded-md bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] transition-colors"
                  >
                    {scene}
                  </button>
                )
              ))}
            </div>
            <button
              onClick={() => setShowAddPanel(false)}
              className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- 原版NPC场景分组 ----
function PortraitSceneGroup({
  scene, sceneIdx, npcId, npcName, gamePortraitUrl, customPortraits,
  onSetPortrait, onReplaceAll, onResetAll, onRemove, canRemove
}: {
  scene: string
  sceneIdx: number
  npcId: string
  npcName: string
  gamePortraitUrl?: string
  customPortraits: Record<string, string>
  onSetPortrait: (exprIdx: number, url: string | null) => void
  onReplaceAll: (url: string) => void
  onResetAll: () => void
  onRemove?: () => void
  canRemove?: boolean
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onReplaceAll(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const hasCustoms = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].some(
    i => customPortraits[`${sceneIdx}_${i}`]
  )

  // 原始肖像URL：优先用自定义替换整张的，否则用游戏目录读取的
  const basePortraitUrl = customPortraits[`${sceneIdx}_0`] || gamePortraitUrl

  return (
    <div>
      {/* 场景标题 + 操作按钮 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-white">{scene}</h3>
        <div className="flex items-center gap-2">
          {canRemove && onRemove && (
            <button
              onClick={onRemove}
              className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded hover:bg-[#3a3a3a] transition-colors"
            >
              移除
            </button>
          )}
          {hasCustoms && (
            <button
              onClick={onResetAll}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-[#3a3a3a] transition-colors"
            >
              重置本组
            </button>
          )}
          <button className="relative text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded border border-[#3a3a3a] hover:border-[#555] transition-colors overflow-hidden">
            替换整张
            <input ref={fileInputRef} type="file" accept="image/png,image/webp,image/jpeg"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFilePicked} />
          </button>
        </div>
      </div>

      {/* 10格肖像网格：横向排列 + 水平滚动，每格保持 64×64 原始像素不被压缩 */}
      {basePortraitUrl ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((exprIdx) => {
            const customUrl = customPortraits[`${sceneIdx}_${exprIdx}`]
            const isCustom = !!customUrl
            return (
              <div key={exprIdx}
                className={`relative rounded-lg overflow-hidden flex flex-col items-center group cursor-pointer flex-shrink-0 ${
                  isCustom ? 'border-2 border-[#555] bg-[#1e1e1e]' : 'border-2 border-transparent hover:border-[#555] bg-[#2a2a2a]'
                }`}
                style={{ width: '64px' }}
                title={`点击替换 ${npcName} - ${expressionLabels[String(exprIdx)]}`}>
                {/* 文件选择覆盖层 */}
                <input type="file" accept="image/png,image/webp,image/jpeg"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => onSetPortrait(exprIdx, reader.result as string)
                    reader.readAsDataURL(file)
                    e.target.value = ''
                  }} />

                {/* canvas 保持 64×64 原图分辨率 */}
                <div className="w-[64px] h-[64px]">
                  <PortraitCrop src={customUrl || basePortraitUrl} index={exprIdx} />
                </div>

                {/* 悬停覆盖层 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>

                {/* 标记 */}
                <div className="absolute top-1 right-1 flex gap-1">
                  {isCustom && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-[#555] text-white leading-none inline-flex items-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  )}
                </div>

                {/* 自定义时显示重置按钮 */}
                {isCustom && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSetPortrait(exprIdx, null) }}
                    className="absolute top-1 left-1 text-[9px] px-1 py-0.5 rounded bg-[#555] text-white leading-none opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  >
                    重置
                  </button>
                )}

                {/* 标签 */}
                <div className="py-1.5 px-1 text-center w-full bg-[#1a1a1a] flex-shrink-0">
                  <div className="text-[10px] text-gray-300 truncate">{expressionLabels[String(exprIdx)]}</div>
                  <div className="text-[9px] text-gray-600">#{exprIdx}</div>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500 py-4 text-center">
          {gamePortraitUrl === undefined ? '正在加载...' : '未找到肖像文件，请确认游戏目录正确'}
        </div>
      )}
    </div>
  )
}

// ---- 自定义NPC肖像编辑器 ----
function CustomPortraitEditor({ npcId, navigate }: {
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
  const [activeScenes, setActiveScenes] = useState<number[]>(DEFAULT_SCENES)
  const [showAddPanel, setShowAddPanel] = useState(false)
  // 解包目录中的原始肖像（用于预览参考）
  const [unpackPortraits, setUnpackPortraits] = useState<Record<number, string>>({})

  // 初始化已设置的场景
  useEffect(() => {
    if (npc?.portraits) {
      const scenes = Object.keys(npc.portraits).map(Number).filter(n => !isNaN(n))
      if (scenes.length > 0) setActiveScenes([...new Set([0, 1, 2, ...scenes])].sort((a, b) => a - b))
    }
  }, [npcId]) // 只在npcId变化时初始化

  // 从解包目录读取肖像作为参考（优先用 NPC 自己的名字，找不到再 fallback 到 Abigail）
  useEffect(() => {
    const loadRef = async () => {
      const urls: Record<number, string> = {}
      const myName = npc?.name || 'Abigail' // 自定义NPC用自己创建时的英文名
      const refNames = [myName, 'Abigail'] // 优先自己，找不到用Abigail兜底
      for (const sceneIdx of DEFAULT_SCENES) {
        const suffix = PORTRAIT_SUFFIXES[sceneIdx] || ''
        if (unpackedRoot) {
          for (const name of refNames) {
            const path = `${unpackedRoot}\\Portraits\\${name}${suffix}.png`
            const url = await window.electronAPI?.readGameFile(path)
            if (url) { urls[sceneIdx] = url; break }
          }
        }
        // 如果解包目录不可用或读取失败，使用本地静态文件作为 fallback
        if (!urls[sceneIdx]) {
          for (const name of refNames) {
            const staticPath = `/assets/maps/Portraits_${name}${suffix}.png`
            urls[sceneIdx] = staticPath
            break
          }
        }
      }
      setUnpackPortraits(urls)
    }
    loadRef()
  }, [unpackedRoot, npc?.name])

  const portraits = npc?.portraits || {}

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

  const handleSelectPortrait = async (sceneIdx: number) => {
    const result = await pickImage()
    if (!result) return
    updateCustomNpc(npcId, {
      portraits: { ...(npc?.portraits || {}), [String(sceneIdx)]: result.dataUrl },
      portraitFilePaths: { ...(npc?.portraitFilePaths || {}), [String(sceneIdx)]: result.filePath },
      portraitUrl: sceneIdx === 0 ? result.dataUrl : (npc?.portraits?.['0'] || npc?.portraitUrl || ''),
    })
  }

  const handleDeletePortrait = (sceneIdx: number) => {
    const existing = { ...(npc?.portraits || {}) }
    const existingPaths = { ...(npc?.portraitFilePaths || {}) }
    delete existing[String(sceneIdx)]
    delete existingPaths[String(sceneIdx)]
    updateCustomNpc(npcId, {
      portraits: Object.keys(existing).length > 0 ? existing : undefined,
      portraitFilePaths: Object.keys(existingPaths).length > 0 ? existingPaths : undefined,
      portraitUrl: sceneIdx === 0 ? (existing['0'] || '') : npc?.portraitUrl,
    })
  }

  if (!npc) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-sm">自定义NPC 未找到</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm text-gray-400 hover:underline">返回</button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-y-auto">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <button onClick={() => navigate(`/npc/${npcId}?tab=portrait`)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {npc.displayName}
        </button>
        <span className="text-gray-600">/</span>
        <span className="text-sm text-white font-medium">编辑肖像</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
          自定义NPC
        </span>
      </div>

      {/* 场景列表 */}
      <div className="flex-1 space-y-8 pb-4">
        {activeScenes.map(sceneIdx => (
          <CustomPortraitSceneGroup
            key={sceneIdx}
            sceneName={sceneTypes[sceneIdx]}
            sceneIdx={sceneIdx}
            portraitUrl={portraits[String(sceneIdx)]}
            unpackPreviewUrl={unpackPortraits[sceneIdx]}
            onSelect={() => handleSelectPortrait(sceneIdx)}
            onDelete={() => handleDeletePortrait(sceneIdx)}
            canRemove={sceneIdx !== 0}
            onRemove={() => setActiveScenes(prev => prev.filter(s => s !== sceneIdx))}
          />
        ))}

        {/* 添加场景 */}
        {!showAddPanel ? (
          <button onClick={() => setShowAddPanel(true)}
            className="w-full border border-dashed border-[#444] rounded-xl p-4 flex items-center justify-center gap-2 text-sm text-gray-400 hover:border-[#666] hover:text-gray-300 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            添加场景
          </button>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 space-y-3">
            <p className="text-sm text-gray-300 font-medium">选择要添加的场景</p>
            <div className="flex flex-wrap gap-2">
              {sceneTypes.map((name, idx) => (
                !activeScenes.includes(idx) && (
                  <button key={idx}
                    onClick={() => { setActiveScenes(prev => [...prev, idx].sort((a, b) => a - b)); setShowAddPanel(false) }}
                    className="text-xs px-3 py-1.5 rounded-md bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] transition-colors">
                    {name}
                  </button>
                )
              ))}
            </div>
            <button onClick={() => setShowAddPanel(false)}
              className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- 肖像裁切组件：用 canvas 将大图裁切成单格显示 ----
// 星露谷原版肖像实际布局（已通过解包文件验证）：
//   2列 × N行，每格 64×64
//   Abigail.png:  128×320  (2×5=10格)
//   Haley.png:    128×448  (2×7=14格，前10个是表情)
// canvas 保持 64×64 原始分辨率（不被压缩），通过 CSS 放大到 100% 显示
function PortraitCrop({ src, index, opacity = 1 }: {
  src: string; index: number; opacity?: number
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [info, setInfo] = useState<string>('加载中...')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !src) { setInfo('无图片'); return }
    const ctx = canvas.getContext('2d')
    if (!ctx) { setInfo('无 context'); return }

    const img = new Image()
    let aborted = false
    img.onload = () => {
      if (aborted) return
      // 星露谷肖像：2列 × N行（每格 64×64 固定）
      const FRAME_SIZE = 64
      const cols = Math.max(1, Math.round(img.naturalWidth / FRAME_SIZE))
      const col = index % cols
      const row = Math.floor(index / cols)
      const sx = col * FRAME_SIZE
      const sy = row * FRAME_SIZE
      // 关键：canvas 保持 64×64 物理像素（不被压缩），CSS 放大显示
      canvas.width = 64
      canvas.height = 64
      ctx.imageSmoothingEnabled = false
      ctx.globalAlpha = opacity
      ctx.clearRect(0, 0, 64, 64)
      if (sx + 64 <= img.naturalWidth && sy + 64 <= img.naturalHeight) {
        ctx.drawImage(img, sx, sy, 64, 64, 0, 0, 64, 64)
        setInfo(`#${index} (${col},${row}) of ${img.naturalWidth}×${img.naturalHeight}`)
      } else {
        ctx.drawImage(img, 0, 0, 64, 64)
        setInfo(`#${index} 越界`)
      }
    }
    img.onerror = () => { if (!aborted) setInfo('加载失败') }
    img.src = src
    return () => { aborted = true }
  }, [src, index, opacity])

  return (
    <canvas ref={canvasRef}
      className="block"
      style={{ imageRendering: 'pixelated', width: '100%', height: '100%', objectFit: 'contain' }}
      title={info} />
  )
}

// ---- 自定义NPC单个场景肖像组（10格裁切 + 完整预览） ----
function CustomPortraitSceneGroup({
  sceneName, sceneIdx, portraitUrl, unpackPreviewUrl, onSelect, onDelete, canRemove, onRemove
}: {
  sceneName: string; sceneIdx: number; portraitUrl?: string; unpackPreviewUrl?: string
  onSelect: () => void; onDelete: () => void
  canRemove: boolean; onRemove: () => void
}): JSX.Element {
  // 显示优先级：自定义图片 > 解包参考图 > 无图占位
  const displayUrl = portraitUrl || unpackPreviewUrl
  const isUnpackPreview = !portraitUrl && !!unpackPreviewUrl

  return (
    <div>
      {/* 场景标题 + 操作按钮 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-white">{sceneName}</h3>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button onClick={onRemove}
              className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded hover:bg-[#3a3a3a] transition-colors">
              移除
            </button>
          )}
          <button onClick={onSelect}
            className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded border border-[#3a3a3a] hover:border-[#555] transition-colors">
            替换整张
          </button>
          {isUnpackPreview && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#333] text-gray-500">参考预览</span>
          )}
        </div>
      </div>

      {/* 10格肖像网格：横向排列 + 水平滚动，每格保持 64×64 原始像素不被压缩 */}
      <div className="overflow-x-auto pb-2 mb-3">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((exprIdx) => {
            return (
              <div key={exprIdx}
                className={`relative rounded-lg overflow-hidden flex flex-col items-center group cursor-pointer flex-shrink-0 ${
                  portraitUrl ? 'border-2 border-[#555] bg-[#1e1e1e]' :
                  unpackPreviewUrl ? 'border-2 border-dashed border-[#444] bg-[#1a1a1a]' :
                  'border-2 border-dashed border-[#333] bg-[#1a1a1a] hover:border-[#555]'
                }`}
                style={{ width: '64px' }}
                onClick={onSelect}
                title={displayUrl ? expressionLabels[String(exprIdx)] : '点击选择图片'}>
                {displayUrl ? (
                  /* canvas 保持 64×64 原图分辨率，CSS 控制显示 */
                  <div className="w-[64px] h-[64px]">
                    <PortraitCrop src={displayUrl} index={exprIdx}
                      opacity={isUnpackPreview ? 0.5 : 1} />
                  </div>
                ) : (
                  /* 无图：占位 */
                  <div className="w-[64px] h-[64px] flex items-center justify-center text-gray-600 group-hover:text-gray-400 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  </div>
                )}
                {/* 标签 */}
                <div className="py-1 px-0.5 text-center w-full bg-[#1a1a1a]">
                  <div className={`text-[9px] truncate ${displayUrl && !isUnpackPreview ? 'text-gray-300' : 'text-gray-500'}`}>{expressionLabels[String(exprIdx)]}</div>
                  <div className="text-[8px] text-gray-600">#{exprIdx}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 完整预览图（仅在有自定义图片时显示） */}
      {portraitUrl && (
        <div className="relative rounded-xl overflow-hidden group max-w-[200px] border-2 border-[#555] bg-[#1e1e1e]">
          <img src={portraitUrl} alt={`${sceneName} 完整肖像`}
            className="w-full h-auto object-contain"
            style={{ imageRendering: 'pixelated' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <button onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-red-900/80 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-800">
            删除
          </button>
        </div>
      )}
    </div>
  )
}
