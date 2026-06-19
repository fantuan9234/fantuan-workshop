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

/** 单个NPC在事件触发时的初始位置 */
export interface NPCInitialPosition {
  npcId: string
  x: number
  y: number
  facing: number // 0=上, 1=右, 2=下, 3=左
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
  /** 玩家初始位置与朝向（可选，默认 farmerX=5 farmerY=5 farmerFacing=2） */
  farmerX?: number
  farmerY?: number
  farmerFacing?: number
  /** 每个NPC独立的初始位置（若为空，导出时用旧逻辑 npcX+npcY+偏移） */
  npcPositions?: NPCInitialPosition[]
  /** 兼容旧版：共享的NPC起始位置（仅当 npcPositions 为空时使用） */
  npcX?: number
  npcY?: number
  /** 镜头模式：follow=跟随玩家, followTile=跟随指定坐标 */
  cameraMode?: 'follow' | 'followTile'
  /** 镜头跟随坐标X（仅 cameraMode='followTile' 时使用） */
  cameraX?: number
  /** 镜头跟随坐标Y（仅 cameraMode='followTile' 时使用） */
  cameraY?: number
  /** 初始音乐ID，默认 'none'（不切换音乐） */
  initialMusic?: string
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
  { type: 'createObject', label: '创建物体', icon: React.createElement(IconWarp), color: '#888', category: 'move', desc: '在地图上创建物体' },
  { type: 'destroyObject', label: '销毁物体', icon: React.createElement(IconWarp), color: '#888', category: 'move', desc: '销毁地图上的物体' },
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
  { value: 'none', label: '不切换（使用地图BGM）' },
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
 * Wiki 编号: 8=感叹号, 12=问号, 16=心, 20=不高兴, 24=音符, 28=睡觉Z, 
 * 32=微笑, 36=省略号, 40=愤怒, 44=x__x, 48=害羞脸红, 52=水滴, 56=骷髅头
 */
export const emotionEmoteMap: Record<string, number> = {
  neutral: 32,     // 微笑
  surprised: 8,    // 感叹号
  happy: 32,       // 微笑
  sad: 28,         // 睡觉Z（可用作悲伤）
  angry: 40,       // 愤怒
  shy: 48,         // 害羞脸红
  love: 16,        // 心
  blush: 48,       // 害羞脸红
  laugh: 32,       // 微笑（也可用16心）
  cry: 28,         // 睡觉Z（表示低落）
  annoyed: 40,     // 愤怒/烦躁
  thinking: 12,    // 问号/思考
  drop: 52,        // 水滴/汗
  skull: 56,       // 骷髅/晕
}

/** 表情中文标签 */
export const emotionLabels: Record<string, string> = {
  neutral: '微笑', surprised: '惊讶', happy: '开心', sad: '悲伤',
  angry: '生气', shy: '害羞', love: '爱心', blush: '脸红',
  laugh: '大笑', cry: '哭泣', annoyed: '烦躁', thinking: '思考',
  drop: '汗颜', skull: '骷髅',
}

/**
 * 生成星露谷事件脚本（与导出逻辑完全一致）
 * 参考: https://stardewvalleywiki.com/Modding:Event_data
 * 此函数同时被 EventEditor 脚本预览和 exportUtils 导出使用，保证一致性
 */
/**
 * NPC ID 到游戏内名称的映射（用于生成事件脚本时使用正确的大小写）
 * key = npcData 中的 id（小写），value = 游戏内实际名称（首字母大写）
 */
export const NPC_NAME_MAP: Record<string, string> = {
  abigail: 'Abigail', alex: 'Alex', elliott: 'Elliott', haley: 'Haley',
  harvey: 'Harvey', leah: 'Leah', maru: 'Maru', penny: 'Penny',
  sam: 'Sam', sebastian: 'Sebastian', shane: 'Shane', emily: 'Emily',
  caroline: 'Caroline', pierre: 'Pierre', lewis: 'Lewis', marnie: 'Marnie',
  robin: 'Robin', linus: 'Linus', pam: 'Pam', jodi: 'Jodi', kent: 'Kent',
  vincent: 'Vincent', jas: 'Jas', gus: 'Gus', clint: 'Clint',
  demetrius: 'Demetrius', george: 'George', evelyn: 'Evelyn', willy: 'Willy',
  wizard: 'Wizard', dwarf: 'Dwarf', sandy: 'Sandy', krobus: 'Krobus',
  leo: 'ParrotBoy', gunther: 'Gunther', marlon: 'Marlon', morris: 'Morris',
  gil: 'Gil', mrqi: 'MrQi', professorsnail: 'ProfessorSnail', birdie: 'Birdie',
  governor: 'Governor', grandpa: 'Grandpa', henchman: 'Henchman',
  bouncer: 'Bouncer', bear: 'Bear', trashbear: 'TrashBear', raccoon: 'Raccoon',
  junimo: 'Junimo', crow: 'Crow', fizz: 'Fizz', safariguy: 'SafariGuy',
  gourmand: 'Gourmand', islandparrot: 'IslandParrot', marcello: 'Marcello',
  oldmariner: 'OldMariner',
}

/**
 * 将NPC ID转为游戏内正确名称
 */
export function resolveNpcName(id: string, extraMap?: Record<string, string>): string {
  return extraMap?.[id] || NPC_NAME_MAP[id] || id
}

export function buildEventScript(ev: {
  timeStart?: string
  timeEnd?: string
  heartRequired?: number
  /** 好感度对应的主NPC ID（如 "abigail"），f 条件需要 NPC 名 */
  mainNpcId?: string
  season?: string
  weather?: string
  farmerX?: number
  farmerY?: number
  farmerFacing?: number
  npcIds?: string[]
  /** 新版：每个NPC独立位置 */
  npcPositions?: Array<{ npcId: string; x: number; y: number; facing: number }>
  /** 旧版兼容：共享NPC起始坐标 */
  npcX?: number
  npcY?: number
  steps?: Array<{ type: string; config: Record<string, string> }>
  /** 自定义NPC的名字映射（key=id, value=游戏内名称） */
  npcNameMap?: Record<string, string>
  /** 镜头模式：follow=跟随玩家, followTile=跟随指定坐标 */
  cameraMode?: 'follow' | 'followTile'
  /** 镜头跟随坐标X（仅 cameraMode='followTile' 时使用） */
  cameraX?: number
  /** 镜头跟随坐标Y（仅 cameraMode='followTile' 时使用） */
  cameraY?: number
  /** 初始音乐ID，默认 'none'（不切换音乐） */
  initialMusic?: string
}): string {
  const parts: string[] = []

  // 1. 时间范围 (格式: t HMM HMM，如 t 600 1600，去掉前导零避免游戏解析问题)
  const timeStart = ev.timeStart || '0600'
  const timeEnd = ev.timeEnd || '2400'
  const ts = String(Number(timeStart.replace(':', '')))
  const te = String(Number(timeEnd.replace(':', '')))
  parts.push(`t ${ts} ${te}`)

  // 2. 好感度条件 (f NPC名 好感度数值，1心=250)
  //    Wiki 格式: f Kosek 500（必须指定NPC名字）
  const heartRequired = Number(ev.heartRequired) || 0
  if (heartRequired > 0) {
    const npcIds = ev.npcIds
    const npcNameMap = ev.npcNameMap
    const nameOf = (nid: string) => resolveNpcName(nid, npcNameMap)
    // 使用主NPC，如果未设置则使用第一个参与的NPC
    const mainNpcId = ev.mainNpcId
    if (mainNpcId && npcIds?.includes(mainNpcId)) {
      parts.push(`f ${nameOf(mainNpcId)} ${heartRequired * 250}`)
    } else if (npcIds && npcIds.length > 0) {
      parts.push(`f ${nameOf(npcIds[0])} ${heartRequired * 250}`)
    }
  }

  // 3. 季节条件 — Wiki 格式: z 季节（禁止的季节），需要禁止其他三个季节
  //    例如 spring 事件 → /z summer/z fall/z winter/
  const season = ev.season || 'any'
  if (season !== 'any') {
    const allSeasons = ['spring', 'summer', 'fall', 'winter']
    allSeasons.forEach(s => {
      if (s !== season) {
        parts.push(`z ${s}`)
      }
    })
  }

  // 4. 天气条件 (w 天气值)
  //    Wiki 格式: w sunny / w rainy / w snowy / w wind
  const weather = ev.weather || 'any'
  if (weather === 'sunny') {
    parts.push('w sunny')
  } else if (weather === 'rainy') {
    parts.push('w rainy')
  }

  // 5. BGM + 镜头坐标 + 角色站位（脚本区，条件区到此结束）
  //    标准 SDV 事件格式：条件/bgm/镜头/站位/命令/end
  //    必须包含 bgm 和镜头，否则 farmer 会被误解析为条件
  
  // BGM（默认可选，用户可设置初始音乐ID）
  const initialMusic = ev.initialMusic || 'none'
  parts.push(initialMusic)

  // 镜头起始坐标（-1000 -1000 = 跟随玩家）
  const cameraMode = ev.cameraMode ?? 'follow'
  if (cameraMode === 'followTile' && ev.cameraX !== undefined && ev.cameraY !== undefined) {
    parts.push(`${ev.cameraX} ${ev.cameraY}`)
  } else {
    parts.push('-1000 -1000')
  }

  // 玩家站位 — 此时已在脚本区，不会被误解析为触发条件
  if (ev.farmerX !== undefined && ev.farmerX !== null && !isNaN(ev.farmerX)) {
    parts.push(`farmer ${ev.farmerX} ${ev.farmerY ?? 5} ${ev.farmerFacing ?? 2}`)
  }

  // 注：SDV 1.6 的 event 格式中，镜头控制也可通过 viewport 命令在事件步骤中控制。

  // NPC位置（优先使用新版 npcPositions，其次兼容旧版 npcX/npcY）
  const npcIds = ev.npcIds
  const npcNameMap = ev.npcNameMap
  const nameOf = (nid: string) => resolveNpcName(nid, npcNameMap)
  if (npcIds && npcIds.length > 0) {
    const npcPositions = ev.npcPositions
    if (npcPositions && npcPositions.length > 0) {
      // 新版：每个NPC独立的坐标和朝向
      npcPositions.forEach(pos => {
        const nid = pos.npcId
        if (npcIds.includes(nid)) {
          parts.push(`${nameOf(nid)} ${pos.x} ${pos.y} ${pos.facing ?? 2}`)
        }
      })
      // 补充在 npcIds 中但没有在 npcPositions 中的NPC（使用第一个NPC的位置偏移）
      const positionedIds = new Set(npcPositions.map(p => p.npcId))
      const firstPos = npcPositions[0]
      let offset = 1
      npcIds.forEach(nid => {
        if (!positionedIds.has(nid)) {
          parts.push(`${nameOf(nid)} ${Number(firstPos.x) + offset * 3} ${firstPos.y} 2`)
          offset++
        }
      })
    } else {
      // 旧版兼容：所有NPC从 npcX/npcY 起横向每隔3格排列
      const npcX = ev.npcX ?? 10
      const npcY = ev.npcY ?? 10
      npcIds.forEach((nid, i) => {
        parts.push(`${nameOf(nid)} ${Number(npcX) + i * 3} ${npcY} 2`)
      })
    }
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
            // Wiki 格式: NPC名 "对话内容" 或 speak NPC "对话内容"
            parts.push(`${speaker} "${text}"`)
          }
          break
        }
        case 'move': {
          // Wiki 格式: move NPC X Y 朝向（无速度参数）
          const facing = cfg.facing || cfg.direction || '2'
          parts.push(`move ${cfg.target || 'farmer'} ${cfg.x || '0'} ${cfg.y || '0'} ${facing}`)
          break
        }
        case 'animate': {
          // animate → emote 命令（Wiki: emote NPC 表情编号）
          const target = cfg.target || 'farmer'
          const emotion = cfg.emotion || 'neutral'
          const emoteId = emotionEmoteMap[emotion] ?? 16
          parts.push(`emote ${target} ${emoteId}`)
          break
        }
        case 'effect': {
          // Wiki fade 格式: fade (无参数时为全屏黑)
          const effect = cfg.effect || 'fade'
          if (effect === 'flash') {
            parts.push('fade 2 0.007')  // 闪烁
          } else {
            parts.push('fade 0 0.007')  // 淡出变黑
          }
          break
        }
        case 'bgm': {
          // Wiki 格式: playMusic 音乐名
          const track = cfg.track || 'spring'
          if (track === 'stop') {
            parts.push('stopMusic')
          } else {
            parts.push(`playMusic ${track}`)
          }
          break
        }
        case 'choice': {
          // Wiki 格式: 使用对话中的 #$q / #$r 标记实现选择分支
          // 事件中通过 speak 命令包含问答标记
          const question = cfg.question || ''
          const opts = [cfg.choice1, cfg.choice2, cfg.choice3, cfg.choice4].filter(Boolean)
          if (opts.length === 0) break
          // 使用 speak（第一个NPC发言提问）+ 后续对话中的 #$r 标记无法在事件中直接实现
          // 简化为: 让第一个NPC提问，用 message 显示选项，然后每个选项用 friendship 调整好感
          const fallbackNpc = npcIds && npcIds.length > 0 ? nameOf(npcIds[0]) : ''
          if (question && fallbackNpc) {
            parts.push(`${fallbackNpc} "${question}"`)
          } else {
            parts.push(`message "${question || opts[0]}"`)
          }
          // 简单实现：对每个选项发出对话和好感变化（通过多个 pause/message/friendship）
          opts.forEach((opt, i) => {
            parts.push(`message "${opt}"`)
            const friendKey = `choice${i + 1}_friendship`
            const npcKey = `choice${i + 1}_npc`
            const dialogueKey = `choice${i + 1}_dialogue`
            const friendship = cfg[friendKey]
            const targetNpc = cfg[npcKey] || fallbackNpc
            const dialogue = cfg[dialogueKey]
            if (friendship && friendship !== '0' && targetNpc) {
              parts.push(`friendship ${targetNpc} ${friendship}`)
            }
            if (dialogue) {
              if (targetNpc) {
                parts.push(`${targetNpc} "${dialogue}"`)
              } else {
                parts.push(`message "${dialogue}"`)
              }
            }
            if (i < opts.length - 1) {
              parts.push('pause 500')
            }
          })
          break
        }
        case 'reward': {
          // 好感度奖励需要指定 NPC（UI 使用 target 字段）
          if (cfg.type === 'friendship') {
            const fallbackNpc = npcIds && npcIds.length > 0 ? nameOf(npcIds[0]) : ''
            const targetNpc = cfg.target || fallbackNpc
            if (targetNpc && cfg.amount) {
              parts.push(`friendship ${targetNpc} ${cfg.amount}`)
            }
          } else if (cfg.type === 'item' && cfg.itemId) {
            // Wiki: addObject X Y 物品ID — 放置物体到玩家面前供拾取
            parts.push(`addObject 物品ID待定 0 0`)
            parts.push(`message "获得了物品！"`)
          } else if (cfg.type === 'money' && cfg.amount) {
            // 事件中没有直接的加钱命令，通过 message 提示
            parts.push(`message "获得 ${cfg.amount} 金币"`)
          } else if (cfg.type === 'recipe' && cfg.recipeName) {
            // Wiki: addCookingRecipe 配方ID 或 addCraftingRecipe 配方ID
            parts.push(`addCookingRecipe ${cfg.recipeName}`)
          }
          break
        }
        case 'warp': {
          // Wiki: warp 角色 X Y
          parts.push(`warp farmer ${cfg.x || '0'} ${cfg.y || '0'}`)
          break
        }
        case 'pause': {
          parts.push(`pause ${cfg.duration || '1000'}`)
          break
        }
        case 'viewport': {
          parts.push(`viewport ${cfg.x || '0'} ${cfg.y || '0'}`)
          break
        }
        case 'fade': {
          // Wiki: fade（无参数=黑屏）
          parts.push('fade')
          break
        }
        case 'addMail': {
          // Wiki: addMailReceived 信件ID
          if (cfg.mailId) parts.push(`addMailReceived ${cfg.mailId}`)
          break
        }
        case 'friendship': {
          const fallbackNpc = npcIds && npcIds.length > 0 ? nameOf(npcIds[0]) : ''
          const targetNpc = cfg.target || fallbackNpc
          if (targetNpc) parts.push(`friendship ${targetNpc} ${cfg.amount || '0'}`)
          break
        }
        case 'face': {
          // Wiki: faceDirection NPC 朝向
          parts.push(`faceDirection ${cfg.target || 'farmer'} ${cfg.direction || '2'}`)
          break
        }
        case 'sound': {
          // Wiki: playSound 音效名
          if (cfg.soundId) parts.push(`playSound ${cfg.soundId}`)
          break
        }
        case 'ambient': {
          // Wiki: ambientLight R G B（需要RGB值）
          const r = cfg.r || '255'
          const g = cfg.g || '255'
          const b = cfg.b || '255'
          parts.push(`ambientLight ${r} ${g} ${b}`)
          break
        }
        case 'addItem': {
          // Wiki: addObject X Y 物品ID — 在地面生成物品
          if (cfg.itemId) parts.push(`addObject ${cfg.x || '0'} ${cfg.y || '0'} ${cfg.itemId}`)
          break
        }
        case 'addQuest': {
          if (cfg.questId) parts.push(`addQuest ${cfg.questId}`)
          break
        }
        case 'unlockRecipe': {
          if (cfg.recipeName) parts.push(`addCraftingRecipe ${cfg.recipeName}`)
          break
        }
        case 'message': {
          parts.push(`message "${cfg.text || ''}"`)
          break
        }
        case 'shake': {
          // Wiki: shake NPC 毫秒 — 需要NPC参数
          parts.push(`shake ${cfg.target || (npcIds && npcIds.length > 0 ? nameOf(npcIds[0]) : 'farmer')} ${cfg.duration || '500'}`)
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
        // 以下类型在SDV事件中没有直接等价命令，跳过或转为基础命令
        case 'jump':
        case 'removeItem':
        case 'completeQuest':
        case 'setEventSeen':
        case 'setMail':
        case 'spawn':
        case 'remove':
        case 'createObject':
        case 'destroyObject':
        case 'text':
        case 'question': {
          // 尝试通过 message 提示，或静默跳过
          // 这些类型在 UI 中仍然可用，但导出时生成注释或跳过
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

/** 获取地图推荐入口坐标（供事件编辑器自动填充触发位置） */
export function getMapEntryPoint(mapName: string): { x: number; y: number; facing: number } | null {
  const map = gameMaps.find(m => m.name === mapName)
  if (map && map.entryX !== undefined && map.entryY !== undefined) {
    return { x: map.entryX, y: map.entryY, facing: map.entryFacing ?? 0 }
  }
  return null
}

/** 心数事件模板 — 快速填充好感度、地图等 */
export const HEART_EVENT_PRESETS: Array<{ hearts: number; title: string; desc: string; defaultMap: string }> = [
  { hearts: 2, title: '2心初识', desc: '第一次深入交流', defaultMap: 'Town' },
  { hearts: 4, title: '4心分支', desc: '重要人生选择', defaultMap: 'Forest' },
  { hearts: 6, title: '6心亲密', desc: '关系更进一步', defaultMap: 'Beach' },
  { hearts: 8, title: '8心告白前奏', desc: '情感升温', defaultMap: 'Mountain' },
  { hearts: 10, title: '10心告白', desc: '确定恋爱关系', defaultMap: 'Forest' },
  { hearts: 14, title: '14心婚后', desc: '婚后特别事件', defaultMap: 'Farm' },
]
