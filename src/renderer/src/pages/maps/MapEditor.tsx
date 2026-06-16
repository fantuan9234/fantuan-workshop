import { useParams, useNavigate } from 'react-router-dom'
import { useState, useMemo, useRef, useEffect } from 'react'
import { referenceMaps, mapCategories, createEmptyMap, type MapInfo, type MapCategory, type WarpPoint, type SpawnPoint, type ForageArea } from '../../data/mapData'
import { defaultNPCs } from '../../data/npcData'
import { useProject } from '../../data/ProjectContext'
import { UnsavedChangesGuard } from '../../components/useUnsavedChangesGuard'
import { useT, asString } from '../../i18n'

export default function MapEditor(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { mutateSnapshot } = useProject()
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const isNew = id === 'new'
  const refMap = referenceMaps.find(m => m.id === id)

  const [displayName, setDisplayName] = useState(refMap?.displayName ?? '新地图')
  const [name, setName] = useState(refMap?.name ?? 'NewMap')
  const [width, setWidth] = useState(refMap?.width ?? 40)
  const [height, setHeight] = useState(refMap?.height ?? 30)
  const [category, setCategory] = useState<MapCategory>(refMap?.category ?? 'outdoor')
  const [indoor, setIndoor] = useState(refMap?.indoor ?? false)
  const [season, setSeason] = useState<MapInfo['season']>(refMap?.season ?? 'all')
  const [description, setDescription] = useState(refMap?.description ?? '')
  const [savedToast, setSavedToast] = useState(false)
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [customImage, setCustomImage] = useState<string | null>(null)
  const [gameAssetSource, setGameAssetSource] = useState<{ name: string; path: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 传送点
  const [warps, setWarps] = useState<WarpPoint[]>(refMap?.warps ?? [])
  // 生成点
  const [spawns, setSpawns] = useState<SpawnPoint[]>(refMap?.spawns ?? [])
  // 采集区
  const [forageAreas, setForageAreas] = useState<ForageArea[]>(refMap?.forageAreas ?? [])

  // 当前激活的编辑器标签
  const [activeTab, setActiveTab] = useState<'props' | 'warps' | 'spawns' | 'forage'>('props')

  // 网格预览的缩放 - 自适应
  const [gridZoom, setGridZoom] = useState(8)
  const containerRef = useRef<HTMLDivElement>(null)
  const gridWrapperRef = useRef<HTMLDivElement>(null)
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null)
  const [clickMode, setClickMode] = useState<'none' | 'warp' | 'spawn' | 'forage'>('none')

  // 根据面板大小自适应缩放
  const autoZoom = useMemo(() => {
    const panelW = (gridWrapperRef.current?.clientWidth ?? 700) - 40
    const fitZoom = Math.floor(panelW / width)
    return Math.max(4, Math.min(16, fitZoom))
  }, [width, height])

  useEffect(() => {
    setGridZoom(autoZoom)
  }, [autoZoom])

  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${width}, ${gridZoom}px)`,
    gridTemplateRows: `repeat(${height}, ${gridZoom}px)`,
    gap: '1px',
  }), [width, height, gridZoom])

  const handleGridClick = (x: number, y: number) => {
    if (clickMode === 'warp') {
      setWarps([...warps, { id: 'w' + Date.now(), label: '新传送点', x, y, targetMap: 'Farm', targetX: 0, targetY: 0 }])
    } else if (clickMode === 'spawn') {
      setSpawns([...spawns, { id: 's' + Date.now(), npcId: '', x, y, label: '新NPC位置' }])
    } else if (clickMode === 'forage') {
      setForageAreas([...forageAreas, { id: 'f' + Date.now(), x, y, w: 15, h: 10, label: '采集区' }])
    }
  }

  // 标记点叠加层
  const warpPositions = useMemo(() => warps.map(w => ({ ...w, color: '#888' })), [warps])
  const spawnPositions = useMemo(() => spawns.map(s => ({ ...s, color: '#888' })), [spawns])
  const forageRects = useMemo(() => forageAreas.map(f => ({ ...f, color: '#888' })), [forageAreas])

  const currentMap: MapInfo = { id: id || 'temp', name, displayName, width, height, category, indoor, season, description, imageUrl: (customImage || refMap?.imageUrl) ?? '', warps, spawns, forageAreas }

  const handleImageUpload = () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setCustomImage(reader.result as string); setGameAssetSource(null) }
    reader.readAsDataURL(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  // 从游戏素材选择地图
  const handleSelectFromGameAssets = async () => {
    // 防御性检查：API 可能不存在（旧版 preload 或加载失败）
    const api = window.electronAPI
    if (!api || typeof api.xnbSelectMapFile !== 'function') {
      setErrorToast('当前版本不支持从游戏素材选择地图，已切换为本地文件上传')
      setTimeout(() => setErrorToast(null), 3500)
      // 回退：调用本地文件选择
      fileRef.current?.click()
      return
    }
    try {
      const result = await api.xnbSelectMapFile()
      if (result?.dataUrl) {
        setCustomImage(result.dataUrl)
        setGameAssetSource({ name: result.name, path: result.path })
      } else {
        // result 为 null：游戏目录未检测到 / Maps 目录不存在 / 用户取消
        setErrorToast('未找到游戏地图素材，请先在设置中配置游戏目录，或改用"选择图片"上传')
        setTimeout(() => setErrorToast(null), 3500)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorToast('从游戏素材加载地图失败：' + msg)
      setTimeout(() => setErrorToast(null), 3500)
    }
  }

  // 清除自定义图片
  const handleClearImage = () => { setCustomImage(null); setGameAssetSource(null) }

  const handleSave = () => {
    if (!name.trim() || !displayName.trim()) return
    const mapToSave: MapInfo = { ...currentMap, id: isNew ? 'map_' + Date.now() : (refMap?.id ?? 'map_' + Date.now()) }
    if (isNew) {
      mutateSnapshot<MapInfo[]>('maps', prev => [...prev, mapToSave])
      navigate(`/maps/${mapToSave.id}`, { replace: true })
    } else {
      mutateSnapshot<MapInfo[]>('maps', prev => prev.map(m => m.id === mapToSave.id ? mapToSave : m))
    }
    setSavedToast(true)
    setDirty(false)
    setTimeout(() => setSavedToast(false), 1500)
  }

  if (!refMap && !isNew) {
    return <div className="p-8 flex flex-col items-center justify-center h-full text-gray-500">
      <div className="w-16 h-16 rounded-2xl bg-[#2a2a2a] flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
        </svg>
      </div>
      <p className="text-sm text-gray-400">{ts('mapEditor.mapNotFound')}</p>
      <button onClick={() => navigate(-1)} className="mt-3 text-sm text-gray-400 hover:text-white hover:underline transition-colors">{ts('mapEditor.back')}</button>
    </div>
  }

  const tabItems = [
    { k: 'props' as const, label: ts('mapEditor.tabProps'), count: 0, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
    { k: 'warps' as const, label: ts('mapEditor.tabWarps'), count: warps.length, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> },
    { k: 'spawns' as const, label: ts('mapEditor.tabSpawns'), count: spawns.length, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { k: 'forage' as const, label: ts('mapEditor.tabForage'), count: forageAreas.length, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  ] as const

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#1a1a1a]" onChange={() => setDirty(true)}>
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#333] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/maps')} className="inline-flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            {ts('mapEditor.mapList')}
          </button>
          <span className="text-gray-600">/</span>
          <span className="text-sm text-white font-medium">{displayName || ts('mapEditor.editMap')}</span>
          {gameAssetSource && (
            <span className="text-[10px] text-green-400/70 bg-green-400/10 px-2 py-0.5 rounded ml-1">
              {gameAssetSource.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">
            {width}×{height} 格 ({width * 16}×{height * 16} px)
          </span>
          {errorToast && (
            <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-1 rounded max-w-[320px] truncate" title={errorToast}>
              {errorToast}
            </span>
          )}
          {savedToast && <span className="text-[11px] text-emerald-400 animate-pulse">{ts('mapEditor.saved')}</span>}
          <button onClick={handleSave} className="text-xs bg-white text-black font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">{ts('mapEditor.saveMap')}</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* 左侧控制面板 */}
        <div className="w-full lg:w-[320px] lg:flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-[#333] overflow-hidden">
          {/* 标签切换 */}
          <div className="flex bg-[#2a2a2a] p-1 m-3 mb-0 rounded-lg gap-0.5 flex-shrink-0">
            {tabItems.map(t => (
              <button key={t.k} onClick={() => setActiveTab(t.k)}
                className={`flex-1 text-[11px] py-2 rounded-md transition-colors flex items-center justify-center gap-1 ${
                  activeTab === t.k ? 'bg-white text-black font-medium' : 'text-gray-400 hover:text-white'
                }`}>
                {t.icon}
                {t.label}
                {t.count > 0 && <span className={`text-[9px] ${activeTab === t.k ? 'text-black/50' : 'text-gray-500'}`}>({t.count})</span>}
              </button>
            ))}
          </div>

          {/* 标签内容 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* === 属性标签 === */}
            {activeTab === 'props' && (
              <>
                {/* 地图背景图卡片 */}
                <div className="bg-[#2a2a2a] rounded-xl p-4">
                  <label className="text-[11px] text-gray-500 block mb-2">{ts('mapEditor.mapBackground')}</label>
                  <div className="flex items-start gap-3">
                    <div className="w-24 h-16 rounded-lg bg-[#1a1a1a] overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#333]">
                      {(customImage || refMap?.imageUrl) ? (
                        <img src={customImage || refMap?.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/></svg>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => fileRef.current?.click()} className="text-[11px] text-gray-400 hover:text-white transition-colors">{ts('mapEditor.selectImage')}</button>
                        <span className="text-[#444]">|</span>
                        <button onClick={handleSelectFromGameAssets} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">{ts('mapEditor.fromGameAssets')}</button>
                        {(customImage || gameAssetSource) && (
                          <>
                            <span className="text-[#444]">|</span>
                            <button onClick={handleClearImage} className="text-[11px] text-red-400/70 hover:text-red-400 transition-colors">{ts('mapEditor.clear')}</button>
                          </>
                        )}
                      </div>
                      {gameAssetSource && (
                        <p className="text-[10px] text-green-400/80 truncate max-w-[180px]" title={gameAssetSource.path}>
                          已加载: {gameAssetSource.name}
                        </p>
                      )}
                      {!gameAssetSource && customImage && (
                        <p className="text-[10px] text-gray-600">自定义图片</p>
                      )}
                      {!customImage && !gameAssetSource && refMap?.imageUrl && (
                        <p className="text-[10px] text-gray-600">使用参考地图</p>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </div>
                  </div>
                </div>

                {/* 基本信息卡片 */}
                <div className="bg-[#2a2a2a] rounded-xl p-4 space-y-3">
                  <F label={ts('mapEditor.chineseName')}><input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="如: 秘密花园" className="input" /></F>
                  <F label={ts('mapEditor.englishId')}><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="如: SecretGarden" className="input" /></F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label={ts('mapEditor.widthTiles')}><input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} min={10} max={200} className="input" /></F>
                    <F label={ts('mapEditor.heightTiles')}><input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} min={10} max={200} className="input" /></F>
                  </div>
                  <p className="text-[10px] text-gray-600 -mt-2">1格 = 16像素，当前尺寸: {width * 16}×{height * 16}px</p>
                </div>

                {/* 分类与季节卡片 */}
                <div className="bg-[#2a2a2a] rounded-xl p-4 space-y-3">
                  <F label={ts('mapEditor.category')}><select value={category} onChange={e => setCategory(e.target.value as MapCategory)} className="input">
                    {mapCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select></F>
                  <F label={ts('mapEditor.sceneType')}><select value={indoor ? 'indoor' : 'outdoor'} onChange={e => setIndoor(e.target.value === 'indoor')} className="input">
                    <option value="outdoor">{ts('mapEditor.outdoor')}</option><option value="indoor">{ts('mapEditor.indoor')}</option>
                  </select></F>
                  <F label={ts('mapEditor.season')}><select value={season} onChange={e => setSeason(e.target.value as MapInfo['season'])} className="input">
                    <option value="all">{ts('mapEditor.seasonAll')}</option><option value="spring">{ts('mapEditor.seasonSpring')}</option><option value="summer">{ts('mapEditor.seasonSummer')}</option><option value="fall">{ts('mapEditor.seasonFall')}</option><option value="winter">{ts('mapEditor.seasonWinter')}</option>
                  </select></F>
                  <F label={ts('mapEditor.description')}><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="游戏内地图描述..." className="input resize-none" /></F>
                </div>
              </>
            )}

            {/* === 传送点标签 === */}
            {activeTab === 'warps' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">{ts('mapEditor.warpList')}</span>
                  <button onClick={() => setWarps([...warps, { id: 'w' + Date.now(), label: '新传送点', x: 10, y: 10, targetMap: 'Farm', targetX: 0, targetY: 0 }])}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[#333] transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {ts('mapEditor.add')}
                  </button>
                </div>
                {warps.length === 0 && (
                  <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col items-center justify-center text-gray-500">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" className="mb-2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    <p className="text-xs">{ts('mapEditor.noWarps')}</p>
                    <p className="text-[10px] text-gray-600 mt-1">点击添加或切换到放置模式</p>
                  </div>
                )}
                {warps.map((w, i) => (
                  <div key={w.id} className="bg-[#2a2a2a] rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                      <input type="text" value={w.label} onChange={e => setWarps(warps.map((wx, j) => j === i ? { ...wx, label: e.target.value } : wx))}
                        className="bg-transparent text-xs text-white outline-none flex-1" placeholder="传送点名称" />
                      <button onClick={() => setWarps(warps.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400 text-[10px] transition-colors">{ts('mapEditor.delete')}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <F label="出发 X">
                        <input type="number" value={w.x} onChange={e => setWarps(warps.map((wx, j) => j === i ? { ...wx, x: Number(e.target.value) } : wx))} className="input py-1" />
                      </F>
                      <F label="出发 Y">
                        <input type="number" value={w.y} onChange={e => setWarps(warps.map((wx, j) => j === i ? { ...wx, y: Number(e.target.value) } : wx))} className="input py-1" />
                      </F>
                      <F label="目标地图">
                        <input type="text" value={w.targetMap} onChange={e => setWarps(warps.map((wx, j) => j === i ? { ...wx, targetMap: e.target.value } : wx))} className="input py-1" placeholder="如: Town" />
                      </F>
                      <div className="grid grid-cols-2 gap-2">
                        <F label="目标 X"><input type="number" value={w.targetX} onChange={e => setWarps(warps.map((wx, j) => j === i ? { ...wx, targetX: Number(e.target.value) } : wx))} className="input py-1" /></F>
                        <F label="目标 Y"><input type="number" value={w.targetY} onChange={e => setWarps(warps.map((wx, j) => j === i ? { ...wx, targetY: Number(e.target.value) } : wx))} className="input py-1" /></F>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* === NPC生成点标签 === */}
            {activeTab === 'spawns' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">{ts('mapEditor.spawnList')}</span>
                  <button onClick={() => setSpawns([...spawns, { id: 's' + Date.now(), npcId: '', x: 10, y: 10, label: '新NPC位置' }])}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[#333] transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {ts('mapEditor.add')}
                  </button>
                </div>
                {spawns.length === 0 && (
                  <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col items-center justify-center text-gray-500">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" className="mb-2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <p className="text-xs">{ts('mapEditor.noSpawns')}</p>
                    <p className="text-[10px] text-gray-600 mt-1">点击添加或切换到放置模式</p>
                  </div>
                )}
                {spawns.map((s, i) => (
                  <div key={s.id} className="bg-[#2a2a2a] rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                      <input type="text" value={s.label} onChange={e => setSpawns(spawns.map((sx, j) => j === i ? { ...sx, label: e.target.value } : sx))}
                        className="bg-transparent text-xs text-white outline-none flex-1" placeholder="位置名称" />
                      <button onClick={() => setSpawns(spawns.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400 text-[10px] transition-colors">{ts('mapEditor.delete')}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <F label="X"><input type="number" value={s.x} onChange={e => setSpawns(spawns.map((sx, j) => j === i ? { ...sx, x: Number(e.target.value) } : sx))} className="input py-1" /></F>
                      <F label="Y"><input type="number" value={s.y} onChange={e => setSpawns(spawns.map((sx, j) => j === i ? { ...sx, y: Number(e.target.value) } : sx))} className="input py-1" /></F>
                      <F label="NPC">
                        <select value={s.npcId} onChange={e => setSpawns(spawns.map((sx, j) => j === i ? { ...sx, npcId: e.target.value } : sx))} className="input py-1">
                          <option value="">{ts('mapEditor.selectNpc')}</option>
                          {defaultNPCs.map(n => <option key={n.id} value={n.id}>{n.displayName}</option>)}
                        </select>
                      </F>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* === 采集区标签 === */}
            {activeTab === 'forage' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">{ts('mapEditor.forageList')}</span>
                  <button onClick={() => setForageAreas([...forageAreas, { id: 'f' + Date.now(), x: 5, y: 5, w: 15, h: 10, label: '采集区' }])}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[#333] transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {ts('mapEditor.add')}
                  </button>
                </div>
                {forageAreas.length === 0 && (
                  <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col items-center justify-center text-gray-500">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" className="mb-2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <p className="text-xs">{ts('mapEditor.noForage')}</p>
                    <p className="text-[10px] text-gray-600 mt-1">点击添加或切换到放置模式</p>
                  </div>
                )}
                {forageAreas.map((f, i) => (
                  <div key={f.id} className="bg-[#2a2a2a] rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
                      <input type="text" value={f.label} onChange={e => setForageAreas(forageAreas.map((fx, j) => j === i ? { ...fx, label: e.target.value } : fx))}
                        className="bg-transparent text-xs text-white outline-none flex-1" placeholder="区域名称" />
                      <button onClick={() => setForageAreas(forageAreas.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400 text-[10px] transition-colors">{ts('mapEditor.delete')}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <F label="起点 X"><input type="number" value={f.x} onChange={e => setForageAreas(forageAreas.map((fx, j) => j === i ? { ...fx, x: Number(e.target.value) } : fx))} className="input py-1" /></F>
                      <F label="起点 Y"><input type="number" value={f.y} onChange={e => setForageAreas(forageAreas.map((fx, j) => j === i ? { ...fx, y: Number(e.target.value) } : fx))} className="input py-1" /></F>
                      <F label="宽度"><input type="number" value={f.w} onChange={e => setForageAreas(forageAreas.map((fx, j) => j === i ? { ...fx, w: Number(e.target.value) } : fx))} className="input py-1" min={1} /></F>
                      <F label="高度"><input type="number" value={f.h} onChange={e => setForageAreas(forageAreas.map((fx, j) => j === i ? { ...fx, h: Number(e.target.value) } : fx))} className="input py-1" min={1} /></F>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 右侧：网格预览 */}
        <div className="flex-1 flex flex-col min-w-0 gap-0 overflow-hidden">
          {/* 工具栏 */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#333] flex-shrink-0 bg-[#1e1e1e]">
            {/* 缩放控制 */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{ts('mapEditor.zoom')}</span>
              <input type="range" min={4} max={16} value={gridZoom} onChange={e => setGridZoom(Number(e.target.value))}
                className="w-20 h-1 accent-white" />
              <span className="text-[10px] text-gray-500 w-16">{gridZoom}px/格</span>
            </div>

            <div className="w-px h-4 bg-[#333]" />

            {/* 放置模式 */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500 mr-1">{ts('mapEditor.place')}</span>
              {([
                { m: 'none' as const, l: ts('mapEditor.view'), color: '' },
                { m: 'warp' as const, l: ts('mapEditor.warpPoint'), color: 'text-blue-400' },
                { m: 'spawn' as const, l: ts('mapEditor.tabSpawns'), color: 'text-emerald-400' },
                { m: 'forage' as const, l: ts('mapEditor.forageArea'), color: 'text-amber-400' },
              ]).map(mo => (
                <button key={mo.m} onClick={() => setClickMode(clickMode === mo.m ? 'none' : mo.m)}
                  className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                    clickMode === mo.m ? 'bg-white text-black font-medium' : 'text-gray-400 hover:text-white hover:bg-[#3a3a3a]'
                  }`}>{mo.l}</button>
              ))}
            </div>

            <div className="flex-1" />

            {/* 状态信息 */}
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              {warps.length > 0 && <span className="text-blue-400/70">{warps.length} {ts('mapEditor.tabWarps')}</span>}
              {spawns.length > 0 && <span className="text-emerald-400/70">{spawns.length} {ts('mapEditor.tabSpawns')}</span>}
              {forageAreas.length > 0 && <span className="text-amber-400/70">{forageAreas.length} {ts('mapEditor.tabForage')}</span>}
              {hoverTile && <span className="text-gray-400">
                ({hoverTile.x}, {hoverTile.y}) = ({hoverTile.x * 16}, {hoverTile.y * 16})px
              </span>}
            </div>
          </div>

          {/* 网格面板 */}
          <div ref={gridWrapperRef} className={`flex-1 overflow-auto p-4 flex items-start justify-center ${clickMode !== 'none' ? 'ring-1 ring-inset ring-[#555]' : ''}`}>
            <div className="relative" style={{ minWidth: width * (gridZoom + 1), minHeight: height * (gridZoom + 1) }}>
              {/* 地图背景图 */}
              {(customImage || refMap?.imageUrl) && (
                <img src={customImage || refMap?.imageUrl} alt={refMap?.displayName}
                  className={`absolute inset-0 w-full h-full object-fill pointer-events-none rounded ${
                    customImage ? '' : 'opacity-20'
                  }`}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              )}

              {/* 网格 */}
              <div style={gridStyle}>
                {Array.from({ length: width * height }).map((_, i) => {
                  const x = i % width
                  const y = Math.floor(i / width)
                  const hasWarp = warps.some(w => w.x === x && w.y === y)
                  const hasSpawn = spawns.some(s => s.x === x && s.y === y)
                  const hasForage = forageAreas.some(f => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h)
                  return (
                    <div key={i}
                      className={`rounded-[1px] transition-all duration-75 cursor-crosshair ${
                        hasWarp ? 'bg-blue-500/30' : hasSpawn ? 'bg-emerald-500/30' : hasForage ? 'bg-amber-500/20' : 'bg-[#2a2a2a]'
                      } hover:ring-1 hover:ring-white/60 hover:z-10`}
                      onMouseEnter={() => setHoverTile({ x, y })}
                      onMouseLeave={() => setHoverTile(null)}
                      onClick={() => handleGridClick(x, y)}
                      title={`(${x}, ${y})${hasWarp ? ' [传送]' : ''}${hasSpawn ? ' [NPC]' : ''}${hasForage ? ' [采集]' : ''}`}
                    />
                  )
                })}
              </div>

              {/* 采集区矩形 */}
              <svg className="absolute inset-0 pointer-events-none" style={{ width: width * (gridZoom + 1), height: height * (gridZoom + 1) }}>
                {forageRects.map(f => (
                  <rect key={f.id} x={f.x * (gridZoom + 1)} y={f.y * (gridZoom + 1)}
                    width={f.w * (gridZoom + 1)} height={f.h * (gridZoom + 1)}
                    fill="#f59e0b10" stroke="#f59e0b" strokeWidth="1.5" rx="2"
                  />
                ))}
              </svg>

              {/* 传送点和NPC点的叠加层 */}
              <div className="absolute inset-0 pointer-events-none" style={{ fontSize: `${Math.max(gridZoom - 2, 5)}px` }}>
                {warpPositions.map(w => (
                  <div key={w.id} className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: w.x * (gridZoom + 1), top: w.y * (gridZoom + 1) }}>
                    <svg width={Math.max(gridZoom + 1, 8)} height={Math.max(gridZoom + 1, 8)} viewBox="0 0 24 24" fill="#3b82f6" className="opacity-90"><circle cx="12" cy="12" r="8"/></svg>
                    {gridZoom >= 8 && <span className="text-blue-300 ml-0.5 text-[8px]">{w.label}</span>}
                  </div>
                ))}
                {spawnPositions.map(s => (
                  <div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: s.x * (gridZoom + 1), top: s.y * (gridZoom + 1) }}>
                    <svg width={Math.max(gridZoom + 2, 8)} height={Math.max(gridZoom + 2, 8)} viewBox="0 0 24 24" fill="#10b981" className="opacity-90"><polygon points="12,2 22,22 2,22"/></svg>
                    {gridZoom >= 8 && <span className="text-emerald-300 ml-0.5 text-[8px]">{s.label}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 图例 */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-[#333] text-[10px] text-gray-500 flex-shrink-0 bg-[#1e1e1e]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {ts('mapEditor.legendWarp')}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {ts('mapEditor.legendSpawn')}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2 rounded bg-amber-500/60" /> {ts('mapEditor.legendForage')}</span>
          </div>
        </div>
      </div>
      <UnsavedChangesGuard dirty={dirty} />
    </div>
  )
}

function F({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return <div><label className="text-[11px] text-gray-500 block mb-1">{label}</label>{children}</div>
}
