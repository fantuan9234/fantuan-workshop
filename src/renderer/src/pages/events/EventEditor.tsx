import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { eventStepTypes, seasonOptions, weatherOptions, type GameEvent, type EventStep, generateEventId, buildEventScript, stepCategoryLabels, stepCategoryOrder, eventBgmTracks, emotionLabels } from '../../data/eventData'
import { defaultNPCs, type NPCInfo } from '../../data/npcData'
import { useProject } from '../../data/ProjectContext'
import { useMapLibrary, getMapDisplayName, inferMapCategory, mapCategoryLabel, findMapByName } from '../../data/useMapLibrary'
import MapPreviewModal from '../../components/MapPreviewModal'
import {
  IconDialogue, IconMove, IconAnimate, IconEffect, IconMusic,
  IconChoice, IconReward, IconWarp, IconHeart, IconMap,
  IconSeason, IconWeather, IconPerson, IconEvent
} from '../../components/Icons'
import { useT, asString } from '../../i18n'
import EditorHeader from '../../components/EditorHeader'
import { UnsavedChangesGuard } from '../../components/useUnsavedChangesGuard'

// 步骤类型 → 颜色映射
const stepTypeColors: Record<string, { bg: string; text: string; dot: string }> = {
  dialogue: { bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400' },
  move:     { bg: 'bg-green-500/15', text: 'text-green-300', dot: 'bg-green-400' },
  animate:  { bg: 'bg-yellow-500/15', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  effect:   { bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400' },
  bgm:      { bg: 'bg-pink-500/15', text: 'text-pink-300', dot: 'bg-pink-400' },
  choice:   { bg: 'bg-orange-500/15', text: 'text-orange-300', dot: 'bg-orange-400' },
  reward:   { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  warp:     { bg: 'bg-cyan-500/15', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  // 新增步骤类型颜色
  face:     { bg: 'bg-green-500/15', text: 'text-green-300', dot: 'bg-green-400' },
  sound:    { bg: 'bg-pink-500/15', text: 'text-pink-300', dot: 'bg-pink-400' },
  ambient:  { bg: 'bg-pink-500/15', text: 'text-pink-300', dot: 'bg-pink-400' },
  addItem:  { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  removeItem: { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  addQuest: { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  completeQuest: { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  setMail:  { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  setEventSeen: { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  unlockRecipe: { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  spawn:    { bg: 'bg-cyan-500/15', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  remove:   { bg: 'bg-cyan-500/15', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  createObject: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  destroyObject: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  text:     { bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400' },
  message:  { bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400' },
  question: { bg: 'bg-orange-500/15', text: 'text-orange-300', dot: 'bg-orange-400' },
  shake:    { bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400' },
  showFrame: { bg: 'bg-yellow-500/15', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  emote:    { bg: 'bg-yellow-500/15', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  // 补全缺失的步骤类型颜色（之前缺失导致点击创建事件后崩溃）
  pause:    { bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400' },
  viewport: { bg: 'bg-green-500/15', text: 'text-green-300', dot: 'bg-green-400' },
  jump:     { bg: 'bg-green-500/15', text: 'text-green-300', dot: 'bg-green-400' },
  fade:     { bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400' },
  friendship: { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  addMail:  { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
}

export default function EventEditor(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { mutateSnapshot, getFullSnapshot } = useProject()

  // 获取项目内的物品/邮件/任务/自定义NPC，供步骤选择器使用
  const projectItems = useMemo(() => (getFullSnapshot().customItems as Array<{ id: string; name?: string; displayName?: string }>) ?? [], [getFullSnapshot])
  const projectMails = useMemo(() => (getFullSnapshot().mails as Array<{ id: string; title?: string; name?: string }>) ?? [], [getFullSnapshot])
  const projectQuests = useMemo(() => (getFullSnapshot().quests as Array<{ id: string; title?: string; name?: string }>) ?? [], [getFullSnapshot])
  // 合并原版NPC和自定义NPC
  const projectCustomNpcs = useMemo(() => (getFullSnapshot().customNpcs as NPCInfo[]) ?? [], [getFullSnapshot])
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

  // ★ 从路由 state 获取数据，不从 registerSnapshot 读
  const stateData = location.state as { newEvent?: GameEvent; allEvents?: GameEvent[] }
  const initialEvents = stateData?.allEvents ?? []

  // 查找当前编辑的事件
  const found = initialEvents.find(e => e.id === id)

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
  const [npcX, setNpcX] = useState<number>((found as any)?.npcX ?? 10)
  const [npcY, setNpcY] = useState<number>((found as any)?.npcY ?? 10)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pickTargetStep, setPickTargetStep] = useState<string | null>(null)
  const [showScriptPreview, setShowScriptPreview] = useState(false)
  // 拾取目标：'farmer' | 'npc' | stepId
  const [pickTarget, setPickTarget] = useState<string | null>(null)

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
    setDirty(true)
  }
  const removeNpc = (npcId: string) => {
    setNpcIds(prev => prev.filter(i => i !== npcId))
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
    if (pickTarget === 'npc') {
      setNpcX(x); setNpcY(y); setDirty(true); setPickTarget(null); setPreviewOpen(false); return
    }
  }, [pickTargetStep, pickTarget, updateConfig])

  const addStep = (type: EventStep['type']) => {
    const st = eventStepTypes.find(s => s.type === type)!
    const sid = `s${Date.now()}`
    const firstNpcName = eventNpcs[0]?.name ?? ''
    const newStep: EventStep = {
      id: sid, type, label: `${ts('eventEditor.newStep')}${st.label}`, icon: st.icon,
      config: type === 'move' ? { target: firstNpcName || 'player', x: '0', y: '0', speed: '2' } :
              type === 'dialogue' ? { speaker: firstNpcName, text: '' } :
              type === 'choice' ? { question: '', choice1: '', choice2: '' } :
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
              type === 'question' ? { question: '', yesLabel: '', noLabel: '' } :
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
      const existingIds = initialEvents.map(e => e.id)
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
      // 保存玩家与NPC初始位置（扩展字段，导出时使用）
      ...(farmerX !== 5 ? { farmerX } : {}),
      ...(farmerY !== 5 ? { farmerY } : {}),
      ...(farmerFacing !== 2 ? { farmerFacing } : {}),
      ...(npcX !== 10 ? { npcX } : {}),
      ...(npcY !== 10 ? { npcY } : {}),
      created: found?.created ?? new Date().toISOString().slice(0, 10),
    } as GameEvent
    // 保存到快照系统（供导出和持久化用）
    mutateSnapshot<GameEvent[]>('events', prev => {
      const idx = prev.findIndex(e => e.id === savedId)
      return idx >= 0 ? prev.map(e => e.id === savedId ? newEvent : e) : [...prev, newEvent]
    })
    // 如果是新建，重定向到正确的 id
    if (!found) {
      navigate(`/events/${savedId}`, { replace: true, state: { allEvents: [...initialEvents.filter(e => e.id !== id), newEvent] } })
    }
    setSavedToast(true)
    setDirty(false)
    setTimeout(() => setSavedToast(false), 1500)
  }

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
      npcIds,
      npcX,
      npcY,
      steps,
    })
  }, [steps, npcIds, heartRequired, season, weather, timeStart, timeEnd, farmerX, farmerY, farmerFacing, npcX, npcY])

  return (
    <div className="h-full flex flex-col overflow-hidden" onChange={() => setDirty(true)}>
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-5 py-3 border-b themed-border-primary flex-shrink-0 themed-bg-primary">
        <EditorHeader title={title || ts('eventEditor.title')} />
        <div className="flex items-center gap-2">
          {savedToast && <span className="text-[11px] text-green-400 animate-pulse">{ts('eventEditor.saved')}</span>}
          <button onClick={() => setShowScriptPreview(!showScriptPreview)}
            className={`text-[11px] px-3 py-1.5 rounded-lg transition-colors ${showScriptPreview ? 'themed-bg-active themed-text-primary' : 'themed-text-muted hover:themed-text-primary themed-bg-hover'}`}>
            {ts('eventEditor.scriptPreview')}
          </button>
          <button onClick={handleSave}
            className="text-[11px] themed-btn-primary font-medium px-4 py-1.5 rounded-lg transition-colors">
            {ts('eventEditor.saveEvent')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* 左侧：事件属性面板 */}
        <div className="w-full lg:w-[360px] xl:w-[400px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r themed-border-primary overflow-y-auto themed-bg-secondary">
          <div className="p-4 space-y-4">
            {/* 基本信息 */}
            <div>
              <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider mb-3">{ts('eventEditor.basicInfo')}</h3>
              <div className="space-y-3">
                <Field label={ts('eventEditor.eventName')}>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={ts('eventEditor.eventNamePlaceholder')} className="input" />
                </Field>

                {/* NPC选择器（带搜索） */}
                <div>
                  <label className="text-[10px] themed-text-dimmed block mb-1.5">{ts('eventEditor.participantNpc')}</label>
                  {npcIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {eventNpcs.map(npc => (
                        <span key={npc.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-purple-500/15 text-purple-300">
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
                    <p className="text-[9px] themed-text-disabled mt-1">提示：先到「资源管理」页解包游戏素材</p>
                  )}
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label={ts('eventEditor.startTime')}><input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} className="input" /></Field>
                  <Field label={ts('eventEditor.endTime')}><input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className="input" /></Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label={ts('eventEditor.season')}>
                    <select value={season} onChange={e => setSeason(e.target.value)} className="input text-xs">
                      {seasonOptions.map(s => <option key={s} value={s}>{seasonLabels[s] || s}</option>)}
                    </select>
                  </Field>
                  <Field label={ts('eventEditor.weather')}>
                    <select value={weather} onChange={e => setWeather(e.target.value as 'any' | 'sunny' | 'rainy')} className="input text-xs">
                      {weatherOptions.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  </Field>
                </div>

                {/* 事件归属：主NPC + 心数要求 */}
                <div className="themed-bg-card rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <IconHeart />
                    <span className="text-[10px] font-medium themed-text-secondary">事件归属</span>
                    <span className="text-[9px] themed-text-disabled">（这是谁的几心事件）</span>
                  </div>
                  {/* 主NPC选择 */}
                  <div>
                    <label className="text-[9px] themed-text-dimmed block mb-1">主NPC（事件归属者）</label>
                    {npcIds.length === 0 ? (
                      <p className="text-[10px] themed-text-disabled italic">请先添加参与NPC</p>
                    ) : (
                      <select
                        value={mainNpcId}
                        onChange={e => setMainNpcId(e.target.value)}
                        className="input text-xs"
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
                    <label className="text-[9px] themed-text-dimmed block mb-1">心数要求（触发所需最低好感）</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min={0} max={14} value={heartRequired} onChange={e => setHeartRequired(Number(e.target.value))} className="flex-1" />
                      <span className="text-xs themed-text-muted font-medium w-10 text-right inline-flex items-center justify-end gap-1">{heartRequired} <IconHeart /></span>
                    </div>
                  </div>
                  {/* 归属摘要 */}
                  {mainNpcId && heartRequired > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                      <span className="text-[10px] themed-text-secondary">
                        {allNpcs.find(n => n.id === mainNpcId)?.displayName ?? mainNpcId} 的
                        <span className="text-purple-300 font-medium mx-0.5">{heartRequired}</span>
                        心事件
                      </span>
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
              <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                {ts('eventEditor.initialPosition')}
                <span className="text-[9px] themed-text-disabled font-normal normal-case tracking-normal">{ts('eventEditor.initialPositionHint')}</span>
              </h3>
              <div className="space-y-2.5 themed-bg-card rounded-lg p-2.5">
                {/* 玩家位置 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] themed-text-dimmed">{ts('eventEditor.farmerPosition')}</label>
                    <button
                      type="button"
                      onClick={() => { setPickTarget('farmer'); setPickTargetStep(null); setPreviewOpen(true) }}
                      disabled={!mapId}
                      className="px-2.5 py-1 rounded-lg bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/50 border border-cyan-700/40 transition-colors text-[10px] font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="打开地图，点击位置自动填入坐标"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      地图选点
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="text-[9px] themed-text-dimmed block mb-0.5">X</label>
                      <input type="number" value={farmerX} onChange={e => { setFarmerX(Number(e.target.value)); setDirty(true) }} className="input text-xs" min={0} />
                    </div>
                    <div>
                      <label className="text-[9px] themed-text-dimmed block mb-0.5">Y</label>
                      <input type="number" value={farmerY} onChange={e => { setFarmerY(Number(e.target.value)); setDirty(true) }} className="input text-xs" min={0} />
                    </div>
                    <div>
                      <label className="text-[9px] themed-text-dimmed block mb-0.5">{ts('eventEditor.facing')}</label>
                      <select value={farmerFacing} onChange={e => { setFarmerFacing(Number(e.target.value)); setDirty(true) }} className="input text-xs">
                        <option value={0}>{ts('eventEditor.dirUp')}</option>
                        <option value={1}>{ts('eventEditor.dirRight')}</option>
                        <option value={2}>{ts('eventEditor.dirDown')}</option>
                        <option value={3}>{ts('eventEditor.dirLeft')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* NPC位置（仅当有NPC时显示） */}
                {npcIds.length > 0 && (
                  <div className="pt-2 border-t themed-border-secondary">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] themed-text-dimmed">{ts('eventEditor.npcPosition')}</label>
                      <button
                        type="button"
                        onClick={() => { setPickTarget('npc'); setPickTargetStep(null); setPreviewOpen(true) }}
                        disabled={!mapId}
                        className="px-2.5 py-1 rounded-lg bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/50 border border-cyan-700/40 transition-colors text-[10px] font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="打开地图，点击位置自动填入坐标"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        地图选点
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[9px] themed-text-dimmed block mb-0.5">X</label>
                        <input type="number" value={npcX} onChange={e => { setNpcX(Number(e.target.value)); setDirty(true) }} className="input text-xs" min={0} />
                      </div>
                      <div>
                        <label className="text-[9px] themed-text-dimmed block mb-0.5">Y</label>
                        <input type="number" value={npcY} onChange={e => { setNpcY(Number(e.target.value)); setDirty(true) }} className="input text-xs" min={0} />
                      </div>
                    </div>
                    <p className="text-[9px] themed-text-disabled mt-1">多个NPC会从该坐标起横向每隔3格排列</p>
                  </div>
                )}
              </div>
            </div>

            {/* 添加步骤（按分类分组） */}
            <div>
              <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider mb-3">{ts('eventEditor.addStep')}</h3>
              <div className="space-y-3">
                {stepCategoryOrder.map(cat => {
                  const catSteps = eventStepTypes.filter(st => st.category === cat)
                  if (catSteps.length === 0) return null
                  return (
                    <div key={cat}>
                      <p className="text-[10px] themed-text-dimmed mb-1.5 font-medium">{stepCategoryLabels[cat]}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {catSteps.map(st => {
                          const colors = stepTypeColors[st.type] || { bg: 'bg-gray-500/15', text: 'text-gray-300', dot: 'bg-gray-400' }
                          return (
                            <button key={st.type} onClick={() => addStep(st.type)}
                              title={st.desc}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${colors.bg} ${colors.text} hover:opacity-80`}>
                              <span className="text-sm flex-shrink-0">{st.icon}</span>
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
                <h3 className="text-sm font-semibold themed-text-secondary">{ts('eventEditor.stepTimeline')}</h3>
                <span className="text-[10px] themed-text-dimmed">{steps.length} {ts('eventEditor.stepCount')}</span>
              </div>

              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 themed-text-dimmed gap-3">
                  <div className="w-16 h-16 rounded-2xl themed-bg-card flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-40">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <p className="text-sm themed-text-muted">{ts('eventEditor.addStepHint')}</p>
                  <p className="text-[10px] themed-text-disabled">{ts('eventEditor.addStepHint2')}</p>
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
            <div className="w-full lg:w-[380px] xl:w-[420px] lg:flex-shrink-0 border-t lg:border-t-0 lg:border-l themed-border-primary flex flex-col">
              <div className="px-4 py-3 border-b themed-border-primary flex items-center gap-2 flex-shrink-0">
                <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider">{ts('eventEditor.mapPreview')}</h3>
                {selectedMap && <span className="text-[9px] themed-text-disabled truncate">({getMapDisplayName(selectedMap.name)} · {selectedMap.width}x{selectedMap.height})</span>}
                {mapImageLoading && <span className="text-[9px] themed-text-dimmed animate-pulse flex-shrink-0">渲染中...</span>}
                {selectedMap && (
                  <button
                    onClick={() => setPreviewOpen(true)}
                    className="ml-auto inline-flex items-center gap-1 text-[10px] themed-text-secondary hover:themed-text-primary px-2 py-1 rounded themed-bg-card hover:themed-bg-card-hover transition-colors flex-shrink-0"
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
                        <span className="text-[10px] themed-text-disabled">渲染中...</span>
                      ) : (
                        <div className="flex flex-col items-center gap-2 themed-text-disabled">
                          <IconMap />
                          <span className="text-[10px]">暂无该地图图片</span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* hover 时显示放大提示 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                    <span className="text-[11px] text-white bg-black/60 px-3 py-1.5 rounded">点击放大 · 查看真实坐标</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center themed-text-disabled gap-2 p-4">
                  <IconMap />
                  <p className="text-[10px]">{ts('eventEditor.selectMapFirst')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：脚本预览（可折叠） */}
        {showScriptPreview && (
          <div className="w-full lg:w-[280px] xl:w-[320px] lg:flex-shrink-0 border-t lg:border-t-0 lg:border-l themed-border-primary flex flex-col themed-bg-secondary">
            <div className="px-4 py-3 border-b themed-border-primary flex items-center justify-between flex-shrink-0">
              <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider">{ts('eventEditor.scriptPreview')}</h3>
              <button onClick={() => setShowScriptPreview(false)} className="themed-text-dimmed hover:themed-text-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-[10px] themed-text-muted font-mono whitespace-pre-wrap break-all leading-relaxed themed-bg-primary rounded-lg p-3 border themed-border-secondary">
                {scriptPreview}
              </pre>
              <div className="mt-3 space-y-1.5">
                <p className="text-[9px] themed-text-disabled">导出格式: Content Patcher EditData</p>
                <p className="text-[9px] themed-text-disabled">目标: Data/Events/{mapId || '{map}'}</p>
                <p className="text-[9px] themed-text-disabled">事件键: {id || '{id}'}/{season}/{timeStart}/{timeEnd}</p>
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
        />
      )}
      <UnsavedChangesGuard dirty={dirty} />
    </div>
  )
}

// ---- 步骤卡片（时间轴样式） ----
function StepCard({ step, index, total, isExpanded, isPicking, onToggle, onUpdateConfig, onUpdateStepField, onRemove, onMove, onStartPick, onStopPick, eventNpcs, projectItems, projectMails, projectQuests }: {
  step: EventStep; index: number; total: number
  isExpanded: boolean; isPicking: boolean
  onToggle: () => void; onUpdateConfig: (k: string, v: string) => void
  onUpdateStepField: (k: 'label' | 'type', v: string) => void
  onRemove: () => void; onMove: (dir: -1 | 1) => void
  onStartPick: () => void; onStopPick: () => void
  eventNpcs: { id: string; name: string; displayName: string }[]
  projectItems: Array<{ id: string; name?: string; displayName?: string }>
  projectMails: Array<{ id: string; title?: string; name?: string }>
  projectQuests: Array<{ id: string; title?: string; name?: string }>
}): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const stInfo = eventStepTypes.find(s => s.type === step.type)!
  const colors = stepTypeColors[step.type] || { bg: 'bg-gray-500/15', text: 'text-gray-300', dot: 'bg-gray-400' }
  // 获取地图列表用于传送步骤的目标地图下拉选择
  const { allMaps } = useMapLibrary()

  return (
    <div className={`relative rounded-xl transition-all ${isExpanded ? 'themed-bg-card ring-1 ring-[#444]' : 'themed-bg-hover hover:themed-bg-hover'}`}>
      <div onClick={onToggle} className="flex items-start gap-3 px-4 py-3 cursor-pointer group">
        <div className={`relative z-10 w-[10px] h-[10px] rounded-full flex-shrink-0 mt-[7px] ${colors.dot} ring-2 ring-[#1a1a1a]`} />
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg} ${colors.text}`}>
          <span className="text-sm">{stInfo.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors.bg} ${colors.text}`}>{stInfo.label}</span>
            <span className="text-[10px] themed-text-disabled">#{index + 1}</span>
            {isPicking && <span className="text-[9px] text-green-400 font-medium animate-pulse">{ts('eventEditor.picking')}</span>}
          </div>
          <p className="text-[11px] themed-text-muted mt-1 truncate">
            {step.type === 'move' ? `移动到 (${step.config.x ?? '?'}, ${step.config.y ?? '?'})` :
             step.type === 'warp' ? `传送到 ${step.config.targetMap || '?'} (${step.config.x ?? '?'}, ${step.config.y ?? '?'})` :
             step.type === 'dialogue' ? `${step.config.speaker || '?'}: "${(step.config.text ?? '').slice(0, 30)}"` :
             step.config.text || step.config.question || step.config.track || step.config.effect || step.config.emotion || step.label}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {index > 0 && <button onClick={(e) => { e.stopPropagation(); onMove(-1) }} className="p-1 themed-text-dimmed hover:themed-text-primary rounded themed-bg-active" title="上移"><ChevronUp /></button>}
          {index < total - 1 && <button onClick={(e) => { e.stopPropagation(); onMove(1) }} className="p-1 themed-text-dimmed hover:themed-text-primary rounded themed-bg-active" title="下移"><ChevronDown /></button>}
          <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="p-1 themed-text-dimmed hover:text-red-400 rounded hover:bg-red-400/10" title="删除"><Trash /></button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t themed-border-primary pt-3 ml-[46px] space-y-2.5">
          <Field2 label={ts('eventEditor.stepName')}>
            <input type="text" value={step.label} onChange={e => onUpdateStepField('label', e.target.value)} className="input text-xs" />
          </Field2>

          {step.type === 'dialogue' && <>
            <Field2 label={ts('eventEditor.speaker')}>
              <select value={step.config.speaker ?? ''} onChange={e => onUpdateConfig('speaker', e.target.value)} className="input text-xs">
                <option value="">{ts('eventEditor.selectSpeaker')}</option>
                <option value="null">{ts('eventEditor.narrator')}</option>
                <optgroup label={ts('eventEditor.eventNpc')}>
                  {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName} ({n.name})</option>)}
                </optgroup>
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.dialogueContent')}>
              <textarea value={step.config.text ?? ''} onChange={e => onUpdateConfig('text', e.target.value)} rows={3} className="input resize-none text-xs" placeholder={ts('eventEditor.dialoguePlaceholder')} />
            </Field2>
          </>}

          {step.type === 'move' && <>
            <Field2 label={ts('eventEditor.moveTarget')}>
              <select value={step.config.target ?? 'npc'} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-xs">
                <option value="player">玩家</option>
                <option value="camera">镜头</option>
                {eventNpcs.length > 0 && (
                  <optgroup label="事件NPC">
                    {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName} ({n.name})</option>)}
                  </optgroup>
                )}
              </select>
            </Field2>
            <div className="grid grid-cols-3 gap-2">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
              <div>
                <label className="text-[9px] themed-text-dimmed block mb-0.5">速度</label>
                <input type="number" value={step.config.speed ?? '2'} onChange={e => onUpdateConfig('speed', e.target.value)} className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-xs themed-text-primary focus:outline-none focus:border-[#555]" min={0} step={0.5} />
              </div>
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'warp' && <>
            <Field2 label={ts('eventEditor.targetMap')}>
              <select value={step.config.targetMap ?? ''} onChange={e => onUpdateConfig('targetMap', e.target.value)} className="input text-xs">
                <option value="">{ts('eventEditor.selectMap')}</option>
                {(['farm', 'town', 'outdoor', 'indoor', 'mine', 'island', 'festival', 'special'] as const).map(cat => {
                  const items = allMaps.filter(m => inferMapCategory(m.name) === cat)
                  if (items.length === 0) return null
                  return (
                    <optgroup key={cat} label={mapCategoryLabel[cat]}>
                      {items.map(m => (
                        <option key={m.name} value={m.name}>
                          {getMapDisplayName(m.name)}
                        </option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
            </Field2>
            <div className="grid grid-cols-2 gap-2">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'animate' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-xs">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.expression')}>
              <select value={step.config.emotion ?? 'happy'} onChange={e => onUpdateConfig('emotion', e.target.value)} className="input text-xs">
                {Object.keys(emotionLabels).map(e => <option key={e} value={e}>{emotionLabels[e]} ({e})</option>)}
              </select>
            </Field2>
          </div>}

          {step.type === 'bgm' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.track')}>
              <select value={step.config.track ?? ''} onChange={e => onUpdateConfig('track', e.target.value)} className="input text-xs">
                <option value="">{ts('eventEditor.selectMap')}</option>
                {eventBgmTracks.map(t => <option key={t.value} value={t.value}>{t.label} ({t.value})</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.volume')}>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="1" step="0.1" value={Number(step.config.volume ?? 0.6)} onChange={e => onUpdateConfig('volume', e.target.value)} className="flex-1" />
                <span className="text-[10px] themed-text-dimmed w-6">{step.config.volume ?? '0.6'}</span>
              </div>
            </Field2>
          </div>}

          {step.type === 'effect' && <Field2 label={ts('eventEditor.effectType')}>
            <select value={step.config.effect ?? 'fade'} onChange={e => onUpdateConfig('effect', e.target.value)} className="input text-xs">
              {['fade','flash','shake','screenCover','pan','zoom'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field2>}

          {step.type === 'choice' && <>
            <Field2 label={ts('eventEditor.question')}>
              <input type="text" value={step.config.question ?? ''} onChange={e => onUpdateConfig('question', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.questionPlaceholder')} />
            </Field2>
            <div className="themed-bg-card rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] themed-text-dimmed">{ts('eventEditor.choiceBranchHint')}</p>
                {/* 动态添加选项按钮：最多4个 */}
                {(() => {
                  const filledCount = [1, 2, 3, 4].filter(i => step.config[`choice${i}`]).length
                  const canAdd = filledCount < 4
                  return canAdd ? (
                    <button
                      onClick={() => {
                        const nextIdx = [1, 2, 3, 4].find(i => !step.config[`choice${i}`])
                        if (nextIdx) onUpdateConfig(`choice${nextIdx}`, '新选项')
                      }}
                      className="text-[9px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-colors flex items-center gap-1"
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      添加选项
                    </button>
                  ) : null
                })()}
              </div>
              {[1, 2, 3, 4].map(i => {
                const textKey = `choice${i}`
                const friendKey = `choice${i}_friendship`
                const npcKey = `choice${i}_npc`
                const dialogueKey = `choice${i}_dialogue`
                const hasText = step.config[textKey]
                // 只显示已有选项
                if (!hasText) return null
                return (
                  <div key={i} className="border themed-border-secondary rounded-md p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] themed-text-dimmed w-4">#{i}</span>
                      <input type="text" value={step.config[textKey] ?? ''} onChange={e => onUpdateConfig(textKey, e.target.value)} className="input text-xs flex-1" placeholder={`${ts('eventEditor.choiceText')} ${i}`} />
                      {/* 删除选项按钮（至少保留2个选项） */}
                      {[1, 2, 3, 4].filter(idx => step.config[`choice${idx}`]).length > 2 && (
                        <button
                          onClick={() => {
                            // 清空该选项的所有字段
                            onUpdateConfig(textKey, '')
                            onUpdateConfig(friendKey, '')
                            onUpdateConfig(npcKey, '')
                            onUpdateConfig(dialogueKey, '')
                          }}
                          className="p-1 themed-text-dimmed hover:text-red-400 rounded hover:bg-red-400/10"
                          title="删除此选项"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 ml-5">
                      <div>
                        <label className="text-[9px] themed-text-dimmed block mb-0.5">{ts('eventEditor.choiceFriendship')}</label>
                        <input type="number" value={step.config[friendKey] ?? '0'} onChange={e => onUpdateConfig(friendKey, e.target.value)} className="input text-xs" placeholder="如: 50 / -25" />
                      </div>
                      <div>
                        <label className="text-[9px] themed-text-dimmed block mb-0.5">好感目标</label>
                        <select value={step.config[npcKey] ?? ''} onChange={e => onUpdateConfig(npcKey, e.target.value)} className="input text-xs">
                          <option value="">默认(首个NPC)</option>
                          {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] themed-text-dimmed block mb-0.5">{ts('eventEditor.choiceDialogue')}</label>
                        <input type="text" value={step.config[dialogueKey] ?? ''} onChange={e => onUpdateConfig(dialogueKey, e.target.value)} className="input text-xs" placeholder={ts('eventEditor.choiceDialoguePlaceholder')} />
                      </div>
                    </div>
                  </div>
                )
              })}
              <p className="text-[9px] themed-text-disabled">{ts('eventEditor.choiceFriendshipHint')}</p>
            </div>
          </>}

          {step.type === 'reward' && <>
            <Field2 label={ts('eventEditor.type')}>
              <select value={step.config.type ?? 'friendship'} onChange={e => onUpdateConfig('type', e.target.value)} className="input text-xs">
                {['friendship','item','money','recipe'].map(t => <option key={t} value={t}>{t === 'friendship' ? '好感度' : t === 'item' ? '物品' : t === 'money' ? '金钱' : '配方'}</option>)}
              </select>
            </Field2>
            {step.config.type === 'friendship' && <>
              <div className="grid grid-cols-2 gap-2">
                <Field2 label="好感目标NPC">
                  <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-xs">
                    <option value="">默认(首个NPC)</option>
                    {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
                  </select>
                </Field2>
                <Field2 label={ts('eventEditor.amount')}>
                  <input type="number" value={step.config.amount ?? '0'} onChange={e => onUpdateConfig('amount', e.target.value)} className="input text-xs" placeholder="如: 50 / -25" />
                </Field2>
              </div>
            </>}
            {step.config.type === 'item' && <>
              <div className="grid grid-cols-2 gap-2">
                <Field2 label={ts('eventEditor.itemId')}>
                  <input type="text" list="project-items-list" value={step.config.itemId ?? ''} onChange={e => onUpdateConfig('itemId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.itemIdPlaceholder')} />
                  <datalist id="project-items-list">
                    {projectItems.map(it => <option key={it.id} value={it.id}>{it.displayName ?? it.name ?? it.id}</option>)}
                  </datalist>
                </Field2>
                <Field2 label={ts('eventEditor.count')}>
                  <input type="number" value={step.config.count ?? '1'} onChange={e => onUpdateConfig('count', e.target.value)} className="input text-xs" min={1} />
                </Field2>
              </div>
            </>}
            {step.config.type === 'money' && <Field2 label="金钱数量">
              <input type="number" value={step.config.amount ?? '0'} onChange={e => onUpdateConfig('amount', e.target.value)} className="input text-xs" placeholder="如: 500" />
            </Field2>}
            {step.config.type === 'recipe' && <Field2 label={ts('eventEditor.recipeName')}>
              <input type="text" value={step.config.recipeName ?? ''} onChange={e => onUpdateConfig('recipeName', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.recipeNamePlaceholder')} />
            </Field2>}
          </>}

          {step.type === 'face' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-xs">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.direction')}>
              <select value={step.config.direction ?? '2'} onChange={e => onUpdateConfig('direction', e.target.value)} className="input text-xs">
                <option value="0">{ts('eventEditor.dirUp')}</option>
                <option value="1">{ts('eventEditor.dirRight')}</option>
                <option value="2">{ts('eventEditor.dirDown')}</option>
                <option value="3">{ts('eventEditor.dirLeft')}</option>
              </select>
            </Field2>
          </div>}

          {step.type === 'sound' && <Field2 label={ts('eventEditor.soundId')}>
            <input type="text" value={step.config.soundId ?? ''} onChange={e => onUpdateConfig('soundId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.soundIdPlaceholder')} />
          </Field2>}

          {step.type === 'ambient' && <Field2 label={ts('eventEditor.ambientId')}>
            <input type="text" value={step.config.ambientId ?? ''} onChange={e => onUpdateConfig('ambientId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.ambientIdPlaceholder')} />
          </Field2>}

          {step.type === 'addItem' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.itemId')}>
              <input type="text" list="project-items-list" value={step.config.itemId ?? ''} onChange={e => onUpdateConfig('itemId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.itemIdPlaceholder')} />
              <datalist id="project-items-list">
                {projectItems.map(it => <option key={it.id} value={it.id}>{it.displayName ?? it.name ?? it.id}</option>)}
              </datalist>
            </Field2>
            <Field2 label={ts('eventEditor.count')}>
              <input type="number" value={step.config.count ?? '1'} onChange={e => onUpdateConfig('count', e.target.value)} className="input text-xs" min={1} />
            </Field2>
          </div>}

          {step.type === 'removeItem' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.itemId')}>
              <input type="text" list="project-items-list" value={step.config.itemId ?? ''} onChange={e => onUpdateConfig('itemId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.itemIdPlaceholder')} />
              <datalist id="project-items-list">
                {projectItems.map(it => <option key={it.id} value={it.id}>{it.displayName ?? it.name ?? it.id}</option>)}
              </datalist>
            </Field2>
            <Field2 label={ts('eventEditor.count')}>
              <input type="number" value={step.config.count ?? '1'} onChange={e => onUpdateConfig('count', e.target.value)} className="input text-xs" min={1} />
            </Field2>
          </div>}

          {step.type === 'addQuest' && <Field2 label={ts('eventEditor.questId')}>
            <input type="text" list="project-quests-list" value={step.config.questId ?? ''} onChange={e => onUpdateConfig('questId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.questIdPlaceholder')} />
            <datalist id="project-quests-list">
              {projectQuests.map(q => <option key={q.id} value={q.id}>{q.title ?? q.name ?? q.id}</option>)}
            </datalist>
          </Field2>}

          {step.type === 'completeQuest' && <Field2 label={ts('eventEditor.questId')}>
            <input type="text" list="project-quests-list" value={step.config.questId ?? ''} onChange={e => onUpdateConfig('questId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.questIdPlaceholder')} />
            <datalist id="project-quests-list">
              {projectQuests.map(q => <option key={q.id} value={q.id}>{q.title ?? q.name ?? q.id}</option>)}
            </datalist>
          </Field2>}

          {step.type === 'setMail' && <Field2 label={ts('eventEditor.mailId')}>
            <input type="text" list="project-mails-list" value={step.config.mailId ?? ''} onChange={e => onUpdateConfig('mailId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.mailIdPlaceholder')} />
            <datalist id="project-mails-list">
              {projectMails.map(m => <option key={m.id} value={m.id}>{m.title ?? m.name ?? m.id}</option>)}
            </datalist>
          </Field2>}

          {step.type === 'setEventSeen' && <Field2 label={ts('eventEditor.eventId')}>
            <input type="text" value={step.config.eventId ?? ''} onChange={e => onUpdateConfig('eventId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.eventIdPlaceholder')} />
          </Field2>}

          {step.type === 'unlockRecipe' && <Field2 label={ts('eventEditor.recipeName')}>
            <input type="text" value={step.config.recipeName ?? ''} onChange={e => onUpdateConfig('recipeName', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.recipeNamePlaceholder')} />
          </Field2>}

          {step.type === 'spawn' && <>
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-xs">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <div className="grid grid-cols-2 gap-2">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'remove' && <Field2 label={ts('eventEditor.character')}>
            <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-xs">
              <option value="">{ts('eventEditor.selectCharacter')}</option>
              {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
            </select>
          </Field2>}

          {step.type === 'createObject' && <>
            <Field2 label={ts('eventEditor.itemId')}>
              <input type="text" value={step.config.itemId ?? ''} onChange={e => onUpdateConfig('itemId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.itemIdPlaceholder')} />
            </Field2>
            <div className="grid grid-cols-2 gap-2">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'destroyObject' && <>
            <div className="grid grid-cols-2 gap-2">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'text' && <Field2 label={ts('eventEditor.fullscreenText')}>
            <textarea value={step.config.text ?? ''} onChange={e => onUpdateConfig('text', e.target.value)} rows={3} className="input resize-none text-xs" placeholder={ts('eventEditor.fullscreenTextPlaceholder')} />
          </Field2>}

          {step.type === 'message' && <Field2 label={ts('eventEditor.notificationText')}>
            <input type="text" value={step.config.text ?? ''} onChange={e => onUpdateConfig('text', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.notificationTextPlaceholder')} />
          </Field2>}

          {step.type === 'question' && <>
            <Field2 label={ts('eventEditor.question')}>
              <input type="text" value={step.config.question ?? ''} onChange={e => onUpdateConfig('question', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.questionPlaceholder')} />
            </Field2>
            <div className="grid grid-cols-2 gap-2">
              <Field2 label={ts('eventEditor.yesLabel')}>
                <input type="text" value={step.config.yesLabel ?? ''} onChange={e => onUpdateConfig('yesLabel', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.yesLabelPlaceholder')} />
              </Field2>
              <Field2 label={ts('eventEditor.noLabel')}>
                <input type="text" value={step.config.noLabel ?? ''} onChange={e => onUpdateConfig('noLabel', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.noLabelPlaceholder')} />
              </Field2>
            </div>
            {/* 是/否分支后果配置 */}
            <div className="themed-bg-card rounded-lg p-2.5 space-y-2">
              <p className="text-[9px] themed-text-dimmed">选择后的后果（好感度变化、对话回应）</p>
              {/* 是分支 */}
              <div className="border themed-border-secondary rounded-md p-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 font-medium">是</span>
                  <span className="text-[9px] themed-text-dimmed">选择"是"后的后果</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 ml-1">
                  <div>
                    <label className="text-[9px] themed-text-dimmed block mb-0.5">好感度变化</label>
                    <input type="number" value={step.config.yes_friendship ?? '0'} onChange={e => onUpdateConfig('yes_friendship', e.target.value)} className="input text-xs" placeholder="如: 50 / -25" />
                  </div>
                  <div>
                    <label className="text-[9px] themed-text-dimmed block mb-0.5">好感目标</label>
                    <select value={step.config.yes_npc ?? ''} onChange={e => onUpdateConfig('yes_npc', e.target.value)} className="input text-xs">
                      <option value="">默认(首个NPC)</option>
                      {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] themed-text-dimmed block mb-0.5">对话回应</label>
                    <input type="text" value={step.config.yes_dialogue ?? ''} onChange={e => onUpdateConfig('yes_dialogue', e.target.value)} className="input text-xs" placeholder="NPC的回应台词" />
                  </div>
                </div>
              </div>
              {/* 否分支 */}
              <div className="border themed-border-secondary rounded-md p-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">否</span>
                  <span className="text-[9px] themed-text-dimmed">选择"否"后的后果</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 ml-1">
                  <div>
                    <label className="text-[9px] themed-text-dimmed block mb-0.5">好感度变化</label>
                    <input type="number" value={step.config.no_friendship ?? '0'} onChange={e => onUpdateConfig('no_friendship', e.target.value)} className="input text-xs" placeholder="如: -25 / 0" />
                  </div>
                  <div>
                    <label className="text-[9px] themed-text-dimmed block mb-0.5">好感目标</label>
                    <select value={step.config.no_npc ?? ''} onChange={e => onUpdateConfig('no_npc', e.target.value)} className="input text-xs">
                      <option value="">默认(首个NPC)</option>
                      {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] themed-text-dimmed block mb-0.5">对话回应</label>
                    <input type="text" value={step.config.no_dialogue ?? ''} onChange={e => onUpdateConfig('no_dialogue', e.target.value)} className="input text-xs" placeholder="NPC的回应台词" />
                  </div>
                </div>
              </div>
              <p className="text-[9px] themed-text-disabled">好感度：正数增加，负数减少（如 50 表示 +50 好感，-25 表示 -25 好感）</p>
            </div>
          </>}

          {step.type === 'shake' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.intensity')}>
              <input type="number" value={step.config.intensity ?? '10'} onChange={e => onUpdateConfig('intensity', e.target.value)} className="input text-xs" min={0} />
            </Field2>
            <Field2 label={ts('eventEditor.duration')}>
              <input type="number" value={step.config.duration ?? '500'} onChange={e => onUpdateConfig('duration', e.target.value)} className="input text-xs" min={0} />
            </Field2>
          </div>}

          {step.type === 'showFrame' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-xs">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.frameIndex')}>
              <input type="number" value={step.config.frameIndex ?? '0'} onChange={e => onUpdateConfig('frameIndex', e.target.value)} className="input text-xs" min={0} />
            </Field2>
          </div>}

          {step.type === 'emote' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-xs">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.emoteId')}>
              <input type="number" value={step.config.emoteId ?? '16'} onChange={e => onUpdateConfig('emoteId', e.target.value)} className="input text-xs" min={0} />
            </Field2>
          </div>}

          {step.type === 'jump' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-xs">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
          </div>}

          {step.type === 'viewport' && <>
            <div className="grid grid-cols-2 gap-2">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'fade' && <Field2 label={ts('eventEditor.effectType')}>
            <select value={step.config.effect ?? 'fade'} onChange={e => onUpdateConfig('effect', e.target.value)} className="input text-xs">
              {['fade','flash'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field2>}

          {step.type === 'pause' && <Field2 label={ts('eventEditor.duration')}>
            <input type="number" value={step.config.duration ?? '1000'} onChange={e => onUpdateConfig('duration', e.target.value)} className="input text-xs" min={0} placeholder="毫秒" />
          </Field2>}

          {step.type === 'friendship' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-xs">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.amount')}>
              <input type="number" value={step.config.amount ?? '50'} onChange={e => onUpdateConfig('amount', e.target.value)} className="input text-xs" placeholder="好感度变化" />
            </Field2>
          </div>}

          {step.type === 'addMail' && <Field2 label={ts('eventEditor.mailId')}>
            <input type="text" list="project-mails-list" value={step.config.mailId ?? ''} onChange={e => onUpdateConfig('mailId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.mailIdPlaceholder')} />
            <datalist id="project-mails-list">
              {projectMails.map(m => <option key={m.id} value={m.id}>{m.title ?? m.name ?? m.id}</option>)}
            </datalist>
          </Field2>}
        </div>
      )}
    </div>
  )
}

function CoordField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <div>
      <label className="text-[9px] themed-text-dimmed block mb-0.5">{label}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-xs themed-text-primary focus:outline-none focus:border-[#555]" min={0} />
    </div>
  )
}

function PickButton({ isActive, onStart, onStop }: { isActive: boolean; onStart: () => void; onStop: () => void }): JSX.Element {
  return (
    <button
      onClick={isActive ? onStop : onStart}
      className={`w-full py-1.5 rounded-lg text-[10px] font-medium transition-colors flex items-center justify-center gap-1 ${
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

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return <div><label className="text-[10px] themed-text-dimmed block mb-1">{label}</label>{children}</div>
}

function Field2({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return <div><label className="text-[9px] themed-text-dimmed block mb-0.5">{label}</label>{children}</div>
}

function ChevronUp(): JSX.Element {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
}

function ChevronDown(): JSX.Element {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
}

function Trash(): JSX.Element {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
}

// ===== 可搜索的NPC选择器 =====
function SearchableNpcSelect({ placeholder, npcs, onSelect, searchValue, onSearchChange }: {
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
        className="input text-xs themed-text-muted cursor-pointer flex items-center justify-between"
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
                className="w-full pl-7 pr-2 py-1 text-[11px] themed-bg-card border themed-border-primary rounded themed-text-primary focus:outline-none focus:border-[#555]"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {npcs.length === 0 ? (
              <div className="px-3 py-4 text-[10px] themed-text-disabled text-center">无匹配NPC</div>
            ) : (
              npcs.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleSelect(n.id)}
                  className="w-full px-3 py-1.5 text-left text-[11px] themed-text-secondary hover:themed-bg-active transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: n.color || '#888' }} />
                  <span className="font-medium">{n.displayName}</span>
                  <span className="themed-text-dimmed text-[9px]">({n.name})</span>
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
function SearchableMapSelect({ value, onChange, allMaps, needsUnpack, searchValue, onSearchChange }: {
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
        className={`input text-xs flex items-center justify-between ${needsUnpack ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                className="w-full pl-7 pr-2 py-1 text-[11px] themed-bg-card border themed-border-primary rounded themed-text-primary focus:outline-none focus:border-[#555]"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredMaps.length === 0 ? (
              <div className="px-3 py-4 text-[10px] themed-text-disabled text-center">无匹配地图</div>
            ) : (
              filteredMaps.map(({ cat, items }) => (
                <div key={cat}>
                  <div className="px-3 py-1 text-[9px] themed-text-dimmed font-medium bg-[#1a1a1a]/50">{mapCategoryLabel[cat]}</div>
                  {items.map(m => (
                    <button
                      key={m.name}
                      onClick={() => handleSelect(m.name)}
                      className={`w-full px-3 py-1.5 text-left text-[11px] transition-colors flex items-center justify-between gap-2 ${
                        value === m.name ? 'themed-bg-active themed-text-primary' : 'themed-text-secondary hover:themed-bg-active'
                      }`}
                    >
                      <span className="font-medium">{getMapDisplayName(m.name)}</span>
                      <span className="themed-text-dimmed text-[9px]">{m.name}</span>
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
