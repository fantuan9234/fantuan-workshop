/**
 * StepCard — 事件步骤时间轴卡片
 * 从 EventEditor.tsx 中提取的独立子组件（~560 行）
 */
import { type EventStep, eventStepTypes, eventBgmTracks, emotionLabels } from '../../data/eventData'
import { useMapLibrary, getMapDisplayName, inferMapCategory, mapCategoryLabel } from '../../data/useMapLibrary'
import { useT, asString } from '../../i18n'
import { Field2, CoordField, PickButton, ChevronUp, ChevronDown, Trash } from './EventEditorComponents'

// 步骤类型 → 颜色映射（与 EventEditor 共享同一份数据）
export const stepTypeColors: Record<string, { bg: string; text: string; dot: string }> = {
  dialogue: { bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400' },
  move:     { bg: 'bg-green-500/15', text: 'text-green-300', dot: 'bg-green-400' },
  animate:  { bg: 'bg-yellow-500/15', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  effect:   { bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400' },
  bgm:      { bg: 'bg-pink-500/15', text: 'text-pink-300', dot: 'bg-pink-400' },
  choice:   { bg: 'bg-orange-500/15', text: 'text-orange-300', dot: 'bg-orange-400' },
  reward:   { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  warp:     { bg: 'bg-cyan-500/15', text: 'text-cyan-300', dot: 'bg-cyan-400' },
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
  pause:    { bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400' },
  viewport: { bg: 'bg-green-500/15', text: 'text-green-300', dot: 'bg-green-400' },
  jump:     { bg: 'bg-green-500/15', text: 'text-green-300', dot: 'bg-green-400' },
  fade:     { bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400' },
  friendship: { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  addMail:  { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
}

export default function StepCard({ step, index, total, isExpanded, isPicking, onToggle, onUpdateConfig, onDeleteConfigKeys, onUpdateStepField, onRemove, onMove, onStartPick, onStopPick, eventNpcs, projectItems, projectMails, projectQuests }: {
  step: EventStep; index: number; total: number
  isExpanded: boolean; isPicking: boolean
  onToggle: () => void; onUpdateConfig: (k: string, v: string) => void; onDeleteConfigKeys: (keys: string[]) => void
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
          <span className="text-base">{stInfo.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colors.bg} ${colors.text}`}>{stInfo.label}</span>
            <span className="text-xs themed-text-disabled">#{index + 1}</span>
            {isPicking && <span className="text-[11px] text-green-400 font-medium animate-pulse">{ts('eventEditor.picking')}</span>}
          </div>
          <p className="text-sm themed-text-muted mt-1 truncate">
            {step.type === 'move' ? `移动到 (${step.config.x ?? '?'}, ${step.config.y ?? '?'}) 朝向${['↑','→','↓','←'][Number(step.config.facing ?? 2)]}` :
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
            <input type="text" value={step.label} onChange={e => onUpdateStepField('label', e.target.value)} className="input text-sm" />
          </Field2>

          {step.type === 'dialogue' && <>
            <Field2 label={ts('eventEditor.speaker')}>
              <select value={step.config.speaker ?? ''} onChange={e => onUpdateConfig('speaker', e.target.value)} className="input text-sm">
                <option value="">{ts('eventEditor.selectSpeaker')}</option>
                <option value="null">{ts('eventEditor.narrator')}</option>
                <optgroup label={ts('eventEditor.eventNpc')}>
                  {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName} ({n.name})</option>)}
                </optgroup>
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.dialogueContent')}>
              <textarea value={step.config.text ?? ''} onChange={e => onUpdateConfig('text', e.target.value)} rows={3} className="input resize-none text-sm" placeholder={ts('eventEditor.dialoguePlaceholder')} />
            </Field2>
          </>}

          {step.type === 'move' && <>
            <Field2 label={ts('eventEditor.moveTarget')}>
              <select value={step.config.target ?? 'npc'} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-sm">
                <option value="player">玩家</option>
                <option value="camera">镜头</option>
                {eventNpcs.length > 0 && (
                  <optgroup label="事件NPC">
                    {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName} ({n.name})</option>)}
                  </optgroup>
                )}
              </select>
            </Field2>
            <div className="grid grid-cols-4 gap-3">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
              <div>
                <label className="text-[11px] themed-text-dimmed block mb-0.5">速度</label>
                <input type="number" value={step.config.speed ?? '2'} onChange={e => onUpdateConfig('speed', e.target.value)} className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-sm themed-text-primary focus:outline-none focus:border-[#555]" min={0} step={0.5} />
              </div>
              <div>
                <label className="text-[11px] themed-text-dimmed block mb-0.5">朝向</label>
                <select value={step.config.facing ?? '2'} onChange={e => onUpdateConfig('facing', e.target.value)} className="w-full themed-bg-primary border themed-border-primary rounded px-2 py-1 text-sm themed-text-primary focus:outline-none focus:border-[#555]">
                  <option value="0">{ts('eventEditor.dirUp')}</option>
                  <option value="1">{ts('eventEditor.dirRight')}</option>
                  <option value="2">{ts('eventEditor.dirDown')}</option>
                  <option value="3">{ts('eventEditor.dirLeft')}</option>
                </select>
              </div>
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'warp' && <>
            <Field2 label={ts('eventEditor.targetMap')}>
              <select value={step.config.targetMap ?? ''} onChange={e => onUpdateConfig('targetMap', e.target.value)} className="input text-sm">
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
            <div className="grid grid-cols-2 gap-3">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'animate' && <div className="grid grid-cols-2 gap-3">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-sm">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.expression')}>
              <select value={step.config.emotion ?? 'happy'} onChange={e => onUpdateConfig('emotion', e.target.value)} className="input text-sm">
                {Object.keys(emotionLabels).map(e => <option key={e} value={e}>{emotionLabels[e]} ({e})</option>)}
              </select>
            </Field2>
          </div>}

          {step.type === 'bgm' && <div className="grid grid-cols-2 gap-3">
            <Field2 label={ts('eventEditor.track')}>
              <select value={step.config.track ?? ''} onChange={e => onUpdateConfig('track', e.target.value)} className="input text-sm">
                <option value="">{ts('eventEditor.selectMap')}</option>
                {eventBgmTracks.map(t => <option key={t.value} value={t.value}>{t.label} ({t.value})</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.volume')}>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="1" step="0.1" value={Number(step.config.volume ?? 0.6)} onChange={e => onUpdateConfig('volume', e.target.value)} className="flex-1" />
                <span className="text-xs themed-text-dimmed w-6">{step.config.volume ?? '0.6'}</span>
              </div>
            </Field2>
          </div>}

          {step.type === 'effect' && <Field2 label={ts('eventEditor.effectType')}>
            <select value={step.config.effect ?? 'fade'} onChange={e => onUpdateConfig('effect', e.target.value)} className="input text-sm">
              {['fade','flash','shake','screenCover','pan','zoom'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field2>}

          {step.type === 'choice' && <>
            <Field2 label={ts('eventEditor.speaker')}>
              <select value={step.config.speaker ?? ''} onChange={e => onUpdateConfig('speaker', e.target.value)} className="input text-sm">
                <option value="">{ts('eventEditor.selectSpeaker')}</option>
                <option value="null">{ts('eventEditor.narrator')}</option>
                <optgroup label={ts('eventEditor.eventNpc')}>
                  {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName} ({n.name})</option>)}
                </optgroup>
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.question')}>
              <input type="text" value={step.config.question ?? ''} onChange={e => onUpdateConfig('question', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.questionPlaceholder')} />
            </Field2>
            <div className="themed-bg-card rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] themed-text-dimmed">{ts('eventEditor.choiceBranchHint')}</p>
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
                      className="text-[11px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-colors flex items-center gap-1"
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
                // 只显示已有选项（key 存在则显示，允许空字符串编辑）
                if (!(textKey in step.config)) return null
                return (
                  <div key={i} className="border themed-border-secondary rounded-md p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] themed-text-dimmed w-4">#{i}</span>
                      <input type="text" value={step.config[textKey] ?? ''} onChange={e => onUpdateConfig(textKey, e.target.value)} className="input text-sm flex-1" placeholder={`${ts('eventEditor.choiceText')} ${i}`} />
                      {/* 删除选项按钮（至少保留2个选项） */}
                      {[1, 2, 3, 4].filter(idx => `choice${idx}` in step.config).length > 2 && (
                        <button
                          onClick={() => {
                            // 从 config 中删除该选项的所有字段
                            onDeleteConfigKeys([textKey, friendKey, npcKey, dialogueKey])
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
                        <label className="text-[11px] themed-text-dimmed block mb-0.5">{ts('eventEditor.choiceFriendship')}</label>
                        <input type="number" value={step.config[friendKey] ?? '0'} onChange={e => onUpdateConfig(friendKey, e.target.value)} className="input text-sm" placeholder="如: 50 / -25" />
                      </div>
                      <div>
                        <label className="text-[11px] themed-text-dimmed block mb-0.5">好感目标</label>
                        <select value={step.config[npcKey] ?? ''} onChange={e => onUpdateConfig(npcKey, e.target.value)} className="input text-sm">
                          <option value="">默认(首个NPC)</option>
                          {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] themed-text-dimmed block mb-0.5">{ts('eventEditor.choiceDialogue')}</label>
                        <input type="text" value={step.config[dialogueKey] ?? ''} onChange={e => onUpdateConfig(dialogueKey, e.target.value)} className="input text-sm" placeholder={ts('eventEditor.choiceDialoguePlaceholder')} />
                      </div>
                    </div>
                  </div>
                )
              })}
              <p className="text-[11px] themed-text-disabled">{ts('eventEditor.choiceFriendshipHint')}</p>
            </div>
          </>}

          {step.type === 'reward' && <>
            <Field2 label={ts('eventEditor.type')}>
              <select value={step.config.type ?? 'friendship'} onChange={e => onUpdateConfig('type', e.target.value)} className="input text-sm">
                {['friendship','item','money','recipe'].map(t => <option key={t} value={t}>{t === 'friendship' ? '好感度' : t === 'item' ? '物品' : t === 'money' ? '金钱' : '配方'}</option>)}
              </select>
            </Field2>
            {step.config.type === 'friendship' && <>
              <div className="grid grid-cols-2 gap-3">
                <Field2 label="好感目标NPC">
                  <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-sm">
                    <option value="">默认(首个NPC)</option>
                    {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
                  </select>
                </Field2>
                <Field2 label={ts('eventEditor.amount')}>
                  <input type="number" value={step.config.amount ?? '0'} onChange={e => onUpdateConfig('amount', e.target.value)} className="input text-sm" placeholder="如: 50 / -25" />
                </Field2>
              </div>
            </>}
            {step.config.type === 'item' && <>
              <div className="grid grid-cols-2 gap-3">
                <Field2 label={ts('eventEditor.itemId')}>
                  <input type="text" list="project-items-list" value={step.config.itemId ?? ''} onChange={e => onUpdateConfig('itemId', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.itemIdPlaceholder')} />
                  <datalist id="project-items-list">
                    {projectItems.map(it => <option key={it.id} value={it.id}>{it.displayName ?? it.name ?? it.id}</option>)}
                  </datalist>
                </Field2>
                <Field2 label={ts('eventEditor.count')}>
                  <input type="number" value={step.config.count ?? '1'} onChange={e => onUpdateConfig('count', e.target.value)} className="input text-sm" min={1} />
                </Field2>
              </div>
            </>}
            {step.config.type === 'money' && <Field2 label="金钱数量">
              <input type="number" value={step.config.amount ?? '0'} onChange={e => onUpdateConfig('amount', e.target.value)} className="input text-sm" placeholder="如: 500" />
            </Field2>}
            {step.config.type === 'recipe' && <Field2 label={ts('eventEditor.recipeName')}>
              <input type="text" value={step.config.recipeName ?? ''} onChange={e => onUpdateConfig('recipeName', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.recipeNamePlaceholder')} />
            </Field2>}
          </>}

          {step.type === 'face' && <div className="grid grid-cols-2 gap-3">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-sm">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.direction')}>
              <select value={step.config.direction ?? '2'} onChange={e => onUpdateConfig('direction', e.target.value)} className="input text-sm">
                <option value="0">{ts('eventEditor.dirUp')}</option>
                <option value="1">{ts('eventEditor.dirRight')}</option>
                <option value="2">{ts('eventEditor.dirDown')}</option>
                <option value="3">{ts('eventEditor.dirLeft')}</option>
              </select>
            </Field2>
          </div>}

          {step.type === 'sound' && <Field2 label={ts('eventEditor.soundId')}>
            <input type="text" value={step.config.soundId ?? ''} onChange={e => onUpdateConfig('soundId', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.soundIdPlaceholder')} />
          </Field2>}

          {step.type === 'ambient' && <Field2 label={ts('eventEditor.ambientId')}>
            <input type="text" value={step.config.ambientId ?? ''} onChange={e => onUpdateConfig('ambientId', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.ambientIdPlaceholder')} />
          </Field2>}

          {step.type === 'addItem' && <div className="grid grid-cols-2 gap-3">
            <Field2 label={ts('eventEditor.itemId')}>
              <input type="text" list="project-items-list" value={step.config.itemId ?? ''} onChange={e => onUpdateConfig('itemId', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.itemIdPlaceholder')} />
              <datalist id="project-items-list">
                {projectItems.map(it => <option key={it.id} value={it.id}>{it.displayName ?? it.name ?? it.id}</option>)}
              </datalist>
            </Field2>
            <Field2 label={ts('eventEditor.count')}>
              <input type="number" value={step.config.count ?? '1'} onChange={e => onUpdateConfig('count', e.target.value)} className="input text-sm" min={1} />
            </Field2>
          </div>}

          {step.type === 'removeItem' && <div className="grid grid-cols-2 gap-3">
            <Field2 label={ts('eventEditor.itemId')}>
              <input type="text" list="project-items-list" value={step.config.itemId ?? ''} onChange={e => onUpdateConfig('itemId', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.itemIdPlaceholder')} />
              <datalist id="project-items-list">
                {projectItems.map(it => <option key={it.id} value={it.id}>{it.displayName ?? it.name ?? it.id}</option>)}
              </datalist>
            </Field2>
            <Field2 label={ts('eventEditor.count')}>
              <input type="number" value={step.config.count ?? '1'} onChange={e => onUpdateConfig('count', e.target.value)} className="input text-sm" min={1} />
            </Field2>
          </div>}

          {step.type === 'addQuest' && <Field2 label={ts('eventEditor.questId')}>
            <input type="text" list="project-quests-list" value={step.config.questId ?? ''} onChange={e => onUpdateConfig('questId', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.questIdPlaceholder')} />
            <datalist id="project-quests-list">
              {projectQuests.map(q => <option key={q.id} value={q.id}>{q.title ?? q.name ?? q.id}</option>)}
            </datalist>
          </Field2>}

          {step.type === 'completeQuest' && <Field2 label={ts('eventEditor.questId')}>
            <input type="text" list="project-quests-list" value={step.config.questId ?? ''} onChange={e => onUpdateConfig('questId', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.questIdPlaceholder')} />
            <datalist id="project-quests-list">
              {projectQuests.map(q => <option key={q.id} value={q.id}>{q.title ?? q.name ?? q.id}</option>)}
            </datalist>
          </Field2>}

          {step.type === 'setMail' && <Field2 label={ts('eventEditor.mailId')}>
            <input type="text" list="project-mails-list" value={step.config.mailId ?? ''} onChange={e => onUpdateConfig('mailId', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.mailIdPlaceholder')} />
            <datalist id="project-mails-list">
              {projectMails.map(m => <option key={m.id} value={m.id}>{m.title ?? m.name ?? m.id}</option>)}
            </datalist>
          </Field2>}

          {step.type === 'setEventSeen' && <Field2 label={ts('eventEditor.eventId')}>
            <input type="text" value={step.config.eventId ?? ''} onChange={e => onUpdateConfig('eventId', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.eventIdPlaceholder')} />
          </Field2>}

          {step.type === 'unlockRecipe' && <Field2 label={ts('eventEditor.recipeName')}>
            <input type="text" value={step.config.recipeName ?? ''} onChange={e => onUpdateConfig('recipeName', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.recipeNamePlaceholder')} />
          </Field2>}

          {step.type === 'spawn' && <>
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-sm">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <div className="grid grid-cols-2 gap-3">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'remove' && <Field2 label={ts('eventEditor.character')}>
            <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-sm">
              <option value="">{ts('eventEditor.selectCharacter')}</option>
              {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
            </select>
          </Field2>}

          {step.type === 'createObject' && <>
            <Field2 label={ts('eventEditor.itemId')}>
              <input type="text" value={step.config.itemId ?? ''} onChange={e => onUpdateConfig('itemId', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.itemIdPlaceholder')} />
            </Field2>
            <div className="grid grid-cols-2 gap-3">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'destroyObject' && <>
            <div className="grid grid-cols-2 gap-3">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'text' && <Field2 label={ts('eventEditor.fullscreenText')}>
            <textarea value={step.config.text ?? ''} onChange={e => onUpdateConfig('text', e.target.value)} rows={3} className="input resize-none text-sm" placeholder={ts('eventEditor.fullscreenTextPlaceholder')} />
          </Field2>}

          {step.type === 'message' && <Field2 label={ts('eventEditor.notificationText')}>
            <input type="text" value={step.config.text ?? ''} onChange={e => onUpdateConfig('text', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.notificationTextPlaceholder')} />
          </Field2>}

          {step.type === 'question' && <>
            <Field2 label={ts('eventEditor.speaker')}>
              <select value={step.config.speaker ?? ''} onChange={e => onUpdateConfig('speaker', e.target.value)} className="input text-sm">
                <option value="">{ts('eventEditor.selectSpeaker')}</option>
                <option value="null">{ts('eventEditor.narrator')}</option>
                <optgroup label={ts('eventEditor.eventNpc')}>
                  {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName} ({n.name})</option>)}
                </optgroup>
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.question')}>
              <input type="text" value={step.config.question ?? ''} onChange={e => onUpdateConfig('question', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.questionPlaceholder')} />
            </Field2>
            <div className="grid grid-cols-2 gap-3">
              <Field2 label={ts('eventEditor.yesLabel')}>
                <input type="text" value={step.config.yesLabel ?? ''} onChange={e => onUpdateConfig('yesLabel', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.yesLabelPlaceholder')} />
              </Field2>
              <Field2 label={ts('eventEditor.noLabel')}>
                <input type="text" value={step.config.noLabel ?? ''} onChange={e => onUpdateConfig('noLabel', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.noLabelPlaceholder')} />
              </Field2>
            </div>
            {/* 是/否分支后果配置 */}
            <div className="themed-bg-card rounded-lg p-2.5 space-y-2">
              <p className="text-[11px] themed-text-dimmed">选择后的后果（好感度变化、对话回应）</p>
              {/* 是分支 */}
              <div className="border themed-border-secondary rounded-md p-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 font-medium">是</span>
                  <span className="text-[11px] themed-text-dimmed">选择"是"后的后果</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 ml-1">
                  <div>
                    <label className="text-[11px] themed-text-dimmed block mb-0.5">好感度变化</label>
                    <input type="number" value={step.config.yes_friendship ?? '0'} onChange={e => onUpdateConfig('yes_friendship', e.target.value)} className="input text-sm" placeholder="如: 50 / -25" />
                  </div>
                  <div>
                    <label className="text-[11px] themed-text-dimmed block mb-0.5">好感目标</label>
                    <select value={step.config.yes_npc ?? ''} onChange={e => onUpdateConfig('yes_npc', e.target.value)} className="input text-sm">
                      <option value="">默认(首个NPC)</option>
                      {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] themed-text-dimmed block mb-0.5">对话回应</label>
                    <input type="text" value={step.config.yes_dialogue ?? ''} onChange={e => onUpdateConfig('yes_dialogue', e.target.value)} className="input text-sm" placeholder="NPC的回应台词" />
                  </div>
                </div>
              </div>
              {/* 否分支 */}
              <div className="border themed-border-secondary rounded-md p-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">否</span>
                  <span className="text-[11px] themed-text-dimmed">选择"否"后的后果</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 ml-1">
                  <div>
                    <label className="text-[11px] themed-text-dimmed block mb-0.5">好感度变化</label>
                    <input type="number" value={step.config.no_friendship ?? '0'} onChange={e => onUpdateConfig('no_friendship', e.target.value)} className="input text-sm" placeholder="如: -25 / 0" />
                  </div>
                  <div>
                    <label className="text-[11px] themed-text-dimmed block mb-0.5">好感目标</label>
                    <select value={step.config.no_npc ?? ''} onChange={e => onUpdateConfig('no_npc', e.target.value)} className="input text-sm">
                      <option value="">默认(首个NPC)</option>
                      {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] themed-text-dimmed block mb-0.5">对话回应</label>
                    <input type="text" value={step.config.no_dialogue ?? ''} onChange={e => onUpdateConfig('no_dialogue', e.target.value)} className="input text-sm" placeholder="NPC的回应台词" />
                  </div>
                </div>
              </div>
              <p className="text-[11px] themed-text-disabled">好感度：正数增加，负数减少（如 50 表示 +50 好感，-25 表示 -25 好感）</p>
            </div>
          </>}

          {step.type === 'shake' && <div className="grid grid-cols-2 gap-3">
            <Field2 label={ts('eventEditor.intensity')}>
              <input type="number" value={step.config.intensity ?? '10'} onChange={e => onUpdateConfig('intensity', e.target.value)} className="input text-sm" min={0} />
            </Field2>
            <Field2 label={ts('eventEditor.duration')}>
              <input type="number" value={step.config.duration ?? '500'} onChange={e => onUpdateConfig('duration', e.target.value)} className="input text-sm" min={0} />
            </Field2>
          </div>}

          {step.type === 'showFrame' && <div className="grid grid-cols-2 gap-3">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-sm">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.frameIndex')}>
              <input type="number" value={step.config.frameIndex ?? '0'} onChange={e => onUpdateConfig('frameIndex', e.target.value)} className="input text-sm" min={0} />
            </Field2>
          </div>}

          {step.type === 'emote' && <div className="grid grid-cols-2 gap-3">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-sm">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.emoteId')}>
              <input type="number" value={step.config.emoteId ?? '16'} onChange={e => onUpdateConfig('emoteId', e.target.value)} className="input text-sm" min={0} />
            </Field2>
          </div>}

          {step.type === 'jump' && <div className="grid grid-cols-2 gap-3">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-sm">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
          </div>}

          {step.type === 'viewport' && <>
            <div className="grid grid-cols-2 gap-3">
              <CoordField label={ts('eventEditor.coordX')} value={step.config.x ?? '0'} onChange={v => onUpdateConfig('x', v)} />
              <CoordField label={ts('eventEditor.coordY')} value={step.config.y ?? '0'} onChange={v => onUpdateConfig('y', v)} />
            </div>
            <PickButton isActive={isPicking} onStart={onStartPick} onStop={onStopPick} />
          </>}

          {step.type === 'fade' && <Field2 label={ts('eventEditor.effectType')}>
            <select value={step.config.effect ?? 'fade'} onChange={e => onUpdateConfig('effect', e.target.value)} className="input text-sm">
              {['fade','flash'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field2>}

          {step.type === 'pause' && <Field2 label={ts('eventEditor.duration')}>
            <input type="number" value={step.config.duration ?? '1000'} onChange={e => onUpdateConfig('duration', e.target.value)} className="input text-sm" min={0} placeholder="毫秒" />
          </Field2>}

          {step.type === 'friendship' && <div className="grid grid-cols-2 gap-3">
            <Field2 label={ts('eventEditor.character')}>
              <select value={step.config.target ?? ''} onChange={e => onUpdateConfig('target', e.target.value)} className="input text-sm">
                <option value="">{ts('eventEditor.selectCharacter')}</option>
                {eventNpcs.map(n => <option key={n.id} value={n.name}>{n.displayName}</option>)}
              </select>
            </Field2>
            <Field2 label={ts('eventEditor.amount')}>
              <input type="number" value={step.config.amount ?? '50'} onChange={e => onUpdateConfig('amount', e.target.value)} className="input text-sm" placeholder="好感度变化" />
            </Field2>
          </div>}

          {step.type === 'addMail' && <Field2 label={ts('eventEditor.mailId')}>
            <input type="text" list="project-mails-list" value={step.config.mailId ?? ''} onChange={e => onUpdateConfig('mailId', e.target.value)} className="input text-sm" placeholder={ts('eventEditor.mailIdPlaceholder')} />
            <datalist id="project-mails-list">
              {projectMails.map(m => <option key={m.id} value={m.id}>{m.title ?? m.name ?? m.id}</option>)}
            </datalist>
          </Field2>}
        </div>
      )}
    </div>
  )
}
