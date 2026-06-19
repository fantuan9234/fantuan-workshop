import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { eventStepTypes, seasonOptions, weatherOptions, type GameEvent, type EventStep, type NPCInitialPosition, generateEventId, buildEventScript, stepCategoryLabels, stepCategoryOrder, HEART_EVENT_PRESETS } from '../../data/eventData'
import { defaultNPCs, type NPCInfo } from '../../data/npcData'
import { useProject } from '../../data/ProjectContext'
import { useMapLibrary, getMapDisplayName, inferMapCategory, findMapByName } from '../../data/useMapLibrary'
import MapPreviewModal from '../../components/MapPreviewModal'
import {
  IconHeart, IconMap, IconSeason, IconWeather, IconPerson, IconEvent
} from '../../components/Icons'
import { useT, asString } from '../../i18n'
import EditorHeader from '../../components/EditorHeader'
import { UnsavedChangesGuard } from '../../components/useUnsavedChangesGuard'
import StepCard, { stepTypeColors } from './StepCard'
import { Field, SearchableNpcSelect, SearchableMapSelect } from './EventEditorComponents'

// stepTypeColors 已从 StepCard.tsx 导入

export default function EventEditor(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { mutateSnapshot, registerSnapshot, getFullSnapshot, snapshotVersion } = useProject()

  // 获取项目内的物品/邮件/任务/自定义NPC，供步骤选择器使用
  const projectItems = useMemo(() => (getFullSnapshot().customItems as Array<{ id: string; name?: string; displayName?: string }>) ?? [], [getFullSnapshot, snapshotVersion])
  const projectMails = useMemo(() => (getFullSnapshot().mails as Array<{ id: string; title?: string; name?: string }>) ?? [], [getFullSnapshot, snapshotVersion])
  const projectQuests = useMemo(() => (getFullSnapshot().quests as Array<{ id: string; title?: string; name?: string }>) ?? [], [getFullSnapshot, snapshotVersion])
  // 合并原版NPC和自定义NPC
  const projectCustomNpcs = useMemo(() => (getFullSnapshot().customNpcs as NPCInfo[]) ?? [], [getFullSnapshot, snapshotVersion])
  const allNpcs = useMemo(() => {
    const customIds = new Set(projectCustomNpcs.map(n => n.id))
    return [...defaultNPCs.filter(n => !customIds.has(n.id)), ...projectCustomNpcs]
  }, [projectCustomNpcs])
  // NPC搜索关键词
  const [npcSearch, setNpcSearch] = useState('')
  // 地图搜索关键词
  const [mapSearch, setMapSearch] = useState('')
  const t = useT()
  const ts = (k: string): string => asString(t, k)

  const seasonLabels: Record<string, string> = {
    any: ts('eventEditor.seasonAny'), spring: ts('eventEditor.seasonSpring'), summer: ts('eventEditor.seasonSummer'), fall: ts('eventEditor.seasonFall'), winter: ts('eventEditor.seasonWinter'),
  }

  // ★ 从路由 state 获取数据（可能为空，需要从快照系统补充）
  const stateData = location.state as { newEvent?: GameEvent; allEvents?: GameEvent[] }

  // ★ 关键修复：初始化时从快照系统获取完整数据，避免仅依赖路由 state
  const [events, setEvents] = useState<GameEvent[]>(() => {
    if (stateData?.allEvents && stateData.allEvents.length > 0) {
      return stateData.allEvents
    }
    try {
      const snap = getFullSnapshot()
      const eventsData = snap.events as GameEvent[]
      if (Array.isArray(eventsData) && eventsData.length > 0) {
        return eventsData
      }
    } catch { /* ignore */ }
    return []
  })
  const eventsRef = useRef<GameEvent[]>(events)
  eventsRef.current = events

  // ★ 注册 'events' 快照，确保 mutateSnapshot 在 EventsPage 卸载后仍可写入
  useEffect(() => {
    return registerSnapshot('events',
      () => eventsRef.current,
      (data: unknown) => { if (Array.isArray(data)) setEvents(data as GameEvent[]) }
    )
  }, [registerSnapshot])

  // 查找当前编辑的事件
  const found = events.find(e => e.id === id)

  // ★ 核心修复：当 registerSnapshot 在 useEffect 中恢复 events 数据后，
  //   表单字段（useState 的初始值在第一次渲染时已定稿）需要同步更新。
  //   使用 eventLoadedRef 标记确保只填充一次，避免覆盖用户后续的编辑。
  const eventLoadedRef = useRef(false)
  useEffect(() => {
    if (eventLoadedRef.current) return
    const target = events.find(e => e.id === id)
    if (!target) return
    eventLoadedRef.current = true

    setTitle(target.title ?? '')
    setNpcIds(target.npcIds ?? [])
    setMainNpcId(target.mainNpcId ?? '')
    setHeartRequired(target.heartRequired ?? 0)
    setMapId(target.map ?? '')
    setTimeStart(target.timeStart ?? '09:00')
    setTimeEnd(target.timeEnd ?? '17:00')
    setSeason(target.season ?? 'any')
    setWeather((target.weather ?? 'any') as 'sunny' | 'rainy' | 'any')
    setDescription(target.description ?? '')
    setSteps(target.steps ?? [])
    setFarmerX(target.farmerX ?? 5)
    setFarmerY(target.farmerY ?? 5)
    setFarmerFacing(target.farmerFacing ?? 2)
    // 镜头模式
    setCameraMode((target as any)?.cameraMode ?? 'follow')
    setCameraX((target as any)?.cameraX ?? 5)
    setCameraY((target as any)?.cameraY ?? 5)
    // 独立 NPC 初始位置
    const ids = target.npcIds ?? []
    if (ids.length > 0) {
      const saved = (target as any)?.npcPositions
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setNpcPositions(saved.map((p: any) => ({ npcId: p.npcId, x: Number(p.x), y: Number(p.y), facing: p.facing ?? 2 })))
      } else {
        const oldX = Number((target as any)?.npcX ?? 10)
        const oldY = Number((target as any)?.npcY ?? 10)
        setNpcPositions(ids.map((nid, i) => ({ npcId: nid, x: oldX + i * 3, y: oldY, facing: 2 })))
      }
    }
  }, [events, id])

  const [title, setTitle] = useState(found?.title ?? '')
  const [npcIds, setNpcIds] = useState<string[]>(found?.npcIds ?? [])
  const [mainNpcId, setMainNpcId] = useState<string>(found?.mainNpcId ?? '')
  const [heartRequired, setHeartRequired] = useState(found?.heartRequired ?? 0)
  const [mapId, setMapId] = useState(found?.map ?? '')
  const [timeStart, setTimeStart] = useState(found?.timeStart ?? '09:00')
  const [timeEnd, setTimeEnd] = useState(found?.timeEnd ?? '17:00')
  const [season, setSeason] = useState(found?.season ?? 'any')
  const [weather, setWeather] = useState(found?.weather ?? 'any')
  const [description, setDescription] = useState(found?.description ?? '')
  const [steps, setSteps] = useState<EventStep[]>(found?.steps ?? [])
  // 玩家与NPC初始位置（事件触发时人物站位，对演出至关重要）
  const [farmerX, setFarmerX] = useState<number>((found as any)?.farmerX ?? 5)
  const [farmerY, setFarmerY] = useState<number>((found as any)?.farmerY ?? 5)
  const [farmerFacing, setFarmerFacing] = useState<number>((found as any)?.farmerFacing ?? 2)
  // 镜头模式
  const [cameraMode, setCameraMode] = useState<'follow' | 'followTile'>((found as any)?.cameraMode ?? 'follow')
  const [cameraX, setCameraX] = useState<number>((found as any)?.cameraX ?? 5)
  const [cameraY, setCameraY] = useState<number>((found as any)?.cameraY ?? 5)
  // 每个NPC独立的初始位置（新版优先，旧版 npcX/npcY 兼容转换）
  const [npcPositions, setNpcPositions] = useState<NPCInitialPosition[]>(() => {
    const ids = found?.npcIds ?? []
    if (ids.length === 0) return []
    // 新版：优先读取每个NPC独立坐标
    const saved = (found as any)?.npcPositions
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved.map((p: any) => ({ npcId: p.npcId, x: Number(p.x), y: Number(p.y), facing: p.facing ?? 2 }))
    }
    // 旧版兼容：从共享 npcX/npcY 转换
    const oldX = Number((found as any)?.npcX ?? 10)
    const oldY = Number((found as any)?.npcY ?? 10)
    return ids.map((id, i) => ({ npcId: id, x: oldX + i * 3, y: oldY, facing: 2 }))
  })
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pickTargetStep, setPickTargetStep] = useState<string | null>(null)
  const [showScriptPreview, setShowScriptPreview] = useState(false)
  // 拾取目标：'farmer' | 'npc:<id>' | stepId
  const [pickTarget, setPickTarget] = useState<string | null>(null)
  // 模板选择器
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)

  // 地图真实渲染图片
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [mapImageLoading, setMapImageLoading] = useState(false)
  // 放大模态框状态
  const [previewOpen, setPreviewOpen] = useState(false)

  // 共享地图库（解包 + 自定义）
  const { allMaps, needsUnpack, reload: reloadMaps } = useMapLibrary()

  // 当前选中的地图（解包 / 自定义 都可能）
  const selectedMap = useMemo(() => {
    if (!mapId) return null
    return findMapByName(allMaps, mapId) || null
  }, [mapId, allMaps])

  // 渲染真实地图图片
  useEffect(() => {
    if (!selectedMap) { setMapImageUrl(null); return }
    const tmxPath = selectedMap.tmxPath
    let cancelled = false
    setMapImageLoading(true)
    async function render() {
      try {
        const dataUrl = await window.electronAPI?.mapRender(tmxPath, 600)
        if (!cancelled) {
          setMapImageUrl(dataUrl || null)
          setMapImageLoading(false)
        }
      } catch {
        if (!cancelled) {
          setMapImageUrl(null)
          setMapImageLoading(false)
        }
      }
    }
    render()
    return () => { cancelled = true }
  }, [selectedMap])

  const eventNpcs = useMemo(() => {
    return npcIds.map(nid => allNpcs.find(n => n.id === nid)).filter(Boolean) as NPCInfo[]
  }, [npcIds, allNpcs])

  const availableNpcs = useMemo(() => {
    const filtered = allNpcs.filter(n => !npcIds.includes(n.id))
    if (!npcSearch.trim()) return filtered
    const kw = npcSearch.trim().toLowerCase()
    return filtered.filter(n =>
      n.displayName.toLowerCase().includes(kw) ||
      n.name.toLowerCase().includes(kw) ||
      n.id.toLowerCase().includes(kw)
    )
  }, [allNpcs, npcIds, npcSearch])

  const addNpc = (npcId: string) => {
    if (!npcId || npcIds.includes(npcId)) return
    setNpcIds(prev => [...prev, npcId])
    // 为新NPC添加默认初始位置（排在最后一个NPC后面）
    setNpcPositions(prev => {
      const lastPos = prev.length > 0 ? prev[prev.length - 1] : { x: 10, y: 10 }
      return [...prev, { npcId, x: lastPos.x + 3, y: lastPos.y, facing: 2 }]
    })
    setDirty(true)
  }
  const removeNpc = (npcId: string) => {
    setNpcIds(prev => prev.filter(i => i !== npcId))
    // 同时移除该NPC的独立位置
    setNpcPositions(prev => prev.filter(p => p.npcId !== npcId))
    // 如果移除的是主NPC，清空主NPC绑定
    if (mainNpcId === npcId) setMainNpcId('')
    setDirty(true)
  }

  const updateConfig = useCallback((stepId: string, key: string, value: string) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, config: { ...s.config, [key]: value } } : s))
    setDirty(true)
  }, [])

  /** 更新步骤本身的字段（如 label），区别于 updateConfig 只改 config */
  const updateStepField = useCallback((stepId: string, key: 'label' | 'type', value: string) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, [key]: value } : s))
    setDirty(true)
  }, [])

  // 从放大模态框里拾取坐标：同时支持步骤/玩家位置/NPC位置
  const handlePreviewPick = useCallback((x: number, y: number) => {
    if (pickTargetStep) {
      updateConfig(pickTargetStep, 'x', String(x))
      updateConfig(pickTargetStep, 'y', String(y))
      setPickTargetStep(null)
      setPreviewOpen(false)
      return
    }
    if (pickTarget === 'farmer') {
      setFarmerX(x); setFarmerY(y); setDirty(true); setPickTarget(null); setPreviewOpen(false); return
    }
    if (pickTarget && pickTarget.startsWith('npc:')) {
      const npcId = pickTarget.replace('npc:', '')
      setNpcPositions(prev => prev.map(p => p.npcId === npcId ? { ...p, x, y } : p))
      setDirty(true); setPickTarget(null); setPreviewOpen(false); return
    }
  }, [pickTargetStep, pickTarget, updateConfig])

  const addStep = (type: EventStep['type']) => {
    const st = eventStepTypes.find(s => s.type === type)!
    const sid = `s${Date.now()}`
    const firstNpcName = eventNpcs[0]?.name ?? ''
    const newStep: EventStep = {
      id: sid, type, label: `${ts('eventEditor.newStep')}${st.label}`, icon: st.icon,
      config: type === 'move' ? { target: firstNpcName || 'player', x: '0', y: '0', speed: '2', facing: '2' } :
              type === 'dialogue' ? { speaker: firstNpcName, text: '' } :
              type === 'choice' ? { speaker: firstNpcName, question: '', choice1: '', choice2: '' } :
              type === 'bgm' ? { track: '', volume: '0.6' } :
              type === 'reward' ? { type: 'friendship', target: '', amount: '0' } :
              type === 'animate' ? { target: firstNpcName, emotion: 'happy' } :
              type === 'effect' ? { effect: 'fade' } :
              type === 'face' ? { target: firstNpcName, direction: '2' } :
              type === 'sound' ? { soundId: '' } :
              type === 'ambient' ? { ambientId: '' } :
              type === 'addItem' ? { itemId: '', count: '1' } :
              type === 'removeItem' ? { itemId: '', count: '1' } :
              type === 'addQuest' ? { questId: '' } :
              type === 'completeQuest' ? { questId: '' } :
              type === 'setMail' ? { mailId: '' } :
              type === 'setEventSeen' ? { eventId: '' } :
              type === 'unlockRecipe' ? { recipeName: '' } :
              type === 'spawn' ? { target: firstNpcName, x: '0', y: '0' } :
              type === 'remove' ? { target: firstNpcName } :
              type === 'createObject' ? { itemId: '', x: '0', y: '0' } :
              type === 'destroyObject' ? { x: '0', y: '0' } :
              type === 'text' ? { text: '' } :
              type === 'message' ? { text: '' } :
              type === 'question' ? { speaker: firstNpcName, question: '', yesLabel: '', noLabel: '' } :
              type === 'shake' ? { intensity: '10', duration: '500' } :
              type === 'showFrame' ? { target: firstNpcName, frameIndex: '0' } :
              type === 'emote' ? { target: firstNpcName, emoteId: '16' } :
              { targetMap: '', x: '0', y: '0' }
    }
    setSteps(prev => [...prev, newStep])
    setExpandedStep(sid)
    setDirty(true)
  }

  const removeStep = (stepId: string) => {
    setSteps(prev => prev.filter(s => s.id !== stepId))
    if (expandedStep === stepId) setExpandedStep(null)
    if (pickTargetStep === stepId) setPickTargetStep(null)
    setDirty(true)
  }

  const moveStep = (stepId: string, dir: -1 | 1) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === stepId)
      if (idx < 0) return prev
      const t = idx + dir
      if (t < 0 || t >= prev.length) return prev
      const ns = [...prev]; [ns[idx], ns[t]] = [ns[t], ns[idx]]
      return ns
    })
    setDirty(true)
  }

  const handleSave = () => {
    if (!title.trim()) return
    const mapDisplay = mapId ? getMapDisplayName(mapId) : mapId
    // 事件ID必须是纯数字（星露谷游戏要求），若旧ID非数字则生成新ID
    let savedId = found?.id ?? id ?? ''
    if (!/^\d+$/.test(savedId)) {
      const existingIds = eventsRef.current.map(e => e.id)
      savedId = generateEventId(existingIds)
    }
    const newEvent: GameEvent = {
      id: savedId,
      title, npcIds,
      mainNpcId: mainNpcId || undefined,
      npcNames: npcIds.map(nid => allNpcs.find(n => n.id === nid)?.displayName ?? nid),
      heartRequired, map: mapId, mapDisplayName: mapDisplay,
      timeStart, timeEnd, season, weather: weather as 'sunny' | 'rainy' | 'any',
      description, steps,
      // 保存玩家与NPC初始位置
      farmerX, farmerY, farmerFacing,
      // 保存镜头模式
      cameraMode: cameraMode || 'follow',
      cameraX: cameraMode === 'followTile' ? cameraX : undefined,
      cameraY: cameraMode === 'followTile' ? cameraY : undefined,
      npcPositions: npcPositions.length > 0 ? npcPositions : undefined,
      created: found?.created ?? new Date().toISOString().slice(0, 10),
    } as GameEvent
    // 保存到快照系统（供导出和持久化用）
    mutateSnapshot<GameEvent[]>('events', prev => {
      const idx = prev.findIndex(e => e.id === savedId)
      return idx >= 0 ? prev.map(e => e.id === savedId ? newEvent : e) : [...prev, newEvent]
    })
    // 如果是新建，重定向到正确的 id
    if (!found) {
      navigate(`/events/${savedId}`, { replace: true, state: { allEvents: [...eventsRef.current.filter(e => e.id !== id), newEvent] } })
    }
    setSavedToast(true)
    setDirty(false)
    setTimeout(() => setSavedToast(false), 1500)
  }

  // NPC id→name 映射（用于生成事件脚本时使用正确的 NPC 大小写）
  const npcNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    allNpcs.forEach(n => { if (n.name) map[n.id] = n.name })
    return map
  }, [allNpcs])

  // 生成脚本预览（与导出逻辑完全一致，使用共享函数）
  const scriptPreview = useMemo(() => {
    return buildEventScript({
      timeStart,
      timeEnd,
      heartRequired,
      season,
      weather,
      farmerX,
      farmerY,
      farmerFacing,
      cameraMode: cameraMode || 'follow',
      cameraX: cameraMode === 'followTile' ? cameraX : undefined,
      cameraY: cameraMode === 'followTile' ? cameraY : undefined,
      npcIds,
      npcPositions: npcPositions.length > 0 ? npcPositions : undefined,
      steps,
      npcNameMap,
    })
  }, [steps, npcIds, npcPositions, heartRequired, season, weather, timeStart, timeEnd, farmerX, farmerY, farmerFacing, npcNameMap])

  return (
    <div className="h-full flex flex-col overflow-hidden" onChange={() => setDirty(true)}>
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-5 py-3 border-b themed-border-primary flex-shrink-0 themed-bg-primary">
        <EditorHeader title={title || ts('eventEditor.title')} />
        <div className="flex items-center gap-3">
          {savedToast && <span className="text-sm text-green-400 animate-pulse">{ts('eventEditor.saved')}</span>}
          <button onClick={() => setShowScriptPreview(!showScriptPreview)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${showScriptPreview ? 'themed-bg-active themed-text-primary' : 'themed-text-muted hover:themed-text-primary themed-bg-hover'}`}>
            {ts('eventEditor.scriptPreview')}
          </button>
          <button onClick={handleSave}
            className="text-sm themed-btn-primary font-medium px-4 py-1.5 rounded-lg transition-colors">
            {ts('eventEditor.saveEvent')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* 左侧：事件属性面板 */}
        <div className="w-full lg:w-[420px] xl:w-[460px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r themed-border-primary overflow-y-auto themed-bg-secondary">
          <div className="p-4 space-y-4">
            {/* 基本信息 */}
            <div>
              {/* 小白引导提示 */}
              <div className="mb-3 px-2.5 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs themed-text-secondary leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span className="text-xs font-medium text-blue-300">编辑事件流程</span>
                </div>
                <ol className="ml-4 space-y-0.5 list-decimal text-[11px] themed-text-dimmed">
                  <li>先添加参与这个事件的 <strong className="themed-text-secondary">NPC</strong></li>
                  <li>选择 <strong className="themed-text-secondary">触发地图</strong> 并设置 <strong className="themed-text-secondary">时间和条件</strong></li>
                  <li>设定每位NPC和玩家的 <strong className="themed-text-secondary">初始站位</strong>（点击"定位"到地图上选点）</li>
                  <li>在右侧 <strong className="themed-text-secondary">添加事件步骤</strong> 来编排演出</li>
                  <li>完成后点击 <strong className="themed-text-secondary">保存</strong>，可在脚本预览中查看</li>
                </ol>
              </div>
              <h3 className="text-sm font-semibold themed-text-muted uppercase tracking-wider mb-3">{ts('eventEditor.basicInfo')}</h3>
              <div className="space-y-3">
                <Field label={ts('eventEditor.eventName')}>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={ts('eventEditor.eventNamePlaceholder')} className="input" />
                </Field>

                {/* NPC选择器（带搜索） */}
                <div>
                  <label className="text-sm themed-text-dimmed block mb-1.5">{ts('eventEditor.participantNpc')}</label>
                  {npcIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {eventNpcs.map(npc => (
                        <span key={npc.id} className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-md bg-purple-500/15 text-purple-300">
                          {npc.displayName}
                          <button onClick={() => removeNpc(npc.id)} className="hover:text-red-400 ml-0.5">x</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <SearchableNpcSelect
                    placeholder={ts('eventEditor.addNpc')}
                    npcs={availableNpcs}
                    onSelect={addNpc}
                    searchValue={npcSearch}
                    onSearchChange={setNpcSearch}
                  />
                </div>

                <Field label={ts('eventEditor.triggerMap')}>
                  <SearchableMapSelect
                    value={mapId}
                    onChange={setMapId}
                    allMaps={allMaps}
                    needsUnpack={needsUnpack}
                    searchValue={mapSearch}
                    onSearchChange={setMapSearch}
                  />
                  {needsUnpack && (
                    <p className="text-xs themed-text-disabled mt-1">提示：先到「资源管理」页解包游戏素材</p>
                  )}
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={ts('eventEditor.startTime')}><input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} className="input" /></Field>
                  <Field label={ts('eventEditor.endTime')}><input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className="input" /></Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={ts('eventEditor.season')}>
                    <select value={season} onChange={e => setSeason(e.target.value)} className="input text-sm">
                      {seasonOptions.map(s => <option key={s} value={s}>{seasonLabels[s] || s}</option>)}
                    </select>
                  </Field>
                  <Field label={ts('eventEditor.weather')}>
                    <select value={weather} onChange={e => setWeather(e.target.value as 'any' | 'sunny' | 'rainy')} className="input text-sm">
                      {weatherOptions.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  </Field>
                </div>

                {/* 事件归属：主NPC + 心数要求 */}
                <div className="themed-bg-card rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <IconHeart />
                    <span className="text-sm font-medium themed-text-secondary">事件归属</span>
                    <span className="text-xs themed-text-disabled">（这是谁的几心事件）</span>
                  </div>
                  {/* 主NPC选择 */}
                  <div>
                    <label className="text-xs themed-text-dimmed block mb-1">主NPC（事件归属者）</label>
                    {npcIds.length === 0 ? (
                      <p className="text-sm themed-text-disabled italic">请先添加参与NPC</p>
                    ) : (
                      <select
                        value={mainNpcId}
                        onChange={e => setMainNpcId(e.target.value)}
                        className="input text-sm"
                      >
                        <option value="">不绑定特定NPC</option>
                        {eventNpcs.map(n => (
                          <option key={n.id} value={n.id}>{n.displayName} ({n.name})</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {/* 心数要求 */}
                  <div>
                    <label className="text-xs themed-text-dimmed block mb-1">心数要求（触发所需最低好感）</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min={0} max={14} value={heartRequired} onChange={e => setHeartRequired(Number(e.target.value))} className="flex-1" />
                      <span className="text-sm themed-text-muted font-medium w-10 text-right inline-flex items-center justify-end gap-1">{heartRequired} <IconHeart /></span>
                    </div>
                  </div>
                  {/* 归属摘要 */}
                  {mainNpcId && heartRequired > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                      <span className="text-xs themed-text-secondary">
                        {allNpcs.find(n => n.id === mainNpcId)?.displayName ?? mainNpcId} 的
                        <span className="text-purple-300 font-medium mx-0.5">{heartRequired}</span>
                        心事件
                      </span>
                    </div>
                  )}
                </div>

                {/* 从模板创建按钮 */}
                <div className="relative">
                  <button
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-dashed themed-border-secondary themed-text-muted hover:themed-text-primary hover:border-[#555] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    从心数模板创建（快速填充好感度、地图等）
                  </button>
                  {showTemplatePicker && (
                    <div className="absolute z-50 mt-1 w-full themed-bg-primary border themed-border-primary rounded-lg shadow-xl max-h-64 overflow-y-auto">
                      {HEART_EVENT_PRESETS.map(preset => (
                        <button
                          key={preset.hearts}
                          onClick={() => {
                            setHeartRequired(preset.hearts)
                            setMapId(preset.defaultMap)
                            setDescription(`${preset.title} · ${preset.desc}`)
                            setShowTemplatePicker(false)
                            setDirty(true)
                          }}
                          className="w-full px-3 py-2 text-left text-sm themed-text-secondary hover:themed-bg-active transition-colors border-b themed-border-secondary last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-purple-300 font-medium">{preset.hearts}❤️</span>
                            <span className="font-medium">{preset.title}</span>
                            <span className="text-[11px] themed-text-dimmed">{preset.desc}</span>
                          </div>
                          <p className="text-[11px] themed-text-disabled mt-0.5">默认地图: {preset.defaultMap}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Field label={ts('eventEditor.intro')}>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={ts('eventEditor.introPlaceholder')} rows={2} className="input resize-none" />
                </Field>
              </div>
            </div>

            {/* 初始位置设置 */}
            <div>
              <h3 className="text-sm font-semibold themed-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                {ts('eventEditor.initialPosition')}
                <span className="text-xs themed-text-disabled font-normal normal-case tracking-normal">{ts('eventEditor.initialPositionHint')}</span>
              </h3>
              <div className="space-y-2.5 themed-bg-card rounded-lg p-2.5">
                {/* 玩家位置 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm themed-text-dimmed">{ts('eventEditor.farmerPosition')}</label>
                    <button
                      type="button"
                      onClick={() => { setPickTarget('farmer'); setPickTargetStep(null); setPreviewOpen(true) }}
                      disabled={!mapId}
                      className="px-2.5 py-1 rounded-lg bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/50 border border-cyan-700/40 transition-colors text-sm font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="打开地图，点击位置自动填入坐标"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      地图选点
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="text-xs themed-text-dimmed block mb-0.5">X</label>
                      <input type="number" value={farmerX} onChange={e => { setFarmerX(Number(e.target.value)); setDirty(true) }} className="input text-sm" min={0} />
                    </div>
                    <div>
                      <label className="text-xs themed-text-dimmed block mb-0.5">Y</label>
                      <input type="number" value={farmerY} onChange={e => { setFarmerY(Number(e.target.value)); setDirty(true) }} className="input text-sm" min={0} />
                    </div>
                    <div>
                      <label className="text-xs themed-text-dimmed block mb-0.5">{ts('eventEditor.facing')}</label>
                      <select value={farmerFacing} onChange={e => { setFarmerFacing(Number(e.target.value)); setDirty(true) }} className="input text-sm">
                        <option value={0}>{ts('eventEditor.dirUp')}</option>
                        <option value={1}>{ts('eventEditor.dirRight')}</option>
                        <option value={2}>{ts('eventEditor.dirDown')}</option>
                        <option value={3}>{ts('eventEditor.dirLeft')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 镜头设置（SDV 1.6 新版格式预留） */}
                <div className="pt-2 border-t themed-border-secondary">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm themed-text-dimmed flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      初始镜头位置
                      <span className="text-[11px] themed-text-disabled font-normal">SDV 1.6 新版格式</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-xs themed-text-dimmed block mb-0.5">镜头 X（-1000=跟随玩家）</label>
                        <input type="number" value={cameraX} onChange={e => { setCameraX(Number(e.target.value)); setDirty(true) }} className="input text-sm" min={-1000} />
                      </div>
                      <div>
                        <label className="text-xs themed-text-dimmed block mb-0.5">镜头 Y</label>
                        <input type="number" value={cameraY} onChange={e => { setCameraY(Number(e.target.value)); setDirty(true) }} className="input text-sm" min={-1000} />
                      </div>
                    </div>
                    <p className="text-xs themed-text-disabled">💡 设 -1000 -1000 让镜头跟随玩家；设具体坐标让镜头固定在场景某处</p>
                  </div>
                </div>

                {/* NPC位置（每个参与NPC独立设置） */}
                {npcIds.length > 0 && (
                  <div className="pt-2 border-t themed-border-secondary">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm themed-text-dimmed flex items-center gap-1.5">
                        {ts('eventEditor.npcPosition')}
                        <span className="text-[11px] themed-text-disabled font-normal">每个NPC独立设置</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      {eventNpcs.map(npc => {
                        const pos = npcPositions.find(p => p.npcId === npc.id)
                        const px = pos?.x ?? 10
                        const py = pos?.y ?? 10
                        const pf = pos?.facing ?? 2
                        const isPickingNpc = pickTarget === `npc:${npc.id}`
                        return (
                          <div key={npc.id} className="themed-bg-card rounded-lg p-2 border themed-border-secondary">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: npc.color || '#888' }} />
                                <span className="text-sm font-medium themed-text-secondary">{npc.displayName}</span>
                                <span className="text-[11px] themed-text-dimmed">({npc.name})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setPickTarget(isPickingNpc ? null : `npc:${npc.id}`); setPickTargetStep(null); setPreviewOpen(true) }}
                                disabled={!mapId}
                                className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                                  isPickingNpc
                                    ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30'
                                    : 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/50 border border-cyan-700/40'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                                title="打开地图，点击位置自动填入坐标"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                {isPickingNpc ? '点地图选位...' : '定位'}
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div>
                                <label className="text-[11px] themed-text-dimmed block mb-0.5">X</label>
                                <input type="number" value={px} onChange={e => { setNpcPositions(prev => prev.map(p => p.npcId === npc.id ? { ...p, x: Number(e.target.value) } : p)); setDirty(true) }} className="input text-sm" min={0} />
                              </div>
                              <div>
                                <label className="text-[11px] themed-text-dimmed block mb-0.5">Y</label>
                                <input type="number" value={py} onChange={e => { setNpcPositions(prev => prev.map(p => p.npcId === npc.id ? { ...p, y: Number(e.target.value) } : p)); setDirty(true) }} className="input text-sm" min={0} />
                              </div>
                              <div>
                                <label className="text-[11px] themed-text-dimmed block mb-0.5">{ts('eventEditor.facing')}</label>
                                <select value={pf} onChange={e => { setNpcPositions(prev => prev.map(p => p.npcId === npc.id ? { ...p, facing: Number(e.target.value) } : p)); setDirty(true) }} className="input text-sm">
                                  <option value={0}>{ts('eventEditor.dirUp')}</option>
                                  <option value={1}>{ts('eventEditor.dirRight')}</option>
                                  <option value={2}>{ts('eventEditor.dirDown')}</option>
                                  <option value={3}>{ts('eventEditor.dirLeft')}</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs themed-text-disabled mt-1.5">💡 每个NPC单独设置位置和朝向，让角色各就各位</p>
                  </div>
                )}
              </div>
            </div>

            {/* 添加步骤（按分类分组） */}
            <div>
              <h3 className="text-sm font-semibold themed-text-muted uppercase tracking-wider mb-3">{ts('eventEditor.addStep')}</h3>
              <div className="space-y-3">
                {stepCategoryOrder.map(cat => {
                  const catSteps = eventStepTypes.filter(st => st.category === cat)
                  if (catSteps.length === 0) return null
                  return (
                    <div key={cat}>
                      <p className="text-sm themed-text-dimmed mb-1.5 font-medium">{stepCategoryLabels[cat]}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {catSteps.map(st => {
                          const colors = stepTypeColors[st.type] || { bg: 'bg-gray-500/15', text: 'text-gray-300', dot: 'bg-gray-400' }
                          return (
                            <button key={st.type} onClick={() => addStep(st.type)}
                              title={st.desc}
                              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors text-left ${colors.bg} ${colors.text} hover:opacity-80`}>
                              <span className="text-base flex-shrink-0">{st.icon}</span>
                              <span className="font-medium truncate">{st.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 中间：步骤时间轴 + 地图预览 */}
        <div className="flex-1 flex flex-col min-w-0 themed-bg-primary">
          <div className="flex-1 flex min-h-0">
            {/* 步骤时间轴 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold themed-text-secondary">{ts('eventEditor.stepTimeline')}</h3>
                <span className="text-xs themed-text-dimmed">{steps.length} {ts('eventEditor.stepCount')}</span>
              </div>

              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 themed-text-dimmed gap-3">
                  <div className="w-16 h-16 rounded-2xl themed-bg-card flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-40">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <p className="text-base themed-text-muted">{ts('eventEditor.addStepHint')}</p>
                  <p className="text-xs themed-text-disabled">{ts('eventEditor.addStepHint2')}</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[19px] top-2 bottom-2 w-0.5 themed-bg-active rounded-full" />
                  <div className="space-y-2">
                    {steps.map((step, idx) => (
                      <StepCard key={step.id} step={step} index={idx} total={steps.length}
                        isExpanded={expandedStep === step.id} isPicking={pickTargetStep === step.id}
                        onToggle={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                        onUpdateConfig={(k, v) => updateConfig(step.id, k, v)}
                        onDeleteConfigKeys={(keys) => {
                          setSteps(prev => prev.map(s => {
                            if (s.id !== step.id) return s
                            const config = { ...s.config }
                            keys.forEach(k => delete config[k])
                            return { ...s, config }
                          }))
                          setDirty(true)
                        }}
                        onUpdateStepField={(k, v) => updateStepField(step.id, k, v)}
                        onRemove={() => removeStep(step.id)}
                        onMove={(dir) => moveStep(step.id, dir)}
                        onStartPick={() => { setPickTargetStep(step.id); setExpandedStep(step.id); setPreviewOpen(true) }}
                        onStopPick={() => setPickTargetStep(null)}
                        eventNpcs={eventNpcs}
                        projectItems={projectItems}
                        projectMails={projectMails}
                        projectQuests={projectQuests}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 地图预览 */}
            <div className="w-full lg:w-[440px] xl:w-[480px] lg:flex-shrink-0 border-t lg:border-t-0 lg:border-l themed-border-primary flex flex-col">
              <div className="px-4 py-3 border-b themed-border-primary flex items-center gap-3 flex-shrink-0">
                <h3 className="text-sm font-semibold themed-text-muted uppercase tracking-wider">{ts('eventEditor.mapPreview')}</h3>
                {selectedMap && <span className="text-[11px] themed-text-disabled truncate">({getMapDisplayName(selectedMap.name)} · {selectedMap.width}x{selectedMap.height})</span>}
                {mapImageLoading && <span className="text-[11px] themed-text-dimmed animate-pulse flex-shrink-0">渲染中...</span>}
                {selectedMap && (
                  <button
                    onClick={() => setPreviewOpen(true)}
                    className="ml-auto inline-flex items-center gap-1 text-xs themed-text-secondary hover:themed-text-primary px-2 py-1 rounded themed-bg-card hover:themed-bg-card-hover transition-colors flex-shrink-0"
                    title="放大查看完整地图（ESC 关闭）"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="3" x2="10" y2="10"/></svg>
                    放大查看
                  </button>
                )}
              </div>
              {selectedMap ? (
                <div
                  className="flex-1 min-h-0 p-2 cursor-pointer relative group"
                  onClick={() => setPreviewOpen(true)}
                  title="点击放大查看完整地图"
                >
                  {mapImageUrl ? (
                    <img
                      src={mapImageUrl}
                      alt={selectedMap.name}
                      className="w-full h-full object-contain rounded-lg"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center themed-bg-card rounded-lg">
                      {mapImageLoading ? (
                        <span className="text-xs themed-text-disabled">渲染中...</span>
                      ) : (
                        <div className="flex flex-col items-center gap-3 themed-text-disabled">
                          <IconMap />
                          <span className="text-xs">暂无该地图图片</span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* hover 时显示放大提示 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                    <span className="text-sm text-white bg-black/60 px-3 py-1.5 rounded">点击放大 · 查看真实坐标</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center themed-text-disabled gap-3 p-4">
                  <IconMap />
                  <p className="text-xs">{ts('eventEditor.selectMapFirst')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：脚本预览（可折叠） */}
        {showScriptPreview && (
          <div className="w-full lg:w-[320px] xl:w-[360px] lg:flex-shrink-0 border-t lg:border-t-0 lg:border-l themed-border-primary flex flex-col themed-bg-secondary">
            <div className="px-4 py-3 border-b themed-border-primary flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-semibold themed-text-muted uppercase tracking-wider">{ts('eventEditor.scriptPreview')}</h3>
              <button onClick={() => setShowScriptPreview(false)} className="themed-text-dimmed hover:themed-text-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-xs themed-text-muted font-mono whitespace-pre-wrap break-all leading-relaxed themed-bg-primary rounded-lg p-3 border themed-border-secondary">
                {scriptPreview}
              </pre>
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] themed-text-disabled">导出格式: Content Patcher EditData</p>
                <p className="text-[11px] themed-text-disabled">目标: Data/Events/{mapId || '{map}'}</p>
                <p className="text-[11px] themed-text-disabled">事件键: {id || '{id}'}/{season}/{timeStart}/{timeEnd}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 地图预览放大模态框 */}
      {previewOpen && selectedMap && (
        <MapPreviewModal
          map={{
            id: selectedMap.name,
            name: selectedMap.name,
            displayName: getMapDisplayName(selectedMap.name),
            category: inferMapCategory(selectedMap.name) as any,
            indoor: inferMapCategory(selectedMap.name) === 'indoor' || inferMapCategory(selectedMap.name) === 'mine' || inferMapCategory(selectedMap.name) === 'special',
            width: selectedMap.width,
            height: selectedMap.height,
            imageUrl: mapImageUrl || '',
            season: 'all',
            description: '',
            warps: [],
            spawns: [],
            forageAreas: [],
          }}
          tmxPath={selectedMap.tmxPath}
          onClose={() => setPreviewOpen(false)}
          onPickTile={(pickTargetStep || pickTarget) ? handlePreviewPick : undefined}
          farmerPos={mapId ? { x: farmerX, y: farmerY } : undefined}
          npcPositions={mapId && npcPositions.length > 0 ? npcPositions.map(pos => {
            const npc = allNpcs.find(n => n.id === pos.npcId)
            return {
              id: pos.npcId,
              displayName: npc?.displayName ?? pos.npcId,
              x: pos.x,
              y: pos.y,
              color: npc?.color ?? '#a855f7',
            }
          }) : undefined}
        />
      )}
      <UnsavedChangesGuard dirty={dirty} />
    </div>
  )
}

// StepCard、Field、Field2、CoordField、PickButton、SearchableNpcSelect、SearchableMapSelect
// 等子组件已提取到 StepCard.tsx 和 EventEditorComponents.tsx
