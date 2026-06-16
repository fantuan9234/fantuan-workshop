import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { referenceQuests, questTypeLabels, questTypeSvgIcons, objectiveTypeLabels, createEmptyQuest, type QuestInfo, type QuestType, type QuestObjective, type ObjectiveType } from '../../data/questData'
import { defaultNPCs } from '../../data/npcData'
import { useProject } from '../../data/ProjectContext'
import EditorHeader from '../../components/EditorHeader'
import { useUnsavedChangesGuard } from '../../components/useUnsavedChangesGuard'

export default function QuestEditor(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { mutateSnapshot } = useProject()

  // ★ 从路由 state 获取数据，不使用 registerSnapshot
  const stateData = location.state as { newQuest?: QuestInfo; allQuests?: QuestInfo[] }
  const initialQuests = stateData?.allQuests ?? []

  // 查找当前编辑的任务
  const refQuest = useMemo(() => {
    return [...referenceQuests, ...initialQuests].find(q => q.id === id)
  }, [id, initialQuests])

  const isNew = id === 'new'
  const init = isNew ? createEmptyQuest() : refQuest

  if (!init) {
    return <div className="p-8 flex flex-col items-center justify-center h-full text-gray-500">
      <p className="text-sm">任务未找到</p>
      <button onClick={() => navigate(-1)} className="mt-3 text-sm text-gray-400 hover:underline">返回</button>
    </div>
  }

  return <EditorInner init={init} isNew={isNew} navigate={navigate} mutateSnapshot={mutateSnapshot}
    refId={refQuest?.id} initialQuests={initialQuests} id={id} />
}

function EditorInner({ init, isNew, navigate, mutateSnapshot, refId, initialQuests, id }: {
  init: QuestInfo; isNew: boolean; navigate: ReturnType<typeof useNavigate>
  mutateSnapshot: <T>(key: string, updater: (prev: T) => T) => void
  refId?: string; initialQuests: QuestInfo[]; id?: string
}): JSX.Element {
  const [displayName, setDisplayName] = useState(init.displayName)
  const [name, setName] = useState(init.name)
  const [type, setType] = useState<QuestType>(init.type)
  const [description, setDescription] = useState(init.description)
  const [triggerNpcId, setTriggerNpcId] = useState(init.triggerNpcId)
  const [heartRequired, setHeartRequired] = useState(init.heartRequired)
  const [season, setSeason] = useState(init.season)
  const [days, setDays] = useState(init.days)
  const [objectives, setObjectives] = useState<QuestObjective[]>(init.objectives)
  const [goldReward, setGoldReward] = useState(init.rewards.gold)
  const [friendshipReward, setFriendshipReward] = useState(init.rewards.friendship)
  const [rewardItems, setRewardItems] = useState(init.rewards.items)
  const [introText, setIntroText] = useState(init.introText)
  const [completeText, setCompleteText] = useState(init.completeText)
  const [savedToast, setSavedToast] = useState(false)
  const [dirty, setDirty] = useState(false)
  useUnsavedChangesGuard(dirty)

  const addObjective = () => {
    setObjectives([...objectives, { id: 'o' + Date.now(), type: 'collect', label: '新目标', targetId: '', targetName: '', count: 1 }])
    setDirty(true)
  }
  const addRewardItem = () => {
    setRewardItems([...rewardItems, { itemId: '', itemName: '', count: 1 }])
    setDirty(true)
  }

  const triggerNpc = defaultNPCs.find(n => n.id === triggerNpcId)
  const triggerNpcName = triggerNpc?.displayName ?? ''

  const handleSave = () => {
    if (!displayName.trim() || !name.trim()) return
    const savedId = isNew ? 'quest_' + Date.now() : (refId ?? 'quest_' + Date.now())
    const questToSave: QuestInfo = {
      id: savedId,
      name, displayName, type, description,
      triggerNpcId, triggerNpcName,
      heartRequired, season, days,
      objectives, introText, completeText,
      rewards: { gold: goldReward, friendship: friendshipReward, items: rewardItems },
    }
    mutateSnapshot<QuestInfo[]>('quests', prev => {
      const idx = prev.findIndex(q => q.id === savedId)
      return idx >= 0 ? prev.map(q => q.id === savedId ? questToSave : q) : [...prev, questToSave]
    })
    if (isNew) {
      navigate(`/quests/${savedId}`, { replace: true, state: { allQuests: [...initialQuests.filter(q => q.id !== id), questToSave] } })
    }
    setSavedToast(true)
    setDirty(false)
    setTimeout(() => setSavedToast(false), 1500)
  }

  const typeColorMap: Record<QuestType, string> = {
    story: 'bg-blue-500/20 text-blue-300',
    help: 'bg-amber-500/20 text-amber-300',
    specialOrder: 'bg-purple-500/20 text-purple-300',
    collection: 'bg-emerald-500/20 text-emerald-300',
    custom: 'bg-pink-500/20 text-pink-300',
  }

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-y-auto" onChange={() => setDirty(true)}>
      {/* 顶栏 */}
      <EditorHeader
        title={displayName || '任务编辑器'}
        icon={
          <div className="flex items-center gap-2">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${typeColorMap[type]}`}>{questTypeLabels[type]}</span>
          </div>
        }
      />
      <div className="flex items-center justify-end mb-4 flex-shrink-0">
        {savedToast && <span className="text-[11px] text-emerald-400 animate-pulse mr-3">已保存</span>}
        <button onClick={handleSave} className="text-sm bg-white text-black font-semibold px-5 py-2 rounded-xl hover:bg-gray-200 transition-colors">
          保存任务
        </button>
      </div>

      {/* 双栏布局 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* 左栏：基本属性 */}
        <div className="space-y-5 overflow-y-auto pr-2">
          <Section title="基本信息">
            <Field label="任务名称"><input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="如：神秘访客" className="input" /></Field>
            <Field label="英文ID"><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="如：MysteriousVisitor" className="input" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="任务类型">
                <select value={type} onChange={e => setType(e.target.value as QuestType)} className="input">
                  {Object.entries(questTypeLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </Field>
              <Field label="触发NPC">
                <select value={triggerNpcId} onChange={e => setTriggerNpcId(e.target.value)} className="input">
                  <option value="">无触发NPC</option>
                  {defaultNPCs.map(n => <option key={n.id} value={n.id}>{n.displayName}</option>)}
                </select>
              </Field>
            </div>
            <Field label="描述">
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="任务简介..." className="input resize-none" />
            </Field>
          </Section>

          <Section title="触发条件">
            <div className="grid grid-cols-3 gap-3">
              <Field label="季节">
                <select value={season} onChange={e => setSeason(e.target.value)} className="input">
                  <option value="all">全部</option>
                  <option value="spring">春天</option>
                  <option value="summer">夏天</option>
                  <option value="fall">秋天</option>
                  <option value="winter">冬天</option>
                </select>
              </Field>
              <Field label="好感要求">
                <input type="number" value={heartRequired} onChange={e => setHeartRequired(Number(e.target.value) || 0)} min={0} max={14} className="input" />
              </Field>
              <Field label="天数限制">
                <input type="number" value={days} onChange={e => setDays(Number(e.target.value) || 0)} min={0} className="input" />
              </Field>
            </div>
          </Section>

          <Section title="对话文本">
            <Field label="介绍对话">
              <textarea value={introText} onChange={e => setIntroText(e.target.value)} rows={3} placeholder="NPC触发任务时说的话..." className="input resize-none" />
            </Field>
            <Field label="完成对话">
              <textarea value={completeText} onChange={e => setCompleteText(e.target.value)} rows={3} placeholder="任务完成时NPC说的话..." className="input resize-none" />
            </Field>
          </Section>
        </div>

        {/* 右栏：目标 & 奖励 */}
        <div className="space-y-5 overflow-y-auto pr-2">
          <Section title={`目标 (${objectives.length})`}>
            <div className="space-y-3">
              {objectives.map((obj, idx) => (
                <div key={obj.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-medium">目标 {idx + 1}</span>
                    <button onClick={() => { setObjectives(objectives.filter(o => o.id !== obj.id)); setDirty(true) }} className="text-gray-500 hover:text-red-400 text-[10px] transition-colors">删除</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-gray-500 block mb-0.5">类型</label>
                      <select value={obj.type} onChange={e => {
                        setObjectives(objectives.map(o => o.id === obj.id ? { ...o, type: e.target.value as ObjectiveType } : o))
                      }} className="input text-xs">
                        {Object.entries(objectiveTypeLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-500 block mb-0.5">数量(≥0)</label>
                      <input type="number" value={obj.count} onChange={e => {
                        setObjectives(objectives.map(o => o.id === obj.id ? { ...o, count: Number(e.target.value) || 0 } : o))
                      }} min={0} className="input text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 block mb-0.5">目标描述</label>
                    <input type="text" value={obj.label} onChange={e => {
                      setObjectives(objectives.map(o => o.id === obj.id ? { ...o, label: e.target.value } : o))
                    }} placeholder="如：找到遗失的日记" className="input text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-gray-500 block mb-0.5">目标物品ID</label>
                      <input type="text" value={obj.targetId} onChange={e => {
                        setObjectives(objectives.map(o => o.id === obj.id ? { ...o, targetId: e.target.value } : o))
                      }} placeholder="可选" className="input text-xs" />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-500 block mb-0.5">物品名称</label>
                      <input type="text" value={obj.targetName} onChange={e => {
                        setObjectives(objectives.map(o => o.id === obj.id ? { ...o, targetName: e.target.value } : o))
                      }} placeholder="可选" className="input text-xs" />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addObjective}
                className="w-full py-2.5 border-2 border-dashed border-[#444] hover:border-[#666] rounded-xl text-xs text-gray-500 hover:text-gray-300 transition-colors font-medium">
                + 添加目标
              </button>
            </div>
          </Section>

          <Section title="奖励">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <F label="金币"><input type="number" value={goldReward} onChange={e => setGoldReward(Number(e.target.value) || 0)} min={0} className="input" /></F>
                <F label="好感度"><input type="number" value={friendshipReward} onChange={e => setFriendshipReward(Number(e.target.value) || 0)} min={0} className="input" /></F>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-medium">奖励物品 ({rewardItems.length})</span>
                  <button onClick={addRewardItem} className="text-[10px] text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#2a2a2a]">+ 添加</button>
                </div>
                {rewardItems.map((ri, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg p-2 border border-[#2a2a2a]">
                    <input type="text" value={ri.itemId} onChange={e => {
                      const cp = [...rewardItems]; cp[idx] = { ...cp[idx], itemId: e.target.value }
                      setRewardItems(cp)
                    }} placeholder="物品ID" className="flex-1 bg-[#111] border-0 rounded px-2 py-1 text-xs text-white outline-none" />
                    <input type="number" value={ri.count} onChange={e => {
                      const cp = [...rewardItems]; cp[idx] = { ...cp[idx], count: Number(e.target.value) || 0 }
                      setRewardItems(cp)
                    }} min={1} className="w-16 bg-[#111] border-0 rounded px-2 py-1 text-xs text-white outline-none" />
                    <button onClick={() => { setRewardItems(rewardItems.filter((_, i) => i !== idx)); setDirty(true) }} className="text-gray-500 hover:text-red-400 text-[10px] p-1">x</button>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* 预览卡片 */}
          <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#333]">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">{questTypeSvgIcons[type]}</span>
              <div>
                <h4 className="text-sm text-white font-semibold">{displayName || '未命名'}</h4>
                <p className="text-[10px] text-gray-500">{questTypeLabels[type]} · {triggerNpcName || '无触发NPC'}</p>
              </div>
            </div>
            {objectives.map((obj, idx) => (
              <div key={obj.id} className="flex items-center gap-2 text-[11px] text-gray-400 py-1">
                <span className="text-gray-600">[{idx + 1}]</span>
                <span>{obj.label || '未设置'}</span>
                <span className="text-gray-600 ml-auto">x{obj.count}</span>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex items-center gap-4 text-[10px]">
              {goldReward > 0 && <span className="text-amber-400">{goldReward}g</span>}
              {friendshipReward > 0 && <span className="text-pink-300">+{friendshipReward} <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></span>}
              {rewardItems.length > 0 && <span className="text-gray-500">+{rewardItems.length} 物品</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 border-b border-[#2a2a2a] pb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return <div><label className="text-[10px] text-gray-500 block mb-1">{label}</label>{children}</div>
}

function F({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return <div><label className="text-[10px] text-gray-500 block mb-1">{label}</label>{children}</div>
}