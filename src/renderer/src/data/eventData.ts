import React from 'react'
import { IconDialogue, IconMove, IconAnimate, IconEffect, IconMusic, IconChoice, IconReward, IconWarp } from '../components/Icons'
import { gameMaps } from './mapData'

// 从真实地图数据生成选单（包含全部60+张游戏地图）
export const mapOptions: { id: string; name: string }[] = gameMaps.map(m => ({
  id: m.name,
  name: `${m.displayName} (${m.name})`,
}))

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

export const eventStepTypes: { type: EventStep['type']; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'dialogue', label: '对话', icon: React.createElement(IconDialogue), color: '#888' },
  { type: 'move', label: '移动', icon: React.createElement(IconMove), color: '#888' },
  { type: 'animate', label: '动画', icon: React.createElement(IconAnimate), color: '#888' },
  { type: 'effect', label: '特效', icon: React.createElement(IconEffect), color: '#888' },
  { type: 'bgm', label: '音乐', icon: React.createElement(IconMusic), color: '#888' },
  { type: 'choice', label: '选项', icon: React.createElement(IconChoice), color: '#888' },
  { type: 'reward', label: '奖励', icon: React.createElement(IconReward), color: '#888' },
  { type: 'warp', label: '传送', icon: React.createElement(IconWarp), color: '#888' },
  { type: 'pause', label: '等待', icon: React.createElement(IconEffect), color: '#888' },
  { type: 'viewport', label: '视口', icon: React.createElement(IconMove), color: '#888' },
  { type: 'fade', label: '淡入淡出', icon: React.createElement(IconEffect), color: '#888' },
  { type: 'jump', label: '跳跃', icon: React.createElement(IconAnimate), color: '#888' },
  { type: 'addMail', label: '信件', icon: React.createElement(IconReward), color: '#888' },
  { type: 'friendship', label: '好感', icon: React.createElement(IconReward), color: '#888' },
  // 新增步骤类型
  { type: 'face', label: '朝向', icon: React.createElement(IconMove), color: '#888' },
  { type: 'sound', label: '音效', icon: React.createElement(IconMusic), color: '#888' },
  { type: 'ambient', label: '环境音', icon: React.createElement(IconMusic), color: '#888' },
  { type: 'addItem', label: '添加物品', icon: React.createElement(IconReward), color: '#888' },
  { type: 'removeItem', label: '移除物品', icon: React.createElement(IconReward), color: '#888' },
  { type: 'addQuest', label: '添加任务', icon: React.createElement(IconReward), color: '#888' },
  { type: 'completeQuest', label: '完成任务', icon: React.createElement(IconReward), color: '#888' },
  { type: 'setMail', label: '标记邮件', icon: React.createElement(IconReward), color: '#888' },
  { type: 'setEventSeen', label: '标记事件', icon: React.createElement(IconReward), color: '#888' },
  { type: 'unlockRecipe', label: '解锁配方', icon: React.createElement(IconReward), color: '#888' },
  { type: 'spawn', label: '生成NPC', icon: React.createElement(IconWarp), color: '#888' },
  { type: 'remove', label: '移除NPC', icon: React.createElement(IconWarp), color: '#888' },
  { type: 'createObject', label: '创建物体', icon: React.createElement(IconWarp), color: '#888' },
  { type: 'destroyObject', label: '销毁物体', icon: React.createElement(IconWarp), color: '#888' },
  { type: 'text', label: '全屏文字', icon: React.createElement(IconDialogue), color: '#888' },
  { type: 'message', label: '提示文字', icon: React.createElement(IconDialogue), color: '#888' },
  { type: 'question', label: '是/否问题', icon: React.createElement(IconChoice), color: '#888' },
  { type: 'shake', label: '屏幕震动', icon: React.createElement(IconEffect), color: '#888' },
  { type: 'showFrame', label: '肖像帧', icon: React.createElement(IconAnimate), color: '#888' },
  { type: 'emote', label: '表情', icon: React.createElement(IconAnimate), color: '#888' },
]

export const sampleEvents: GameEvent[] = [
  {
    id: 'evt_001',
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
    id: 'evt_002',
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
    id: 'evt_003',
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
