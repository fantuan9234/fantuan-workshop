import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { eventStepTypes, seasonOptions, weatherOptions, type GameEvent, type EventStep } from '../../data/eventData'
import { defaultNPCs } from '../../data/npcData'
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
import { useUnsavedChangesGuard } from '../../components/useUnsavedChangesGuard'

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
}

export default function EventEditor(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { mutateSnapshot } = useProject()
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
  const [heartRequired, setHeartRequired] = useState(found?.heartRequired ?? 0)
  const [mapId, setMapId] = useState(found?.map ?? '')
  const [timeStart, setTimeStart] = useState(found?.timeStart ?? '09:00')
  const [timeEnd, setTimeEnd] = useState(found?.timeEnd ?? '17:00')
  const [season, setSeason] = useState(found?.season ?? 'any')
  const [weather, setWeather] = useState(found?.weather ?? 'any')
  const [description, setDescription] = useState(found?.description ?? '')
  const [steps, setSteps] = useState<EventStep[]>(found?.steps ?? [])
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)
  const [dirty, setDirty] = useState(false)
  useUnsavedChangesGuard(dirty)
  const [pickTargetStep, setPickTargetStep] = useState<string | null>(null)
  const [showScriptPreview, setShowScriptPreview] = useState(false)

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
    return npcIds.map(nid => defaultNPCs.find(n => n.id === nid)).filter(Boolean) as typeof defaultNPCs
  }, [npcIds])

  const availableNpcs = defaultNPCs.filter(n => !npcIds.includes(n.id))

  const addNpc = (npcId: string) => {
    if (!npcId || npcIds.includes(npcId)) return
    setNpcIds(prev => [...prev, npcId])
    setDirty(true)
  }
  const removeNpc = (npcId: string) => {
    setNpcIds(prev => prev.filter(i => i !== npcId))
    setDirty(true)
  }

  const updateConfig = useCallback((stepId: string, key: string, value: string) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, config: { ...s.config, [key]: value } } : s))
    setDirty(true)
  }, [])

  const handlePickTile = useCallback((x: number, y: number) => {
    if (!pickTargetStep) return
    updateConfig(pickTargetStep, 'x', String(x))
    updateConfig(pickTargetStep, 'y', String(y))
    setPickTargetStep(null)
  }, [pickTargetStep, updateConfig])

  // 从放大模态框里拾取坐标：同时支持写入事件步骤（若正在拾取）或仅打开预览查看
  const handlePreviewPick = useCallback((x: number, y: number) => {
    if (pickTargetStep) {
      updateConfig(pickTargetStep, 'x', String(x))
      updateConfig(pickTargetStep, 'y', String(y))
      setPickTargetStep(null)
      setPreviewOpen(false)
    }
  }, [pickTargetStep, updateConfig])

  const addStep = (type: EventStep['type']) => {
    const st = eventStepTypes.find(s => s.type === type)!
    const sid = `s${Date.now()}`
    const firstNpcName = eventNpcs[0]?.name ?? ''
    const newStep: EventStep = {
      id: sid, type, label: `${ts('eventEditor.newStep')}${st.label}`, icon: st.icon,
      config: type === 'move' ? { target: 'npc', x: '0', y: '0' } :
              type === 'dialogue' ? { speaker: firstNpcName, text: '' } :
              type === 'choice' ? { question: '', choice1: '', choice2: '' } :
              type === 'bgm' ? { track: '', volume: '0.6' } :
              type === 'reward' ? { type: 'friendship', amount: '0' } :
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
    const savedId = found?.id ?? `evt_${Date.now()}`
    const newEvent: GameEvent = {
      id: savedId,
      title, npcIds,
      npcNames: npcIds.map(nid => defaultNPCs.find(n => n.id === nid)?.displayName ?? nid),
      heartRequired, map: mapId, mapDisplayName: mapDisplay,
      timeStart, timeEnd, season, weather: weather as 'sunny' | 'rainy' | 'any',
      description, steps,
      created: found?.created ?? new Date().toISOString().slice(0, 10),
    }
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

  // 生成脚本预览
  const scriptPreview = useMemo(() => {
    const parts: string[] = []
    const conditions: string[] = []
    if (npcIds.length > 0) conditions.push(`npc=${npcIds[0]}`)
    if (heartRequired > 0) conditions.push(`hearts=${heartRequired}`)
    if (season && season !== 'any') conditions.push(`season=${season}`)
    if (weather && weather !== 'any') conditions.push(`weather=${weather}`)
    if (timeStart) conditions.push(`time=${timeStart}`)
    if (mapId) conditions.push(`map=${mapId}`)
    if (conditions.length > 0) parts.push(conditions.join('/'))

    steps.forEach(step => {
      const cfg = step.config || {}
      switch (step.type) {
        case 'dialogue': {
          const speaker = cfg.speaker || 'null'
          const text = cfg.text || ''
          if (speaker === 'null' || speaker === 'narrator') parts.push(`message "${text}"`)
          else parts.push(`speak ${speaker} "${text}"`)
          break
        }
        case 'move': parts.push(`move ${cfg.target || 'npc'} ${cfg.x || '0'} ${cfg.y || '0'} 2`); break
        case 'choice': {
          const q = cfg.question || ''
          const opts = [cfg.choice1, cfg.choice2, cfg.choice3, cfg.choice4].filter(Boolean)
          parts.push(`question fork1 "${q}#${opts.join('#')}"`)
          break
        }
        case 'bgm': parts.push(`playMusic ${cfg.track || 'springtown'}`); break
        case 'animate': parts.push(`emote ${cfg.target || 'npc'} 16`); break
        case 'reward': {
          if (cfg.type === 'friendship' && cfg.npcId && cfg.amount) parts.push(`friendship ${cfg.npcId} ${cfg.amount}`)
          break
        }
        case 'effect': parts.push('globalFade 0.007'); break
        case 'warp': parts.push(`warp farmer ${cfg.x || '0'} ${cfg.y || '0'}`); break
      }
    })
    parts.push('end')
    return parts.join('/')
  }, [steps, npcIds, heartRequired, season, weather, timeStart, mapId])

  const isPicking = pickTargetStep !== null

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
        <div className="w-full lg:w-[280px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r themed-border-primary overflow-y-auto themed-bg-secondary">
          <div className="p-4 space-y-4">
            {/* 基本信息 */}
            <div>
              <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider mb-3">{ts('eventEditor.basicInfo')}</h3>
              <div className="space-y-3">
                <Field label={ts('eventEditor.eventName')}>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={ts('eventEditor.eventNamePlaceholder')} className="input" />
                </Field>

                {/* NPC选择器 */}
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
                  <select value="" onChange={e => addNpc(e.target.value)} className="input text-xs themed-text-muted">
                    <option value="">{ts('eventEditor.addNpc')}</option>
                    {availableNpcs.map(n => <option key={n.id} value={n.id}>{n.displayName}</option>)}
                  </select>
                </div>

                <Field label={ts('eventEditor.triggerMap')}>
                  <select value={mapId} onChange={e => setMapId(e.target.value)} className="input">
                    <option value="">{ts('eventEditor.selectMap')}</option>
                    {needsUnpack ? (
                      <option value="" disabled>（请先在「资源管理」中解包游戏素材）</option>
                    ) : (
                      <>
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
                      </>
                    )}
                  </select>
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
                    <select value={weather} onChange={e => setWeather(e.target.value)} className="input text-xs">
                      {weatherOptions.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label={ts('eventEditor.heartRequired')}>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={14} value={heartRequired} onChange={e => setHeartRequired(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs themed-text-muted font-medium w-10 text-right inline-flex items-center justify-end gap-1">{heartRequired} <IconHeart /></span>
                  </div>
                </Field>

                <Field label={ts('eventEditor.intro')}>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={ts('eventEditor.introPlaceholder')} rows={2} className="input resize-none" />
                </Field>
              </div>
            </div>

            {/* 添加步骤 */}
            <div>
              <h3 className="text-[11px] font-semibold themed-text-muted uppercase tracking-wider mb-3">{ts('eventEditor.addStep')}</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {eventStepTypes.map(st => {
                  const colors = stepTypeColors[st.type]
                  return (
                    <button key={st.type} onClick={() => addStep(st.type)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors text-left ${colors.bg} ${colors.text} hover:opacity-80`}>
                      <span className="text-sm">{st.icon}</span>
                      <span className="font-medium">{st.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 中间：步骤时间轴 + 地图预览 */}
        <div className="flex-1 flex flex-col min-w-0 themed-bg-primary">
          {!isPicking ? (
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
                          onRemove={() => removeStep(step.id)}
                          onMove={(dir) => moveStep(step.id, dir)}
                          onStartPick={() => { setPickTargetStep(step.id); setExpandedStep(step.id) }}
                          onStopPick={() => setPickTargetStep(null)}
                          eventNpcs={eventNpcs}
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
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-3 px-4 py-3 border-b themed-border-primary flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <h3 className="text-xs font-medium themed-text-secondary">{ts('eventEditor.pickingCoord')}</h3>
                <span className="text-[10px] themed-text-dimmed">{ts('eventEditor.pickHint')}</span>
                <button
                  onClick={() => setPreviewOpen(true)}
                  className="ml-auto text-[10px] themed-text-secondary hover:themed-text-primary px-2 py-1 rounded themed-bg-card"
                >
                  打开放大视图拾取
                </button>
                <button onClick={() => setPickTargetStep(null)} className="text-[10px] themed-text-muted hover:themed-text-primary px-2 py-1 rounded themed-bg-card">{ts('eventEditor.cancelPick')}</button>
              </div>
              {selectedMap ? (
                <div className="flex-1 min-h-0 p-2">
                  {mapImageUrl ? (
                    <div className="w-full h-full overflow-auto rounded-lg themed-bg-card flex items-center justify-center p-2">
                      <img
                        src={mapImageUrl}
                        alt={selectedMap.name}
                        className="max-w-full max-h-full object-contain cursor-crosshair"
                        onClick={(e) => {
                          // 在大图上点击拾取坐标
                          // 需要计算 object-contain 造成的 letterboxing 偏移
                          const img = e.currentTarget
                          const rect = img.getBoundingClientRect()
                          const nW = img.naturalWidth || selectedMap.width * 16
                          const nH = img.naturalHeight || selectedMap.height * 16
                          const imageAspect = nW / nH
                          const containerAspect = rect.width / rect.height

                          let renderW: number, renderH: number, offsetX: number, offsetY: number
                          if (imageAspect > containerAspect) {
                            // 图片更宽，上下有黑边
                            renderW = rect.width
                            renderH = rect.width / imageAspect
                            offsetX = 0
                            offsetY = (rect.height - renderH) / 2
                          } else {
                            // 图片更高，左右有黑边
                            renderH = rect.height
                            renderW = rect.height * imageAspect
                            offsetX = (rect.width - renderW) / 2
                            offsetY = 0
                          }

                          const localX = e.clientX - rect.left - offsetX
                          const localY = e.clientY - rect.top - offsetY
                          const tW = nW / selectedMap.width
                          const tH = nH / selectedMap.height
                          const scaleX = nW / renderW
                          const scaleY = nH / renderH
                          const imgPx = localX * scaleX
                          const imgPy = localY * scaleY
                          const tileX = Math.floor(imgPx / tW)
                          const tileY = Math.floor(imgPy / tH)
                          handlePickTile(
                            Math.max(0, Math.min(selectedMap.width - 1, tileX)),
                            Math.max(0, Math.min(selectedMap.height - 1, tileY))
                          )
                        }}
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center themed-bg-card rounded-lg">
                      <span className="text-[10px] themed-text-disabled">{mapImageLoading ? '渲染中...' : '暂无该地图图片'}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 themed-bg-secondary rounded-xl flex items-center justify-center themed-text-dimmed m-4">
                  <p className="text-sm">{ts('eventEditor.selectMapFirst2')}</p>
                </div>
              )}
            </div>
          )}
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
            warps: [],
            spawns: [],
            forageAreas: [],
          }}
          tmxPath={selectedMap.tmxPath}
          onClose={() => setPreviewOpen(false)}
          onPickTile={pickTargetStep ? handlePreviewPick : undefined}
        />
      )}
    </div>
  )
}

// ---- 步骤卡片（时间轴样式） ----
function StepCard({ step, index, total, isExpanded, isPicking, onToggle, onUpdateConfig, onRemove, onMove, onStartPick, onStopPick, eventNpcs }: {
  step: EventStep; index: number; total: number
  isExpanded: boolean; isPicking: boolean
  onToggle: () => void; onUpdateConfig: (k: string, v: string) => void
  onRemove: () => void; onMove: (dir: -1 | 1) => void
  onStartPick: () => void; onStopPick: () => void
  eventNpcs: { id: string; name: string; displayName: string }[]
}): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const stInfo = eventStepTypes.find(s => s.type === step.type)!
  const colors = stepTypeColors[step.type]

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
            <input type="text" value={step.label} onChange={e => onUpdateConfig('label', e.target.value)} className="input text-xs" />
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
                <option value="npc">NPC</option>
                <option value="player">玩家</option>
                <option value="camera">镜头</option>
              </select>
            </Field2>
            <div className="grid grid-cols-2 gap-2">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'warp' && <>
            <Field2 label={ts('eventEditor.targetMap')}>
              <input type="text" value={step.config.targetMap ?? ''} onChange={e => onUpdateConfig('targetMap', e.target.value)} className="input text-xs" placeholder="如: Town, Farm" />
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
                {['happy','sad','angry','surprised','blush','neutral','laugh','cry','annoyed','thinking'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field2>
          </div>}

          {step.type === 'bgm' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.track')}>
              <input type="text" value={step.config.track ?? ''} onChange={e => onUpdateConfig('track', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.trackPlaceholder')} />
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
            <Field2 label={ts('eventEditor.choice1')}>
              <input type="text" value={step.config.choice1 ?? ''} onChange={e => onUpdateConfig('choice1', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.choice1Placeholder')} />
            </Field2>
            <Field2 label={ts('eventEditor.choice2')}>
              <input type="text" value={step.config.choice2 ?? ''} onChange={e => onUpdateConfig('choice2', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.choice2Placeholder')} />
            </Field2>
          </>}

          {step.type === 'reward' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.type')}>
              <select value={step.config.type ?? 'friendship'} onChange={e => onUpdateConfig('type', e.target.value)} className="input text-xs">
                {['friendship','item','money','recipe','furniture'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.amount')}>
              <input type="number" value={step.config.amount ?? '0'} onChange={e => onUpdateConfig('amount', e.target.value)} className="input text-xs" />
            </Field2>
          </div>}

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
              <input type="text" value={step.config.itemId ?? ''} onChange={e => onUpdateConfig('itemId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.itemIdPlaceholder')} />
            </Field2>
            <Field2 label={ts('eventEditor.count')}>
              <input type="number" value={step.config.count ?? '1'} onChange={e => onUpdateConfig('count', e.target.value)} className="input text-xs" min={1} />
            </Field2>
          </div>}

          {step.type === 'removeItem' && <div className="grid grid-cols-2 gap-2">
            <Field2 label={ts('eventEditor.itemId')}>
              <input type="text" value={step.config.itemId ?? ''} onChange={e => onUpdateConfig('itemId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.itemIdPlaceholder')} />
            </Field2>
            <Field2 label={ts('eventEditor.count')}>
              <input type="number" value={step.config.count ?? '1'} onChange={e => onUpdateConfig('count', e.target.value)} className="input text-xs" min={1} />
            </Field2>
          </div>}

          {step.type === 'addQuest' && <Field2 label={ts('eventEditor.questId')}>
            <input type="text" value={step.config.questId ?? ''} onChange={e => onUpdateConfig('questId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.questIdPlaceholder')} />
          </Field2>}

          {step.type === 'completeQuest' && <Field2 label={ts('eventEditor.questId')}>
            <input type="text" value={step.config.questId ?? ''} onChange={e => onUpdateConfig('questId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.questIdPlaceholder')} />
          </Field2>}

          {step.type === 'setMail' && <Field2 label={ts('eventEditor.mailId')}>
            <input type="text" value={step.config.mailId ?? ''} onChange={e => onUpdateConfig('mailId', e.target.value)} className="input text-xs" placeholder={ts('eventEditor.mailIdPlaceholder')} />
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
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  return (
    <button onClick={isActive ? onStop : onStart}
      className={`w-full py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
        isActive ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30' : 'themed-bg-card themed-text-muted themed-bg-active'
      }`}>
      {isActive ? ts('eventEditor.cancelPickCoord') : ts('eventEditor.pickFromMap')}
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
