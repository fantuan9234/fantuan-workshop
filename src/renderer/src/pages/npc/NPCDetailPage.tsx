import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react'
import { defaultNPCs, type NPCInfo, type ScheduleEntry, GIFT_CATEGORY_IDS, DIALOGUE_VARIABLE_TOKENS, DIALOGUE_EMOTION_CODES, HEART_EVENT_PRESETS, MARRIAGE_DIALOGUE_KEYS } from '../../data/npcData'
import { useCustomNpcs } from '../../data/useCustomNpcs'
import { useProject, type VanillaNpcOverride } from '../../data/ProjectContext'
import { useLocale } from '../../i18n'
import { useNpcAssets } from '../../data/useNpcAssets'
import { getNpcSpriteUrls } from '../../data/spriteData'
import { IconHome, IconBriefcase, IconLeaf, IconTip, IconMapPin, IconAlert } from '../../components/Icons'

// 中文名→英文名映射（用于人际关系选择器等）
const NPC_NAME_MAP: Record<string, string> = {}
defaultNPCs.forEach(n => { NPC_NAME_MAP[n.displayName] = n.name })
const NPC_EN_TO_CN: Record<string, string> = {}
defaultNPCs.forEach(n => { NPC_EN_TO_CN[n.name] = n.displayName })

// 称呼选项
const RELATION_TITLES = ['爸爸', '妈妈', '哥哥', '姐姐', '弟弟', '妹妹', '儿子', '女儿', '丈夫', '妻子', '祖父', '祖母', '孙子', '孙女', '叔叔', '阿姨', '侄子', '侄女', '继父', '继母', '同母异父兄弟', '同母异父姐妹', '朋友', '其他']
// gameItems.ts no longer used — items loaded from game via xnbListItems

// Dialogue context help text
// 键名必须与游戏内部格式一致，否则对话不会生效
const DIALOGUE_CONTEXT_HELP: Record<string, string> = {
  'Introduction': '初次见面时的对话（自定义NPC必须填写）',
  'Mon': '周一随机对话',
  'Tue': '周二随机对话',
  'Wed': '周三随机对话',
  'Thu': '周四随机对话',
  'Fri': '周五随机对话',
  'Sat': '周六随机对话',
  'Sun': '周日随机对话',
  'rain': '雨天对话（覆盖当天的日常对话）',
  'AcceptGift_Loved': '收到最爱礼物时的回应',
  'AcceptGift_Liked': '收到喜欢礼物时的回应',
  'AcceptGift_Neutral': '收到一般礼物时的回应',
  'AcceptGift_Disliked': '收到不喜欢的礼物时的回应',
  'AcceptGift_Hated': '收到讨厌的礼物时的回应',
}

// Dialogue template examples
const DIALOGUE_EXAMPLES: Record<string, string[]> = {
  'Introduction': [
    '你好！我是{name}，很高兴认识你！',
    '欢迎来到鹈鹕镇！我是{name}，希望能和你成为朋友。',
    '哦，新面孔！我叫{name}，需要帮忙吗？',
  ],
  'Mon': [
    '新的一周开始了，{player}！今天有什么计划？',
    '周一总是充满活力，不是吗？',
    '早上好！今天天气真不错。',
  ],
  'rain': [
    '下雨天最适合待在家里了，你觉得呢？',
    '听着雨声，感觉好平静……',
    '这种天气适合喝杯热茶。',
  ],
  'AcceptGift_Loved': [
    '哇！这是我最喜欢的！谢谢你，{player}！',
    '天哪，你怎么知道我喜欢这个？太贴心了！',
    '太棒了！我真的很喜欢！',
  ],
  'AcceptGift_Liked': [
    '谢谢你的礼物！我很喜欢。',
    '这个不错，谢谢你想着我。',
    '收到礼物总是让我很开心。谢谢！',
  ],
  'AcceptGift_Neutral': [
    '谢谢你的礼物。',
    '嗯……谢谢吧。',
    '谢了。',
  ],
  'AcceptGift_Disliked': [
    '呃……这个不太适合我……',
    '谢谢？但这真的不是我的菜……',
    '抱歉，我对这个不太感兴趣。',
  ],
  'AcceptGift_Hated': [
    '这是什么？我不喜欢这种东西。',
    '请别再给我这个了，我讨厌它。',
    '这让我很不舒服。请停下。',
  ],
  // 好感度对话
  'Mon2': ['嘿，{player}！最近怎么样？', '又见面了！'],
  'Mon4': ['每次见到你都很开心！', '你来了！我正想着你呢。'],
  'Mon6': ['{player}，能和你聊天总是让我心情变好。', '你是我最好的朋友。'],
  'Mon8': ['我真的很珍惜我们的友谊，{player}。', '有你在身边，每一天都很特别。'],
  'Mon10': ['{player}，你对我来说比任何人都重要。', '我无法想象没有你的日子。'],
  // 季节对话
  'spring': ['春天来了，一切都充满希望！', '春天的空气真好闻。'],
  'summer': ['夏天真热，不过我喜欢。', '夏天的夜晚最美了。'],
  'fall': ['秋天的落叶真美。', '收获的季节到了！'],
  'winter': ['冬天虽然冷，但很安静。', '下雪了！好漂亮。'],
  // 婚姻对话
  'marriage_Mon': ['早安，亲爱的！新的一周开始了。', '和你在一起的每一天都很幸福。'],
  'marriage_rain': ['下雨天待在家里真好，有你在身边。', '听着雨声，感觉好安心。'],
  'SpouseGiftJealous': ['……你给{0}送了礼物？我有点在意。'],
  // 节日对话
  'flowerDance': ['花舞节真热闹！要一起跳舞吗？', '这些花真漂亮。'],
  'luau': ['夏威夷宴会！你带了什么来？', '这汤闻起来不错。'],
  'stardewFair': ['展览会上有好多有趣的东西！', '你的展品一定很棒。'],
  // 特殊对话
  'breakUp': ['……我明白了。', '为什么……'],
  'divorced': ['……', '我们没什么好说的了。'],
  'DumpsterDiveComment': ['呃……你在翻垃圾桶？', '你确定你没事吗？'],
  'RejectBouquet': ['抱歉，我还没准备好……', '谢谢你的心意，但是……'],
  'RejectMermaidPendant': ['我还没准备好结婚……', '这太突然了……'],
  'MovieInvitation': ['看电影？好呀！', '听起来很有趣！'],
}



// Dialogue key definitions
const DIALOGUE_KEYS = [
  { key: 'Introduction', label: '介绍' },
  { key: 'Mon', label: '周一' },
  { key: 'Tue', label: '周二' },
  { key: 'Wed', label: '周三' },
  { key: 'Thu', label: '周四' },
  { key: 'Fri', label: '周五' },
  { key: 'Sat', label: '周六' },
  { key: 'Sun', label: '周日' },
  { key: 'rain', label: '雨天' },
  { key: 'AcceptGift_Loved', label: '最爱' },
  { key: 'AcceptGift_Liked', label: '喜欢' },
  { key: 'AcceptGift_Neutral', label: '一般' },
  { key: 'AcceptGift_Disliked', label: '不喜欢' },
  { key: 'AcceptGift_Hated', label: '讨厌' },
]

// 对话格式帮助（用于对话编辑器顶部的帮助提示）
const DIALOGUE_FORMAT_HELP = [
  { syntax: '/', desc: '分隔多句对话，游戏随机选一句', example: '你好！/今天天气不错！' },
  { syntax: '{0}, {1}', desc: '参数替换（NPC名/玩家名/物品名）', example: '谢谢{0}送我的礼物！' },
  { syntax: '$q <id>/<问题>', desc: '向玩家提问', example: '$q 1000/你喜欢吃鱼吗？' },
  { syntax: '$r <id> <心>/<回答>', desc: '玩家选择后的回应', example: '$r 1000 10/我也很喜欢！' },
  { syntax: '%adj', desc: '随机形容词', example: '这真是%adj的一天！' },
  { syntax: '%noun', desc: '随机名词', example: '我想养一只%noun。' },
  { syntax: '%name', desc: '随机NPC名字', example: '我听说%name最近……' },
  { syntax: '$h $l $u $k', desc: '切换肖像表情（开心/伤心/独特/亲吻）', example: '$h太好了！' },
  { syntax: 'break', desc: '换行', example: '第一行break第二行' },
]

// 自定义NPC对话键分组定义
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_LABELS: Record<string, string> = { Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四', Fri: '周五', Sat: '周六', Sun: '周日' }
const SEASONS = ['spring', 'summer', 'fall', 'winter']
const SEASON_LABELS: Record<string, string> = { spring: '春季', summer: '夏季', fall: '秋季', winter: '冬季' }
const HEART_LEVELS = [2, 4, 6, 8, 10]

// 自定义NPC对话键分组（用于扩展编辑器）
const CUSTOM_NPC_DIALOGUE_GROUPS = {
  intro: [
    { key: 'Introduction', label: '介绍' },
  ],
  daily: {
    default: [
      { key: 'Mon', label: '周一' },
      { key: 'Tue', label: '周二' },
      { key: 'Wed', label: '周三' },
      { key: 'Thu', label: '周四' },
      { key: 'Fri', label: '周五' },
      { key: 'Sat', label: '周六' },
      { key: 'Sun', label: '周日' },
      { key: 'rain', label: '雨天' },
    ],
    spring: [
      { key: 'spring', label: '春季默认' },
      { key: 'spring_Mon', label: '春季周一' },
      { key: 'spring_Tue', label: '春季周二' },
      { key: 'spring_Wed', label: '春季周三' },
      { key: 'spring_Thu', label: '春季周四' },
      { key: 'spring_Fri', label: '春季周五' },
      { key: 'spring_Sat', label: '春季周六' },
      { key: 'spring_Sun', label: '春季周日' },
      { key: 'spring_rain', label: '春季雨天' },
    ],
    summer: [
      { key: 'summer', label: '夏季默认' },
      { key: 'summer_Mon', label: '夏季周一' },
      { key: 'summer_Tue', label: '夏季周二' },
      { key: 'summer_Wed', label: '夏季周三' },
      { key: 'summer_Thu', label: '夏季周四' },
      { key: 'summer_Fri', label: '夏季周五' },
      { key: 'summer_Sat', label: '夏季周六' },
      { key: 'summer_Sun', label: '夏季周日' },
      { key: 'summer_rain', label: '夏季雨天' },
    ],
    fall: [
      { key: 'fall', label: '秋季默认' },
      { key: 'fall_Mon', label: '秋季周一' },
      { key: 'fall_Tue', label: '秋季周二' },
      { key: 'fall_Wed', label: '秋季周三' },
      { key: 'fall_Thu', label: '秋季周四' },
      { key: 'fall_Fri', label: '秋季周五' },
      { key: 'fall_Sat', label: '秋季周六' },
      { key: 'fall_Sun', label: '秋季周日' },
      { key: 'fall_rain', label: '秋季雨天' },
    ],
    winter: [
      { key: 'winter', label: '冬季默认' },
      { key: 'winter_Mon', label: '冬季周一' },
      { key: 'winter_Tue', label: '冬季周二' },
      { key: 'winter_Wed', label: '冬季周三' },
      { key: 'winter_Thu', label: '冬季周四' },
      { key: 'winter_Fri', label: '冬季周五' },
      { key: 'winter_Sat', label: '冬季周六' },
      { key: 'winter_Sun', label: '冬季周日' },
      { key: 'winter_rain', label: '冬季雨天' },
    ],
  },
  hearts: DAYS.flatMap(day =>
    HEART_LEVELS.map(hearts => ({
      key: `${day}${hearts}`,
      label: `${DAY_LABELS[day]}(${hearts}心)`,
    }))
  ),
  gift: [
    { key: 'AcceptGift_Loved', label: '最爱' },
    { key: 'AcceptGift_Liked', label: '喜欢' },
    { key: 'AcceptGift_Neutral', label: '一般' },
    { key: 'AcceptGift_Disliked', label: '不喜欢' },
    { key: 'AcceptGift_Hated', label: '讨厌' },
    { key: 'AcceptBirthdayGift_Loved', label: '生日最爱' },
    { key: 'AcceptBirthdayGift_Liked', label: '生日喜欢' },
    { key: 'AcceptBirthdayGift_Neutral', label: '生日一般' },
    { key: 'AcceptBirthdayGift_Disliked', label: '生日不喜欢' },
    { key: 'AcceptBirthdayGift_Hated', label: '生日讨厌' },
  ],
  marriage: [
    ...DAYS.map(day => ({ key: `marriage_${day}`, label: `婚后${DAY_LABELS[day]}` })),
    { key: 'marriage_rain', label: '婚后雨天' },
    { key: 'marriage_cold', label: '婚后寒冷' },
    { key: 'marriage_good', label: '婚后好天气' },
    { key: 'marriage_kids', label: '婚后有孩子' },
    { key: 'SpouseGiftJealous', label: '配偶嫉妒' },
    { key: 'SpouseFarmhouseClutter', label: '农舍受阻' },
    { key: 'Spouse_MonstersInHouse', label: '屋内有怪' },
    { key: 'spouse_stardrop', label: '配偶星之果实' },
  ],
  festival: [
    { key: 'flowerDance', label: '花舞节' },
    { key: 'FlowerDance_Decline', label: '花舞节拒绝' },
    { key: 'luau', label: '夏威夷宴会' },
    { key: 'stardewFair', label: '展览会' },
    { key: 'festivalOfIce', label: '冰雪节' },
    { key: 'nightMarket', label: '夜市' },
    { key: 'spiritEve', label: '万灵节' },
    { key: 'feastOfTheWinterStar', label: '冬日星盛宴' },
    { key: 'eggFestival', label: '复活节' },
    { key: 'jellies', label: '月光水母舞会' },
  ],
  special: [
    { key: 'breakUp', label: '分手' },
    { key: 'divorced', label: '离婚后' },
    { key: 'DumpsterDiveComment', label: '翻垃圾桶' },
    { key: 'HitBySlingshot', label: '被弹弓射' },
    { key: 'green_rain', label: '绿雨' },
    { key: 'green_rain2', label: '绿雨(2年后)' },
    { key: 'WipedMemory', label: '记忆擦除' },
    { key: 'RejectBouquet', label: '拒绝花束' },
    { key: 'RejectMermaidPendant', label: '拒绝吊坠' },
    { key: 'RejectGift_Divorced', label: '离婚拒礼' },
    { key: 'MovieInvitation', label: '电影邀请' },
    { key: 'Resort', label: '姜岛度假' },
    { key: 'Resort_Entering', label: '姜岛进入' },
    { key: 'Resort_Leaving', label: '姜岛离开' },
  ],
}

const FACING_LABELS = ['下', '上', '左', '右']

// 对话键中文标签映射（用于动态展示游戏原版对话文件中的非标准键）
const DIALOGUE_KEY_LABELS: Record<string, string> = {
  // 季节对话
  'spring': '春季', 'summer': '夏季', 'fall': '秋季', 'winter': '冬季',
  // 季节+星期组合
  'spring_Mon': '春季周一', 'spring_Tue': '春季周二', 'spring_Wed': '春季周三',
  'spring_Thu': '春季周四', 'spring_Fri': '春季周五', 'spring_Sat': '春季周六', 'spring_Sun': '春季周日',
  'summer_Mon': '夏季周一', 'summer_Tue': '夏季周二', 'summer_Wed': '夏季周三',
  'summer_Thu': '夏季周四', 'summer_Fri': '夏季周五', 'summer_Sat': '夏季周六', 'summer_Sun': '夏季周日',
  'fall_Mon': '秋季周一', 'fall_Tue': '秋季周二', 'fall_Wed': '秋季周三',
  'fall_Thu': '秋季周四', 'fall_Fri': '秋季周五', 'fall_Sat': '秋季周六', 'fall_Sun': '秋季周日',
  'winter_Mon': '冬季周一', 'winter_Tue': '冬季周二', 'winter_Wed': '冬季周三',
  'winter_Thu': '冬季周四', 'winter_Fri': '冬季周五', 'winter_Sat': '冬季周六', 'winter_Sun': '冬季周日',
  // 季节+雨天
  'spring_rain': '春季雨天', 'summer_rain': '秋季雨天', 'fall_rain': '秋季雨天', 'winter_rain': '冬季雨天',
  // 好感度对话（带数字后缀如 Mon2, Tue4 等）
  'Mon2': '周一(2心)', 'Mon4': '周一(4心)', 'Mon6': '周一(6心)', 'Mon8': '周一(8心)', 'Mon10': '周一(10心)',
  'Tue2': '周二(2心)', 'Tue4': '周二(4心)', 'Tue6': '周二(6心)', 'Tue8': '周二(8心)', 'Tue10': '周二(10心)',
  'Wed2': '周三(2心)', 'Wed4': '周三(4心)', 'Wed6': '周三(6心)', 'Wed8': '周三(8心)', 'Wed10': '周三(10心)',
  'Thu2': '周四(2心)', 'Thu4': '周四(4心)', 'Thu6': '周四(6心)', 'Thu8': '周四(8心)', 'Thu10': '周四(10心)',
  'Fri2': '周五(2心)', 'Fri4': '周五(4心)', 'Fri6': '周五(6心)', 'Fri8': '周五(8心)', 'Fri10': '周五(10心)',
  'Sat2': '周六(2心)', 'Sat4': '周六(4心)', 'Sat6': '周六(6心)', 'Sat8': '周六(8心)', 'Sat10': '周六(10心)',
  'Sun2': '周日(2心)', 'Sun4': '周日(4心)', 'Sun6': '周日(6心)', 'Sun8': '周日(8心)', 'Sun10': '周日(10心)',
  // 婚姻对话
  'marriage_Mon': '婚后周一', 'marriage_Tue': '婚后周二', 'marriage_Wed': '婚后周三',
  'marriage_Thu': '婚后周四', 'marriage_Fri': '婚后周五', 'marriage_Sat': '婚后周六', 'marriage_Sun': '婚后周日',
  'marriage_rain': '婚后雨天', 'marriage_cold': '婚后寒冷', 'marriage_good': '婚后好天气',
  'marriage_kids': '婚后有孩子',
  // 姜岛对话
  'Resort': '姜岛度假', 'Resort_Mon': '姜岛周一', 'Resort_Tue': '姜岛周二',
  'Resort_Wed': '姜岛周三', 'Resort_Thu': '姜岛周四', 'Resort_Fri': '姜岛周五',
  'Resort_Sat': '姜岛周六', 'Resort_Sun': '姜岛周日', 'Resort_Entering': '姜岛进入',
  'Resort_Leaving': '姜岛离开',
  // 电影相关
  'MovieInvitation': '电影邀请', 'ConcessionMovie': '电影对话', 'ConcessionSnack': '零食对话',
  // 其他常见
  'reject_845': '拒绝八心事件', 'reject_846': '拒绝十心事件',
  'green_rain': '绿雨', 'green_rain2': '绿雨(2)',
  'dancePartner': '舞伴对话', 'dancePartner_rain': '舞伴雨天',
  'spouse_stardrop': '配偶星之果实',
  'breakUp': '分手', 'divorced': '离婚后',
  'secondChance_Head': '第二次机会',
  'dumped_Guys': '被甩(男)', 'dumped_Girls': '被甩(女)',
  'flowerDance': '花舞节', 'luau': '夏威夷宴会', 'stardewFair': '展览会',
  'festivalOfIce': '冰雪节', 'nightMarket': '夜市',
  'spiritEve': '万灵节', 'feastOfTheWinterStar': '冬日星盛宴',
  'eggFestival': '复活节', 'jellies': '月光水母舞会',
  'summer_rain2': '夏季雨天2', 'winter_15': '冬季15日', 'winter_16': '冬季16日', 'winter_17': '冬季17日',
  'winter_24': '冬季24日', 'winter_25': '冬季25日',
}

// 对话键描述映射（用于解释每个对话键的用途）
const DIALOGUE_KEY_DESC: Record<string, string> = {
  // 通用礼物反应
  'AcceptGift_Loved': '收到最爱物品时的通用回应（适用于所有最爱物品）',
  'AcceptGift_Liked': '收到喜欢物品时的通用回应（适用于所有喜欢物品）',
  'AcceptGift_Neutral': '收到一般物品时的通用回应',
  'AcceptGift_Disliked': '收到不喜欢物品时的通用回应',
  'AcceptGift_Hated': '收到讨厌物品时的通用回应',
  'AcceptGift': '收到礼物时的通用回应（无更具体匹配时使用）',
  'AcceptGift_Positive': '收到正面评价礼物时的回应（最爱/喜欢/一般）',
  'AcceptGift_Negative': '收到负面评价礼物时的回应（不喜欢/讨厌）',
  // 生日礼物反应
  'AcceptBirthdayGift_Loved': '生日收到最爱物品',
  'AcceptBirthdayGift_Liked': '生日收到喜欢物品',
  'AcceptBirthdayGift_Neutral': '生日收到一般物品',
  'AcceptBirthdayGift_Disliked': '生日收到不喜欢物品',
  'AcceptBirthdayGift_Hated': '生日收到讨厌物品',
  'AcceptBirthdayGift': '生日收到礼物时的通用回应',
  'AcceptBirthdayGift_Positive': '生日收到正面评价礼物',
  'AcceptBirthdayGift_Negative': '生日收到负面评价礼物',
  // 拒绝类
  'RejectGift_Divorced': '因离婚而拒绝礼物',
  'RejectBouquet': '拒绝花束',
  'RejectMermaidPendant': '拒绝美人鱼吊坠',
  // 婚姻相关
  'breakUp': '被赠与枯萎花束分手时的反应',
  'divorced': '与离婚配偶对话时的反应',
  'spouse_stardrop': '配偶赠送星之果实',
  'SpouseGiftJealous': '配偶嫉妒你给其他NPC送礼',
  'SpouseFarmhouseClutter': '配偶在农舍无法寻路时',
  'Spouse_MonstersInHouse': '农舍附近有怪物时',
  // 姜岛
  'Resort': '姜岛度假村通用对话',
  'Resort_Entering': '进入姜岛度假村',
  'Resort_Leaving': '离开姜岛度假村',
  // 电影
  'MovieInvitation': '受邀观影的反应',
  'ConcessionMovie': '电影对话',
  'ConcessionSnack': '零食对话',
  // 节日
  'flowerDance': '花舞节对话',
  'luau': '夏威夷宴会对话',
  'stardewFair': '星露谷展览会对话',
  'festivalOfIce': '冰雪节对话',
  'nightMarket': '夜市对话',
  'spiritEve': '万灵节对话',
  'feastOfTheWinterStar': '冬日星盛宴对话',
  'eggFestival': '复活节对话',
  'jellies': '月光水母舞会对话',
  // 季节对话
  'spring': '春季默认对话（该季节无更具体日程时使用）',
  'summer': '夏季默认对话（该季节无更具体日程时使用）',
  'fall': '秋季默认对话（该季节无更具体日程时使用）',
  'winter': '冬季默认对话（该季节无更具体日程时使用）',
  // 季节+星期
  'spring_Mon': '春季周一对话', 'spring_Tue': '春季周二对话', 'spring_Wed': '春季周三对话',
  'spring_Thu': '春季周四对话', 'spring_Fri': '春季周五对话', 'spring_Sat': '春季周六对话', 'spring_Sun': '春季周日对话',
  'summer_Mon': '夏季周一对话', 'summer_Tue': '夏季周二对话', 'summer_Wed': '夏季周三对话',
  'summer_Thu': '夏季周四对话', 'summer_Fri': '夏季周五对话', 'summer_Sat': '夏季周六对话', 'summer_Sun': '夏季周日对话',
  'fall_Mon': '秋季周一对话', 'fall_Tue': '秋季周二对话', 'fall_Wed': '秋季周三对话',
  'fall_Thu': '秋季周四对话', 'fall_Fri': '秋季周五对话', 'fall_Sat': '秋季周六对话', 'fall_Sun': '秋季周日对话',
  'winter_Mon': '冬季周一对话', 'winter_Tue': '冬季周二对话', 'winter_Wed': '冬季周三对话',
  'winter_Thu': '冬季周四对话', 'winter_Fri': '冬季周五对话', 'winter_Sat': '冬季周六对话', 'winter_Sun': '冬季周日对话',
  // 季节+雨天
  'spring_rain': '春季雨天对话', 'summer_rain': '夏季雨天对话', 'fall_rain': '秋季雨天对话', 'winter_rain': '冬季雨天对话',
  // 好感度对话
  'Mon2': '周一2心对话', 'Mon4': '周一4心对话', 'Mon6': '周一6心对话', 'Mon8': '周一8心对话', 'Mon10': '周一10心对话',
  'Tue2': '周二2心对话', 'Tue4': '周二4心对话', 'Tue6': '周二6心对话', 'Tue8': '周二8心对话', 'Tue10': '周二10心对话',
  'Wed2': '周三2心对话', 'Wed4': '周三4心对话', 'Wed6': '周三6心对话', 'Wed8': '周三8心对话', 'Wed10': '周三10心对话',
  'Thu2': '周四2心对话', 'Thu4': '周四4心对话', 'Thu6': '周四6心对话', 'Thu8': '周四8心对话', 'Thu10': '周四10心对话',
  'Fri2': '周五2心对话', 'Fri4': '周五4心对话', 'Fri6': '周五6心对话', 'Fri8': '周五8心对话', 'Fri10': '周五10心对话',
  'Sat2': '周六2心对话', 'Sat4': '周六4心对话', 'Sat6': '周六6心对话', 'Sat8': '周六8心对话', 'Sat10': '周六10心对话',
  'Sun2': '周日2心对话', 'Sun4': '周日4心对话', 'Sun6': '周日6心对话', 'Sun8': '周日8心对话', 'Sun10': '周日10心对话',
  // 婚姻
  'marriage_Mon': '婚后周一日程对话', 'marriage_Tue': '婚后周二日程对话', 'marriage_Wed': '婚后周三日程对话',
  'marriage_Thu': '婚后周四日程对话', 'marriage_Fri': '婚后周五日程对话', 'marriage_Sat': '婚后周六日程对话', 'marriage_Sun': '婚后周日日程对话',
  'marriage_rain': '婚后雨天对话', 'marriage_cold': '婚后寒冷天气对话', 'marriage_good': '婚后好天气对话',
  'marriage_kids': '婚后有孩子时的对话',
  // 姜岛
  'Resort': '姜岛度假村通用对话', 'Resort_Mon': '姜岛周一对话', 'Resort_Tue': '姜岛周二对话',
  'Resort_Wed': '姜岛周三对话', 'Resort_Thu': '姜岛周四对话', 'Resort_Fri': '姜岛周五对话',
  'Resort_Sat': '姜岛周六对话', 'Resort_Sun': '姜岛周日对话', 'Resort_Entering': '进入姜岛度假村时',
  'Resort_Leaving': '离开姜岛度假村时',
  // 电影
  'MovieInvitation': '受邀看电影时的反应', 'ConcessionMovie': '在电影院看电影的对话', 'ConcessionSnack': '在电影院买零食的对话',
  // 拒绝
  'reject_845': '拒绝八心告白事件', 'reject_846': '拒绝十心告白事件',
  // 其他常见
  'green_rain': '第一年绿雨期间对话', 'green_rain2': '第二年及之后绿雨期间对话',
  'dancePartner': '作为花舞节舞伴时的对话', 'dancePartner_rain': '雨天作为舞伴的对话',
  'spouse_stardrop': '配偶赠送星之果实时的对话',
  'breakUp': '被赠与枯萎花束分手时的反应', 'divorced': '与离婚配偶对话时的反应',
  'secondChance_Head': '使用黑暗神殿重新开始关系后首次对话',
  'dumped_Guys': '被男性NPC甩后的反应', 'dumped_Girls': '被女性NPC甩后的反应',
  // 节日
  'flowerDance': '花舞节期间对话', 'luau': '夏威夷宴会期间对话', 'stardewFair': '星露谷展览会期间对话',
  'festivalOfIce': '冰雪节期间对话', 'nightMarket': '夜市期间对话',
  'spiritEve': '万灵节期间对话', 'feastOfTheWinterStar': '冬日星盛宴期间对话',
  'eggFestival': '复活节期间对话', 'jellies': '月光水母舞会期间对话',
  'summer_rain2': '夏季雨天第二段对话',
  'winter_15': '冬季15日（夜市第一天）', 'winter_16': '冬季16日（夜市第二天）', 'winter_17': '冬季17日（夜市第三天）',
  'winter_24': '冬季24日（冬日星盛宴前夜）', 'winter_25': '冬季25日（冬日星盛宴当天）',
  // 其他
  'DumpsterDiveComment': '撞见玩家翻垃圾桶时的反应',
  'HitBySlingshot': '被弹弓射击时的反应',
  'WipedMemory': '使用记忆之黑暗神殿擦除记忆后首次对话',
  'Introduction': '初次见面时的对话',
  'reject_845': '拒绝八心告白事件',
  'reject_846': '拒绝十心告白事件',
  'SpouseGiftJealous': '配偶嫉妒你给其他NPC送礼时的反应',
  'SpouseFarmhouseClutter': '配偶在农舍被杂物挡住无法寻路时',
  'Spouse_MonstersInHouse': '农舍附近有怪物时配偶的反应',
}

// 对话键分类函数：将非标准键按类型分组
function categorizeDialogueKey(key: string): { group: string; groupLabel: string; desc: string } {
  // 礼物反应（含特定物品/类别/生日）
  if (key.startsWith('AcceptGift_') || key.startsWith('AcceptBirthdayGift_')) {
    // 区分通用和特定
    const giftTastes = ['Loved', 'Liked', 'Neutral', 'Disliked', 'Hated', 'Positive', 'Negative']
    const isGeneric = giftTastes.some(t => key === `AcceptGift_${t}` || key === `AcceptBirthdayGift_${t}`)
    if (isGeneric) {
      return { group: 'gift_generic', groupLabel: '通用礼物反应', desc: DIALOGUE_KEY_DESC[key] || '' }
    }
    // 特定物品/类别反应
    if (key.startsWith('AcceptBirthdayGift_')) {
      return { group: 'gift_birthday', groupLabel: '生日礼物反应', desc: DIALOGUE_KEY_DESC[key] || `生日收到特定物品时的回应` }
    }
    return { group: 'gift_specific', groupLabel: '特定物品反应', desc: `收到特定物品/类别物品时的回应` }
  }
  // 拒绝类
  if (key.startsWith('Reject')) {
    return { group: 'reject', groupLabel: '拒绝类对话', desc: DIALOGUE_KEY_DESC[key] || '拒绝某事时的对话' }
  }
  // 婚姻
  if (key.startsWith('marriage') || key.startsWith('Spouse') || key === 'breakUp' || key === 'divorced' || key === 'spouse_stardrop') {
    return { group: 'marriage', groupLabel: '婚姻/配偶', desc: DIALOGUE_KEY_DESC[key] || '婚后相关对话' }
  }
  // 姜岛
  if (key.startsWith('Resort') || key.startsWith('Island')) {
    return { group: 'island', groupLabel: '姜岛', desc: DIALOGUE_KEY_DESC[key] || '姜岛相关对话' }
  }
  // 电影
  if (key.startsWith('Movie') || key.startsWith('Concession') || key.startsWith('RejectMovie')) {
    return { group: 'movie', groupLabel: '电影', desc: DIALOGUE_KEY_DESC[key] || '电影相关对话' }
  }
  // 节日
  const festivalKeys = ['flowerDance', 'luau', 'stardewFair', 'festivalOfIce', 'nightMarket', 'spiritEve', 'feastOfTheWinterStar', 'eggFestival', 'jellies', 'Fair_', 'WinterStar_', 'FlowerDance_']
  if (festivalKeys.some(fk => key === fk || key.startsWith(fk))) {
    return { group: 'festival', groupLabel: '节日', desc: DIALOGUE_KEY_DESC[key] || '节日期间NPC的特殊对话' }
  }
  // 季节+星期/日期组合
  const seasonMatch = key.match(/^(spring|summer|fall|winter)_/)
  if (seasonMatch) {
    return { group: 'seasonal', groupLabel: '季节对话', desc: DIALOGUE_KEY_DESC[key] || '特定季节的对话' }
  }
  // 好感度对话（星期+数字）
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\d+$/.test(key)) {
    return { group: 'hearts', groupLabel: '好感度对话', desc: DIALOGUE_KEY_DESC[key] || '达到一定好感度后触发的对话' }
  }
  // 地点对话（地点名_数字 或 地点名_星期）
  if (/^[A-Z][a-zA-Z]+_\d+_\d+$/.test(key) || /^[A-Z][a-zA-Z]+_(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.test(key)) {
    return { group: 'location', groupLabel: '地点对话', desc: 'NPC在特定地点时触发的对话' }
  }
  // 其他
  // 尝试为未识别的键提供更有意义的描述
  let fallbackDesc = ''
  if (key.includes('dumped') || key.includes('Dumped')) fallbackDesc = '被甩后的反应'
  else if (key.includes('reject') || key.includes('Reject')) fallbackDesc = '拒绝某事时的对话'
  else if (key.includes('secondChance')) fallbackDesc = '重新开始关系后的对话'
  else if (key.includes('green_rain')) fallbackDesc = '绿雨期间的对话'
  else if (key.includes('dance')) fallbackDesc = '舞蹈/舞会相关对话'
  else if (key.includes('spouse') || key.includes('Spouse')) fallbackDesc = '配偶相关对话'
  else if (key.includes('marriage') || key.includes('Marriage')) fallbackDesc = '婚姻相关对话'
  else if (key.includes('Resort') || key.includes('Island')) fallbackDesc = '姜岛相关对话'
  else if (key.includes('Movie') || key.includes('Concession')) fallbackDesc = '电影相关对话'
  else if (key.includes('Dumpster')) fallbackDesc = '翻垃圾桶相关对话'
  else if (key.includes('Slingshot') || key.includes('HitBy')) fallbackDesc = '被攻击时的反应'
  else if (key.includes('Wiped') || key.includes('Memory')) fallbackDesc = '记忆被擦除后的对话'
  else if (key.includes('festival') || key.includes('Festival')) fallbackDesc = '节日相关对话'
  else if (key.includes('rain')) fallbackDesc = '雨天相关对话'
  else fallbackDesc = '游戏内部对话键，对应特定游戏场景'
  return { group: 'other', groupLabel: '其他', desc: DIALOGUE_KEY_DESC[key] || fallbackDesc }
}

// 为对话键生成中文标签
function getDialogueKeyLabel(key: string): string {
  // 1. 直接匹配映射表
  if (DIALOGUE_KEY_LABELS[key]) return DIALOGUE_KEY_LABELS[key]
  // 2. 星期+数字后缀模式（如 Mon2, Tue4, Sun10）
  const dayNumMatch = key.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(\d+)$/)
  if (dayNumMatch) {
    const dayLabels: Record<string, string> = { Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四', Fri: '周五', Sat: '周六', Sun: '周日' }
    return `${dayLabels[dayNumMatch[1]] || dayNumMatch[1]}(${dayNumMatch[2]}心)`
  }
  // 3. 季节+日期模式（如 spring_15, summer_28）
  const seasonDateMatch = key.match(/^(spring|summer|fall|winter)_(\d+)$/)
  if (seasonDateMatch) {
    const seasonLabels: Record<string, string> = { spring: '春季', summer: '夏季', fall: '秋季', winter: '冬季' }
    return `${seasonLabels[seasonDateMatch[1]] || seasonDateMatch[1]}${seasonDateMatch[2]}日`
  }
  // 4. 季节+星期+数字模式（如 spring_Mon2, summer_Fri4）
  const seasonDayNumMatch = key.match(/^(spring|summer|fall|winter)_(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(\d+)$/)
  if (seasonDayNumMatch) {
    const seasonLabels: Record<string, string> = { spring: '春季', summer: '夏季', fall: '秋季', winter: '冬季' }
    const dayLabels: Record<string, string> = { Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四', Fri: '周五', Sat: '周六', Sun: '周日' }
    return `${seasonLabels[seasonDayNumMatch[1]]}${dayLabels[seasonDayNumMatch[2]]}(${seasonDayNumMatch[3]}心)`
  }
  // 5. marriage前缀
  if (key.startsWith('marriage_')) {
    const subKey = key.slice(9)
    return `婚后${getDialogueKeyLabel(subKey) || subKey}`
  }
  // 6. Resort前缀
  if (key.startsWith('Resort_')) {
    const subKey = key.slice(7)
    return `姜岛${getDialogueKeyLabel(subKey) || subKey}`
  }
  // 7. 季节+星期模式（如 spring_Mon）
  const seasonDayMatch = key.match(/^(spring|summer|fall|winter)_(Mon|Tue|Wed|Thu|Fri|Sat|Sun|rain)$/)
  if (seasonDayMatch) {
    const seasonLabels: Record<string, string> = { spring: '春季', summer: '夏季', fall: '秋季', winter: '冬季' }
    const dayLabels: Record<string, string> = { Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四', Fri: '周五', Sat: '周六', Sun: '周日', rain: '雨天' }
    return `${seasonLabels[seasonDayMatch[1]]}${dayLabels[seasonDayMatch[2]] || seasonDayMatch[2]}`
  }
  // 8. 其他：直接返回键名
  return key
}

// 对话编辑器中的单个条目（textarea + 标签 + 描述）
// 必须是顶层组件，不能在父组件渲染过程中作为内联函数定义（会违反 Hooks 规则）
function DialogueItem({ dialogueKey, label, desc, dialogueMap, saveDialogue }: {
  dialogueKey: string
  label: string
  desc?: string
  dialogueMap: Record<string, string>
  saveDialogue: (key: string, text: string) => void
}): JSX.Element {
  const value = dialogueMap[dialogueKey] || ''
  const hasText = !!value
  return (
    <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        {hasText && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      </div>
      {desc && <p className="text-[11px] text-gray-500 mb-1.5">{desc}</p>}
      <textarea
        key={`${dialogueKey}-${value}`}
        defaultValue={value}
        onBlur={e => {
          const val = e.target.value.trim()
          if (val !== value) {
            saveDialogue(dialogueKey, val)
          }
        }}
        placeholder={DIALOGUE_CONTEXT_HELP[dialogueKey] || '输入对话内容，用 / 分隔多句'}
        className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#555] resize-none transition-colors"
        rows={2}
      />
    </div>
  )
}

// 可折叠的对话分组（使用 useState 控制展开状态，必须是顶层组件）
function CollapsibleDialogueGroup({ groupLabel, keys, descs, defaultOpen, dialogueMap, saveDialogue }: {
  groupLabel: string
  keys: string[]
  descs: string[]
  defaultOpen?: boolean
  dialogueMap: Record<string, string>
  saveDialogue: (key: string, text: string) => void
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const filledCount = keys.filter(k => dialogueMap[k]).length
  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#222] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-200 font-medium">{groupLabel}</span>
          <span className="text-xs text-gray-500">{keys.length} 条</span>
          {filledCount > 0 && <span className="text-[10px] bg-emerald-800/60 text-emerald-300 px-1.5 py-0.5 rounded-full">已填{filledCount}</span>}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-[#2a2a2a] pt-2">
          {keys.map((key, idx) => (
            <DialogueItem
              key={key}
              dialogueKey={key}
              label={getDialogueKeyLabel(key)}
              desc={descs[idx] || undefined}
              dialogueMap={dialogueMap}
              saveDialogue={saveDialogue}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---- 地点选项（按SDV规则分类）----
// NPC寻路规则：户外大地图可走路，室内传送进入，Farm/Backwoods/SecretWoods/Mine不可用
const MAP_LOCATIONS = [
  // === 户外大地图（NPC可走路往返）===
  { value: 'Town', label: '鹈鹕镇', desc: '城镇中心，NPC主要活动区' },
  { value: 'Beach', label: '海滩', desc: '沙滩区域' },
  { value: 'Forest', label: '森林', desc: '城镇西侧森林' },
  { value: 'Mountain', label: '山区', desc: '矿井附近山区' },
  { value: 'Desert', label: '沙漠', desc: '卡利科沙漠（需巴士修复）' },
  { value: 'IslandWest', label: '姜岛西部', desc: '姜岛主要区域（需船修复）' },
  { value: 'BusStop', label: '巴士站', desc: '农场前方巴士站' },
  { value: 'Railroad', label: '铁路', desc: '铁路沿线区域' },

  // === 室内工作地点（NPC传送进入）===
  { value: 'Saloon', label: '酒馆', desc: '格斯的星之果实餐吧' },
  { value: 'Hospital', label: '医院', desc: '哈维的诊所' },
  { value: 'Blacksmith', label: '铁匠铺', desc: '克林特的铁匠铺' },
  { value: 'SeedShop', label: '杂货店', desc: '皮埃尔的种子商店' },
  { value: 'ScienceHouse', label: '木工店', desc: '罗宾的木工店' },
  { value: 'Library', label: '博物馆', desc: '博物馆和图书馆' },
  { value: 'ManorHouse', label: '镇长大宅', desc: '刘易斯镇长的家' },
  { value: 'AnimalShop', label: '动物商店', desc: '玛妮的牧场' },
  { value: 'FishShop', label: '鱼店', desc: '威利的鱼店' },
  { value: 'CommunityCenter', label: '社区中心', desc: '社区中心' },
  { value: 'WizardHouse', label: '巫师塔', desc: '巫师的住所' },
  { value: 'AdventureGuild', label: '冒险者公会', desc: '马龙和阿德丽娜的公会' },
  { value: 'JojaMart', label: 'Joja超市', desc: '大型连锁超市' },

  // === NPC住宅（可访问/睡觉）===
  { value: 'JoshHouse', label: '乔治家', desc: '乔治和艾芙琳的家' },
  { value: 'SamHouse', label: '山姆家', desc: '乔迪的家（柳巷1号）' },
  { value: 'HaleyHouse', label: '海莉家', desc: '海莉和艾米丽的家（柳巷2号）' },
  { value: 'AlexHouse', label: '亚历克斯家', desc: '亚历克斯和艾芙琳的家' },
  { value: 'ElliottHouse', label: '艾利奥特小屋', desc: '海边小屋' },
  { value: 'LeahHouse', label: '莉亚小屋', desc: '森林中的木屋' },
  { value: 'Trailer', label: '拖车', desc: '潘姆和潘妮的拖车' },
  { value: 'FarmHouse', label: '农舍', desc: '玩家农舍（仅配偶可用）' },
]

const FACING_OPTIONS = [
  { value: 0, label: '下' },
  { value: 1, label: '上' },
  { value: 2, label: '左' },
  { value: 3, label: '右' },
]

function isCustomNpc(npc: NPCInfo): boolean {
  return npc.id.startsWith('custom_')
}

// ---- New helper components for Tab-based layout ----

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <label className="flex items-center gap-2 cursor-pointer bg-[#1f1f1f] rounded-lg p-3 border border-[#2a2a2a]">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="accent-emerald-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }): JSX.Element {
  return (
    <div className="bg-[#1f1f1f] rounded-lg p-3 border border-[#2a2a2a]">
      <label className="text-xs text-gray-500 block mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#555]">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function BasicInfoEditor({ npc, updateCustomNpc }: { npc: NPCInfo; updateCustomNpc: (u: Partial<NPCInfo>) => void }): JSX.Element {
  return (
    <div className="bg-[#2a2a2a] rounded-xl p-5 space-y-4">
      <h3 className="text-base font-medium text-gray-300">基本信息</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* 显示名称 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">显示名称</label>
          <input type="text" value={npc.displayName || ''} onChange={e => updateCustomNpc({ displayName: e.target.value })}
            className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]" />
        </div>
        {/* 英文名 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">英文名（内部ID）</label>
          <input type="text" value={npc.name || ''} onChange={e => updateCustomNpc({ name: e.target.value })}
            className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]" />
        </div>
        {/* 性别 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">性别</label>
          <select value={npc.gender || 'female'} onChange={e => updateCustomNpc({ gender: e.target.value as 'male' | 'female' })}
            className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]">
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </div>
        {/* 年龄 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">年龄</label>
          <select value={npc.age || 'Adult'} onChange={e => updateCustomNpc({ age: e.target.value as any })}
            className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]">
            <option value="Child">儿童</option>
            <option value="Teen">青少年</option>
            <option value="Adult">成年人</option>
          </select>
        </div>
        {/* 生日季节 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">生日季节</label>
          <select value={npc.birthSeason || 'spring'} onChange={e => updateCustomNpc({ birthSeason: e.target.value as any })}
            className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]">
            <option value="spring">春季</option>
            <option value="summer">夏季</option>
            <option value="fall">秋季</option>
            <option value="winter">冬季</option>
          </select>
        </div>
        {/* 生日日期 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">生日日期</label>
          <input type="number" min={1} max={28} value={npc.birthDay || 1} onChange={e => updateCustomNpc({ birthDay: Number(e.target.value) })}
            className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]" />
        </div>
        {/* 举止 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">举止</label>
          <select value={npc.manner || 'Neutral'} onChange={e => updateCustomNpc({ manner: e.target.value as any })}
            className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]">
            <option value="Polite">礼貌</option>
            <option value="Neutral">中性</option>
            <option value="Rude">粗鲁</option>
          </select>
        </div>
        {/* 社交倾向 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">社交倾向</label>
          <select value={npc.socialAnxiety || 'Neutral'} onChange={e => updateCustomNpc({ socialAnxiety: e.target.value as any })}
            className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]">
            <option value="Shy">内向</option>
            <option value="Neutral">中性</option>
            <option value="Outgoing">外向</option>
          </select>
        </div>
        {/* 乐观度 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">乐观度</label>
          <select value={npc.optimism || 'Neutral'} onChange={e => updateCustomNpc({ optimism: e.target.value as any })}
            className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]">
            <option value="Positive">乐观</option>
            <option value="Neutral">中性</option>
            <option value="Negative">悲观</option>
          </select>
        </div>
        {/* 可结婚 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">可结婚</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={npc.canMarry || false} onChange={e => updateCustomNpc({ canMarry: e.target.checked })}
              className="accent-pink-500" />
            <span className="text-sm text-gray-300">可恋爱结婚</span>
          </label>
        </div>
      </div>

      {/* 简介 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1.5">简介</label>
        <textarea value={npc.description || ''} onChange={e => updateCustomNpc({ description: e.target.value })}
          placeholder="NPC的背景故事和性格描述..."
          className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#555] resize-none"
          rows={3} />
      </div>
    </div>
  )
}

function VanillaNpcInfoCard({ npc }: { npc: NPCInfo }): JSX.Element {
  const ageLabel = npc.age === 'Child' ? '儿童' : npc.age === 'Teen' ? '青少年' : '成年人'
  const mannerLabel = npc.manner === 'Polite' ? '礼貌' : npc.manner === 'Rude' ? '粗鲁' : '中性'
  const anxietyLabel = npc.socialAnxiety === 'Shy' ? '内向' : npc.socialAnxiety === 'Outgoing' ? '外向' : '中性'
  const optimismLabel = npc.optimism === 'Positive' ? '乐观' : npc.optimism === 'Negative' ? '悲观' : '中性'

  return (
    <div className="bg-[#2a2a2a] rounded-xl p-5">
      <h3 className="text-base font-medium text-gray-300 mb-3">NPC信息</h3>
      <div className="grid grid-cols-2 gap-3">
        <InfoChip label="名字" value={npc.displayName} />
        <InfoChip label="生日" value={npc.birthday} />
        <InfoChip label="性别" value={npc.gender === 'male' ? '男' : '女'} />
        <InfoChip label="年龄" value={ageLabel} />
        <InfoChip label="举止" value={mannerLabel} />
        <InfoChip label="社交" value={anxietyLabel} />
        <InfoChip label="乐观" value={optimismLabel} />
        <InfoChip label="住所" value={npc.home} />
        {npc.canMarry && <div className="text-xs text-pink-300">可结婚</div>}
        {npc.language === 'Dwarvish' && <div className="text-xs text-amber-300">矮人语</div>}
      </div>
      {/* 人际关系 */}
      {npc.friendsAndFamily && Object.keys(npc.friendsAndFamily).length > 0 && (
        <div className="mt-3 border-t border-[#333] pt-3">
          <p className="text-xs text-gray-500 mb-2">人际关系</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(npc.friendsAndFamily).map(([enName, title]) => (
              <span key={enName} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-[#1f1f1f] border border-[#333]">
                <span className="text-gray-300">{NPC_EN_TO_CN[enName] || enName}</span>
                <span className="text-gray-500">→</span>
                <span className="text-amber-300">{title}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {npc.description && (
        <p className="text-sm text-gray-400 mt-3 border-t border-[#333] pt-3">{npc.description}</p>
      )}
    </div>
  )
}

function SocialAndMarriageTab({ npc, updateCustomNpc, custom }: { npc: NPCInfo; updateCustomNpc: (u: Partial<NPCInfo>) => void; custom: boolean }): JSX.Element {
  const { mutateSnapshot } = useProject()
  const [subTab, setSubTab] = useState<'social' | 'marriage'>('social')

  // Marriage state
  const [spouseRoomAsset, setSpouseRoomAsset] = useState(npc.spouseRoom?.mapAsset || '')
  const [spouseRoomX, setSpouseRoomX] = useState(npc.spouseRoom?.mapSourceRect?.x ?? 0)
  const [spouseRoomY, setSpouseRoomY] = useState(npc.spouseRoom?.mapSourceRect?.y ?? 0)
  const [spouseRoomW, setSpouseRoomW] = useState(npc.spouseRoom?.mapSourceRect?.width ?? 6)
  const [spouseRoomH, setSpouseRoomH] = useState(npc.spouseRoom?.mapSourceRect?.height ?? 9)
  const [spousePatioAsset, setSpousePatioAsset] = useState(npc.spousePatio?.mapAsset || '')
  const [spousePatioX, setSpousePatioX] = useState(npc.spousePatio?.mapSourceRect?.x ?? 0)
  const [spousePatioY, setSpousePatioY] = useState(npc.spousePatio?.mapSourceRect?.y ?? 0)
  const [engagementDialogue0, setEngagementDialogue0] = useState(npc.engagementDialogue?.[0] || '')
  const [engagementDialogue1, setEngagementDialogue1] = useState(npc.engagementDialogue?.[1] || '')
  const [marriageDialogueMap, setMarriageDialogueMap] = useState<Record<string, string>>(npc.marriageDialogue || {})

  const saveMarriageData = useCallback(() => {
    const spouseRoom = (spouseRoomAsset || npc.canMarry) ? {
      mapAsset: spouseRoomAsset || `{{ModId}}_spouse_rooms`,
      mapSourceRect: { x: spouseRoomX, y: spouseRoomY, width: spouseRoomW, height: spouseRoomH }
    } : undefined
    const spousePatio = spousePatioAsset ? {
      mapAsset: spousePatioAsset,
      mapSourceRect: { x: spousePatioX, y: spousePatioY, width: 4, height: 4 }
    } : undefined
    const engagementDialogue = (engagementDialogue0 || engagementDialogue1) ? [engagementDialogue0, engagementDialogue1] as [string, string] : undefined
    const marriageDialogue = Object.keys(marriageDialogueMap).length > 0 ? marriageDialogueMap : undefined

    if (custom) {
      updateCustomNpc({ spouseRoom, spousePatio, engagementDialogue, marriageDialogue })
    } else {
      // Save to vanillaNpcOverrides
      mutateSnapshot<Record<string, VanillaNpcOverride>>('vanillaNpcOverrides', prev => ({
        ...(prev || {}),
        [npc.name]: {
          ...((prev || {})[npc.name] || {}),
          marriage: {
            ...(((prev || {})[npc.name] || {}) as any)?.marriage,
            spouseRoom,
            spousePatio,
            engagementDialogue,
            marriageDialogue,
          }
        }
      }))
    }
  }, [custom, npc, updateCustomNpc, mutateSnapshot, spouseRoomAsset, spouseRoomX, spouseRoomY, spouseRoomW, spouseRoomH, spousePatioAsset, spousePatioX, spousePatioY, engagementDialogue0, engagementDialogue1, marriageDialogueMap])

  return (
    <div className="space-y-4">
      {/* Sub-tab */}
      <div className="flex items-center gap-1">
        <button onClick={() => setSubTab('social')} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${subTab === 'social' ? 'bg-white text-black' : 'bg-[#1f1f1f] text-gray-500 border border-[#2a2a2a]'}`}>社交功能</button>
        <button onClick={() => setSubTab('marriage')} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${subTab === 'marriage' ? 'bg-white text-black' : 'bg-[#1f1f1f] text-gray-500 border border-[#2a2a2a]'}`}>婚姻系统</button>
      </div>

      {subTab === 'social' && (
        <div className="bg-[#2a2a2a] rounded-xl p-5 space-y-3">
          <h3 className="text-base font-medium text-gray-300">社交功能</h3>
          {custom ? (
            <div className="grid grid-cols-2 gap-3">
              <ToggleField label="启用社交" value={npc.canSocialize !== false} onChange={v => updateCustomNpc({ canSocialize: v })} />
              <ToggleField label="可接受礼物" value={npc.canReceiveGifts !== false} onChange={v => updateCustomNpc({ canReceiveGifts: v })} />
              <ToggleField label="附近问候" value={npc.canGreetNearbyCharacters !== false} onChange={v => updateCustomNpc({ canGreetNearbyCharacters: v })} />
              <ToggleField label="可去姜岛" value={npc.canVisitIsland !== false} onChange={v => updateCustomNpc({ canVisitIsland: v })} />
              <ToggleField label="计入介绍任务" value={npc.introductionsQuest !== false} onChange={v => updateCustomNpc({ introductionsQuest: v })} />
              <ToggleField label="可发布送货任务" value={npc.itemDeliveryQuests !== false} onChange={v => updateCustomNpc({ itemDeliveryQuests: v })} />
              <ToggleField label="计入完美度" value={npc.perfectionScore !== false} onChange={v => updateCustomNpc({ perfectionScore: v })} />
              <SelectField label="日历显示" value={npc.calendar || 'AlwaysShown'} onChange={v => updateCustomNpc({ calendar: v as any })}
                options={[{ value: 'AlwaysShown', label: '始终显示' }, { value: 'HiddenUntilMet', label: '见面后显示' }, { value: 'HiddenAlways', label: '永不显示' }]} />
              <SelectField label="社交页显示" value={npc.socialTab || 'AlwaysShown'} onChange={v => updateCustomNpc({ socialTab: v as any })}
                options={[{ value: 'AlwaysShown', label: '始终显示' }, { value: 'UnknownUntilMet', label: '见面显示名字' }, { value: 'HiddenUntilMet', label: '见面后显示' }, { value: 'HiddenAlways', label: '永不显示' }]} />
              <SelectField label="结局幻灯片" value={npc.endSlideShow || 'MainGroup'} onChange={v => updateCustomNpc({ endSlideShow: v as any })}
                options={[{ value: 'MainGroup', label: '主人群' }, { value: 'TrailingGroup', label: '尾随人群' }, { value: 'Hidden', label: '不出现' }]} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">原版NPC的社交属性修改功能即将推出。</p>
          )}
        </div>
      )}

      {subTab === 'marriage' && (
        <div className="bg-[#2a2a2a] rounded-xl p-5 space-y-4">
          <h3 className="text-base font-medium text-gray-300 flex items-center gap-2">
            婚姻系统
            {!npc.canMarry && <span className="text-xs text-amber-400 font-normal">需先在基本信息中启用"可结婚"</span>}
          </h3>

          {/* 配偶房间 */}
          <div className="bg-[#1f1f1f] rounded-lg p-4 border border-[#2a2a2a]">
            <h4 className="text-sm text-gray-300 font-medium mb-3">配偶房间</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">地图素材名</label>
                <input type="text" value={spouseRoomAsset} onChange={e => setSpouseRoomAsset(e.target.value)} onBlur={saveMarriageData}
                  placeholder="{{ModId}}_spouse_rooms"
                  className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">偏移 (X, Y, 宽, 高)</label>
                <div className="flex gap-1">
                  <input type="number" value={spouseRoomX} onChange={e => setSpouseRoomX(Number(e.target.value))} onBlur={saveMarriageData}
                    className="w-16 bg-[#242424] border border-[#333] rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
                  <input type="number" value={spouseRoomY} onChange={e => setSpouseRoomY(Number(e.target.value))} onBlur={saveMarriageData}
                    className="w-16 bg-[#242424] border border-[#333] rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
                  <input type="number" value={spouseRoomW} onChange={e => setSpouseRoomW(Number(e.target.value))} onBlur={saveMarriageData}
                    className="w-16 bg-[#242424] border border-[#333] rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
                  <input type="number" value={spouseRoomH} onChange={e => setSpouseRoomH(Number(e.target.value))} onBlur={saveMarriageData}
                    className="w-16 bg-[#242424] border border-[#333] rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
                </div>
              </div>
            </div>
          </div>

          {/* 配偶露台 */}
          <div className="bg-[#1f1f1f] rounded-lg p-4 border border-[#2a2a2a]">
            <h4 className="text-sm text-gray-300 font-medium mb-3">配偶露台</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">露台素材名</label>
                <input type="text" value={spousePatioAsset} onChange={e => setSpousePatioAsset(e.target.value)} onBlur={saveMarriageData}
                  placeholder="spousePatios"
                  className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">偏移 (X, Y)</label>
                <div className="flex gap-1">
                  <input type="number" value={spousePatioX} onChange={e => setSpousePatioX(Number(e.target.value))} onBlur={saveMarriageData}
                    className="w-20 bg-[#242424] border border-[#333] rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
                  <input type="number" value={spousePatioY} onChange={e => setSpousePatioY(Number(e.target.value))} onBlur={saveMarriageData}
                    className="w-20 bg-[#242424] border border-[#333] rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
                </div>
              </div>
            </div>
          </div>

          {/* 订婚对话 */}
          <div className="bg-[#1f1f1f] rounded-lg p-4 border border-[#2a2a2a]">
            <h4 className="text-sm text-gray-300 font-medium mb-3">订婚对话</h4>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">订婚对话1</label>
                <textarea value={engagementDialogue0} onChange={e => setEngagementDialogue0(e.target.value)} onBlur={saveMarriageData}
                  placeholder="订婚时NPC的第一段对话..."
                  className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#555] resize-none" rows={2} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">订婚对话2</label>
                <textarea value={engagementDialogue1} onChange={e => setEngagementDialogue1(e.target.value)} onBlur={saveMarriageData}
                  placeholder="订婚时NPC的第二段对话..."
                  className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#555] resize-none" rows={2} />
              </div>
            </div>
          </div>

          {/* 婚后日常对话 */}
          <div className="bg-[#1f1f1f] rounded-lg p-4 border border-[#2a2a2a]">
            <h4 className="text-sm text-gray-300 font-medium mb-3">婚后日常对话</h4>
            <div className="space-y-2">
              {MARRIAGE_DIALOGUE_KEYS.map(dk => (
                <div key={dk.key} className="bg-[#1a1a1a] rounded-lg p-2.5 border border-[#2a2a2a]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-300 font-medium">{dk.label}</span>
                    <span className="text-[10px] text-gray-500">{dk.desc}</span>
                  </div>
                  <textarea value={marriageDialogueMap[dk.key] || ''}
                    onChange={e => setMarriageDialogueMap(prev => ({ ...prev, [dk.key]: e.target.value }))}
                    onBlur={saveMarriageData}
                    placeholder={`输入${dk.label}对话...`}
                    className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#555] resize-none" rows={2} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PortraitAndAppearanceTab({ npc, updateCustomNpc, custom, navigate, id, spriteUrls }: {
  npc: NPCInfo; updateCustomNpc: (u: Partial<NPCInfo>) => void; custom: boolean; navigate: (path: string) => void; id: string; spriteUrls: string[]
}): JSX.Element {
  const [appearanceList, setAppearanceList] = useState<Array<{
    id: string; season?: 'spring' | 'summer' | 'fall' | 'winter'; isIslandAttire?: boolean;
    portraitSprite?: string; sprite?: string; precedence?: number; weight?: number
  }>>(npc.appearance || [])

  const addAppearance = () => {
    const newApp = {
      id: `Appearance_${appearanceList.length + 1}`,
      precedence: 0,
      weight: 1,
    }
    const updated = [...appearanceList, newApp]
    setAppearanceList(updated)
    updateCustomNpc({ appearance: updated })
  }

  const updateAppearance = (idx: number, updates: Record<string, unknown>) => {
    const updated = appearanceList.map((a, i) => i === idx ? { ...a, ...updates } : a)
    setAppearanceList(updated)
    updateCustomNpc({ appearance: updated })
  }

  const removeAppearance = (idx: number) => {
    const updated = appearanceList.filter((_, i) => i !== idx)
    setAppearanceList(updated)
    updateCustomNpc({ appearance: updated.length > 0 ? updated : undefined })
  }

  return (
    <div className="space-y-4">
      {/* Portrait/Sprite quick links */}
      <div className="bg-[#2a2a2a] rounded-xl p-5">
        <h3 className="text-base font-medium text-gray-300 mb-3">肖像与行走图</h3>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/npc/${id}/portrait`)}
            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-[#333] rounded-lg transition-colors border border-[#444] flex-1">
            <div className="w-10 h-10 bg-[#1a1a1a] rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
              {npc.wikiPortraitUrl ? (
                <img src={npc.wikiPortraitUrl} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : <span className="text-xs text-gray-600">P</span>}
            </div>
            编辑肖像
          </button>
          <button onClick={() => navigate(`/npc/${id}/sprite`)}
            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-[#333] rounded-lg transition-colors border border-[#444] flex-1">
            <div className="w-10 h-10 bg-[#1a1a1a] rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
              {spriteUrls.length > 0 ? (
                <img src={spriteUrls[0]} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : <span className="text-xs text-gray-600">S</span>}
            </div>
            编辑行走图
          </button>
        </div>
      </div>

      {/* Dynamic Appearance */}
      <div className="bg-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-medium text-gray-300">动态外观</h3>
            <p className="text-xs text-gray-500 mt-0.5">根据季节或场景切换NPC的肖像和行走图</p>
          </div>
          <button onClick={addAppearance}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50 border border-emerald-700/40 transition-colors">
            + 添加外观
          </button>
        </div>

        {appearanceList.length === 0 && (
          <div className="border-2 border-dashed border-[#444] rounded-xl p-8 text-center bg-[#1a1a1a]/50">
            <p className="text-sm text-gray-500">暂无动态外观配置</p>
            <p className="text-xs text-gray-600 mt-1">默认使用肖像和行走图编辑器中上传的图片</p>
          </div>
        )}

        <div className="space-y-3">
          {appearanceList.map((app, idx) => (
            <div key={idx} className="bg-[#1f1f1f] rounded-lg p-4 border border-[#2a2a2a]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-300 font-medium">{app.id}</span>
                <button onClick={() => removeAppearance(idx)} className="text-xs text-red-400 hover:text-red-300">删除</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">外观ID</label>
                  <input type="text" value={app.id} onChange={e => updateAppearance(idx, { id: e.target.value })}
                    className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">季节</label>
                  <select value={app.season || ''} onChange={e => updateAppearance(idx, { season: e.target.value || undefined })}
                    className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#555]">
                    <option value="">无（默认）</option>
                    <option value="spring">春季</option>
                    <option value="summer">夏季</option>
                    <option value="fall">秋季</option>
                    <option value="winter">冬季</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">岛屿装扮</label>
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" checked={app.isIslandAttire || false} onChange={e => updateAppearance(idx, { isIslandAttire: e.target.checked || undefined })}
                      className="accent-emerald-500" />
                    <span className="text-sm text-gray-300">姜岛装扮</span>
                  </label>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">肖像路径</label>
                  <input type="text" value={app.portraitSprite || ''} onChange={e => updateAppearance(idx, { portraitSprite: e.target.value || undefined })}
                    placeholder="Portraits/NPC名"
                    className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#555]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">行走图路径</label>
                  <input type="text" value={app.sprite || ''} onChange={e => updateAppearance(idx, { sprite: e.target.value || undefined })}
                    placeholder="Characters/NPC名"
                    className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#555]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">优先级</label>
                  <input type="number" value={app.precedence ?? 0} onChange={e => updateAppearance(idx, { precedence: Number(e.target.value) })}
                    className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RelationsEditor({ npc, updateCustomNpc, custom }: { npc: NPCInfo; updateCustomNpc: (u: Partial<NPCInfo>) => void; custom: boolean }): JSX.Element {
  const [relations, setRelations] = useState<Record<string, string>>(npc.friendsAndFamily || {})

  const addRelation = () => {
    // 默认选第一个可社交NPC
    const firstNpc = defaultNPCs.find(n => n.canSocialize !== false && n.name !== npc.name)
    const defaultName = firstNpc?.name || 'Abigail'
    const updated = { ...relations, [defaultName]: '朋友' }
    setRelations(updated)
    updateCustomNpc({ friendsAndFamily: updated })
  }

  const updateRelation = (npcName: string, newTitle: string) => {
    const updated = { ...relations, [npcName]: newTitle }
    setRelations(updated)
    updateCustomNpc({ friendsAndFamily: updated })
  }

  const removeRelation = (npcName: string) => {
    const updated = { ...relations }
    delete updated[npcName]
    setRelations(updated)
    updateCustomNpc({ friendsAndFamily: Object.keys(updated).length > 0 ? updated : undefined })
  }

  const changeRelationNpc = (oldKey: string, newKey: string) => {
    const updated: Record<string, string> = {}
    for (const [k, v] of Object.entries(relations)) {
      if (k === oldKey) updated[newKey] = v
      else updated[k] = v
    }
    setRelations(updated)
    updateCustomNpc({ friendsAndFamily: updated })
  }

  // 可选NPC列表（排除自身和不可社交NPC）
  const selectableNpcs = defaultNPCs.filter(n => n.canSocialize !== false && n.name !== npc.name)

  return (
    <div className="bg-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-medium text-gray-300">人际关系</h3>
          <p className="text-xs text-gray-500 mt-0.5">定义NPC与其他角色的关系（如家人、朋友等）</p>
        </div>
        <button onClick={addRelation}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50 border border-emerald-700/40 transition-colors">
          + 添加关系
        </button>
      </div>

      {Object.keys(relations).length === 0 && (
        <div className="border-2 border-dashed border-[#444] rounded-xl p-8 text-center bg-[#1a1a1a]/50">
          <p className="text-sm text-gray-500">暂无人际关系</p>
          <p className="text-xs text-gray-600 mt-1">添加关系后，游戏会正确显示NPC之间的亲属称谓</p>
        </div>
      )}

      <div className="space-y-2">
        {Object.entries(relations).map(([npcName, title]) => (
          <div key={npcName} className="bg-[#1f1f1f] rounded-lg p-3 border border-[#2a2a2a] flex items-center gap-3">
            {/* NPC选择器 - 显示中文名 */}
            <select value={npcName} onChange={e => changeRelationNpc(npcName, e.target.value)}
              className="flex-1 bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#555]">
              {selectableNpcs.map(n => (
                <option key={n.name} value={n.name}>{n.displayName}</option>
              ))}
              {/* 如果当前值不在可选列表中（如自定义NPC），也保留选项 */}
              {!selectableNpcs.find(n => n.name === npcName) && (
                <option value={npcName}>{NPC_EN_TO_CN[npcName] || npcName}</option>
              )}
            </select>
            {/* 称呼选择器 */}
            <select value={title} onChange={e => updateRelation(npcName, e.target.value)}
              className="flex-1 bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#555]">
              {RELATION_TITLES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
              {/* 如果当前值不在预设列表中，也保留选项 */}
              {!RELATION_TITLES.includes(title) && (
                <option value={title}>{title}</option>
              )}
            </select>
            <button onClick={() => removeRelation(npcName)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeartEventsTab({ npc, custom, navigate }: { npc: NPCInfo; custom: boolean; navigate: (path: string) => void }): JSX.Element {
  return (
    <div className="bg-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-medium text-gray-300">心形事件</h3>
          <p className="text-xs text-gray-500 mt-0.5">与NPC好感度相关的事件，达到指定心数后触发</p>
        </div>
      </div>

      {/* Heart event presets */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {HEART_EVENT_PRESETS.map(preset => (
          <div key={preset.hearts} className="bg-[#1f1f1f] rounded-lg p-4 border border-[#2a2a2a] hover:border-[#444] transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-pink-400 font-bold text-lg">{preset.hearts}</span>
              <span className="text-xs text-pink-300">心</span>
              <span className="text-sm text-gray-300 font-medium">{preset.title}</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">{preset.desc}</p>
            <button onClick={() => navigate('/events')}
              className="text-xs px-3 py-1.5 rounded-lg bg-pink-900/50 text-pink-300 hover:bg-pink-800/50 border border-pink-700/40 transition-colors">
              前往事件编辑器创建
            </button>
          </div>
        ))}
      </div>

      <div className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
        <p className="text-xs text-gray-400">
          提示：心形事件需要在事件编辑器中创建。事件ID设为心数（如"2"、"4"等），目标设为 <code className="text-amber-400 bg-[#242424] px-1.5 py-0.5 rounded">Data/Events/{'{'}ModId{'}'}_{npc.name}</code> 即可关联到此NPC。
        </p>
      </div>
    </div>
  )
}

function DialogueQuickInsertToolbar(): JSX.Element {
  const [showEmotions, setShowEmotions] = useState(false)
  const [showVariables, setShowVariables] = useState(false)

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <span className="text-xs text-gray-500">快捷插入：</span>
      <div className="relative">
        <button onClick={() => { setShowEmotions(!showEmotions); setShowVariables(false) }}
          className="text-xs px-2 py-1 rounded bg-[#1f1f1f] text-gray-400 hover:text-white border border-[#2a2a2a] transition-colors">
          表情代码
        </button>
        {showEmotions && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-[#222] border border-[#444] rounded-lg shadow-xl z-20 p-2 space-y-1">
            {DIALOGUE_EMOTION_CODES.map(em => (
              <button key={em.code} onClick={() => { navigator.clipboard.writeText(em.code); setShowEmotions(false) }}
                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-[#333] transition-colors flex items-center gap-2">
                <code className="text-amber-400 bg-[#1a1a1a] px-1.5 py-0.5 rounded font-mono">{em.code}</code>
                <span className="text-gray-300">{em.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <button onClick={() => { setShowVariables(!showVariables); setShowEmotions(false) }}
          className="text-xs px-2 py-1 rounded bg-[#1f1f1f] text-gray-400 hover:text-white border border-[#2a2a2a] transition-colors">
          变量令牌
        </button>
        {showVariables && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-[#222] border border-[#444] rounded-lg shadow-xl z-20 p-2 space-y-1 max-h-60 overflow-y-auto">
            {DIALOGUE_VARIABLE_TOKENS.map(vt => (
              <button key={vt.token} onClick={() => { navigator.clipboard.writeText(vt.token); setShowVariables(false) }}
                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-[#333] transition-colors flex items-center gap-2">
                <code className="text-amber-400 bg-[#1a1a1a] px-1.5 py-0.5 rounded font-mono text-[10px]">{vt.token}</code>
                <span className="text-gray-300">{vt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={() => navigator.clipboard.writeText('^')}
        className="text-xs px-2 py-1 rounded bg-[#1f1f1f] text-gray-400 hover:text-white border border-[#2a2a2a] transition-colors"
        title="换行符（在对话中插入换行）">
        换行符 ^
      </button>
    </div>
  )
}

function GiftCategorySelector({ loved, liked, disliked, hated, onAddCategory }: {
  loved: string; liked: string; disliked: string; hated: string;
  onAddCategory: (cat: 'loved' | 'liked' | 'disliked' | 'hated', categoryId: string) => void
}): JSX.Element {
  const [showCategories, setShowCategories] = useState(false)
  const [targetCat, setTargetCat] = useState<'loved' | 'liked' | 'disliked' | 'hated'>('loved')

  const allIds = `${loved} ${liked} ${disliked} ${hated}`.split(/\s+/).filter(Boolean)
  const existingCategories = new Set(allIds.filter(id => id.startsWith('-')))

  return (
    <div className="bg-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-gray-300">礼物类别选择器</h3>
        <button onClick={() => setShowCategories(!showCategories)}
          className="text-xs px-3 py-1.5 rounded-lg bg-purple-900/50 text-purple-300 hover:bg-purple-800/50 border border-purple-700/40 transition-colors">
          + 添加类别
        </button>
      </div>

      {/* Already selected categories */}
      {existingCategories.size > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Array.from(existingCategories).map(catId => {
            const catInfo = GIFT_CATEGORY_IDS.find(c => c.id === catId)
            return (
              <span key={catId} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-900/40 text-purple-300 border border-purple-700/40">
                <span className="text-[10px] text-purple-400">类</span>
                {catInfo?.label || `类别${catId}`}
              </span>
            )
          })}
        </div>
      )}

      {showCategories && (
        <div className="bg-[#1f1f1f] rounded-lg p-3 border border-[#2a2a2a]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500">添加到：</span>
            {(['loved', 'liked', 'disliked', 'hated'] as const).map(cat => (
              <button key={cat} onClick={() => setTargetCat(cat)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  targetCat === cat
                    ? cat === 'loved' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                      : cat === 'liked' ? 'bg-sky-900/60 text-sky-300 border border-sky-700/50'
                        : cat === 'disliked' ? 'bg-orange-900/60 text-orange-300 border border-orange-700/50'
                          : 'bg-red-900/60 text-red-300 border border-red-700/50'
                    : 'bg-[#252525] text-gray-500'
                }`}>
                {{loved:'最爱',liked:'喜欢',disliked:'不喜欢',hated:'讨厌'}[cat]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
            {GIFT_CATEGORY_IDS.map(cat => {
              const alreadyAdded = allIds.includes(cat.id)
              return (
                <button key={cat.id} onClick={() => { onAddCategory(targetCat, cat.id); setShowCategories(false) }}
                  disabled={alreadyAdded}
                  className={`text-xs px-2.5 py-2 rounded text-left transition-colors ${
                    alreadyAdded
                      ? 'bg-[#252525] text-gray-600 cursor-not-allowed'
                      : 'bg-[#242424] text-gray-300 hover:bg-[#333] border border-[#333]'
                  }`}>
                  <div className="font-medium">{cat.label} <span className="text-gray-500">({cat.id})</span></div>
                  <div className="text-[10px] text-gray-500">{cat.desc}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function NPCDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { customNpcs, updateCustomNpc: updateCustomNpcFromCtx } = useCustomNpcs()
  const { mutateSnapshot, getFullSnapshot } = useProject()
  const { unpackedRoot } = useNpcAssets()
  const locale = useLocale()
  const [dialogueMap, setDialogueMap] = useState<Record<string, string>>({})
  const [dialogueSaved, setDialogueSaved] = useState(false)
  const [topTab, setTopTab] = useState<'basic' | 'social' | 'portrait' | 'schedule' | 'dialogue' | 'gift' | 'relations' | 'heartEvents'>('basic')
  const [dialogueTab, setDialogueTab] = useState<'intro' | 'daily' | 'hearts' | 'gift' | 'marriage' | 'festival' | 'special'>('intro')
  const [dailySeason, setDailySeason] = useState<'default' | 'spring' | 'summer' | 'fall' | 'winter'>('default')
  const [dialogueFormatHelpOpen, setDialogueFormatHelpOpen] = useState(false)

  // 用 ref 缓存 customNpcs，避免 useEffect 因 customNpcs 引用变化而无限循环
  const customNpcsRef = useRef(customNpcs)
  customNpcsRef.current = customNpcs

  // 切换 NPC 时加载对话数据（含旧键名迁移）
  // 只依赖 id、unpackedRoot、locale，不依赖 customNpcs（每次渲染都是新引用）
  useEffect(() => {
    const npc = [...defaultNPCs, ...customNpcsRef.current].find((n) => n.id === id)
    if (!npc) { setDialogueMap({}); return }

    if (isCustomNpc(npc) && npc.dialogues) {
      const migrated = { ...npc.dialogues }
      // 旧键名 → 新键名迁移（游戏不识别 love/like/neutral/dislike/hate）
      const keyMap: Record<string, string> = {
        'love': 'AcceptGift_Loved',
        'like': 'AcceptGift_Liked',
        'neutral': 'AcceptGift_Neutral',
        'dislike': 'AcceptGift_Disliked',
        'hate': 'AcceptGift_Hated',
      }
      let changed = false
      for (const [oldKey, newKey] of Object.entries(keyMap)) {
        if (migrated[oldKey] !== undefined && migrated[newKey] === undefined) {
          migrated[newKey] = migrated[oldKey]
          delete migrated[oldKey]
          changed = true
        }
      }
      if (changed) {
        updateCustomNpcFromCtx(npc.id, { dialogues: migrated })
      }
      setDialogueMap(migrated)
    } else if (!isCustomNpc(npc)) {
      // 原版NPC：先从 vanillaNpcOverrides 加载已保存的覆盖数据
      const snap = getFullSnapshot()
      const overrides = snap.vanillaNpcOverrides || {}
      const npcOverride = overrides[npc.name]
      const savedDialogues = npcOverride?.dialogues || {}

      // 如果有已保存的覆盖数据，直接使用
      if (Object.keys(savedDialogues).length > 0) {
        setDialogueMap(savedDialogues)
        return
      }

      // 否则从游戏解包文件加载原版对话数据作为初始值
      // unpackedRoot 为 null 时也尝试调用（主进程会自动查找解包目录）
      // locale 参数决定读取中文/英文版对话文件
      window.electronAPI?.npcReadVanillaDialogue?.(unpackedRoot || '', npc.name, locale).then(vanillaData => {
        if (vanillaData && typeof vanillaData === 'object') {
            // 游戏对话格式: { "Mon": "对话内容", "Tue": "对话内容", ... }
            // 过滤掉 $开头的系统键
            const filtered: Record<string, string> = {}
            for (const [key, value] of Object.entries(vanillaData)) {
              if (!key.startsWith('$') && typeof value === 'string') {
                filtered[key] = value
              }
            }
            setDialogueMap(filtered)
          } else {
            setDialogueMap({})
          }
        }).catch(() => setDialogueMap({}))
    } else {
      setDialogueMap({})
    }
  }, [id, unpackedRoot, locale])

  // 用 useMemo 缓存 npc 对象，避免 customNpcs 引用变化导致不必要的重渲染
  const npcFromCtx = useMemo(() => [...defaultNPCs, ...customNpcs].find((n) => n.id === id), [id, customNpcs])
  // 用 ref 缓存 npc，防止 customNpcs 短暂为空时（如 restoreSnapshot 竞态）导致 npc 变 null
  const npcRef = useRef(npcFromCtx)
  if (npcFromCtx) npcRef.current = npcFromCtx
  const npc = npcRef.current
  const custom = npc ? isCustomNpc(npc) : false

  // Sprite URLs for preview: vanilla NPCs from game assets, custom NPCs from uploaded data
  const spriteUrls = useMemo(() => {
    if (!npc) return []
    if (custom) {
      // Custom NPCs: use the first uploaded sprite scene
      const customSprite = npc.sprites?.[Object.keys(npc.sprites || {})[0]]
      return customSprite ? [customSprite] : []
    }
    return getNpcSpriteUrls(npc.name)
  }, [npc, custom])

  // Save single dialogue entry (auto-save) — 同时保存到 NPC 数据和本地状态
  const saveDialogue = (key: string, text: string) => {
    const newMap = { ...dialogueMap, [key]: text }
    if (!text.trim()) delete newMap[key]
    setDialogueMap(newMap)
    if (custom && npc) {
      updateCustomNpcFromCtx(npc.id, { dialogues: newMap })
    } else if (!custom && npc) {
      // 原版NPC：保存到 vanillaNpcOverrides
      mutateSnapshot<Record<string, VanillaNpcOverride>>('vanillaNpcOverrides', prev => ({
        ...(prev || {}),
        [npc.name]: {
          ...((prev || {})[npc.name] || {}),
          dialogues: Object.keys(newMap).length > 0 ? newMap : undefined,
        }
      }))
    }
    setDialogueSaved(true)
    setTimeout(() => setDialogueSaved(false), 1200)
  }

  // Update custom NPC data — 用 useCallback 稳定引用，避免子组件不必要的重渲染
  const updateCustomNpc = useCallback((updates: Partial<NPCInfo>) => {
    if (custom && npc) {
      updateCustomNpcFromCtx(npc.id, updates)
    }
  }, [custom, npc, updateCustomNpcFromCtx])

  if (!npc) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-sm">未找到NPC</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm text-gray-400 hover:underline">返回</button>
      </div>
    )
  }

  // Merge custom NPC embedded dialogues and project dialogues
  const effectiveDialogueMap = custom
    ? { ...(npc.dialogues || {}), ...dialogueMap }
    : dialogueMap

  return (
    <div className="p-3 md:p-6 min-h-full flex flex-col" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 2000px' }}>
      {/* Top back button */}
      <button onClick={() => navigate('/npc')} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4 flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回NPC列表
      </button>

      {/* NPC Info Card - compact header */}
      <div className="bg-[#2a2a2a] rounded-xl p-4 flex items-center gap-4 flex-shrink-0">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0 flex items-center justify-center">
          {npc.portraitUrl ? (
            <img src={npc.portraitUrl} alt={npc.displayName} className="w-full h-full object-cover object-top" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <span className="text-xl text-gray-400">{npc.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">{npc.displayName}</h2>
            {custom && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">自定义</span>}
            {npc.canMarry && <span className="text-[10px] px-2 py-0.5 rounded bg-pink-900/40 text-pink-300 border border-pink-800/40">可结婚</span>}
          </div>
          <div className="flex flex-wrap gap-3 mt-1">
            <InfoChip label="生日" value={npc.birthday} />
            <InfoChip label="性别" value={npc.gender === 'male' ? '男' : '女'} />
          </div>
        </div>
      </div>

      {/* Top-level Tab bar */}
      <div className="flex items-center gap-1 mt-4 mb-4 overflow-x-auto pb-1 flex-shrink-0">
        {([
          { key: 'basic', label: '基本信息' },
          { key: 'social', label: '社交与婚姻' },
          { key: 'portrait', label: '肖像与外观' },
          { key: 'schedule', label: '日程' },
          { key: 'dialogue', label: '对话' },
          { key: 'gift', label: '礼物喜好' },
          { key: 'relations', label: '人际关系' },
          { key: 'heartEvents', label: '心形事件' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setTopTab(tab.key)}
            className={`text-xs px-4 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
              topTab === tab.key
                ? 'bg-white text-black shadow-md'
                : 'bg-[#1f1f1f] text-gray-500 hover:bg-[#252525] hover:text-gray-300 border border-[#2a2a2a]'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {/* 基本信息 Tab */}
        {topTab === 'basic' && (
          <div className="space-y-4">
            {custom && <BasicInfoEditor npc={npc} updateCustomNpc={updateCustomNpc} />}
            {!custom && <VanillaNpcInfoCard npc={npc} />}
          </div>
        )}

        {/* 社交与婚姻 Tab */}
        {topTab === 'social' && (
          <SocialAndMarriageTab npc={npc} updateCustomNpc={updateCustomNpc} custom={custom} />
        )}

        {/* 肖像与外观 Tab */}
        {topTab === 'portrait' && (
          <PortraitAndAppearanceTab npc={npc} updateCustomNpc={updateCustomNpc} custom={custom} navigate={navigate} id={id!} spriteUrls={spriteUrls} />
        )}

        {/* 日程 Tab */}
        {topTab === 'schedule' && (
          <EditableHomeAndSchedule npc={npc} updateCustomNpc={updateCustomNpc} custom={custom} />
        )}

        {/* 对话 Tab */}
        {topTab === 'dialogue' && (
          <div className="bg-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-medium text-gray-300 flex items-center gap-2">
                对话编辑器
                {Object.keys(effectiveDialogueMap).length > 0 && (
                  <span className="text-sm text-gray-500 font-normal">（{Object.keys(effectiveDialogueMap).length} 条）</span>
                )}
              </h3>
              {dialogueSaved && <span className="text-sm text-emerald-400">已保存</span>}
            </div>
            {!effectiveDialogueMap['Introduction'] && custom && (
              <div className="mb-3 p-2.5 bg-amber-900/30 border border-amber-700/30 rounded-lg">
                <p className="text-xs text-amber-300">自定义NPC需要填写介绍对话，这样NPC才能自我介绍。</p>
              </div>
            )}

            {/* Quick insert toolbar */}
            <DialogueQuickInsertToolbar />

            {/* Dialogue Tab 分组 */}
            {(() => {
          // === 自定义NPC：扩展Tab结构 ===
          if (custom) {
            const allCustomKeys = [
              ...CUSTOM_NPC_DIALOGUE_GROUPS.intro,
              ...CUSTOM_NPC_DIALOGUE_GROUPS.daily.default,
              ...SEASONS.flatMap(s => CUSTOM_NPC_DIALOGUE_GROUPS.daily[s as keyof typeof CUSTOM_NPC_DIALOGUE_GROUPS.daily]),
              ...CUSTOM_NPC_DIALOGUE_GROUPS.hearts,
              ...CUSTOM_NPC_DIALOGUE_GROUPS.gift,
              ...CUSTOM_NPC_DIALOGUE_GROUPS.marriage,
              ...CUSTOM_NPC_DIALOGUE_GROUPS.festival,
              ...CUSTOM_NPC_DIALOGUE_GROUPS.special,
            ]
            const countFilled = (keys: { key: string }[]) => keys.filter(dk => effectiveDialogueMap[dk.key]).length

            const customTabs: { key: typeof dialogueTab; label: string; filled: number; total: number }[] = [
              { key: 'intro', label: '介绍', filled: countFilled(CUSTOM_NPC_DIALOGUE_GROUPS.intro), total: CUSTOM_NPC_DIALOGUE_GROUPS.intro.length },
              { key: 'daily', label: '日常', filled: countFilled(CUSTOM_NPC_DIALOGUE_GROUPS.daily.default) + countFilled(CUSTOM_NPC_DIALOGUE_GROUPS.hearts) + countFilled(SEASONS.flatMap(s => CUSTOM_NPC_DIALOGUE_GROUPS.daily[s as keyof typeof CUSTOM_NPC_DIALOGUE_GROUPS.daily])), total: CUSTOM_NPC_DIALOGUE_GROUPS.daily.default.length + CUSTOM_NPC_DIALOGUE_GROUPS.hearts.length + SEASONS.flatMap(s => CUSTOM_NPC_DIALOGUE_GROUPS.daily[s as keyof typeof CUSTOM_NPC_DIALOGUE_GROUPS.daily]).length },
              { key: 'hearts', label: '好感度', filled: countFilled(CUSTOM_NPC_DIALOGUE_GROUPS.hearts), total: CUSTOM_NPC_DIALOGUE_GROUPS.hearts.length },
              { key: 'gift', label: '礼物反应', filled: countFilled(CUSTOM_NPC_DIALOGUE_GROUPS.gift), total: CUSTOM_NPC_DIALOGUE_GROUPS.gift.length },
              { key: 'marriage', label: '婚姻', filled: countFilled(CUSTOM_NPC_DIALOGUE_GROUPS.marriage), total: CUSTOM_NPC_DIALOGUE_GROUPS.marriage.length },
              { key: 'festival', label: '节日', filled: countFilled(CUSTOM_NPC_DIALOGUE_GROUPS.festival), total: CUSTOM_NPC_DIALOGUE_GROUPS.festival.length },
              { key: 'special', label: '特殊', filled: countFilled(CUSTOM_NPC_DIALOGUE_GROUPS.special), total: CUSTOM_NPC_DIALOGUE_GROUPS.special.length },
            ]

            return (
              <>
                {/* 对话格式帮助 */}
                <div className="mb-3">
                  <button
                    onClick={() => setDialogueFormatHelpOpen(!dialogueFormatHelpOpen)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    对话格式帮助
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`text-gray-500 transition-transform ${dialogueFormatHelpOpen ? 'rotate-180' : ''}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {dialogueFormatHelpOpen && (
                    <div className="mt-2 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg space-y-1.5">
                      {DIALOGUE_FORMAT_HELP.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px]">
                          <code className="text-amber-400 bg-[#242424] px-1.5 py-0.5 rounded shrink-0 font-mono">{h.syntax}</code>
                          <span className="text-gray-400">{h.desc}</span>
                          <span className="text-gray-600 ml-auto shrink-0">如: {h.example}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tab 栏 */}
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  {customTabs.map(tab => (
                    <button key={tab.key} onClick={() => setDialogueTab(tab.key)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                        dialogueTab === tab.key
                          ? 'bg-white text-black shadow-md'
                          : 'bg-[#1f1f1f] text-gray-500 hover:bg-[#252525] hover:text-gray-300 border border-[#2a2a2a]'
                      }`}>
                      {tab.label}
                      {tab.filled > 0 && dialogueTab !== tab.key && (
                        <span className="ml-1 text-[10px] bg-emerald-800/60 text-emerald-300 px-1 py-0.5 rounded-full">{tab.filled}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* 介绍 Tab */}
                {dialogueTab === 'intro' && (
                  <div className="space-y-2">
                    {CUSTOM_NPC_DIALOGUE_GROUPS.intro.map(dk => (
                      <DialogueItem
                        key={dk.key}
                        dialogueKey={dk.key}
                        label={dk.label}
                        desc={DIALOGUE_KEY_DESC[dk.key]}
                        dialogueMap={effectiveDialogueMap}
                        saveDialogue={saveDialogue}
                      />
                    ))}
                  </div>
                )}

                {/* 日常 Tab */}
                {dialogueTab === 'daily' && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400 font-medium">默认日常</span>
                        <span className="text-[10px] text-gray-600">适用于所有季节，好感度对话会覆盖同一天的默认对话</span>
                      </div>
                      <div className="space-y-3">
                        {DAYS.map(day => {
                          const dayHeartsKeys = CUSTOM_NPC_DIALOGUE_GROUPS.hearts
                            .filter((dk: { key: string }) => dk.key.startsWith(day))
                            .sort((a: { key: string }, b: { key: string }) => {
                              const numA = parseInt(a.key.replace(day, ''))
                              const numB = parseInt(b.key.replace(day, ''))
                              return numA - numB
                            })
                          const hasHearts = dayHeartsKeys.length > 0
                          return (
                            <div key={day}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-300 font-medium">{DAY_LABELS[day]}</span>
                                {hasHearts && <span className="text-[10px] text-amber-400">+{dayHeartsKeys.length}条好感度对话</span>}
                              </div>
                              <div className="space-y-1.5 pl-2 border-l-2 border-[#3a3a3a]">
                                <DialogueItem dialogueKey={day} label="默认" desc={DIALOGUE_CONTEXT_HELP[day] || DIALOGUE_KEY_DESC[day]} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                                {dayHeartsKeys.map((hk: { key: string; label: string }) => (
                                  <DialogueItem key={hk.key} dialogueKey={hk.key} label={hk.label} desc={`好感度达到${hk.key.replace(day, '')}心后，${DAY_LABELS[day]}的对话`} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                                ))}
                              </div>
                            </div>
                          )
                        })}
                        {/* 雨天单独一组 */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-300 font-medium">雨天</span>
                          </div>
                          <div className="space-y-1.5 pl-2 border-l-2 border-[#3a3a3a]">
                            <DialogueItem dialogueKey="rain" label="默认" desc={DIALOGUE_CONTEXT_HELP['rain'] || DIALOGUE_KEY_DESC['rain']} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* 季节对话 */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400 font-medium">季节对话</span>
                        <span className="text-[10px] text-gray-600">覆盖对应季节的默认对话</span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {['default', ...SEASONS].map(s => (
                          <button
                            key={s}
                            onClick={() => setDailySeason(s as typeof dailySeason)}
                            className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                              dailySeason === s
                                ? 'bg-white text-black shadow-sm'
                                : 'bg-[#1a1a1a] text-gray-500 hover:bg-[#222] hover:text-gray-300 border border-[#2a2a2a]'
                            }`}
                          >
                            {s === 'default' ? '默认' : SEASON_LABELS[s]}
                            {s !== 'default' && (() => {
                              const seasonKeys = CUSTOM_NPC_DIALOGUE_GROUPS.daily[s as keyof typeof CUSTOM_NPC_DIALOGUE_GROUPS.daily]
                              const filled = seasonKeys.filter((dk: { key: string }) => effectiveDialogueMap[dk.key]).length
                              return filled > 0 ? <span className="ml-1 text-[10px] bg-emerald-800/60 text-emerald-300 px-1 py-0.5 rounded-full">{filled}</span> : null
                            })()}
                          </button>
                        ))}
                      </div>
                      {dailySeason !== 'default' && (() => {
                        const seasonKeys = CUSTOM_NPC_DIALOGUE_GROUPS.daily[dailySeason as keyof typeof CUSTOM_NPC_DIALOGUE_GROUPS.daily]
                        return (
                          <div className="space-y-2">
                            {seasonKeys.map((dk: { key: string; label: string }) => (
                              <DialogueItem
                                key={dk.key}
                                dialogueKey={dk.key}
                                label={dk.label}
                                desc={DIALOGUE_KEY_DESC[dk.key] || ''}
                                dialogueMap={effectiveDialogueMap}
                                saveDialogue={saveDialogue}
                              />
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {/* 好感度 Tab */}
                {dialogueTab === 'hearts' && (
                  <div className="space-y-3">
                    <div className="mb-2 p-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                      <p className="text-[11px] text-gray-400">好感度对话在玩家与NPC达到指定心数后触发，会覆盖同一天的默认对话。键名格式为「星期+心数」，如 Mon2=周一2心。</p>
                    </div>
                    {DAYS.map(day => {
                      const dayKeys = CUSTOM_NPC_DIALOGUE_GROUPS.hearts.filter((dk: { key: string }) => dk.key.startsWith(day))
                      const filled = dayKeys.filter((dk: { key: string }) => effectiveDialogueMap[dk.key]).length
                      return (
                        <CollapsibleDialogueGroup
                          key={day}
                          groupLabel={`${DAY_LABELS[day]}（${HEART_LEVELS.length}个等级）`}
                          keys={dayKeys.map((dk: { key: string }) => dk.key)}
                          descs={dayKeys.map((dk: { key: string }) => DIALOGUE_KEY_DESC[dk.key] || `好感度达到${dk.key.replace(day, '')}心后，${DAY_LABELS[day]}的对话`)}
                          defaultOpen={filled > 0}
                          dialogueMap={effectiveDialogueMap}
                          saveDialogue={saveDialogue}
                        />
                      )
                    })}
                  </div>
                )}

                {/* 礼物反应 Tab */}
                {dialogueTab === 'gift' && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400 font-medium">通用礼物反应</span>
                        <span className="text-[10px] text-gray-600">适用于所有该类别的物品</span>
                      </div>
                      <div className="space-y-2">
                        {CUSTOM_NPC_DIALOGUE_GROUPS.gift.filter(dk => !dk.key.startsWith('AcceptBirthday')).map(dk => (
                          <DialogueItem
                            key={dk.key}
                            dialogueKey={dk.key}
                            label={dk.label}
                            desc={DIALOGUE_KEY_DESC[dk.key]}
                            dialogueMap={effectiveDialogueMap}
                            saveDialogue={saveDialogue}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400 font-medium">生日礼物反应</span>
                        <span className="text-[10px] text-gray-600">NPC生日当天收到礼物时使用</span>
                      </div>
                      <div className="space-y-2">
                        {CUSTOM_NPC_DIALOGUE_GROUPS.gift.filter(dk => dk.key.startsWith('AcceptBirthday')).map(dk => (
                          <DialogueItem
                            key={dk.key}
                            dialogueKey={dk.key}
                            label={dk.label}
                            desc={DIALOGUE_KEY_DESC[dk.key]}
                            dialogueMap={effectiveDialogueMap}
                            saveDialogue={saveDialogue}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 婚姻 Tab */}
                {dialogueTab === 'marriage' && (
                  <div className="space-y-3">
                    <div className="mb-2 p-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                      <p className="text-[11px] text-gray-400">婚姻对话在NPC与玩家结婚后触发。婚后日程对话（marriage_Mon等）会覆盖普通日程对话。</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400 font-medium">婚后日程对话</span>
                        <span className="text-[10px] text-gray-600">覆盖婚后的日常对话</span>
                      </div>
                      <div className="space-y-2">
                        {CUSTOM_NPC_DIALOGUE_GROUPS.marriage.filter(dk => dk.key.startsWith('marriage_')).map(dk => (
                          <DialogueItem
                            key={dk.key}
                            dialogueKey={dk.key}
                            label={dk.label}
                            desc={DIALOGUE_KEY_DESC[dk.key] || ''}
                            dialogueMap={effectiveDialogueMap}
                            saveDialogue={saveDialogue}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400 font-medium">配偶特殊对话</span>
                        <span className="text-[10px] text-gray-600">特定场景触发的配偶对话</span>
                      </div>
                      <div className="space-y-2">
                        {CUSTOM_NPC_DIALOGUE_GROUPS.marriage.filter(dk => !dk.key.startsWith('marriage_')).map(dk => (
                          <DialogueItem
                            key={dk.key}
                            dialogueKey={dk.key}
                            label={dk.label}
                            desc={DIALOGUE_KEY_DESC[dk.key] || ''}
                            dialogueMap={effectiveDialogueMap}
                            saveDialogue={saveDialogue}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 节日 Tab */}
                {dialogueTab === 'festival' && (
                  <div className="space-y-3">
                    <div className="mb-2 p-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                      <p className="text-[11px] text-gray-400">节日期间NPC的特殊对话。如果未设置，NPC会使用默认的节日对话。</p>
                    </div>
                    <div className="space-y-2">
                      {CUSTOM_NPC_DIALOGUE_GROUPS.festival.map(dk => (
                        <DialogueItem
                          key={dk.key}
                          dialogueKey={dk.key}
                          label={dk.label}
                          desc={DIALOGUE_KEY_DESC[dk.key] || ''}
                          dialogueMap={effectiveDialogueMap}
                          saveDialogue={saveDialogue}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 特殊 Tab */}
                {dialogueTab === 'special' && (
                  <div className="space-y-3">
                    <div className="mb-2 p-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                      <p className="text-[11px] text-gray-400">特殊场景对话，如分手、离婚、翻垃圾桶等。大部分可选填写。</p>
                    </div>
                    <div className="space-y-2">
                      {CUSTOM_NPC_DIALOGUE_GROUPS.special.map(dk => (
                        <DialogueItem
                          key={dk.key}
                          dialogueKey={dk.key}
                          label={dk.label}
                          desc={DIALOGUE_KEY_DESC[dk.key] || ''}
                          dialogueMap={effectiveDialogueMap}
                          saveDialogue={saveDialogue}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          }

          // === 原版NPC：保持现有4-Tab结构 ===
          const standardKeys = new Set(DIALOGUE_KEYS.map(dk => dk.key))
          const introKeys = DIALOGUE_KEYS.filter(dk => dk.key === 'Introduction')
          const dailyKeys = DIALOGUE_KEYS.filter(dk => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'rain'].includes(dk.key))
          const giftKeys = DIALOGUE_KEYS.filter(dk => dk.key.startsWith('AcceptGift_'))

          const allExtraKeys = Object.keys(effectiveDialogueMap)
            .filter(key => !standardKeys.has(key) && !key.startsWith('$'))
            .sort()

          // 好感度对话键（如 Mon2, Tue4, Sun10）归入日常Tab，按星期分组显示
          const heartsExtraKeys = allExtraKeys.filter(key => /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\d+$/.test(key))

          const seasonalExtraKeys = allExtraKeys.filter(key => {
            if (['spring', 'summer', 'fall', 'winter'].includes(key)) return true
            if (/^(spring|summer|fall|winter)_(Mon|Tue|Wed|Thu|Fri|Sat|Sun|rain)$/.test(key)) return true
            if (/^(spring|summer|fall|winter)_\d+$/.test(key)) return true
            if (/^(spring|summer|fall|winter)_(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\d+$/.test(key)) return true
            return false
          })
          const giftExtraKeys = allExtraKeys.filter(key =>
            key.startsWith('AcceptGift_') || key.startsWith('AcceptBirthdayGift_')
          )
          const otherExtraKeys = allExtraKeys.filter(key =>
            !heartsExtraKeys.includes(key) &&
            !seasonalExtraKeys.includes(key) &&
            !key.startsWith('AcceptGift_') && !key.startsWith('AcceptBirthdayGift_')
          )

          const seasonGroups: { season: string; seasonLabel: string; keys: string[] }[] = [
            { season: 'spring', seasonLabel: '春季', keys: [] },
            { season: 'summer', seasonLabel: '夏季', keys: [] },
            { season: 'fall', seasonLabel: '秋季', keys: [] },
            { season: 'winter', seasonLabel: '冬季', keys: [] },
          ]
          for (const key of seasonalExtraKeys) {
            const seasonMatch = key.match(/^(spring|summer|fall|winter)/)
            if (seasonMatch) {
              const group = seasonGroups.find(g => g.season === seasonMatch[1])
              if (group) group.keys.push(key)
            }
          }
          const activeSeasonGroups = seasonGroups.filter(g => g.keys.length > 0)

          const groupedExtras: Record<string, { groupLabel: string; keys: string[]; descs: string[] }> = {}
          for (const key of otherExtraKeys) {
            const cat = categorizeDialogueKey(key)
            if (!groupedExtras[cat.group]) {
              groupedExtras[cat.group] = { groupLabel: cat.groupLabel, keys: [], descs: [] }
            }
            groupedExtras[cat.group].keys.push(key)
            groupedExtras[cat.group].descs.push(cat.desc)
          }
          const groupOrder = ['hearts', 'location', 'marriage', 'island', 'movie', 'festival', 'reject', 'other']
          const sortedGroups = groupOrder
            .filter(g => groupedExtras[g])
            .map(g => ({ group: g, ...groupedExtras[g] }))
          for (const [g, data] of Object.entries(groupedExtras)) {
            if (!groupOrder.includes(g)) {
              sortedGroups.push({ group: g, ...data })
            }
          }

          const countFilled = (keys: { key: string }[]) => keys.filter(dk => effectiveDialogueMap[dk.key]).length
          const introFilled = countFilled(introKeys)
          const dailyFilled = countFilled(dailyKeys) + seasonalExtraKeys.filter(k => effectiveDialogueMap[k]).length + heartsExtraKeys.filter(k => effectiveDialogueMap[k]).length
          const giftFilled = countFilled(giftKeys) + giftExtraKeys.filter(k => effectiveDialogueMap[k]).length
          const extraFilled = otherExtraKeys.filter(k => effectiveDialogueMap[k]).length

          const tabs: { key: 'intro' | 'daily' | 'gift' | 'extra'; label: string; filled: number; total: number }[] = [
            { key: 'intro', label: '介绍', filled: introFilled, total: introKeys.length },
            { key: 'daily', label: '日常', filled: dailyFilled, total: dailyKeys.length + seasonalExtraKeys.length + heartsExtraKeys.length },
            { key: 'gift', label: '礼物反应', filled: giftFilled, total: giftKeys.length + giftExtraKeys.length },
            ...(otherExtraKeys.length > 0 ? [{ key: 'extra' as const, label: '其他', filled: extraFilled, total: otherExtraKeys.length }] : []),
          ]

          return (
            <>
              {/* Tab 栏 */}
              <div className="flex items-center gap-1 mb-3">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setDialogueTab(tab.key)}
                    className={`text-sm px-4 py-2 rounded-lg transition-colors font-medium ${
                      dialogueTab === tab.key
                        ? 'bg-white text-black shadow-md'
                        : 'bg-[#1f1f1f] text-gray-500 hover:bg-[#252525] hover:text-gray-300 border border-[#2a2a2a]'
                    }`}>
                    {tab.label}
                    {tab.filled > 0 && dialogueTab !== tab.key && (
                      <span className="ml-1.5 text-[10px] bg-emerald-800/60 text-emerald-300 px-1.5 py-0.5 rounded-full">{tab.filled}</span>
                    )}
                  </button>
                ))}
              </div>

              {dialogueTab === 'intro' && (
                <div className="space-y-2">
                  {introKeys.map(dk => (
                    <DialogueItem key={dk.key} dialogueKey={dk.key} label={dk.label} desc={DIALOGUE_KEY_DESC[dk.key]} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                  ))}
                </div>
              )}
              {dialogueTab === 'daily' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 font-medium">默认日常</span>
                      <span className="text-[10px] text-gray-600">适用于所有季节，好感度对话会覆盖同一天的默认对话</span>
                    </div>
                    <div className="space-y-3">
                      {DAYS.map(day => {
                        const dayKey = day
                        const dayHeartsKeys = heartsExtraKeys
                          .filter(k => k.startsWith(day))
                          .sort((a, b) => {
                            const numA = parseInt(a.replace(day, ''))
                            const numB = parseInt(b.replace(day, ''))
                            return numA - numB
                          })
                        const hasHearts = dayHeartsKeys.length > 0
                        return (
                          <div key={day}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-300 font-medium">{DAY_LABELS[day]}</span>
                              {hasHearts && <span className="text-[10px] text-amber-400">+{dayHeartsKeys.length}条好感度对话</span>}
                            </div>
                            <div className="space-y-1.5 pl-2 border-l-2 border-[#3a3a3a]">
                              <DialogueItem key={dayKey} dialogueKey={dayKey} label="默认" desc={DIALOGUE_CONTEXT_HELP[dayKey]} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                              {dayHeartsKeys.map(hk => (
                                <DialogueItem key={hk} dialogueKey={hk} label={getDialogueKeyLabel(hk)} desc={`好感度达到${hk.replace(day, '')}心后，${DAY_LABELS[day]}的对话`} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      {/* 雨天单独一组 */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-300 font-medium">雨天</span>
                        </div>
                        <div className="space-y-1.5 pl-2 border-l-2 border-[#3a3a3a]">
                          <DialogueItem key="rain" dialogueKey="rain" label="默认" desc={DIALOGUE_CONTEXT_HELP['rain']} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {activeSeasonGroups.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400 font-medium">季节对话</span>
                        <span className="text-[10px] text-gray-600">来自游戏原版对话文件，覆盖对应季节的默认对话</span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        <button onClick={() => setDailySeason('default')} className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${dailySeason === 'default' ? 'bg-white text-black shadow-sm' : 'bg-[#1a1a1a] text-gray-500 hover:bg-[#222] hover:text-gray-300 border border-[#2a2a2a]'}`}>默认</button>
                        {activeSeasonGroups.map(sg => (
                          <button key={sg.season} onClick={() => setDailySeason(sg.season as typeof dailySeason)} className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${dailySeason === sg.season ? 'bg-white text-black shadow-sm' : 'bg-[#1a1a1a] text-gray-500 hover:bg-[#222] hover:text-gray-300 border border-[#2a2a2a]'}`}>
                            {sg.seasonLabel}
                            {sg.keys.filter(k => effectiveDialogueMap[k]).length > 0 && <span className="ml-1 text-[10px] bg-emerald-800/60 text-emerald-300 px-1 py-0.5 rounded-full">{sg.keys.filter(k => effectiveDialogueMap[k]).length}</span>}
                          </button>
                        ))}
                      </div>
                      {dailySeason !== 'default' && (() => {
                        const currentGroup = activeSeasonGroups.find(g => g.season === dailySeason)
                        if (!currentGroup || currentGroup.keys.length === 0) return null
                        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'rain']
                        const sortedKeys = [...currentGroup.keys].sort((a, b) => {
                          const getSortKey = (k: string) => {
                            if (/^(spring|summer|fall|winter)$/.test(k)) return `0_${k}`
                            const dayMatch = k.match(/^(spring|summer|fall|winter)_(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/)
                            if (dayMatch) return `1_${dayOrder.indexOf(dayMatch[2])}`
                            if (/^(spring|summer|fall|winter)_rain$/.test(k)) return '2'
                            const dateMatch = k.match(/^(spring|summer|fall|winter)_(\d+)$/)
                            if (dateMatch) return `3_${dateMatch[2].padStart(3, '0')}`
                            return `4_${k}`
                          }
                          return getSortKey(a).localeCompare(getSortKey(b))
                        })
                        return (
                          <div className="space-y-2">
                            {sortedKeys.map(key => (
                              <DialogueItem key={key} dialogueKey={key} label={getDialogueKeyLabel(key)} desc={DIALOGUE_KEY_DESC[key] || ''} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}
              {dialogueTab === 'gift' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 font-medium">通用礼物反应</span>
                      <span className="text-[10px] text-gray-600">适用于所有该类别的物品</span>
                    </div>
                    <div className="space-y-2">
                      {giftKeys.map(dk => (
                        <DialogueItem key={dk.key} dialogueKey={dk.key} label={dk.label} desc={DIALOGUE_KEY_DESC[dk.key]} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                      ))}
                    </div>
                  </div>
                  {giftExtraKeys.length > 0 && (() => {
                    const genericGiftExtras = giftExtraKeys.filter(k => {
                      const giftTastes = ['Loved', 'Liked', 'Neutral', 'Disliked', 'Hated', 'Positive', 'Negative']
                      return giftTastes.some(t => k === `AcceptGift_${t}`)
                    })
                    const birthdayGiftExtras = giftExtraKeys.filter(k => k.startsWith('AcceptBirthdayGift_'))
                    const specificGiftExtras = giftExtraKeys.filter(k => !genericGiftExtras.includes(k) && !k.startsWith('AcceptBirthdayGift_'))
                    return (
                      <>
                        {genericGiftExtras.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-400 font-medium">原版通用反应</span>
                              <span className="text-[10px] text-gray-600">来自游戏原版对话文件</span>
                            </div>
                            <div className="space-y-2">
                              {genericGiftExtras.map(key => (
                                <DialogueItem key={key} dialogueKey={key} label={getDialogueKeyLabel(key)} desc={DIALOGUE_KEY_DESC[key] || '收到该类别礼物时的通用回应'} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                              ))}
                            </div>
                          </div>
                        )}
                        {birthdayGiftExtras.length > 0 && (
                          <CollapsibleDialogueGroup key={`birthday-${birthdayGiftExtras.length}`} groupLabel={`生日礼物反应（${birthdayGiftExtras.length}条）`} keys={birthdayGiftExtras} descs={birthdayGiftExtras.map(k => DIALOGUE_KEY_DESC[k] || getDialogueKeyLabel(k))} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                        )}
                        {specificGiftExtras.length > 0 && (
                          <CollapsibleDialogueGroup key={`specific-${specificGiftExtras.length}`} groupLabel={`特定物品反应（${specificGiftExtras.length}条）`} keys={specificGiftExtras} descs={specificGiftExtras.map(k => { const cat = categorizeDialogueKey(k); return cat.desc || '收到特定物品时的回应' })} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
              {dialogueTab === 'extra' && otherExtraKeys.length > 0 && (
                <div>
                  <div className="mb-3 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                    <p className="text-xs text-gray-400">
                      以下是游戏原版对话文件中的特殊对话，<span className="text-amber-400">一般不需要修改</span>。点击分组展开查看和编辑。
                    </p>
                  </div>
                  <div className="space-y-2">
                    {sortedGroups.map(g => (
                      <CollapsibleDialogueGroup key={g.group} groupLabel={`${g.groupLabel}（${g.keys.length}条）`} keys={g.keys} descs={g.descs} dialogueMap={effectiveDialogueMap} saveDialogue={saveDialogue} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        })()}
          </div>
        )}

        {/* 礼物喜好 Tab */}
        {topTab === 'gift' && (
          <div className="space-y-4">
            <EditableGiftTastes npc={npc} updateCustomNpc={updateCustomNpc} custom={custom} />
            {/* Gift Category Selector - standalone component that copies category IDs to clipboard */}
            <GiftCategorySelector loved="" liked="" disliked="" hated="" onAddCategory={() => {}} />
          </div>
        )}

        {/* 人际关系 Tab */}
        {topTab === 'relations' && (
          <RelationsEditor npc={npc} updateCustomNpc={updateCustomNpc} custom={custom} />
        )}

        {/* 心形事件 Tab */}
        {topTab === 'heartEvents' && (
          <HeartEventsTab npc={npc} custom={custom} navigate={navigate} />
        )}
      </div>
    </div>
  )
}

// Schedule: 季节 → 日期 两级结构
// 实际存储键: spring, spring_Mon, spring_rain, summer, summer_Mon ...
// 游戏匹配优先级: season_day+rain > season_day > season_rain > season > day+rain > day > rain
const SEASON_TABS = [
  { key: 'spring', label: '春季', color: 'text-green-400' },
  { key: 'summer', label: '夏季', color: 'text-yellow-400' },
  { key: 'fall', label: '秋季', color: 'text-orange-400' },
  { key: 'winter', label: '冬季', color: 'text-blue-400' },
]

const DAY_TABS = [
  { key: '', label: '默认', desc: '该季节的默认日程（未设具体日时使用）' },
  { key: 'Mon', label: '周一' },
  { key: 'Tue', label: '周二' },
  { key: 'Wed', label: '周三' },
  { key: 'Thu', label: '周四' },
  { key: 'Fri', label: '周五' },
  { key: 'Sat', label: '周六' },
  { key: 'Sun', label: '周日' },
  { key: 'rain', label: '雨天' },
]

// 特殊日程键分类（用于动态检测和展示）
// 游戏原版日程文件可能包含这些特殊键
const SPECIAL_SCHEDULE_KEYS: Record<string, { label: string; desc: string }> = {
  // 婚姻相关
  'marriage': { label: '婚姻日程', desc: '婚后日常日程' },
  'marriage_Mon': { label: '婚姻周一', desc: '婚后周一日程' },
  'marriage_Tue': { label: '婚姻周二', desc: '婚后周二日程' },
  'marriage_Wed': { label: '婚姻周三', desc: '婚后周三日程' },
  'marriage_Thu': { label: '婚姻周四', desc: '婚后周四日程' },
  'marriage_Fri': { label: '婚姻周五', desc: '婚后周五日程' },
  'marriage_Sat': { label: '婚姻周六', desc: '婚后周六日程' },
  'marriage_Sun': { label: '婚姻周日', desc: '婚后周日日程' },
  'marriageJob': { label: '婚姻工作', desc: '婚后工作日程' },
  'marriageJob_Mon': { label: '婚姻工作周一', desc: '婚后周一工作日程' },
  'marriageJob_Tue': { label: '婚姻工作周二', desc: '婚后周二工作日程' },
  'marriageJob_Wed': { label: '婚姻工作周三', desc: '婚后周三工作日程' },
  'marriageJob_Thu': { label: '婚姻工作周四', desc: '婚后周四工作日程' },
  'marriageJob_Fri': { label: '婚姻工作周五', desc: '婚后周五工作日程' },
  'marriageJob_Sat': { label: '婚姻工作周六', desc: '婚后周六工作日程' },
  'marriageJob_Sun': { label: '婚姻工作周日', desc: '婚后周日工作日程' },
  // 姜岛相关
  'Island': { label: '姜岛', desc: '姜岛日程' },
  'Island_Mon': { label: '姜岛周一', desc: '姜岛周一日程' },
  'Island_Tue': { label: '姜岛周二', desc: '姜岛周二日程' },
  'Island_Wed': { label: '姜岛周三', desc: '姜岛周三日程' },
  'Island_Thu': { label: '姜岛周四', desc: '姜岛周四日程' },
  'Island_Fri': { label: '姜岛周五', desc: '姜岛周五日程' },
  'Island_Sat': { label: '姜岛周六', desc: '姜岛周六日程' },
  'Island_Sun': { label: '姜岛周日', desc: '姜岛周日日程' },
  // 特定日期（节日等）
  'spring_15': { label: '春季15日', desc: '花舞节前夜' },
  'spring_24': { label: '春季24日', desc: '花舞节' },
  'summer_10': { label: '夏季10日', desc: '夏威夷宴会' },
  'summer_28': { label: '夏季28日', desc: '月光水母舞会' },
  'fall_15': { label: '秋季15日', desc: '展览会前夜' },
  'fall_16': { label: '秋季16日', desc: '展览会' },
  'fall_27': { label: '秋季27日', desc: '万灵节前夜' },
  'winter_15': { label: '冬季15日', desc: '冰雪节' },
  'winter_24': { label: '冬季24日', desc: '冬日星盛宴前夜' },
  'winter_25': { label: '冬季25日', desc: '冬日星盛宴' },
  'winter_28': { label: '冬季28日', desc: '年末' },
  // 沙漠节(1.6 新增)
  'DesertFestival': { label: '沙漠节', desc: '沙漠节日程' },
  'DesertFestival_1': { label: '沙漠节第1天', desc: '沙漠节第1天日程' },
  'DesertFestival_2': { label: '沙漠节第2天', desc: '沙漠节第2天日程' },
  'DesertFestival_3': { label: '沙漠节第3天', desc: '沙漠节第3天日程' },
  'marriage_DesertFestival_1': { label: '婚后沙漠节1', desc: '婚后沙漠节第1天' },
  'marriage_DesertFestival_2': { label: '婚后沙漠节2', desc: '婚后沙漠节第2天' },
  'marriage_DesertFestival_3': { label: '婚后沙漠节3', desc: '婚后沙漠节第3天' },
  // 绿雨事件(1.5 新增)
  'GreenRain': { label: '绿雨', desc: '绿雨事件日程' },
  'GreenRain1': { label: '绿雨第1年', desc: '绿雨第一年事件' },
  'GreenRain2': { label: '绿雨第2年', desc: '绿雨第二年事件' },
  // 鱼王节日
  'SquidFest': { label: '鱿鱼节', desc: '鱿鱼节(冬15日)' },
  'SquidFest_Mon': { label: '鱿鱼节周一', desc: '鱿鱼节周一日程' },
  'SquidFest_Tue': { label: '鱿鱼节周二', desc: '鱿鱼节周二日程' },
  'SquidFest_Wed': { label: '鱿鱼节周三', desc: '鱿鱼节周三日程' },
  'SquidFest_Thu': { label: '鱿鱼节周四', desc: '鱿鱼节周四日程' },
  'SquidFest_Fri': { label: '鱿鱼节周五', desc: '鱿鱼节周五日程' },
  'SquidFest_Sat': { label: '鱿鱼节周六', desc: '鱿鱼节周六日程' },
  'SquidFest_Sun': { label: '鱿鱼节周日', desc: '鱿鱼节周日日程' },
  // 夜市(冬15-17日)
  'winter_16': { label: '冬季16日', desc: '夜市' },
  'winter_17': { label: '冬季17日', desc: '夜市' },
  'summer_9': { label: '夏季9日', desc: '特殊日' },
  // 离婚/丧偶/独身后
  'divorced': { label: '离婚后', desc: '离婚后日程' },
  'dumped': { label: '分手后', desc: '分手后日程' },
}

// 判断日程键是否在标准季节/日期tab中能展示
// 标准展示位置包括：
// 1. season / season_day 形式（如 spring、spring_Mon）
// 2. 通用 day 形式（Mon、rain）—— 出现在每个季节的 day tab 中
function isStandardScheduleKey(key: string): boolean {
  const seasons = ['spring', 'summer', 'fall', 'winter']
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'rain']
  // 通用 day 键（如 Mon, rain）—— 在 day tab 可见
  if (days.includes(key)) return true
  // season 或 season_day 形式
  for (const season of seasons) {
    if (key === season) return true
    for (const day of days) {
      if (key === `${season}_${day}`) return true
    }
  }
  return false
}

// 获取日程键的显示标签
function getScheduleKeyLabel(key: string): string {
  // 1. 优先查特殊键映射
  if (SPECIAL_SCHEDULE_KEYS[key]) return SPECIAL_SCHEDULE_KEYS[key].label
  // 2. 标准格式解析
  const seasons: Record<string, string> = { spring: '春季', summer: '夏季', fall: '秋季', winter: '冬季' }
  const days: Record<string, string> = { Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四', Fri: '周五', Sat: '周六', Sun: '周日', rain: '雨天' }
  // 3. 通用 day 键
  if (days[key]) return days[key]
  // 4. season / season_day 形式
  const parts = key.split('_')
  if (parts.length === 1 && seasons[parts[0]]) return seasons[parts[0]]
  if (parts.length === 2 && seasons[parts[0]] && days[parts[1]]) return `${seasons[parts[0]]}${days[parts[1]]}`
  // 5. 数字日期（如 spring_15）
  if (parts.length === 2 && seasons[parts[0]] && /^\d+$/.test(parts[1])) return `${seasons[parts[0]]}${parts[1]}日`
  // 6. 含下划线的复合键（rain_xxx, DesertFestival_1 等）
  //    把每个子段翻译后拼接，下划线显示为"·"
  if (parts.length >= 2) {
    const translated = parts.map(p => {
      if (seasons[p]) return seasons[p]
      if (days[p]) return days[p]
      if (/^\d+$/.test(p)) return `${p}日`
      return p
    })
    // 如果至少有一个子段被翻译过，说明是可拆分的复合键
    const wasTranslated = parts.some((p, i) => translated[i] !== p)
    if (wasTranslated) return translated.join('·')
  }
  // 7. 驼峰拆分（如 GreenRain1 → 绿雨 1）
  const camelMatch = key.match(/^([A-Z][a-z]+)([A-Z]?[a-z]*)?(\d+)?$/)
  if (camelMatch) {
    // 简单驼峰转中文：保留数字并把英文分段用"·"连接（仅用于特殊节日）
    const head = camelMatch[1]
    const tail = camelMatch[2] || ''
    const num = camelMatch[3] || ''
    // 已知节日名映射（驼峰英文转中文）
    const festivalMap: Record<string, string> = {
      'GreenRain': '绿雨', 'SquidFest': '鱿鱼节', 'DesertFestival': '沙漠节',
      'MovieTheater': '电影院', 'Resort': '姜岛度假',
    }
    const fullKey = head + tail
    if (festivalMap[fullKey]) return festivalMap[fullKey] + (num ? ` ${num}` : '')
    if (festivalMap[head]) return festivalMap[head] + (num ? ` ${num}` : '')
  }
  // 8. 最后的回退：直接返回键名
  return key
}

// 获取实际存储键：季节+日期组合
function getScheduleKey(season: string, day: string): string {
  if (!day) return season // 默认 = 季节本身
  return `${season}_${day}` // 如 spring_Mon, summer_rain
}

function normalizeSchedule(schedule: ScheduleEntry[] | Record<string, ScheduleEntry[]> | undefined): Record<string, ScheduleEntry[]> {
  if (!schedule) return {}
  if (Array.isArray(schedule)) return { spring: schedule }
  // 兼容旧数据：将 "default" 键迁移到 "spring"
  const result: Record<string, ScheduleEntry[]> = {}
  for (const [key, entries] of Object.entries(schedule)) {
    if (key === 'default') {
      result['spring'] = entries
    } else {
      result[key] = entries
    }
  }
  return result
}

// ---- 特殊日程单项（可折叠）----
function SpecialScheduleItem({ scheduleKey, entries, allLocations, timeLabel, locationLabel, onAddEntry, onDeleteSchedule }: {
  scheduleKey: string; entries: ScheduleEntry[]; allLocations: { value: string; label: string; desc: string }[]
  timeLabel: (v: string) => string; locationLabel: (v: string) => string
  onAddEntry: () => void; onDeleteSchedule: () => void
}): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const label = getScheduleKeyLabel(scheduleKey)
  const specialInfo = SPECIAL_SCHEDULE_KEYS[scheduleKey]
  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#222] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-200 font-medium">{label}</span>
          {specialInfo && <span className="text-xs text-gray-500">({specialInfo.desc})</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{entries.length} 条</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-[#2a2a2a] pt-2">
          {/* Timeline preview */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
            {entries.map((entry, idx) => {
              const locationInfo = allLocations.find(m => m.value === entry.location)
              return (
                <div key={idx} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-blue-400 font-medium">{timeLabel(entry.time)}</span>
                    <div className="w-3 h-3 rounded-full bg-blue-500 my-1.5 ring-2 ring-blue-500/20"></div>
                    <span className="text-xs text-gray-400 max-w-[80px] truncate" title={locationInfo?.desc}>
                      {locationLabel(entry.location)}
                    </span>
                  </div>
                  {idx < entries.length - 1 && (
                    <div className="w-10 h-0.5 bg-[#444] mx-1"></div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Detail list */}
          {entries.map((entry, idx) => (
            <div key={idx} className="bg-[#242424] rounded-lg p-3 border border-[#2a2a2a]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-blue-400 font-medium min-w-[80px]">{timeLabel(entry.time)}</span>
                <span className="text-xs text-gray-300">{locationLabel(entry.location)}</span>
                <span className="text-xs text-gray-500">({entry.tileX}, {entry.tileY})</span>
                <span className="text-xs text-gray-500">朝向: {FACING_LABELS[entry.facing] || entry.facing}</span>
                {entry.command && <span className="text-xs text-amber-400">{entry.command}</span>}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={onAddEntry}
              className="flex-1 py-2 border-2 border-dashed border-[#333] rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:border-[#444] transition-colors">
              + 添加条目
            </button>
            <button onClick={onDeleteSchedule}
              className="px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-red-800/30 transition-colors">
              删除此日程
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- 特殊日程区域 ----
function SpecialScheduleSection({ schedules, setSchedules, allLocations, timeLabel, locationLabel }: {
  schedules: Record<string, ScheduleEntry[]>
  setSchedules: React.Dispatch<React.SetStateAction<Record<string, ScheduleEntry[]>>>
  allLocations: { value: string; label: string; desc: string }[]
  timeLabel: (v: string) => string; locationLabel: (v: string) => string
}): JSX.Element | null {
  const nonStandardKeys = Object.keys(schedules).filter(key => !isStandardScheduleKey(key) && (schedules[key] || []).length > 0)
  if (nonStandardKeys.length === 0) return null
  return (
    <div className="bg-[#1f1f1f] rounded-lg p-4 border border-[#2a2a2a]">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm text-gray-400 flex items-center gap-1.5">
          其他日程
          <span className="text-xs text-gray-500">（婚姻/姜岛/特定日期等特殊日程）</span>
        </label>
        <span className="text-xs text-gray-500">{nonStandardKeys.length} 个</span>
      </div>
      <div className="space-y-2">
        {nonStandardKeys.map(key => (
          <SpecialScheduleItem
            key={key}
            scheduleKey={key}
            entries={schedules[key] || []}
            allLocations={allLocations}
            timeLabel={timeLabel}
            locationLabel={locationLabel}
            onAddEntry={() => {
              const newEntries = [...(schedules[key] || []), { time: '610', location: 'Town', tileX: 0, tileY: 0, facing: 2 }]
              setSchedules({ ...schedules, [key]: newEntries })
            }}
            onDeleteSchedule={() => {
              const updated = { ...schedules }
              delete updated[key]
              setSchedules(updated)
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ---- 住所预设（室内有床地点）----
// NPC睡觉需要有床，不能在户外
const HOME_PRESETS = [
  // === 城镇住宅 ===
  { value: 'Town', label: '鹈鹕镇', desc: '城镇中心（需配合坐标）', x: 47, y: 87 },
  { value: 'JoshHouse', label: '乔治家', desc: '乔治和艾芙琳的家', x: 16, y: 22 },
  { value: 'SamHouse', label: '山姆家', desc: '柳巷1号', x: 4, y: 5 },
  { value: 'HaleyHouse', label: '海莉家', desc: '柳巷2号', x: 16, y: 5 },
  { value: 'AlexHouse', label: '亚历克斯家', desc: '亚历克斯和艾芙琳的家', x: 19, y: 5 },
  { value: 'ManorHouse', label: '镇长大宅', desc: '刘易斯镇长的豪宅', x: 8, y: 5 },
  { value: 'Trailer', label: '拖车', desc: '潘姆和潘妮的拖车', x: 15, y: 4 },

  // === 其他区域住宅 ===
  { value: 'ElliottHouse', label: '海边小屋', desc: '艾利奥特的海边小屋', x: 1, y: 5 },
  { value: 'LeahHouse', label: '森林小屋', desc: '莉亚的森林木屋', x: 3, y: 7 },
  { value: 'ScienceHouse', label: '木工店', desc: '罗宾的木工店（山区）', x: 19, y: 4 },
  { value: 'IslandHouse', label: '姜岛度假屋', desc: '姜岛的度假小屋', x: 8, y: 8 },

  // === 农舍（仅配偶）===
  { value: 'FarmHouse', label: '农舍', desc: '仅配偶婚后可用', x: 4, y: 8 },
]

// Schedule templates
const SCHEDULE_TEMPLATES = [
  {
    name: '普通村民',
    desc: '早上在家，白天在镇里，晚上回家',
    difficulty: '简单',
    entries: [
      { time: '610', location: 'Town', tileX: 47, tileY: 87, facing: 0 },
      { time: '900', location: 'Town', tileX: 73, tileY: 54, facing: 2 },
      { time: '1400', location: 'Saloon', tileX: 42, tileY: 17, facing: 2 },
      { time: '1900', location: 'Town', tileX: 47, tileY: 87, facing: 0 },
      { time: '2200', location: 'Town', tileX: 47, tileY: 87, facing: 0, command: 'sleep' },
    ]
  },
  {
    name: '店主',
    desc: '固定时间在店里，中午短暂休息，晚上关门',
    difficulty: '中等',
    entries: [
      { time: '800', location: 'SeedShop', tileX: 39, tileY: 5, facing: 0 },
      { time: '1200', location: 'Saloon', tileX: 42, tileY: 17, facing: 2 },
      { time: '1700', location: 'SeedShop', tileX: 39, tileY: 5, facing: 0 },
      { time: '2200', location: 'SeedShop', tileX: 39, tileY: 5, facing: 0, command: 'sleep' },
    ]
  },
  {
    name: '海滩爱好者',
    desc: '大部分时间在海滩，傍晚回镇上',
    difficulty: '简单',
    entries: [
      { time: '800', location: 'Beach', tileX: 30, tileY: 34, facing: 2 },
      { time: '1200', location: 'Beach', tileX: 13, tileY: 39, facing: 2 },
      { time: '1700', location: 'Town', tileX: 73, tileY: 54, facing: 2 },
      { time: '2200', location: 'Town', tileX: 47, tileY: 87, facing: 0, command: 'sleep' },
    ]
  },
  {
    name: '隐士',
    desc: '整天待在森林或山区',
    difficulty: '简单',
    entries: [
      { time: '610', location: 'Forest', tileX: 14, tileY: 40, facing: 2 },
      { time: '1400', location: 'Mountain', tileX: 46, tileY: 23, facing: 2 },
      { time: '2200', location: 'Forest', tileX: 14, tileY: 40, facing: 2, command: 'sleep' },
    ]
  },
  {
    name: '冒险者',
    desc: '白天在冒险者公会，晚上回镇上',
    difficulty: '简单',
    entries: [
      { time: '610', location: 'Mountain', tileX: 49, tileY: 31, facing: 2 },
      { time: '900', location: 'AdventureGuild', tileX: 5, tileY: 8, facing: 0 },
      { time: '1800', location: 'Mountain', tileX: 49, tileY: 31, facing: 2 },
      { time: '2200', location: 'Mountain', tileX: 49, tileY: 31, facing: 2, command: 'sleep' },
    ]
  },
]

const TIME_OPTIONS = [
  { value: '600', label: '上午 6:00' }, { value: '630', label: '上午 6:30' },
  { value: '700', label: '上午 7:00' }, { value: '730', label: '上午 7:30' },
  { value: '800', label: '上午 8:00' }, { value: '830', label: '上午 8:30' },
  { value: '900', label: '上午 9:00' }, { value: '930', label: '上午 9:30' },
  { value: '1000', label: '上午 10:00' }, { value: '1030', label: '上午 10:30' },
  { value: '1100', label: '上午 11:00' }, { value: '1130', label: '上午 11:30' },
  { value: '1200', label: '中午 12:00' }, { value: '1230', label: '中午 12:30' },
  { value: '1300', label: '下午 1:00' }, { value: '1330', label: '下午 1:30' },
  { value: '1400', label: '下午 2:00' }, { value: '1430', label: '下午 2:30' },
  { value: '1500', label: '下午 3:00' }, { value: '1530', label: '下午 3:30' },
  { value: '1600', label: '下午 4:00' }, { value: '1630', label: '下午 4:30' },
  { value: '1700', label: '下午 5:00' }, { value: '1730', label: '下午 5:30' },
  { value: '1800', label: '下午 6:00' }, { value: '1830', label: '下午 6:30' },
  { value: '1900', label: '下午 7:00' }, { value: '1930', label: '下午 7:30' },
  { value: '2000', label: '下午 8:00' }, { value: '2030', label: '下午 8:30' },
  { value: '2100', label: '下午 9:00' }, { value: '2130', label: '下午 9:30' },
  { value: '2200', label: '下午 10:00' }, { value: '2230', label: '下午 10:30' },
  { value: '2300', label: '下午 11:00' }, { value: '2330', label: '下午 11:30' },
  { value: '2400', label: '午夜 12:00' }, { value: '260', label: '凌晨 2:00' },
]

// ---- 地点分组（用于下拉框 optgroup）----
const LOCATION_GROUPS = [
  {
    label: '居住区 (NPC睡觉)',
    locations: [
      { value: 'Town', label: '鹈鹕镇', desc: '城镇中心', defaultX: 47, defaultY: 87 },
      { value: 'JoshHouse', label: '乔治家', desc: '乔治和艾芙琳的家', defaultX: 16, defaultY: 22 },
      { value: 'SamHouse', label: '山姆家', desc: '柳巷1号', defaultX: 4, defaultY: 5 },
      { value: 'HaleyHouse', label: '海莉家', desc: '柳巷2号', defaultX: 16, defaultY: 5 },
      { value: 'AlexHouse', label: '亚历克斯家', desc: '亚历克斯的家', defaultX: 19, defaultY: 5 },
      { value: 'ManorHouse', label: '镇长大宅', desc: '刘易斯的家', defaultX: 8, defaultY: 5 },
      { value: 'Trailer', label: '拖车', desc: '潘姆和潘妮的家', defaultX: 15, defaultY: 4 },
      { value: 'ElliottHouse', label: '海边小屋', desc: '艾利奥特的家', defaultX: 1, defaultY: 5 },
      { value: 'LeahHouse', label: '森林小屋', desc: '莉亚的木屋', defaultX: 3, defaultY: 7 },
      { value: 'ScienceHouse', label: '木工店', desc: '罗宾的店（山区）', defaultX: 19, defaultY: 4 },
      { value: 'IslandHouse', label: '姜岛度假屋', desc: '姜岛的度假屋', defaultX: 8, defaultY: 8 },
      { value: 'FarmHouse', label: '农舍', desc: '仅配偶可用', defaultX: 4, defaultY: 8 },
    ]
  },
  {
    label: '工作地点 (NPC白天活动)',
    locations: [
      { value: 'SeedShop', label: '杂货店', desc: '皮埃尔的种子商店', defaultX: 39, defaultY: 5 },
      { value: 'Saloon', label: '酒馆', desc: '格斯的星之果实餐吧', defaultX: 42, defaultY: 17 },
      { value: 'Hospital', label: '医院', desc: '哈维的诊所', defaultX: 13, defaultY: 14 },
      { value: 'Blacksmith', label: '铁匠铺', desc: '克林特的铁匠铺', defaultX: 5, defaultY: 8 },
      { value: 'Library', label: '博物馆', desc: '博物馆和图书馆', defaultX: 11, defaultY: 9 },
      { value: 'ManorHouse', label: '镇长大宅', desc: '刘易斯的豪宅', defaultX: 8, defaultY: 8 },
      { value: 'AnimalShop', label: '动物商店', desc: '玛妮的牧场', defaultX: 5, defaultY: 8 },
      { value: 'FishShop', label: '鱼店', desc: '威利的鱼店', defaultX: 5, defaultY: 8 },
      { value: 'CommunityCenter', label: '社区中心', desc: '社区中心', defaultX: 10, defaultY: 8 },
      { value: 'WizardHouse', label: '巫师塔', desc: '巫师的住所', defaultX: 5, defaultY: 8 },
      { value: 'AdventureGuild', label: '冒险者公会', desc: '马龙的公会', defaultX: 5, defaultY: 8 },
    ]
  },
  {
    label: '户外活动 (NPC可以走路)',
    locations: [
      { value: 'Town', label: '鹈鹕镇', desc: '城镇中心', defaultX: 47, defaultY: 87 },
      { value: 'Beach', label: '海滩', desc: '沙滩区域', defaultX: 30, defaultY: 34 },
      { value: 'Forest', label: '森林', desc: '城镇西侧森林', defaultX: 14, defaultY: 40 },
      { value: 'Mountain', label: '山区', desc: '矿井附近山区', defaultX: 46, defaultY: 23 },
      { value: 'Desert', label: '沙漠', desc: '卡利科沙漠', defaultX: 30, defaultY: 40 },
      { value: 'IslandWest', label: '姜岛西部', desc: '姜岛主要区域', defaultX: 30, defaultY: 30 },
      { value: 'BusStop', label: '巴士站', desc: '农场前方巴士站', defaultX: 22, defaultY: 5 },
      { value: 'Railroad', label: '铁路', desc: '铁路沿线区域', defaultX: 30, defaultY: 45 },
    ]
  },
]

// 解析游戏原版日程字符串为 ScheduleEntry[] 格式
// 游戏格式: "630 Town 47 87 2/900 SeedShop 39 5 0" 或 "630 Town 47 87 2 sleep"
// 忽略 GOTO 命令行（如 "GOTO 6"）
function parseVanillaScheduleString(raw: string): ScheduleEntry[] {
  if (!raw || typeof raw !== 'string') return []
  const parts = raw.split('/')
  return parts.map(part => {
    const tokens = part.trim().split(/\s+/)
    if (tokens.length === 0 || !tokens[0]) return null

    // GOTO 命令：如 "GOTO spring" 或 "GOTO spring_Mon"
    if (tokens[0] === 'GOTO') {
      return { time: '610', location: 'Town', tileX: 0, tileY: 0, facing: 2, goto: tokens[1] || 'spring' } as ScheduleEntry
    }

    // 条件命令：如 "NOT friendship Sam 6" 开头
    // 游戏格式: "NOT friendship Sam 6/630 Town 47 87 2" — 条件作为单独的 / 分隔段
    // 或者条件嵌入在条目中
    let condition: string | undefined
    let remainingTokens = tokens
    if (tokens[0] === 'NOT' || tokens[0] === 'not') {
      // NOT friendship <npc> <hearts> 后面可能跟日程条目
      // 找到日程部分的起始（以数字开头的token）
      const notPart = [tokens[0]]
      let scheduleStart = -1
      for (let i = 1; i < tokens.length; i++) {
        if (/^\d{3,4}$/.test(tokens[i])) {
          scheduleStart = i
          break
        }
        notPart.push(tokens[i])
      }
      condition = notPart.join(' ')
      if (scheduleStart >= 0) {
        remainingTokens = tokens.slice(scheduleStart)
      } else {
        // 纯条件行，没有日程数据
        return { time: '610', location: 'Town', tileX: 0, tileY: 0, facing: 2, condition } as ScheduleEntry
      }
    }

    const entry: ScheduleEntry = {
      time: remainingTokens[0] || '610',
      location: remainingTokens[1] || 'Town',
      tileX: Number(remainingTokens[2]) || 0,
      tileY: Number(remainingTokens[3]) || 0,
      facing: Number(remainingTokens[4]) || 0,
    }
    if (condition) entry.condition = condition
    // 第6个token可能是command（如 sleep, talk）或额外的路径点
    if (remainingTokens.length > 5) {
      const cmd = remainingTokens[5]
      if (cmd === 'sleep' || cmd === 'talk') {
        entry.command = cmd
      }
    }
    return entry
  }).filter((e): e is ScheduleEntry => e !== null)
}

// 解析游戏原版日程JSON为 Record<string, ScheduleEntry[]>
// 游戏格式: { "spring": "630 Town 47 87 2/900 SeedShop 39 5 0", "spring_Mon": "...", "rain": "..." }
function parseVanillaSchedule(data: Record<string, string>): Record<string, ScheduleEntry[]> {
  if (!data || typeof data !== 'object') return {}
  const result: Record<string, ScheduleEntry[]> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string') continue
    // 跳过 $ 开头的系统键
    if (key.startsWith('$')) continue
    const entries = parseVanillaScheduleString(value)
    if (entries.length > 0) {
      result[key] = entries
    }
  }
  return result
}

// ---- Editable: Home and Schedule ----
// 用 memo 包裹，避免父组件输入对话时整个超重子组件重渲染
const EditableHomeAndSchedule = memo(function EditableHomeAndScheduleImpl({ npc, updateCustomNpc, custom }: { npc: NPCInfo; updateCustomNpc: (u: Partial<NPCInfo>) => void; custom: boolean }): JSX.Element {
  const { getFullSnapshot, mutateSnapshot } = useProject()
  const { unpackedRoot } = useNpcAssets()
  const snap = getFullSnapshot()
  const customMaps = (snap.customMaps as Array<{ id: string; mapName: string; displayName: string }>) || []

  // 原版NPC从 vanillaNpcOverrides 加载日程
  const vanillaOverride = !custom ? (snap.vanillaNpcOverrides || {})[npc.name] : undefined

  const [homeLocation, setHomeLocation] = useState(custom ? (npc.homeLocation || npc.home || 'Town') : (vanillaOverride?.giftTastes ? 'Town' : (npc.home || 'Town')))
  const [homeTileX, setHomeTileX] = useState(custom ? (npc.homeTileX ?? 0) : 0)
  const [homeTileY, setHomeTileY] = useState(custom ? (npc.homeTileY ?? 0) : 0)
  const [schedules, setSchedules] = useState<Record<string, ScheduleEntry[]>>(() => {
    if (custom) return normalizeSchedule(npc.schedule)
    // 原版NPC从 vanillaNpcOverrides 加载已保存的覆盖数据
    const saved = normalizeSchedule(vanillaOverride?.schedule as any)
    if (Object.keys(saved).length > 0) return saved
    return {}
  })
  // 原版NPC：从游戏解包文件加载原版日程数据作为初始值
  const [vanillaScheduleLoaded, setVanillaScheduleLoaded] = useState(false)
  useEffect(() => {
    if (custom || vanillaScheduleLoaded) return
    // 如果已有保存的覆盖数据，不需要加载原版数据
    const currentOverride = (getFullSnapshot().vanillaNpcOverrides || {})[npc.name]
    if (currentOverride?.schedule && Object.keys(currentOverride.schedule).length > 0) return
    // unpackedRoot 为 null 时也尝试调用（主进程会自动查找解包目录）
    window.electronAPI?.npcReadVanillaSchedule?.(unpackedRoot || '', npc.name).then(vanillaData => {
      if (vanillaData && typeof vanillaData === 'object') {
        const parsed = parseVanillaSchedule(vanillaData)
        if (Object.keys(parsed).length > 0) {
          setSchedules(parsed)
        }
      }
      setVanillaScheduleLoaded(true)
    }).catch(() => setVanillaScheduleLoaded(true))
  }, [custom, npc.name, unpackedRoot, vanillaScheduleLoaded])
  const [activeSeason, setActiveSeason] = useState('spring')
  const [activeDay, setActiveDay] = useState('')
  const [introduceAt, setIntroduceAt] = useState(npc.introduceAt || '')
  const [showHomePresets, setShowHomePresets] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const activeKey = getScheduleKey(activeSeason, activeDay)

  // 按游戏优先级查找日程：season_day > day > season > 默认
  // 游戏匹配优先级: season_day+rain > season_day > season_rain > season > day+rain > day > rain
  const getEffectiveEntries = useCallback((season: string, day: string): ScheduleEntry[] => {
    const seasonDay = day ? `${season}_${day}` : season
    // 1. 精确匹配 season_day（如 spring_Mon）
    if (schedules[seasonDay]?.length) return schedules[seasonDay]
    // 2. 回退到 day-only（如 Mon，所有季节通用）
    if (day && schedules[day]?.length) return schedules[day]
    // 3. 回退到 season-only（如 spring）
    if (day && schedules[season]?.length) return schedules[season]
    return []
  }, [schedules])

  const currentEntries = getEffectiveEntries(activeSeason, activeDay)
  // 当前显示的日程来源于哪个键（用于提示用户）
  const currentSourceKey = useMemo(() => {
    const seasonDay = activeDay ? `${activeSeason}_${activeDay}` : activeSeason
    if (schedules[seasonDay]?.length) return seasonDay
    if (activeDay && schedules[activeDay]?.length) return activeDay
    if (activeDay && schedules[activeSeason]?.length) return activeSeason
    return null
  }, [activeSeason, activeDay, schedules])

  // 合并静态地图和导入的自定义地图
  const allLocations = useMemo(() => {
    const staticList = MAP_LOCATIONS.map(m => ({ value: m.value, label: m.label, desc: m.desc }))
    const customList = customMaps.map(m => ({
      value: m.mapName,
      label: `自定义: ${m.displayName}`,
      desc: `导入的地图文件`,
    }))
    return [...staticList, ...customList]
  }, [customMaps])

  // Auto-save home (debounced + force on unmount)
  const homeRef = useRef({ homeLocation, homeTileX, homeTileY })
  homeRef.current = { homeLocation, homeTileX, homeTileY }
  useEffect(() => {
    const timer = setTimeout(() => {
      const h = homeRef.current
      updateCustomNpc({ homeLocation: h.homeLocation, homeTileX: h.homeTileX, homeTileY: h.homeTileY })
    }, 200)
    return () => {
      clearTimeout(timer)
      // 组件卸载时强制保存（否则切换到导出页会丢失改动）
      const h = homeRef.current
      updateCustomNpc({ homeLocation: h.homeLocation, homeTileX: h.homeTileX, homeTileY: h.homeTileY })
    }
  }, [homeLocation, homeTileX, homeTileY, updateCustomNpc])

  // Auto-save schedules (debounced + force on unmount)
  const schedulesRef = useRef(schedules)
  schedulesRef.current = schedules
  useEffect(() => {
    const timer = setTimeout(() => {
      const s = schedulesRef.current
      const filtered: Record<string, ScheduleEntry[]> = {}
      for (const [key, entries] of Object.entries(s)) {
        if (entries.length > 0) filtered[key] = entries
      }
      if (custom) {
        updateCustomNpc({ schedule: Object.keys(filtered).length > 0 ? filtered : undefined })
      } else {
        // 原版NPC：保存到 vanillaNpcOverrides
        mutateSnapshot<Record<string, VanillaNpcOverride>>('vanillaNpcOverrides', prev => ({
          ...(prev || {}),
          [npc.name]: {
            ...((prev || {})[npc.name] || {}),
            schedule: Object.keys(filtered).length > 0 ? filtered : undefined,
          }
        }))
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      const s = schedulesRef.current
      const filtered: Record<string, ScheduleEntry[]> = {}
      for (const [key, entries] of Object.entries(s)) {
        if (entries.length > 0) filtered[key] = entries
      }
      if (custom) {
        updateCustomNpc({ schedule: Object.keys(filtered).length > 0 ? filtered : undefined })
      } else {
        mutateSnapshot<Record<string, VanillaNpcOverride>>('vanillaNpcOverrides', prev => ({
          ...(prev || {}),
          [npc.name]: {
            ...((prev || {})[npc.name] || {}),
            schedule: Object.keys(filtered).length > 0 ? filtered : undefined,
          }
        }))
      }
    }
  }, [schedules, updateCustomNpc, custom, npc.name, mutateSnapshot])

  // Auto-save introduceAt (debounced + force on unmount)
  const introduceAtRef = useRef(introduceAt)
  introduceAtRef.current = introduceAt
  useEffect(() => {
    const timer = setTimeout(() => {
      updateCustomNpc({ introduceAt: introduceAtRef.current || undefined })
    }, 200)
    return () => {
      clearTimeout(timer)
      // 组件卸载时强制保存
      updateCustomNpc({ introduceAt: introduceAtRef.current || undefined })
    }
  }, [introduceAt, updateCustomNpc])

  const addEntry = () => {
    // 如果当前是回退日程，先复制一份到当前键再添加
    const base = currentEntries.length > 0 && !schedules[activeKey]?.length ? [...currentEntries] : [...currentEntries]
    const updated = { ...schedules, [activeKey]: [...base, { time: '610', location: 'Town', tileX: 0, tileY: 0, facing: 2 }] }
    setSchedules(updated)
  }

  const removeEntry = (idx: number) => {
    // 确保在当前键上操作（如果是回退日程，先复制到当前键）
    const workingEntries = schedules[activeKey]?.length ? schedules[activeKey] : [...currentEntries]
    const updated = { ...schedules, [activeKey]: workingEntries.filter((_, i) => i !== idx) }
    setSchedules(updated)
  }

  const updateEntry = (idx: number, field: keyof ScheduleEntry, value: string | number | undefined) => {
    // 确保在当前键上操作（如果是回退日程，先复制到当前键）
    const workingEntries = schedules[activeKey]?.length ? [...schedules[activeKey]] : [...currentEntries]
    workingEntries[idx] = { ...workingEntries[idx], [field]: value }
    setSchedules({ ...schedules, [activeKey]: workingEntries })
  }

  const applyTemplate = (template: typeof SCHEDULE_TEMPLATES[0]) => {
    setSchedules({ ...schedules, [activeKey]: template.entries })
    setShowTemplates(false)
  }

  const applyTemplateToAllDays = (template: typeof SCHEDULE_TEMPLATES[0]) => {
    const updated = { ...schedules }
    for (const day of DAY_TABS) {
      const key = getScheduleKey(activeSeason, day.key)
      if (!updated[key] || updated[key].length === 0) {
        updated[key] = template.entries
      }
    }
    setSchedules(updated)
    setShowTemplates(false)
  }

  const applyTemplateToAllSeasons = (template: typeof SCHEDULE_TEMPLATES[0]) => {
    const updated = { ...schedules }
    for (const season of SEASON_TABS) {
      if (!updated[season.key] || updated[season.key].length === 0) {
        updated[season.key] = template.entries
      }
    }
    setSchedules(updated)
    setShowTemplates(false)
  }

  const applyHomePreset = (preset: typeof HOME_PRESETS[0]) => {
    setHomeLocation(preset.value)
    setHomeTileX(preset.x)
    setHomeTileY(preset.y)
    setShowHomePresets(false)
  }

  const copyDayToOtherDays = () => {
    if (currentEntries.length === 0) return
    const updated = { ...schedules }
    for (const day of DAY_TABS) {
      const key = getScheduleKey(activeSeason, day.key)
      if (key !== activeKey && (!updated[key] || updated[key].length === 0)) {
        updated[key] = [...currentEntries]
      }
    }
    setSchedules(updated)
  }

  const copySeasonToOtherSeasons = () => {
    const updated = { ...schedules }
    for (const season of SEASON_TABS) {
      if (season.key === activeSeason) continue
      for (const day of DAY_TABS) {
        const srcKey = getScheduleKey(activeSeason, day.key)
        const dstKey = getScheduleKey(season.key, day.key)
        if ((schedules[srcKey] || []).length > 0 && (!updated[dstKey] || updated[dstKey].length === 0)) {
          updated[dstKey] = [...schedules[srcKey]]
        }
      }
    }
    setSchedules(updated)
  }

  const timeLabel = (timeVal: string): string => {
    return TIME_OPTIONS.find(t => t.value === timeVal)?.label || timeVal
  }

  const locationLabel = (locVal: string): string => {
    return allLocations.find(m => m.value === locVal)?.label || locVal
  }

  const getScheduleSummary = (entries: ScheduleEntry[]): string => {
    if (entries.length === 0) return '无日程'
    if (entries.length === 1) {
      const e = entries[0]
      if (e.goto) return `GOTO ${e.goto}`
      return `${timeLabel(e.time)} @ ${locationLabel(e.location)}${e.condition ? ' [条件]' : ''}`
    }
    const hasGoto = entries.some(e => e.goto)
    const hasCondition = entries.some(e => e.condition)
    return `${entries.length} 条（${timeLabel(entries[0].time)} ~ ${timeLabel(entries[entries.length - 1].time)}）${hasGoto ? ' [含跳转]' : ''}${hasCondition ? ' [含条件]' : ''}`
  }

  return (
    <div className="bg-[#2a2a2a] rounded-xl p-5 mt-4">
      <h3 className="text-base font-medium text-gray-300 mb-4 flex items-center gap-2">
        {custom ? '住所与日程' : '日程覆盖'}
        <span className="text-xs text-gray-500 font-normal">
          {custom ? '（设置NPC的住所和日常活动）' : '（覆盖原版NPC的日程，未设置的天数使用游戏默认日程）'}
        </span>
      </h3>

      <div className="space-y-6">
        {/* Home Configuration - 仅自定义NPC */}
        {custom && (
        <div className="bg-[#1f1f1f] rounded-lg p-4 border border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-gray-400 flex items-center gap-1.5">
              NPC住所位置
              <span className="text-xs text-gray-500">（NPC默认居住的地方）</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHomePresets(!showHomePresets)}
                className="text-xs px-3.5 py-2 rounded-md bg-blue-900/50 text-blue-300 hover:bg-blue-800/50 border border-blue-700/40 transition-colors flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                快速选择
              </button>
              {showHomePresets && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#222] border border-[#444] rounded-xl shadow-2xl z-30 p-3.5 space-y-2">
                  <p className="text-xs text-gray-400 mb-2">选择一个常用位置：</p>
                  {HOME_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => applyHomePreset(preset)}
                      className="w-full text-left text-xs px-3 py-2.5 rounded-lg hover:bg-[#333] transition-colors"
                    >
                      <div className="text-gray-200 font-medium">{preset.label}</div>
                      <div className="text-xs text-gray-500">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-gray-500 block mb-1.5">位置</label>
              <select
                value={homeLocation}
                onChange={e => {
                  const val = e.target.value
                  setHomeLocation(val)
                  // 自动填坐标：从 LOCATION_GROUPS 查找默认坐标
                  for (const group of LOCATION_GROUPS) {
                    const found = group.locations.find(l => l.value === val)
                    if (found) {
                      setHomeTileX(found.defaultX)
                      setHomeTileY(found.defaultY)
                      break
                    }
                  }
                }}
                className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]"
              >
                {LOCATION_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.locations.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </optgroup>
                ))}
                {customMaps.length > 0 && (
                  <optgroup label="导入的自定义地图">
                    {customMaps.map(m => (
                      <option key={m.mapName} value={m.mapName}>自定义: {m.displayName}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="w-24">
              <label className="text-xs text-gray-500 block mb-1.5">坐标 X</label>
              <input type="number" value={homeTileX} onChange={e => setHomeTileX(Number(e.target.value))}
                className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]" />
            </div>
            <div className="w-24">
              <label className="text-xs text-gray-500 block mb-1.5">坐标 Y</label>
              <input type="number" value={homeTileY} onChange={e => setHomeTileY(Number(e.target.value))}
                className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]" />
            </div>
          </div>
          <div className="mt-2.5 text-xs text-gray-500 flex items-center gap-2">
            <span>当前坐标：({homeTileX}, {homeTileY})</span>
            <span className="text-gray-600">|</span>
            <span>在游戏里按 F8 打开 SMAPI 控制台，输入 <code className="text-amber-500 bg-[#1a1a1a] px-1.5 py-0.5 rounded">player.tile</code> 查看当前位置坐标</span>
          </div>
        </div>
        )}

        {/* Introduce At - 仅自定义NPC */}
        {custom && (
        <div className="bg-[#1f1f1f] rounded-lg p-4 border border-[#2a2a2a]">
          <label className="text-sm text-gray-400 flex items-center gap-1.5 mb-2.5">
            NPC登场方式
            <span className="text-xs text-gray-500">（NPC开始出现的时间）</span>
          </label>
          <select
            value={introduceAt}
            onChange={e => setIntroduceAt(e.target.value)}
            className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555]"
          >
            <option value="">第一天起出现（立即）</option>
            <option value="Letter">信件邀请</option>
            <option value="Seasonal">季节登场</option>
            <option value="MeetEveryone">认识所有人后</option>
          </select>
        </div>
        )}

        {/* Schedule Configuration */}
        <div className="bg-[#1f1f1f] rounded-lg p-4 border border-[#2a2a2a]">
          {/* 新手引导 */}
          {(schedules['spring'] || []).length === 0 && (schedules['summer'] || []).length === 0 && (schedules['fall'] || []).length === 0 && (schedules['winter'] || []).length === 0 && (
            <div className="mb-4 p-4 bg-[#1a2a1a] border border-emerald-800/40 rounded-lg">
              <p className="text-sm text-emerald-400 font-medium mb-2.5 inline-flex items-center gap-1.5"><IconTip /> 快速上手（3步完成基础日程）</p>
              <ol className="text-xs text-gray-400 space-y-1.5">
                <li>1. 选择季节 → 点击模板按钮 → 选择模板应用到当前日期</li>
                <li>2. 用"复制到其他日"将日程复制到同季节的其他日期</li>
                <li>3. 用"复制到其他季节"将整个季节的日程复制到其他季节</li>
              </ol>
              <p className="text-xs text-gray-500 mt-2.5">提示：至少要设置一个季节的日程，NPC才会走动！</p>
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-gray-400 flex items-center gap-1.5">
              日常日程
              <span className="text-xs text-gray-500">（NPC在不同时间会去哪里）</span>
            </label>
            <div className="flex items-center gap-2">
              {currentEntries.length > 0 && (
                <button onClick={copyDayToOtherDays}
                  className="text-xs px-3 py-1.5 rounded bg-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#333] transition-colors"
                  title="复制当前日期日程到同季节其他空日期"
                >复制到其他日</button>
              )}
              <button onClick={copySeasonToOtherSeasons}
                className="text-xs px-3 py-1.5 rounded bg-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#333] transition-colors"
                title="复制当前季节所有日程到其他空季节"
              >复制到其他季节</button>
              <div className="relative">
                <button onClick={() => setShowTemplates(!showTemplates)}
                  className="text-xs px-3 py-1.5 rounded bg-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#333] transition-colors"
                >模板</button>
                {showTemplates && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-[#222] border border-[#444] rounded-xl shadow-2xl z-30 p-3.5 space-y-2">
                    <p className="text-xs text-gray-400 mb-2">选择一个日程模板：</p>
                    {SCHEDULE_TEMPLATES.map((tpl) => (
                      <div key={tpl.name} className="flex items-center gap-1">
                        <button onClick={() => applyTemplate(tpl)}
                          className="flex-1 text-left text-xs px-3 py-2.5 rounded-lg hover:bg-[#333] transition-colors"
                        >
                          <div className="text-gray-200 font-medium">{tpl.name}</div>
                          <div className="text-xs text-gray-500">{tpl.desc}</div>
                        </button>
                        <button onClick={() => applyTemplateToAllDays(tpl)}
                          className="text-xs px-2 py-1 rounded bg-sky-900/50 text-sky-300 hover:bg-sky-800/50 border border-sky-700/40 transition-colors whitespace-nowrap"
                          title="应用到当前季节所有空日期"
                        >全日</button>
                        <button onClick={() => applyTemplateToAllSeasons(tpl)}
                          className="text-xs px-2 py-1 rounded bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50 border border-emerald-700/40 transition-colors whitespace-nowrap"
                          title="应用到所有季节的默认日程"
                        >全季</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Season tabs (一级) */}
          <div className="flex items-center gap-1 mb-2">
            {SEASON_TABS.map(season => {
              const isActive = activeSeason === season.key
              // 统计该季节有多少天有日程（含回退匹配）
              const daysSet = DAY_TABS.filter(d => getEffectiveEntries(season.key, d.key).length > 0).length
              return (
                <button key={season.key}
                  onClick={() => { setActiveSeason(season.key); setActiveDay('') }}
                  className={`relative text-sm px-4 py-2 rounded-lg transition-colors font-medium
                    ${isActive
                      ? 'bg-white text-black shadow-md'
                      : daysSet > 0
                        ? 'bg-[#333] text-gray-300 hover:bg-[#3a3a3a] border border-[#444]'
                        : 'bg-[#1f1f1f] text-gray-600 hover:bg-[#252525] border border-[#2a2a2a]'
                    }`}>
                  <span className={isActive ? '' : season.color}>{season.label}</span>
                  {daysSet > 0 && !isActive && (
                    <span className="ml-1.5 text-[10px] bg-emerald-800/60 text-emerald-300 px-1.5 py-0.5 rounded-full">{daysSet}天</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Day tabs (二级) — 当前季节下的日期 */}
          <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-[#2a2a2a]">
            {DAY_TABS.map(day => {
              const key = getScheduleKey(activeSeason, day.key)
              const effectiveEntries = getEffectiveEntries(activeSeason, day.key)
              const hasData = effectiveEntries.length > 0
              const isActive = activeDay === day.key
              const summary = getScheduleSummary(effectiveEntries)
              // 是否为回退日程（非精确匹配）
              const isFallback = hasData && !schedules[key]?.length
              return (
                <button key={day.key || '_default'}
                  onClick={() => setActiveDay(day.key)}
                  title={day.desc || `${day.label}: ${summary}`}
                  className={`relative text-xs px-2.5 py-1.5 rounded transition-colors font-medium group
                    ${isActive
                      ? 'bg-white text-black shadow-md'
                      : hasData
                        ? 'bg-[#333] text-gray-300 hover:bg-[#3a3a3a] border border-[#444]'
                        : 'bg-[#1f1f1f] text-gray-600 hover:bg-[#252525] border border-[#2a2a2a]'
                    }`}>
                  <span>{day.label}</span>
                  {hasData && !isActive && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-[#1f1f1f] ${
                      isFallback ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                  )}
                  {hasData && (
                    <span className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-0.5 px-2.5 py-1 bg-[#333] text-xs text-gray-300 rounded whitespace-nowrap z-20 border border-[#444]">
                      {summary}{isFallback ? ' (继承)' : ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Current tab schedule entries */}
          {/* 来源提示：当显示的是回退日程时，告知用户数据来源 */}
          {currentEntries.length > 0 && currentSourceKey && currentSourceKey !== activeKey && (
            <div className="mb-3 p-2 bg-amber-900/20 border border-amber-700/30 rounded-lg flex items-center gap-2">
              <span className="text-xs text-amber-300">继承自</span>
              <code className="text-xs text-amber-400 bg-[#1a1a1a] px-1.5 py-0.5 rounded">{currentSourceKey}</code>
              <span className="text-xs text-amber-300/70">（该天无专属日程，使用上级日程。编辑后将创建独立日程）</span>
            </div>
          )}
          {currentEntries.length === 0 ? (
            <div className="border-2 border-dashed border-[#444] rounded-xl p-10 text-center bg-[#1a1a1a]/50">
              <p className="text-sm text-gray-500 mb-4">该天暂无日程</p>
              <button onClick={addEntry}
                className="text-sm px-5 py-2.5 rounded-lg bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50 border border-emerald-700/40 transition-colors"
              >+ 添加日程</button>
            </div>
          ) : (
            <div>
              {/* Timeline preview */}
              <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-2">
                {currentEntries.map((entry, idx) => {
                  const locationInfo = allLocations.find(m => m.value === entry.location)
                  const isGoto = !!entry.goto
                  return (
                    <div key={idx} className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <span className={`text-xs font-medium ${isGoto ? 'text-purple-400' : 'text-blue-400'}`}>{timeLabel(entry.time)}</span>
                        <div className={`w-3 h-3 rounded-full my-1.5 ring-2 ${isGoto ? 'bg-purple-500 ring-purple-500/20' : 'bg-blue-500 ring-blue-500/20'}`}></div>
                        <span className="text-xs text-gray-400 max-w-[80px] truncate" title={isGoto ? `GOTO ${entry.goto}` : locationInfo?.desc}>
                          {isGoto ? `→${entry.goto}` : locationLabel(entry.location)}
                        </span>
                      </div>
                      {idx < currentEntries.length - 1 && (
                        <div className="w-10 h-0.5 bg-[#444] mx-1"></div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Detail schedule list */}
              <div className="space-y-2.5">
                {currentEntries.map((entry, idx) => {
                  const locationInfo = allLocations.find(m => m.value === entry.location)
                  const facingLabels = ['下', '上', '左', '右']
                  const commandLabels: Record<string, string> = {
                    'sleep': ' 睡觉',
                    'talk': ' 对话',
                  }
                  const isGoto = !!entry.goto
                  return (
                    <div key={idx} className={`bg-[#1a1a1a] rounded-lg p-4 border transition-colors group ${isGoto ? 'border-purple-700/50 bg-purple-900/10' : 'border-[#2a2a2a] hover:border-[#444]'}`}>
                      {/* GOTO 模式切换 */}
                      <div className="flex items-center gap-2 mb-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isGoto}
                            onChange={e => {
                              const newEntries = [...currentEntries]
                              if (e.target.checked) {
                                newEntries[idx] = { ...newEntries[idx], goto: 'spring', time: '610', location: 'Town', tileX: 0, tileY: 0, facing: 2 }
                              } else {
                                newEntries[idx] = { ...newEntries[idx], goto: undefined }
                              }
                              setSchedules({ ...schedules, [activeKey]: newEntries })
                            }}
                            className="accent-purple-500"
                          />
                          <span className="text-xs text-purple-400 font-medium">GOTO 跳转</span>
                          <span className="text-[10px] text-gray-500">跳转到另一个日程键</span>
                        </label>
                      </div>

                      {isGoto ? (
                        /* GOTO 模式：只需选择目标键 */
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400">跳转到：</span>
                          <select
                            value={entry.goto || 'spring'}
                            onChange={e => updateEntry(idx, 'goto', e.target.value)}
                            className="bg-[#242424] border border-purple-700/40 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 min-w-[160px]"
                          >
                            <optgroup label="季节">
                              {SEASON_TABS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                            </optgroup>
                            <optgroup label="星期">
                              {DAY_TABS.filter(d => d.key).map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                            </optgroup>
                            <optgroup label="季节+星期">
                              {SEASON_TABS.flatMap(s => DAY_TABS.filter(d => d.key).map(d => (
                                <option key={`${s.key}_${d.key}`} value={`${s.key}_${d.key}`}>{s.label}{d.label}</option>
                              )))}
                            </optgroup>
                            <optgroup label="特殊">
                              <option value="rain">雨天</option>
                              <option value="marriage">婚姻</option>
                              {SEASON_TABS.map(s => <option key={`${s.key}_rain`} value={`${s.key}_rain`}>{s.label}雨天</option>)}
                            </optgroup>
                          </select>
                          <span className="text-xs text-gray-500">NPC将使用目标日程键的日程代替当天日程</span>
                        </div>
                      ) : (
                        /* 普通模式：时间/地点/坐标/朝向/指令 */
                        <>
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            {/* Time dropdown */}
                            <select value={entry.time} onChange={e => { updateEntry(idx, 'time', e.target.value) }}
                              className="bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555] min-w-[140px] hover:border-[#444] transition-colors">
                              {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>

                            {/* Location dropdown */}
                            <select value={entry.location} onChange={e => {
                              const val = e.target.value
                              // 自动填坐标：从 LOCATION_GROUPS 查找默认坐标
                              let newX = entry.tileX
                              let newY = entry.tileY
                              for (const group of LOCATION_GROUPS) {
                                const found = group.locations.find(l => l.value === val)
                                if (found) {
                                  newX = found.defaultX
                                  newY = found.defaultY
                                  break
                                }
                              }
                              // 一次性更新 location + 坐标，避免多次 setSchedules 丢失数据
                              const newEntries = [...currentEntries]
                              newEntries[idx] = { ...newEntries[idx], location: val, tileX: newX, tileY: newY }
                              setSchedules({ ...schedules, [activeKey]: newEntries })
                            }}
                              className="flex-1 min-w-[160px] bg-[#242424] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#555] hover:border-[#444] transition-colors"
                              title={locationInfo?.desc}>
                              {LOCATION_GROUPS.map(group => (
                                <optgroup key={group.label} label={group.label}>
                                  {group.locations.map(m => (
                                    <option key={m.value} value={m.value} title={m.desc}>{m.label}</option>
                                  ))}
                                </optgroup>
                              ))}
                              {/* 自定义地图单独一组 */}
                              {customMaps.length > 0 && (
                                <optgroup label="导入的自定义地图">
                                  {customMaps.map(m => (
                                    <option key={m.mapName} value={m.mapName}>自定义: {m.displayName}</option>
                                  ))}
                                </optgroup>
                              )}
                            </select>

                            {/* Delete button */}
                            <button type="button" onClick={() => removeEntry(idx)}
                              className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-900/30 border border-[#333] hover:border-red-700/40"
                              title="删除此条目">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>

                           {/* Advanced fields (tile coordinates, facing, command) */}
                           <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                             <div className="flex items-center gap-1.5">
                               <span className="text-xs text-gray-500 font-medium">X：</span>
                               <input type="text" inputMode="numeric" value={entry.tileX || ''} 
                                 onChange={e => {
                                   const v = e.target.value.replace(/[^\d\-]/g, '')
                                   if (v === '' || v === '-') {
                                     updateEntry(idx, 'tileX', v as any)
                                   } else {
                                     updateEntry(idx, 'tileX', Number(v))
                                   }
                                 }}
                                 onBlur={e => {
                                   const v = e.target.value
                                   const num = v === '' || v === '-' ? 0 : Number(v)
                                   updateEntry(idx, 'tileX', Math.max(0, Math.floor(num)))
                                 }}
                                 className="w-16 bg-[#242424] border border-[#333] rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
                             </div>
                             <div className="flex items-center gap-1.5">
                               <span className="text-xs text-gray-500 font-medium">Y：</span>
                               <input type="text" inputMode="numeric" value={entry.tileY || ''} 
                                 onChange={e => {
                                   const v = e.target.value.replace(/[^\d\-]/g, '')
                                   if (v === '' || v === '-') {
                                     updateEntry(idx, 'tileY', v as any)
                                   } else {
                                     updateEntry(idx, 'tileY', Number(v))
                                   }
                                 }}
                                 onBlur={e => {
                                   const v = e.target.value
                                   const num = v === '' || v === '-' ? 0 : Number(v)
                                   updateEntry(idx, 'tileY', Math.max(0, Math.floor(num)))
                                 }}
                                 className="w-16 bg-[#242424] border border-[#333] rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-[#555]" />
                             </div>
                             <div className="flex items-center gap-1.5">
                               <span className="text-xs text-gray-500 font-medium">朝向：</span>
                               <select value={entry.facing} onChange={e => updateEntry(idx, 'facing', Number(e.target.value))}
                                 className="bg-[#242424] border border-[#333] rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-[#555]">
                                 {FACING_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                               </select>
                             </div>
                             <div className="flex items-center gap-1.5">
                               <span className="text-xs text-gray-500 font-medium">指令：</span>
                               <select value={entry.command || ''} onChange={e => updateEntry(idx, 'command', e.target.value || undefined)}
                                 className="bg-[#242424] border border-[#333] rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-[#555]">
                                 <option value="">无</option>
                                 <option value="sleep">睡觉</option>
                                 <option value="talk">对话</option>
                               </select>
                             </div>
                           </div>

                           {/* 条件命令 */}
                           <div className="flex items-center gap-2 mt-2.5">
                             <span className="text-xs text-gray-500 font-medium">条件：</span>
                             <select
                               value={entry.condition ? (entry.condition.startsWith('NOT friendship') ? 'NOT_friendship' : entry.condition.startsWith('friendship') ? 'friendship' : 'custom') : ''}
                               onChange={e => {
                                 const val = e.target.value
                                 if (!val) {
                                   updateEntry(idx, 'condition', undefined)
                                 } else if (val === 'NOT_friendship') {
                                   updateEntry(idx, 'condition', `NOT friendship  `)
                                 } else if (val === 'friendship') {
                                   updateEntry(idx, 'condition', `friendship  `)
                                 } else {
                                   // custom - 保留当前值
                                 }
                               }}
                               className="bg-[#242424] border border-[#333] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#555] min-w-[120px]"
                             >
                               <option value="">无条件</option>
                               <option value="NOT_friendship">NOT friendship（未达到好感度）</option>
                               <option value="friendship">friendship（达到好感度）</option>
                               {entry.condition && !entry.condition.startsWith('NOT friendship') && !entry.condition.startsWith('friendship') && (
                                 <option value="custom">自定义条件</option>
                               )}
                             </select>
                             {entry.condition && (
                               <input
                                 type="text"
                                 value={entry.condition}
                                 onChange={e => updateEntry(idx, 'condition', e.target.value)}
                                 placeholder="如: NOT friendship Sam 6"
                                 className="flex-1 min-w-[180px] bg-[#242424] border border-amber-700/40 rounded-lg px-2.5 py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-mono"
                               />
                             )}
                             {entry.condition && (
                               <button
                                 onClick={() => updateEntry(idx, 'condition', undefined)}
                                 className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                                 title="移除条件"
                               >✕</button>
                             )}
                           </div>
                           {entry.condition && (
                             <p className="text-[10px] text-gray-600 mt-1">
                               格式：NOT friendship &lt;NPC名&gt; &lt;心数&gt; — 与该NPC好感度未达到指定心数时执行此条目
                             </p>
                           )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Add / Clear entry buttons */}
              <div className="flex gap-2 mt-2.5">
                <button onClick={addEntry}
                  className="flex-1 py-2.5 border-2 border-dashed border-[#333] rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:border-[#444] transition-colors">
                  + 添加条目
                </button>
                {currentEntries.length > 0 && (
                  <button onClick={() => setSchedules({ ...schedules, [activeKey]: [] })}
                    className="px-4 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-red-800/30 transition-colors">
                    清空当前
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 其他日程：展示非标准格式的日程键（如 marriage、Island、特定日期等） */}
        <SpecialScheduleSection
          schedules={schedules}
          setSchedules={setSchedules}
          allLocations={allLocations}
          timeLabel={timeLabel}
          locationLabel={locationLabel}
        />
      </div>
    </div>
  )
})

// ---- Editable: Gift Tastes ----
/** 物品type字段的中文映射 */
const TYPE_LABELS: Record<string, string> = {
  '': '其他',
  'Seeds': '种子', 'Basic': '基础', 'Vegetable': '蔬菜', 'Fruit': '水果',
  'Flower': '花卉', 'Fish': '鱼类', 'Cooking': '料理', 'Crafting': '合成',
  'Mineral': '矿物', 'Minerals': '矿物', 'Gem': '宝石', 'Resource': '资源',
  'MonsterLoot': '怪物掉落', 'Meat': '肉类', 'AnimalProduct': '动物制品',
  'ArtisanGoods': '工匠品', 'Fertilizer': '肥料', 'Bait': '鱼饵', 'Tackle': '钓具',
  'Litter': '垃圾', 'Quest': '任务', 'Ring': '戒指', 'Hat': '帽子',
  'Boots': '靴子', 'Tool': '工具', 'Furniture': '家具', 'Weapon': '武器',
  'Clothing': '服装', 'Decor': '装饰',
}
/** 需要展示的type白名单（过滤掉垃圾/工具/任务等不送礼的类型） */
const GIFT_TYPE_WHITELIST = new Set([
  'Fruit', 'Vegetable', 'Flower', 'Fish', 'Cooking', 'ArtisanGoods',
  'AnimalProduct', 'Gem', 'Mineral', 'Minerals', 'Resource', 'Crafting',
  'Ring', 'Hat', 'Boots', 'Weapon', 'Meat', 'MonsterLoot', 'Seeds',
  'Furniture', 'Clothing', 'Decor', 'Bait', 'Tackle', 'Fertilizer',
])
/** 显示顺序 */
const TYPE_ORDER = [
  'Fruit', 'Vegetable', 'Flower', 'Fish', 'Cooking', 'ArtisanGoods',
  'AnimalProduct', 'Gem', 'Mineral', 'Minerals', 'Resource', 'Crafting',
  'Weapon', 'Ring', 'Hat', 'Boots', 'Furniture', 'Clothing', 'Decor',
  'Meat', 'MonsterLoot', 'Seeds', 'Bait', 'Tackle', 'Fertilizer',
]

interface VanillaGameItem {
  id: string; name: string; displayName: string; description: string
  type: string; category: number; price: number; texture: string; spriteIndex: number
}

// 解析游戏原版礼物偏好字符串
// 游戏格式: "最爱台词/最爱物品ID 物品ID.../喜欢台词/喜欢物品ID.../不喜欢台词/不喜欢物品ID.../讨厌台词/讨厌物品ID..."
// 共8段，用斜杠分隔，偶数索引(0,2,4,6)是台词（英文），奇数索引(1,3,5,7)是物品ID
// 物品ID可以是具体ID（如128）或类别ID（如-2宝石类）
const CATEGORY_LABELS: Record<string, string> = {
  '-2': '宝石类', '-4': '鱼类(所有)', '-5': '蛋类', '-6': '奶类',
  '-7': '烹饪原料', '-8': '合成类', '-10': '花卉类', '-12': '矿物类',
  '-14': '肉类', '-15': '金属资源', '-16': '建材类', '-18': '家具类',
  '-20': '垃圾类', '-21': '鱼饵类', '-22': '钓具类', '-24': '烹饪类',
  '-26': '工匠品类', '-27': '糖浆类', '-28': '怪物掉落',
  '-74': '蔬菜类', '-75': '水果类', '-79': '种子类', '-80': '调料类',
  '-81': '采集品类',
}

// 通用偏好键 → 本地类别键的映射
const UNIVERSAL_KEY_MAP: Record<string, 'loved' | 'liked' | 'neutral' | 'disliked' | 'hated'> = {
  'Universal_Love': 'loved',
  'Universal_Like': 'liked',
  'Universal_Neutral': 'neutral',
  'Universal_Dislike': 'disliked',
  'Universal_Hate': 'hated',
}

// 获取物品ID的显示名称（支持类别ID和具体物品ID）
function getItemDisplayName(id: string, vanillaItems: VanillaGameItem[]): string {
  // 类别ID（负数）
  if (id.startsWith('-')) {
    return CATEGORY_LABELS[id] || `类别${id}`
  }
  // 具体物品ID
  const item = vanillaItems.find(i => i.id === id)
  return item?.displayName || item?.name || `ID:${id}`
}

// 从单个8段式字符串中解析某个类别（1:love, 3:like, 5:dislike, 7:hate）
// 返回 { line: 台词, ids: [物品ID] }
function parseGiftSegment(raw: string, segIdx: number): { line: string; ids: string[] } {
  if (!raw) return { line: '', ids: [] }
  // 游戏数据中"台词"段可能包含多个用 `/` 分割的句子，但前面用的是 `^` 字符分句
  // 谨慎起见直接 split('/')
  const parts = raw.split('/')
  if (parts.length < 8) return { line: '', ids: [] }
  const line = (parts[segIdx - 1] || '').replace(/\^/g, ' / ')
  const idsStr = parts[segIdx] || ''
  const ids = idsStr.trim() ? idsStr.trim().split(/\s+/).filter(Boolean) : []
  return { line, ids }
}

function parseVanillaGiftTastes(input: string | { npcData: string; universal: Record<string, string> } | null | undefined): { loved: string; liked: string; disliked: string; hated: string; neutral: string; lovedLine: string; likedLine: string; dislikedLine: string; hatedLine: string; neutralLine: string } | null {
  if (!input) return null
  // 兼容旧版（仅返回字符串）和新版（返回 { npcData, universal }）
  const npcRaw = typeof input === 'string' ? input : input.npcData
  const universalMap = typeof input === 'string' ? {} : (input.universal || {})
  if (!npcRaw || typeof npcRaw !== 'string') return null

  // 解析NPC自己的8段
  // 注意：游戏原版npc字符串可能 < 8段（如夫妻关系/特殊NPC），需要按 segIdx 容错
  const loved = parseGiftSegment(npcRaw, 1)
  const liked = parseGiftSegment(npcRaw, 3)
  const disliked = parseGiftSegment(npcRaw, 5)
  const hated = parseGiftSegment(npcRaw, 7)
  // neutral 在游戏原版npc字符串中没有显式段（由游戏运行时排除法计算）
  // 但通用偏好中可能有 Universal_Neutral
  const neutral = parseGiftSegment(universalMap['Universal_Neutral'] || '', 1)

  // 合并通用物品：把通用类别的物品ID追加到对应类别（去重）
  const mergeIds = (npcIds: string[], universalRaw: string | undefined): string[] => {
    if (!universalRaw) return npcIds
    const seg = parseGiftSegment(universalRaw, 1)
    const set = new Set(npcIds)
    for (const id of seg.ids) set.add(id)
    return Array.from(set)
  }
  const lovedIds = mergeIds(loved.ids, universalMap['Universal_Love'])
  const likedIds = mergeIds(liked.ids, universalMap['Universal_Like'])
  const dislikedIds = mergeIds(disliked.ids, universalMap['Universal_Dislike'])
  const hatedIds = mergeIds(hated.ids, universalMap['Universal_Hate'])
  const neutralIds = mergeIds(neutral.ids, universalMap['Universal_Neutral'])

  return {
    loved: lovedIds.join(' '),
    liked: likedIds.join(' '),
    disliked: dislikedIds.join(' '),
    hated: hatedIds.join(' '),
    neutral: neutralIds.join(' '),
    lovedLine: loved.line,
    likedLine: liked.line,
    dislikedLine: disliked.line,
    hatedLine: hated.line,
    neutralLine: neutral.line,
  }
}

// 用 memo 包裹，避免父组件输入对话时整个超重子组件重渲染
const EditableGiftTastes = memo(function EditableGiftTastesImpl({ npc, updateCustomNpc, custom }: { npc: NPCInfo; updateCustomNpc: (u: Partial<NPCInfo>) => void; custom: boolean }): JSX.Element {
  const { unpackedRoot } = useNpcAssets()
  const { mutateSnapshot, getFullSnapshot } = useProject()
  const locale = useLocale()

  // 原版NPC从 vanillaNpcOverrides 加载礼物偏好
  const vanillaOverride = !custom ? (getFullSnapshot().vanillaNpcOverrides || {})[npc.name] : undefined

  const [loved, setLoved] = useState(custom ? (npc.giftTastes?.loved || '') : (vanillaOverride?.giftTastes?.loved || ''))
  const [liked, setLiked] = useState(custom ? (npc.giftTastes?.liked || '') : (vanillaOverride?.giftTastes?.liked || ''))
  const [disliked, setDisliked] = useState(custom ? (npc.giftTastes?.disliked || '') : (vanillaOverride?.giftTastes?.disliked || ''))
  const [hated, setHated] = useState(custom ? (npc.giftTastes?.hated || '') : (vanillaOverride?.giftTastes?.hated || ''))
  // 原版NPC的4段英文台词（用于显示和导出）
  const [lovedLine, setLovedLine] = useState(custom ? '' : (vanillaOverride?.giftTasteLines?.loved || ''))
  const [likedLine, setLikedLine] = useState(custom ? '' : (vanillaOverride?.giftTasteLines?.liked || ''))
  const [dislikedLine, setDislikedLine] = useState(custom ? '' : (vanillaOverride?.giftTasteLines?.disliked || ''))
  const [hatedLine, setHatedLine] = useState(custom ? '' : (vanillaOverride?.giftTasteLines?.hated || ''))
  // 原版NPC：从游戏解包文件加载原版礼物偏好数据作为初始值
  const [vanillaGiftsLoaded, setVanillaGiftsLoaded] = useState(false)
  useEffect(() => {
    if (custom || vanillaGiftsLoaded) return
    // 如果已有保存的覆盖数据，不需要加载原版数据
    const currentOverride = (getFullSnapshot().vanillaNpcOverrides || {})[npc.name]
    if (currentOverride?.giftTastes && Object.keys(currentOverride.giftTastes).length > 0) return
    // unpackedRoot 为 null 时也尝试调用（主进程会自动查找解包目录）
    // locale 参数决定读取中文/英文版礼物偏好文件
    window.electronAPI?.npcReadVanillaGiftTastes?.(unpackedRoot || '', npc.name, locale).then(vanillaData => {
      if (vanillaData) {
        const parsed = parseVanillaGiftTastes(vanillaData)
        if (parsed) {
          if (parsed.loved) setLoved(parsed.loved)
          if (parsed.liked) setLiked(parsed.liked)
          if (parsed.disliked) setDisliked(parsed.disliked)
          if (parsed.hated) setHated(parsed.hated)
          // 保存原版英文台词
          if (parsed.lovedLine) setLovedLine(parsed.lovedLine)
          if (parsed.likedLine) setLikedLine(parsed.likedLine)
          if (parsed.dislikedLine) setDislikedLine(parsed.dislikedLine)
          if (parsed.hatedLine) setHatedLine(parsed.hatedLine)
        }
      }
      setVanillaGiftsLoaded(true)
    }).catch(() => setVanillaGiftsLoaded(true))
  }, [custom, npc.name, unpackedRoot, vanillaGiftsLoaded])
  const [giftCategory, setGiftCategory] = useState('全部')
  const [giftTargetCat, setGiftTargetCat] = useState<'loved' | 'liked' | 'disliked' | 'hated'>('loved')
  const [giftSearch, setGiftSearch] = useState('')
  const [itemImageCache, setItemImageCache] = useState<Record<string, string>>({})
  const itemImageCacheRef = useRef<Record<string, string>>({})
  const [vanillaItems, setVanillaItems] = useState<VanillaGameItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)

  // Load real game items
  useEffect(() => {
    if (!unpackedRoot) { setItemsLoading(false); return }
    let cancelled = false
    setItemsLoading(true)
    async function load() {
      const result = await (window as any).electronAPI?.xnbListItems?.(unpackedRoot)
      if (!cancelled && result?.success && result.items) {
        // Deduplicate by id (keep first)
        const seen = new Set<string>()
        const unique = (result.items as VanillaGameItem[]).filter(item => {
          if (seen.has(item.id)) return false
          seen.add(item.id)
          return true
        })
        setVanillaItems(unique)
      }
      if (!cancelled) setItemsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [unpackedRoot])

  // Extract available types from loaded items
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>()
    vanillaItems.forEach(item => { if (item.type) typeSet.add(item.type) })
    // Build ordered list: types in TYPE_ORDER that exist, then any remaining
    const ordered = TYPE_ORDER.filter(t => typeSet.has(t))
    typeSet.forEach(t => { if (!ordered.includes(t)) ordered.push(t) })
    return ordered
  }, [vanillaItems])

  // Build category tabs: 全部 + type->Chinese labels
  const categoryTabs = useMemo(() => {
    const tabs: string[] = ['全部']
    for (const t of availableTypes) {
      if (!GIFT_TYPE_WHITELIST.has(t)) continue
      tabs.push(TYPE_LABELS[t] || t)
    }
    return tabs
  }, [availableTypes])

  // Reverse map: Chinese label -> type string
  const labelToType = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of availableTypes) {
      map[TYPE_LABELS[t] || t] = t
    }
    return map
  }, [availableTypes])

  const persist = () => {
    const gt: Record<string, string> = {}
    if (loved.trim()) gt.loved = loved.trim()
    if (liked.trim()) gt.liked = liked.trim()
    if (disliked.trim()) gt.disliked = disliked.trim()
    if (hated.trim()) gt.hated = hated.trim()
    const gtl: Record<string, string> = {}
    if (lovedLine.trim()) gtl.loved = lovedLine.trim()
    if (likedLine.trim()) gtl.liked = likedLine.trim()
    if (dislikedLine.trim()) gtl.disliked = dislikedLine.trim()
    if (hatedLine.trim()) gtl.hated = hatedLine.trim()
    if (custom) {
      updateCustomNpc({ giftTastes: Object.keys(gt).length > 0 ? gt : undefined })
    } else {
      // 原版NPC：保存到 vanillaNpcOverrides
      mutateSnapshot<Record<string, VanillaNpcOverride>>('vanillaNpcOverrides', prev => ({
        ...(prev || {}),
        [npc.name]: {
          ...((prev || {})[npc.name] || {}),
          giftTastes: Object.keys(gt).length > 0 ? gt : undefined,
          giftTasteLines: Object.keys(gtl).length > 0 ? gtl : undefined,
        }
      }))
    }
  }

  const addItemToCategory = (cat: string, itemId: string) => {
    const currentIds = cat === 'loved' ? loved : cat === 'liked' ? liked : cat === 'disliked' ? disliked : hated
    const idList = currentIds.split(/\s+/).filter(id => id.trim())
    if (!idList.includes(itemId)) {
      const newList = [...idList, itemId].join(' ')
      if (cat === 'loved') setLoved(newList)
      else if (cat === 'liked') setLiked(newList)
      else if (cat === 'disliked') setDisliked(newList)
      else if (cat === 'hated') setHated(newList)
      setTimeout(persist, 0)
    }
  }

  const removeItemFromCategory = (cat: string, itemId: string) => {
    const currentIds = cat === 'loved' ? loved : cat === 'liked' ? liked : cat === 'disliked' ? disliked : hated
    const newList = currentIds.split(/\s+/).filter(id => id.trim() && id !== itemId).join(' ')
    if (cat === 'loved') setLoved(newList)
    else if (cat === 'liked') setLiked(newList)
    else if (cat === 'disliked') setDisliked(newList)
    else if (cat === 'hated') setHated(newList)
    setTimeout(persist, 0)
  }

  const getSelectedIds = (cat: string) => (cat === 'loved' ? loved : cat === 'liked' ? liked : cat === 'disliked' ? disliked : hated).split(/\s+/).filter(id => id.trim())

  // Filter items by category (type) + search
  const filteredItems = useMemo(() => {
    let list: VanillaGameItem[]
    if (giftCategory === '全部') {
      list = vanillaItems
    } else {
      const targetType = labelToType[giftCategory]
      list = targetType ? vanillaItems.filter(i => i.type === targetType) : vanillaItems
    }
    if (giftSearch.trim()) {
      const q = giftSearch.toLowerCase()
      list = list.filter(i =>
        (i.displayName || i.name).toLowerCase().includes(q) ||
        i.id.includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [giftCategory, giftSearch, vanillaItems, labelToType])

  // Batch load item images for visible items
  // 用 ref 缓存已加载的 ID 集合，避免 filteredItems 变化时重复加载已有图片
  const loadedItemIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!unpackedRoot || filteredItems.length === 0) return
    const toLoad = filteredItems.filter(item => !itemImageCacheRef.current[item.id] && !loadedItemIdsRef.current.has(item.id))
    if (toLoad.length === 0) return
    // 标记为正在加载，避免重复请求
    toLoad.forEach(item => loadedItemIdsRef.current.add(item.id))
    let cancelled = false
    async function batchLoad() {
      // Load in chunks of 40 to avoid huge payloads
      const chunkSize = 40
      for (let i = 0; i < toLoad.length; i += chunkSize) {
        if (cancelled) break
        const chunk = toLoad.slice(i, i + chunkSize)
        const batch = chunk.map(item => ({ id: item.id, texture: item.texture, spriteIndex: item.spriteIndex }))
        const result = await (window as any).electronAPI?.xnbBatchItemImages?.(unpackedRoot, batch)
        if (!cancelled && result) {
          itemImageCacheRef.current = { ...itemImageCacheRef.current, ...result }
          setItemImageCache(prev => ({ ...prev, ...result }))
        }
      }
    }
    batchLoad()
    return () => { cancelled = true }
  }, [unpackedRoot, filteredItems])

  const GIFT_CATS = [
    { key: 'loved', label: '最爱', color: 'text-emerald-400' },
    { key: 'liked', label: '喜欢', color: 'text-sky-400' },
    { key: 'disliked', label: '不喜欢', color: 'text-orange-400' },
    { key: 'hated', label: '讨厌', color: 'text-red-400' },
  ]
  const GIFT_LINES: Record<string, string> = {
    loved: lovedLine, liked: likedLine, disliked: dislikedLine, hated: hatedLine
  }

  return (
    <div className="bg-[#2a2a2a] rounded-xl p-5 mt-4">
      <h3 className="text-base font-medium text-gray-300 mb-3">礼物偏好</h3>

      {GIFT_CATS.map(cat => {
        const selectedIds = getSelectedIds(cat.key)
        const vanillaLine = GIFT_LINES[cat.key]
        return (
          <div key={cat.key} className="bg-[#1f1f1f] rounded-lg p-3 mb-2 border border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-2">
              <label className={`text-sm ${cat.color} font-bold flex items-center gap-1`}>
                {cat.label}
                <span className="text-xs text-gray-500 font-normal">({selectedIds.length})</span>
              </label>
            </div>
            {/* Selected item tags */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedIds.map(id => {
                  const displayName = getItemDisplayName(id, vanillaItems)
                  const isCategory = id.startsWith('-')
                  return (
                    <span key={id} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                      isCategory ? 'bg-purple-900/40 text-purple-300 border border-purple-700/40' : 'bg-[#252525]'
                    }`}>
                      {isCategory && <span className="text-[10px] text-purple-400">类</span>}
                      {displayName}
                      <button onClick={() => removeItemFromCategory(cat.key, id)}
                        className="text-gray-500 hover:text-red-400 ml-0.5">&times;</button>
                    </span>
                  )
                })}
              </div>
            )}
            {/* Vanilla dialogue line preview (原版台词) */}
            {vanillaLine && !custom && (
              <div className="text-xs text-gray-400 italic mb-2 px-1 border-l-2 border-gray-600 pl-2">
                {vanillaLine}
              </div>
            )}
            {/* Direct ID input */}
            <input type="text"
              value={cat.key === 'loved' ? loved : cat.key === 'liked' ? liked : cat.key === 'disliked' ? disliked : hated}
              onChange={e => {
                if (cat.key === 'loved') setLoved(e.target.value)
                else if (cat.key === 'liked') setLiked(e.target.value)
                else if (cat.key === 'disliked') setDisliked(e.target.value)
                else setHated(e.target.value)
                persist()
              }}
              placeholder="输入物品ID，用空格分隔..."
              className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#555]" />
          </div>
        )
      })}

      {/* Full item browser: category tabs + search */}
      <div className="bg-[#1f1f1f] rounded-lg p-3 border border-[#2a2a2a]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm text-gray-400">物品浏览器</h4>
            {itemsLoading ? (
              <span className="text-xs text-gray-500">加载中...</span>
            ) : (
              <span className="text-xs text-gray-600">（{vanillaItems.length}个物品）</span>
            )}
          </div>
          {/* 添加目标分类选择 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">点击添加到：</span>
            {GIFT_CATS.map(cat => (
              <button key={cat.key} onClick={() => setGiftTargetCat(cat.key as any)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  giftTargetCat === cat.key
                    ? `${cat.color} bg-[#333] border border-current font-bold`
                    : 'text-gray-500 hover:text-gray-300 bg-[#252525] border border-transparent'
                }`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1.5 mb-2">
          <button
            onClick={() => {
              // 取消当前分类：从所有礼物类别中移除当前筛选出的物品
              const toRemove = filteredItems.filter(item => {
                const inLoved = getSelectedIds('loved').includes(item.id)
                const inLiked = getSelectedIds('liked').includes(item.id)
                const inDisliked = getSelectedIds('disliked').includes(item.id)
                const inHated = getSelectedIds('hated').includes(item.id)
                return inLoved || inLiked || inDisliked || inHated
              })
              if (toRemove.length === 0) return
              const removeIds = new Set(toRemove.map(i => i.id))
              const filterOut = (list: string) => list.split(/\s+/).filter(id => id.trim() && !removeIds.has(id)).join(' ')
              setLoved(filterOut(loved))
              setLiked(filterOut(liked))
              setDisliked(filterOut(disliked))
              setHated(filterOut(hated))
              setTimeout(persist, 0)
            }}
            className="text-xs px-2 py-1 rounded bg-orange-900/50 text-orange-300 hover:bg-orange-800/50 border border-orange-700/40 transition-colors"
          >移除当前分类</button>
          <button
            onClick={() => {
              const toAdd = filteredItems.filter(item => {
                const inLoved = getSelectedIds('loved').includes(item.id)
                const inLiked = getSelectedIds('liked').includes(item.id)
                const inDisliked = getSelectedIds('disliked').includes(item.id)
                const inHated = getSelectedIds('hated').includes(item.id)
                return !inLoved && !inLiked && !inDisliked && !inHated
              })
              if (toAdd.length === 0) return
              const newIds = [...getSelectedIds(giftTargetCat), ...toAdd.map(i => i.id)].join(' ')
              if (giftTargetCat === 'loved') setLoved(newIds)
              else if (giftTargetCat === 'liked') setLiked(newIds)
              else if (giftTargetCat === 'disliked') setDisliked(newIds)
              else setHated(newIds)
              setTimeout(persist, 0)
            }}
            className="text-xs px-2 py-1 rounded bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50 border border-emerald-700/40 transition-colors"
          >全选到{(() => { const cat = GIFT_CATS.find(c => c.key === giftTargetCat); return cat ? cat.label : '最爱'; })()}</button>
            <button
              onClick={() => {
                setLoved('')
                setLiked('')
                setDisliked('')
                setHated('')
                setTimeout(persist, 0)
              }}
              className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-800/40 border border-red-700/30 transition-colors"
          >清空全部</button>
        </div>
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 mb-2">
          {categoryTabs.map(c => (
            <button key={c} onClick={() => setGiftCategory(c)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${giftCategory === c ? 'bg-white text-black' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
        {/* Search */}
        <input type="text" value={giftSearch} onChange={e => setGiftSearch(e.target.value)}
          placeholder="搜索物品名称或ID..."
          className="w-full bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#555] mb-2" />
        {/* Item grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-64 overflow-y-auto">
          {itemsLoading && (
            <p className="col-span-full text-sm text-gray-500 text-center py-4">正在从游戏加载物品数据...</p>
          )}
          {!itemsLoading && filteredItems.map(item => {
            const inLoved = getSelectedIds('loved').includes(item.id)
            const inLiked = getSelectedIds('liked').includes(item.id)
            const inDisliked = getSelectedIds('disliked').includes(item.id)
            const inHated = getSelectedIds('hated').includes(item.id)
            const added = inLoved || inLiked || inDisliked || inHated
            const imgSrc = itemImageCache[item.id]
            return (
              <button key={item.id}
                onClick={() => added ? removeItemFromCategory(inLoved ? 'loved' : inLiked ? 'liked' : inDisliked ? 'disliked' : 'hated', item.id) : addItemToCategory(giftTargetCat, item.id)}
                className={`text-xs p-1.5 rounded transition-colors flex flex-col items-center gap-0.5 ${
                  added ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' : 'bg-[#252525] hover:bg-[#333] text-gray-400 hover:text-white'
                }`}
                title={`${item.displayName || item.name}\n${item.description || ''}`}>
                {imgSrc ? (
                  <img src={imgSrc} alt={item.name} className="w-8 h-8 object-contain pixelated" loading="lazy" />
                ) : null}
                <span className="truncate w-full text-center leading-tight">{item.displayName || item.name}</span>
              </button>
            )
          })}
          {!itemsLoading && filteredItems.length === 0 && (
            <p className="col-span-full text-sm text-gray-500 text-center py-4">没有匹配的物品</p>
          )}
        </div>
      </div>
    </div>
  )
})

function SpriteCard({ url, name }: { url: string; name: string }): JSX.Element {
  return (
    <div className="bg-[#1a1a1a] rounded-lg overflow-hidden group">
      <div className="aspect-square flex items-center justify-center p-2">
        <img src={url} alt={name} className="max-w-full max-h-full object-contain pixelated"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
      </div>
      <div className="p-1.5 text-center">
        <span className="text-[9px] text-gray-500 truncate block">{name}</span>
      </div>
    </div>
  )
}

function InfoChip({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{value}</span>
    </div>
  )
}

function GiftTasteRow({ label, color, value }: { label: string; color: string; value: string }): JSX.Element {
  return (
    <div className="bg-[#1a1a1a] rounded-lg px-3 py-2">
      <span className={`text-[10px] ${color} block mb-0.5`}>{label}</span>
      <span className="text-[11px] text-gray-300 font-mono">{value}</span>
    </div>
  )
}
