import React from 'react'
import { IconDialogue, IconMove, IconAnimate, IconEffect, IconMusic, IconChoice, IconReward, IconWarp } from '../components/Icons'
import { gameMaps } from './mapData'

// 从真实地图数据生成选单（包含全部60+张游戏地图）
export const mapOptions: { id: string; name: string }[] = gameMaps.map(m => ({
  id: m.name,
  name: `${m.displayName} (${m.name})`,
}))

/**
 * 生成纯数字事件ID（星露谷事件ID必须是数字）
 * 使用 1000001+ 范围避免与原版事件冲突（原版通常 < 1000000）
 * 同毫秒内创建多个事件时通过递增避免冲突
 */
let eventIdCounter = 0
export function generateEventId(existingIds: string[] = []): string {
  const existingNums = new Set(existingIds.map(id => Number(id)).filter(n => !isNaN(n)))
  let base = 1000001 + (Date.now() % 1000000) + eventIdCounter
  eventIdCounter++
  while (existingNums.has(base)) base++
  return String(base)
}

export interface EventStep {
  id: string
  type: 'dialogue' | 'move' | 'animate' | 'effect' | 'bgm' | 'choice' | 'reward' | 'warp' | 'pause' | 'viewport' | 'fade' | 'jump' | 'addMail' | 'friendship' | 'face' | 'sound' | 'ambient' | 'addItem' | 'removeItem' | 'addQuest' | 'completeQuest' | 'setMail' | 'setEventSeen' | 'unlockRecipe' | 'spawn' | 'remove' | 'createObject' | 'destroyObject' | 'text' | 'message' | 'question' | 'shake' | 'showFrame' | 'emote'
  label: string
  icon: React.ReactNode
  config: Record<string, string>
}

export interface GameEvent {
  id: string
  title: string
  npcIds: string[]
  npcNames: string[]
  /** 主NPC：事件的归属者（几心事件属于谁），为空表示不绑定特定NPC */
  mainNpcId?: string
  heartRequired: number
  map: string
  mapDisplayName: string
  timeStart: string
  timeEnd: string
  season: string
  weather: 'sunny' | 'rainy' | 'any'
  description: string
  steps: EventStep[]
  created: string
}

export const eventStepTypes: { type: EventStep['type']; label: string; icon: React.ReactNode; color: string; category: string; desc: string }[] = [
  // 对话与文字
  { type: 'dialogue', label: '对话', icon: React.createElement(IconDialogue), color: '#888', category: 'dialogue', desc: 'NPC说话或旁白文字' },
  { type: 'message', label: '提示文字', icon: React.createElement(IconDialogue), color: '#888', category: 'dialogue', desc: '左下角通知文字' },
  { type: 'text', label: '头顶文字', icon: React.createElement(IconDialogue), color: '#888', category: 'dialogue', desc: '角色头顶气泡文字' },
  { type: 'question', label: '是/否问题', icon: React.createElement(IconChoice), color: '#888', category: 'dialogue', desc: '二选一问答' },
  { type: 'choice', label: '多选项', icon: React.createElement(IconChoice), color: '#888', category: 'dialogue', desc: '多选项分支选择' },
  // 移动与位置
  { type: 'move', label: '移动', icon: React.createElement(IconMove), color: '#888', category: 'move', desc: '角色移动到坐标' },
  { type: 'warp', label: '传送', icon: React.createElement(IconWarp), color: '#888', category: 'move', desc: '传送玩家到坐标' },
  { type: 'face', label: '朝向', icon: React.createElement(IconMove), color: '#888', category: 'move', desc: '改变角色朝向' },
  { type: 'jump', label: '跳跃', icon: React.createElement(IconAnimate), color: '#888', category: 'move', desc: '角色跳跃' },
  { type: 'viewport', label: '视口', icon: React.createElement(IconMove), color: '#888', category: 'move', desc: '移动镜头到坐标' },
  { type: 'spawn', label: '生成NPC', icon: React.createElement(IconWarp), color: '#888', category: 'move', desc: '在地图上生成NPC' },
  { type: 'remove', label: '移除NPC', icon: React.createElement(IconWarp), color: '#888', category: 'move', desc: '从地图移除NPC' },
  // 动画与表情
  { type: 'animate', label: '表情动画', icon: React.createElement(IconAnimate), color: '#888', category: 'animate', desc: 'NPC表情动画' },
  { type: 'emote', label: '表情图标', icon: React.createElement(IconAnimate), color: '#888', category: 'animate', desc: '头顶表情图标' },
  { type: 'showFrame', label: '肖像帧', icon: React.createElement(IconAnimate), color: '#888', category: 'animate', desc: '切换肖像帧' },
  { type: 'shake', label: '屏幕震动', icon: React.createElement(IconEffect), color: '#888', category: 'animate', desc: '屏幕震动效果' },
  // 特效与音乐
  { type: 'effect', label: '淡入淡出', icon: React.createElement(IconEffect), color: '#888', category: 'effect', desc: '画面淡入淡出' },
  { type: 'fade', label: '淡变', icon: React.createElement(IconEffect), color: '#888', category: 'effect', desc: '画面淡变效果' },
  { type: 'bgm', label: '背景音乐', icon: React.createElement(IconMusic), color: '#888', category: 'effect', desc: '播放/停止BGM' },
  { type: 'sound', label: '音效', icon: React.createElement(IconMusic), color: '#888', category: 'effect', desc: '播放音效' },
  { type: 'ambient', label: '环境音', icon: React.createElement(IconMusic), color: '#888', category: 'effect', desc: '播放环境音' },
  { type: 'pause', label: '等待', icon: React.createElement(IconEffect), color: '#888', category: 'effect', desc: '暂停等待毫秒' },
  // 奖励与物品
  { type: 'reward', label: '奖励', icon: React.createElement(IconReward), color: '#888', category: 'reward', desc: '好感/物品/金钱奖励' },
  { type: 'friendship', label: '好感度', icon: React.createElement(IconReward), color: '#888', category: 'reward', desc: '直接调整好感' },
  { type: 'addItem', label: '添加物品', icon: React.createElement(IconReward), color: '#888', category: 'reward', desc: '给玩家添加物品' },
  { type: 'removeItem', label: '移除物品', icon: React.createElement(IconReward), color: '#888', category: 'reward', desc: '从玩家移除物品' },
  { type: 'createObject', label: '创建物体', icon: React.createElement(IconWarp), color: '#888', category: 'reward', desc: '在地图上创建物体' },
  { type: 'destroyObject', label: '销毁物体', icon: React.createElement(IconWarp), color: '#888', category: 'reward', desc: '销毁地图上的物体' },
  { type: 'unlockRecipe', label: '解锁配方', icon: React.createElement(IconReward), color: '#888', category: 'reward', desc: '解锁制作配方' },
  // 任务与邮件
  { type: 'addQuest', label: '添加任务', icon: React.createElement(IconReward), color: '#888', category: 'quest', desc: '添加新任务' },
  { type: 'completeQuest', label: '完成任务', icon: React.createElement(IconReward), color: '#888', category: 'quest', desc: '完成指定任务' },
  { type: 'setMail', label: '发送邮件', icon: React.createElement(IconReward), color: '#888', category: 'quest', desc: '标记邮件为已发送' },
  { type: 'addMail', label: '添加邮件', icon: React.createElement(IconReward), color: '#888', category: 'quest', desc: '添加邮件到信箱' },
  { type: 'setEventSeen', label: '标记事件', icon: React.createElement(IconReward), color: '#888', category: 'quest', desc: '标记事件已观看' },
]

/** 步骤分类信息（用于UI分组显示） */
export const stepCategoryLabels: Record<string, string> = {
  dialogue: '对话与文字',
  move: '移动与位置',
  animate: '动画与表情',
  effect: '特效与音乐',
  reward: '奖励与物品',
  quest: '任务与邮件',
}

/** 步骤分类显示顺序 */
export const stepCategoryOrder: string[] = ['dialogue', 'move', 'animate', 'effect', 'reward', 'quest']

export const sampleEvents: GameEvent[] = [
  {
    id: '1000001',
    title: '阿比盖尔2心事件',
    npcIds: ['abigail'],
    npcNames: ['阿比盖尔'],
    heartRequired: 2,
    map: 'farm', mapDisplayName: '标准农场',
    timeStart: '09:00',
    timeEnd: '17:00',
    season: 'any',
    weather: 'any',
    description: '进入农场触发，阿比盖尔在玩电子游戏。',
    steps: [
      { id: 's1', type: 'dialogue', label: '阿比盖尔的问候', icon: React.createElement(IconDialogue), config: { speaker: 'Abigail', text: '哦！嗨，你吓了我一跳。我正在玩《草原之王之旅》呢……' } },
      { id: 's2', type: 'animate', label: '阿比盖尔惊讶', icon: React.createElement(IconAnimate), config: { target: 'Abigail', emotion: 'surprised' } },
      { id: 's3', type: 'dialogue', label: '玩家回应', icon: React.createElement(IconDialogue), config: { speaker: 'Abigail', text: '你想看我玩吗？我玩得还不错哦。' } },
      { id: 's4', type: 'choice', label: '玩家选择', icon: React.createElement(IconChoice), config: { 
        choice1: '好啊，让我看看！(+50好感)', 
        choice2: '我还有事，下次吧。(+0好感)',
        choice3: '我玩得比你好。(-25好感)'
      }},
      { id: 's5', type: 'dialogue', label: '告别', icon: React.createElement(IconDialogue), config: { speaker: 'Abigail', text: '下次再来找我玩吧！' } }
    ],
    created: '2026-06-14'
  },
  {
    id: '1000002',
    title: '塞巴斯蒂安4心事件',
    npcIds: ['sebastian'],
    npcNames: ['塞巴斯蒂安'],
    heartRequired: 4,
    map: 'farm', mapDisplayName: '标准农场',
    timeStart: '20:00',
    timeEnd: '24:00',
    season: 'any',
    weather: 'any',
    description: '晚上在农场触发，塞巴斯蒂安在看星星。',
    steps: [
      { id: 's1', type: 'bgm', label: '夜晚BGM', icon: React.createElement(IconMusic), config: { track: 'Night_Market', volume: '0.6' } },
      { id: 's2', type: 'dialogue', label: '塞巴斯蒂安的感慨', icon: React.createElement(IconDialogue), config: { speaker: 'Sebastian', text: '……你来了。我只是想一个人待会儿，看看星星。' } },
      { id: 's3', type: 'dialogue', label: '继续对话', icon: React.createElement(IconDialogue), config: { speaker: 'Sebastian', text: '你知道吗……有时候我觉得，在这个镇上只有你懂我。' } },
      { id: 's4', type: 'reward', label: '好感度奖励', icon: React.createElement(IconReward), config: { type: 'friendship', amount: '100' } }
    ],
    created: '2026-06-13'
  },
  {
    id: '1000003',
    title: '山姆乐队练习',
    npcIds: ['sam', 'sebastian'],
    npcNames: ['山姆', '塞巴斯蒂安'],
    heartRequired: 3,
    map: 'farm', mapDisplayName: '标准农场',
    timeStart: '14:00',
    timeEnd: '20:00',
    season: 'summer',
    weather: 'any',
    description: '进入农场触发，山姆和塞巴斯蒂安在排练。',
    steps: [
      { id: 's1', type: 'move', label: '镜头移动到房间', icon: React.createElement(IconMove), config: { target: 'camera', x: '20', y: '15' } },
      { id: 's2', type: 'dialogue', label: '山姆打招呼', icon: React.createElement(IconDialogue), config: { speaker: 'Sam', text: '嘿！你来得正好！我们在排练新曲子呢！' } },
      { id: 's3', type: 'dialogue', label: '塞巴斯蒂安插话', icon: React.createElement(IconDialogue), config: { speaker: 'Sebastian', text: '……山姆，别这么大惊小怪的。' } },
      { id: 's4', type: 'dialogue', label: '山姆解释', icon: React.createElement(IconDialogue), config: { speaker: 'Sam', text: '周末我们有个小演出，你想来看吗？' } },
      { id: 's5', type: 'choice', label: '演出邀请', icon: React.createElement(IconChoice), config: { 
        choice1: '当然！我很期待！',
        choice2: '不了，我不太感兴趣。'
      }},
      { id: 's6', type: 'bgm', label: '音乐停止', icon: React.createElement(IconMusic), config: { track: 'stop', volume: '0' } }
    ],
    created: '2026-06-12'
  }
]

export const seasonOptions = ['any', 'spring', 'summer', 'fall', 'winter']
export const weatherOptions = [
  { value: 'any', label: '不限' },
  { value: 'sunny', label: '晴天' },
  { value: 'rainy', label: '雨天' }
]

export const eventBgmTracks = [
  { value: 'spring', label: '春日' },
  { value: 'springtown', label: '春日城镇' },
  { value: 'summer', label: '夏日' },
  { value: 'fall', label: '秋日' },
  { value: 'winter', label: '冬日' },
  { value: 'clubloop', label: '俱乐部' },
  { value: 'saloon', label: '酒馆' },
  { value: 'beach', label: '海滩' },
  { value: 'beach_night', label: '海滩夜晚' },
  { value: 'mountain_day', label: '山区' },
  { value: 'night_market', label: '夜市' },
  { value: 'moonlight_jellies', label: '月光水母' },
  { value: 'farmhouse_day', label: '农舍日间' },
  { value: 'farmhouse_night', label: '农舍夜间' },
  { value: 'stop', label: '停止音乐' },
]

/**
 * 表情ID映射（星露谷标准 emote ID）
 * 参考: https://stardewvalleywiki.com/Modding:Event_data
 */
export const emotionEmoteMap: Record<string, number> = {
  neutral: 16, surprised: 8, happy: 16, sad: 28,
  angry: 12, shy: 20, love: 20, blush: 20,
  laugh: 18, cry: 28, annoyed: 12, thinking: 8,
}

/** 表情中文标签 */
export const emotionLabels: Record<string, string> = {
  neutral: '中性', surprised: '惊讶', happy: '开心', sad: '悲伤',
  angry: '生气', shy: '害羞', love: '爱心', blush: '脸红',
  laugh: '大笑', cry: '哭泣', annoyed: '烦躁', thinking: '思考',
}

/**
 * 生成星露谷事件脚本（与导出逻辑完全一致）
 * 参考: https://stardewvalleywiki.com/Modding:Event_data
 * 此函数同时被 EventEditor 脚本预览和 exportUtils 导出使用，保证一致性
 */
export function buildEventScript(ev: {
  timeStart?: string
  timeEnd?: string
  heartRequired?: number
  season?: string
  weather?: string
  farmerX?: number
  farmerY?: number
  farmerFacing?: number
  npcIds?: string[]
  npcX?: number
  npcY?: number
  steps?: Array<{ type: string; config: Record<string, string> }>
}): string {
  const parts: string[] = []

  // 1. 时间范围 (格式: HHMM HHMM，如 1000 1600)
  const timeStart = ev.timeStart || '0600'
  const timeEnd = ev.timeEnd || '2400'
  const ts = timeStart.replace(':', '')
  const te = timeEnd.replace(':', '')
  parts.push(`${ts} ${te}`)

  // 2. 好感度条件 (f 好感度数值，1心=250)
  const heartRequired = Number(ev.heartRequired) || 0
  if (heartRequired > 0) {
    parts.push(`f ${heartRequired * 250}`)
  }

  // 3. 季节条件 (s 0=春, s 1=夏, s 2=秋, s 3=冬)
  const season = ev.season || 'any'
  const seasonMap: Record<string, string> = { spring: '0', summer: '1', fall: '2', winter: '3' }
  if (season !== 'any' && seasonMap[season] !== undefined) {
    parts.push(`s ${seasonMap[season]}`)
  }

  // 4. 天气条件 (w = 雨天)
  const weather = ev.weather || 'any'
  if (weather === 'rainy') {
    parts.push('w')
  }

  // 5. 玩家位置 (farmer X Y 朝向)
  const farmerX = ev.farmerX ?? 5
  const farmerY = ev.farmerY ?? 5
  const farmerFacing = ev.farmerFacing ?? 2
  parts.push(`farmer ${farmerX} ${farmerY} ${farmerFacing}`)

  // 6. NPC位置 (NPC名 X Y 朝向)
  const npcIds = ev.npcIds
  if (npcIds && npcIds.length > 0) {
    const npcX = ev.npcX ?? 10
    const npcY = ev.npcY ?? 10
    npcIds.forEach((nid, i) => {
      parts.push(`${nid} ${Number(npcX) + i * 3} ${npcY} 2`)
    })
  }

  // 7. skippable 标记
  parts.push('skippable')

  // 8. 事件步骤转译
  const steps = ev.steps
  if (steps && Array.isArray(steps)) {
    steps.forEach((step) => {
      const type = step.type
      const cfg = step.config || {}

      switch (type) {
        case 'dialogue': {
          const speaker = cfg.speaker || 'null'
          const text = cfg.text || ''
          if (speaker === 'null' || speaker === 'narrator') {
            parts.push(`message "${text}"`)
          } else {
            parts.push(`${speaker} "${text}"`)
          }
          break
        }
        case 'move': {
          // UI 使用 speed 字段（移动速度，默认 2）
          parts.push(`move ${cfg.target || 'farmer'} ${cfg.x || '0'} ${cfg.y || '0'} ${cfg.speed || '2'}`)
          break
        }
        case 'animate': {
          const target = cfg.target || 'farmer'
          const emotion = cfg.emotion || 'neutral'
          const emoteId = emotionEmoteMap[emotion] ?? 16
          parts.push(`emote ${target} ${emoteId}`)
          break
        }
        case 'effect': {
          // UI 使用 effect 字段（fade/flash/shake/screenCover/pan/zoom）
          // 星露谷 fade 命令格式: fade <type> <speed>
          // type: 0=淡出变黑, 1=淡入恢复, 2=闪烁, 3=覆盖
          const effectMap: Record<string, string> = {
            fade: '0', flash: '2', shake: '2', screenCover: '3', pan: '0', zoom: '0'
          }
          const fadeType = effectMap[cfg.effect || 'fade'] ?? '0'
          const speed = cfg.speed || '0.007'
          parts.push(`fade ${fadeType} ${speed}`)
          break
        }
        case 'bgm': {
          parts.push(`music ${cfg.track || 'spring'}`)
          // 音量控制（可选）
          if (cfg.volume && cfg.volume !== '0.6' && cfg.volume !== '1') {
            // 星露谷事件中音量通过 playMusic 没有直接参数，保留 volume 字段供后续扩展
          }
          break
        }
        case 'choice': {
          const question = cfg.question || ''
          // 收集所有选项文本（支持 choice1~choice4）
          const opts = [cfg.choice1, cfg.choice2, cfg.choice3, cfg.choice4].filter(Boolean)
          if (opts.length === 0) break
          const combinedText = `${question}#${opts.join('#')}`
          parts.push(`question null "${combinedText}"`)
          // 每个选项分支：option1/option2/... + 分支内容（好感/对话）
          opts.forEach((opt, i) => {
            parts.push(`option${i + 1}`)
            const friendKey = `choice${i + 1}_friendship`
            const npcKey = `choice${i + 1}_npc`
            const dialogueKey = `choice${i + 1}_dialogue`
            const friendship = cfg[friendKey]
            const targetNpc = cfg[npcKey] || (npcIds && npcIds.length > 0 ? npcIds[0] : '')
            const dialogue = cfg[dialogueKey]
            // 好感变化（需要指定NPC）
            if (friendship && friendship !== '0' && targetNpc) {
              parts.push(`friendship ${targetNpc} ${friendship}`)
            }
            // 回应对话
            if (dialogue) {
              if (targetNpc) {
                parts.push(`${targetNpc} "${dialogue}"`)
              } else {
                parts.push(`message "${dialogue}"`)
              }
            }
          })
          break
        }
        case 'reward': {
          // 好感度奖励需要指定 NPC（UI 使用 target 字段）
          if (cfg.type === 'friendship') {
            const targetNpc = cfg.target || (npcIds && npcIds.length > 0 ? npcIds[0] : '')
            if (targetNpc && cfg.amount) {
              parts.push(`friendship ${targetNpc} ${cfg.amount}`)
            }
          } else if (cfg.type === 'item' && cfg.itemId) {
            parts.push(`addItem ${cfg.itemId} ${cfg.count || '1'}`)
          } else if (cfg.type === 'money' && cfg.amount) {
            parts.push(`addMoney ${cfg.amount}`)
          } else if (cfg.type === 'recipe' && cfg.recipeName) {
            parts.push(`learnRecipe ${cfg.recipeName}`)
          }
          break
        }
        case 'warp': {
          parts.push(`warp farmer ${cfg.x || '0'} ${cfg.y || '0'}`)
          break
        }
        case 'pause': {
          // UI 使用 duration 字段（毫秒）
          parts.push(`pause ${cfg.duration || '1000'}`)
          break
        }
        case 'viewport': {
          parts.push(`viewport ${cfg.x || '0'} ${cfg.y || '0'}`)
          break
        }
        case 'fade': {
          // UI 使用 effect 字段（fade/flash）
          const effectMap: Record<string, string> = { fade: '0', flash: '2' }
          const fadeType = effectMap[cfg.effect || 'fade'] ?? '0'
          const speed = cfg.speed || '0.007'
          parts.push(`fade ${fadeType} ${speed}`)
          break
        }
        case 'jump': {
          parts.push(`jump ${cfg.target || 'farmer'}`)
          break
        }
        case 'addMail':
        case 'setMail': {
          if (cfg.mailId) parts.push(`addMail ${cfg.mailId}`)
          break
        }
        case 'friendship': {
          // UI 使用 target 字段（NPC名）
          const targetNpc = cfg.target || (npcIds && npcIds.length > 0 ? npcIds[0] : '')
          if (targetNpc) parts.push(`friendship ${targetNpc} ${cfg.amount || '0'}`)
          break
        }
        case 'face': {
          parts.push(`face ${cfg.target || 'farmer'} ${cfg.direction || '2'}`)
          break
        }
        case 'sound': {
          if (cfg.soundId) parts.push(`sound ${cfg.soundId}`)
          break
        }
        case 'ambient': {
          if (cfg.ambientId) parts.push(`ambient ${cfg.ambientId}`)
          break
        }
        case 'addItem': {
          if (cfg.itemId) parts.push(`addItem ${cfg.itemId} ${cfg.count || '1'}`)
          break
        }
        case 'removeItem': {
          if (cfg.itemId) parts.push(`removeItem ${cfg.itemId} ${cfg.count || '1'}`)
          break
        }
        case 'addQuest': {
          if (cfg.questId) parts.push(`addQuest ${cfg.questId}`)
          break
        }
        case 'completeQuest': {
          if (cfg.questId) parts.push(`completeQuest ${cfg.questId}`)
          break
        }
        case 'setEventSeen': {
          if (cfg.eventId) parts.push(`stopEvent ${cfg.eventId}`)
          break
        }
        case 'unlockRecipe': {
          if (cfg.recipeName) parts.push(`learnRecipe ${cfg.recipeName}`)
          break
        }
        case 'spawn': {
          parts.push(`addActor ${cfg.target || 'farmer'} ${cfg.x || '0'} ${cfg.y || '0'}`)
          break
        }
        case 'remove': {
          parts.push(`removeActor ${cfg.target || 'farmer'}`)
          break
        }
        case 'createObject': {
          if (cfg.itemId) parts.push(`createObject ${cfg.itemId} ${cfg.x || '0'} ${cfg.y || '0'}`)
          break
        }
        case 'destroyObject': {
          parts.push(`destroyObject ${cfg.x || '0'} ${cfg.y || '0'}`)
          break
        }
        case 'text': {
          parts.push(`textAboveHead farmer "${cfg.text || ''}"`)
          break
        }
        case 'message': {
          parts.push(`message "${cfg.text || ''}"`)
          break
        }
        case 'question': {
          // 是/否问题：生成问题 + option1(是) + option2(否) 分支
          const question = cfg.question || ''
          const yesLabel = cfg.yesLabel || 'Yes'
          const noLabel = cfg.noLabel || 'No'
          parts.push(`question null "${question}#${yesLabel}#${noLabel}"`)
          // 是分支
          parts.push('option1')
          const yesFriend = cfg.yes_friendship
          const yesNpc = cfg.yes_npc || (npcIds && npcIds.length > 0 ? npcIds[0] : '')
          const yesDialogue = cfg.yes_dialogue
          if (yesFriend && yesFriend !== '0' && yesNpc) {
            parts.push(`friendship ${yesNpc} ${yesFriend}`)
          }
          if (yesDialogue) {
            if (yesNpc) {
              parts.push(`${yesNpc} "${yesDialogue}"`)
            } else {
              parts.push(`message "${yesDialogue}"`)
            }
          }
          // 否分支
          parts.push('option2')
          const noFriend = cfg.no_friendship
          const noNpc = cfg.no_npc || (npcIds && npcIds.length > 0 ? npcIds[0] : '')
          const noDialogue = cfg.no_dialogue
          if (noFriend && noFriend !== '0' && noNpc) {
            parts.push(`friendship ${noNpc} ${noFriend}`)
          }
          if (noDialogue) {
            if (noNpc) {
              parts.push(`${noNpc} "${noDialogue}"`)
            } else {
              parts.push(`message "${noDialogue}"`)
            }
          }
          break
        }
        case 'shake': {
          parts.push(`shake ${cfg.intensity || '10'} ${cfg.duration || '500'}`)
          break
        }
        case 'showFrame': {
          parts.push(`showFrame ${cfg.target || 'farmer'} ${cfg.frameIndex || '0'}`)
          break
        }
        case 'emote': {
          parts.push(`emote ${cfg.target || 'farmer'} ${cfg.emoteId || '16'}`)
          break
        }
        default: {
          if (cfg.raw) parts.push(cfg.raw)
        }
      }
    })
  }

  // 9. 结束标记
  parts.push('end')

  return parts.join('/')
}
