export interface ScheduleEntry {
  time: string      // e.g. "630" for 6:30 AM
  location: string  // map name
  tileX: number
  tileY: number
  facing: number    // 0=up, 1=right, 2=down, 3=left
  command?: string  // optional: 'sleep', 'talk', etc.
  /** GOTO命令：跳转到另一个日程键（如 "spring"），设置后其他字段忽略 */
  goto?: string
  /** 条件命令：如 "NOT friendship Sam 6"，设置后该条目仅在条件满足时生效 */
  condition?: string
}

export interface GiftTastes {
  loved?: string    // item IDs separated by spaces
  liked?: string
  disliked?: string
  hated?: string
  neutral?: string
  // 1.6 JSON model 反应文本
  loveResponse?: string
  likeResponse?: string
  neutralResponse?: string
  dislikeResponse?: string
  hateResponse?: string
}

export interface NPCInfo {
  id: string
  name: string
  displayName: string
  birthday: string
  canMarry: boolean
  gender: 'male' | 'female'
  description: string
  home: string
  color: string
  portraitUrl: string
  wikiPortraitUrl: string
  // --- 自定义NPC扩展字段 ---
  portraitFilePath?: string
  spriteFilePath?: string
  spriteUrl?: string
  // 多场景数据（key 为场景索引字符串 "0", "2" 等）
  portraits?: Record<string, string>       // { sceneIdx: dataUrl }
  portraitFilePaths?: Record<string, string> // { sceneIdx: filePath }
  sprites?: Record<string, string>         // { sceneIdx: dataUrl }
  spriteFilePaths?: Record<string, string>   // { sceneIdx: filePath }
  birthSeason?: string
  birthDay?: number
  introduceAt?: string
  homeLocation?: string
  homeTileX?: number
  homeTileY?: number
  // 1.6 Data/Characters 完整字段
  homeRegion?: string
  age?: 'Teen' | 'Adult' | 'Child'
  manner?: 'Polite' | 'Neutral' | 'Rude'
  socialAnxiety?: 'Shy' | 'Neutral' | 'Outgoing'
  optimism?: 'Positive' | 'Neutral' | 'Negative'
  isDarkSkinned?: boolean
  canVisitIsland?: boolean | string  // supports GSQ
  schedule?: ScheduleEntry[] | Record<string, ScheduleEntry[]>  // 旧格式: 数组; 新格式: { "Mon": [...], "Tue": [...], "rain": [...] }
  giftTastes?: GiftTastes
  dialogues?: Record<string, string>

  // 社交功能字段
  language?: 'Default' | 'Dwarvish'
  canSocialize?: boolean | string  // supports GSQ
  canReceiveGifts?: boolean
  canCommentOnPurchasedShopItems?: boolean | null
  canGreetNearbyCharacters?: boolean
  calendar?: 'HiddenAlways' | 'HiddenUntilMet' | 'AlwaysShown'
  socialTab?: 'HiddenAlways' | 'HiddenUntilMet' | 'UnknownUntilMet' | 'AlwaysShown'
  spouseAdopts?: boolean | string | null  // supports GSQ
  spouseWantsChildren?: boolean | string  // supports GSQ
  spouseGiftJealousy?: boolean | string  // supports GSQ
  spouseGiftJealousyFriendshipChange?: number
  introductionsQuest?: boolean | null
  itemDeliveryQuests?: boolean | string | null  // supports GSQ
  perfectionScore?: boolean
  endSlideShow?: 'Hidden' | 'MainGroup' | 'TrailingGroup'

  // 人际关系
  friendsAndFamily?: Record<string, string>  // {"Robin": "妈妈", "Demetrius": "爸爸"}

  // 配偶系统
  spouseRoom?: {
    mapAsset: string
    mapSourceRect: { x: number; y: number; width: number; height: number }
  }
  spousePatio?: {
    mapAsset: string
    mapSourceRect: { x: number; y: number; width: number; height: number }
    spriteAnimationFrames?: Array<[number, number]>  // [tileIndex, durationMs]
    spriteAnimationPixelOffset?: { x: number; y: number }
  }
  engagementDialogue?: [string, string]  // [dialogue0, dialogue1]
  marriageDialogue?: Record<string, string>  // {Good_Morning: "...", Good_Night: "...", etc.}
  marriageSchedule?: Record<string, ScheduleEntry[]>  // {marriage_spring: [...], etc.}

  // Home多住址
  homeAddresses?: Array<{
    id: string
    location: string
    tile: { x: number; y: number }
    direction: 'up' | 'right' | 'down' | 'left'
    condition?: string | null
  }>

  // 外观动态切换 (Appearance)
  appearance?: Array<{
    id: string
    season?: 'spring' | 'summer' | 'fall' | 'winter'
    isIslandAttire?: boolean
    portraitSprite?: string
    sprite?: string
    precedence?: number
    weight?: number
  }>

  // 外观细节
  textureName?: string
  size?: { x: number; y: number }
  mugShotSourceRect?: { x: number; y: number; width: number; height: number }
  breather?: boolean
  shadow?: { visible: boolean; offset: { x: number; y: number }; scale: number }
  emoteOffset?: { x: number; y: number }
  shakePortraits?: number[]
  kissSpriteIndex?: number
  kissSpriteFacingDirection?: boolean

  // 解锁条件
  unlockConditions?: string
  spawnIfMissing?: boolean
}

// 人物肖像（从 Steam 游戏解包，详情页/编辑页用）
const PORTRAIT = (name: string) => `/assets/maps/Portraits_${name}.png`

// 列表头像（从 Wiki 下载到本地，选择人物页用）
const WIKI_AVATAR = (name: string) => `/assets/wiki/${name}.png`

export const defaultNPCs: NPCInfo[] = [
  // === 可婚NPC ===
  { id: 'abigail', name: 'Abigail', displayName: '阿比盖尔', birthday: '秋季13日', canMarry: true, gender: 'female', description: '皮埃尔和卡洛琳的女儿，喜欢冒险和超自然事物。', home: '皮埃尔杂货店', color: '#7b2d8b', portraitUrl: PORTRAIT('Abigail'), wikiPortraitUrl: WIKI_AVATAR('Abigail'), birthSeason: 'fall', birthDay: 13, age: 'Adult', manner: 'Neutral', socialAnxiety: 'Outgoing', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'SeedShop', homeTileX: 26, homeTileY: 13, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Pierre: '爸爸', Caroline: '妈妈' } },
  { id: 'alex', name: 'Alex', displayName: '亚历克斯', birthday: '夏季13日', canMarry: true, gender: 'male', description: '住在镇上的运动青年，梦想成为职业运动员。', home: '乔治和艾芙琳家', color: '#2d6b3f', portraitUrl: PORTRAIT('Alex'), wikiPortraitUrl: WIKI_AVATAR('Alex'), birthSeason: 'summer', birthDay: 13, age: 'Adult', manner: 'Neutral', socialAnxiety: 'Outgoing', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'SamHouse', homeTileX: 18, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { George: '爷爷', Evelyn: '奶奶' } },
  { id: 'elliott', name: 'Elliott', displayName: '艾利欧特', birthday: '秋季5日', canMarry: true, gender: 'male', description: '住在海边小屋的作家，浪漫而优雅。', home: '海边小屋', color: '#b85c3a', portraitUrl: PORTRAIT('Elliott'), wikiPortraitUrl: WIKI_AVATAR('Elliott'), birthSeason: 'fall', birthDay: 5, age: 'Adult', manner: 'Polite', socialAnxiety: 'Neutral', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'ElliottHouse', homeTileX: 5, homeTileY: 6, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup' },
  { id: 'haley', name: 'Haley', displayName: '海莉', birthday: '春季14日', canMarry: true, gender: 'female', description: '艾米丽的妹妹，喜欢摄影和时尚。', home: '柳巷2号', color: '#d4a853', portraitUrl: PORTRAIT('Haley'), wikiPortraitUrl: WIKI_AVATAR('Haley'), birthSeason: 'spring', birthDay: 14, age: 'Adult', manner: 'Rude', socialAnxiety: 'Outgoing', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'HaleyHouse', homeTileX: 16, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Emily: '姐妹' } },
  { id: 'harvey', name: 'Harvey', displayName: '哈维', birthday: '冬季14日', canMarry: true, gender: 'male', description: '镇上的医生，温和而内敛。', home: '哈维诊所', color: '#4a7c8c', portraitUrl: PORTRAIT('Harvey'), wikiPortraitUrl: WIKI_AVATAR('Harvey'), birthSeason: 'winter', birthDay: 14, age: 'Adult', manner: 'Polite', socialAnxiety: 'Shy', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'HarveySurgery', homeTileX: 5, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup' },
  { id: 'leah', name: 'Leah', displayName: '莉亚', birthday: '冬季23日', canMarry: true, gender: 'female', description: '住在煤矿森林的木雕艺术家。', home: '煤矿森林小屋', color: '#c46b3a', portraitUrl: PORTRAIT('Leah'), wikiPortraitUrl: WIKI_AVATAR('Leah'), birthSeason: 'winter', birthDay: 23, age: 'Adult', manner: 'Polite', socialAnxiety: 'Neutral', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'LeahHouse', homeTileX: 10, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup' },
  { id: 'maru', name: 'Maru', displayName: '玛鲁', birthday: '夏季10日', canMarry: true, gender: 'female', description: '德米特里厄斯和罗宾的女儿，喜爱发明创造。', home: '木匠铺', color: '#c4394a', portraitUrl: PORTRAIT('Maru'), wikiPortraitUrl: WIKI_AVATAR('Maru'), birthSeason: 'summer', birthDay: 10, age: 'Adult', manner: 'Polite', socialAnxiety: 'Outgoing', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'ScienceHouse', homeTileX: 7, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Demetrius: '爸爸', Robin: '妈妈', Sebastian: '同母异父兄弟' } },
  { id: 'penny', name: 'Penny', displayName: '潘妮', birthday: '秋季2日', canMarry: true, gender: 'female', description: '潘姆的女儿，在镇上当老师教孩子。', home: '拖车', color: '#d4983a', portraitUrl: PORTRAIT('Penny'), wikiPortraitUrl: WIKI_AVATAR('Penny'), birthSeason: 'fall', birthDay: 2, age: 'Adult', manner: 'Polite', socialAnxiety: 'Shy', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'Trailer', homeTileX: 6, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Pam: '妈妈' } },
  { id: 'sam', name: 'Sam', displayName: '山姆', birthday: '夏季17日', canMarry: true, gender: 'male', description: '乔迪的儿子，热爱音乐，在乐队弹吉他。', home: '柳巷1号', color: '#d4b03a', portraitUrl: PORTRAIT('Sam'), wikiPortraitUrl: WIKI_AVATAR('Sam'), birthSeason: 'summer', birthDay: 17, age: 'Adult', manner: 'Neutral', socialAnxiety: 'Outgoing', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'SamHouse', homeTileX: 18, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Jodi: '妈妈', Kent: '爸爸', Vincent: '兄弟' } },
  { id: 'sebastian', name: 'Sebastian', displayName: '塞巴斯蒂安', birthday: '冬季10日', canMarry: true, gender: 'male', description: '罗宾的儿子，自由职业程序员。', home: '木匠铺地下室', color: '#3a3a3a', portraitUrl: PORTRAIT('Sebastian'), wikiPortraitUrl: WIKI_AVATAR('Sebastian'), birthSeason: 'winter', birthDay: 10, age: 'Adult', manner: 'Neutral', socialAnxiety: 'Shy', optimism: 'Negative', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'ScienceHouse', homeTileX: 7, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Robin: '妈妈', Maru: '姐妹', Demetrius: '继父' } },
  { id: 'shane', name: 'Shane', displayName: '谢恩', birthday: '春季20日', canMarry: true, gender: 'male', description: '在Joja超市工作，喜欢养鸡。', home: '玛妮的牧场', color: '#4a5cb8', portraitUrl: PORTRAIT('Shane'), wikiPortraitUrl: WIKI_AVATAR('Shane'), birthSeason: 'spring', birthDay: 20, age: 'Adult', manner: 'Rude', socialAnxiety: 'Shy', optimism: 'Negative', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'AnimalShop', homeTileX: 21, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Marnie: '阿姨' } },
  { id: 'emily', name: 'Emily', displayName: '艾米丽', birthday: '春季27日', canMarry: true, gender: 'female', description: '海莉的姐姐，在星落酒吧工作。', home: '柳巷2号', color: '#4a8bc8', portraitUrl: PORTRAIT('Emily'), wikiPortraitUrl: WIKI_AVATAR('Emily'), birthSeason: 'spring', birthDay: 27, age: 'Adult', manner: 'Polite', socialAnxiety: 'Outgoing', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'HaleyHouse', homeTileX: 16, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Haley: '姐妹' } },

  // === 镇居民（可社交） ===
  { id: 'caroline', name: 'Caroline', displayName: '卡洛琳', birthday: '冬季7日', canMarry: false, gender: 'female', description: '皮埃尔的妻子，阿比盖尔的母亲。', home: '皮埃尔杂货店', color: '#4a8b6b', portraitUrl: PORTRAIT('Caroline'), wikiPortraitUrl: WIKI_AVATAR('Caroline'), birthSeason: 'winter', birthDay: 7, age: 'Adult', manner: 'Polite', socialAnxiety: 'Neutral', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'SeedShop', homeTileX: 26, homeTileY: 13, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Pierre: '丈夫', Abigail: '女儿' } },
  { id: 'pierre', name: 'Pierre', displayName: '皮埃尔', birthday: '春季26日', canMarry: false, gender: 'male', description: '杂货店老板，出售种子和百货。', home: '皮埃尔杂货店', color: '#4a6bc8', portraitUrl: PORTRAIT('Pierre'), wikiPortraitUrl: WIKI_AVATAR('Pierre'), birthSeason: 'spring', birthDay: 26, age: 'Adult', manner: 'Neutral', socialAnxiety: 'Neutral', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'SeedShop', homeTileX: 26, homeTileY: 13, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Caroline: '妻子', Abigail: '女儿' } },
  { id: 'lewis', name: 'Lewis', displayName: '刘易斯', birthday: '春季7日', canMarry: false, gender: 'male', description: '鹈鹕镇的镇长。', home: '镇长大宅', color: '#c8a84a', portraitUrl: PORTRAIT('Lewis'), wikiPortraitUrl: WIKI_AVATAR('Lewis'), birthSeason: 'spring', birthDay: 7, age: 'Adult', manner: 'Polite', socialAnxiety: 'Outgoing', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'ManorHouse', homeTileX: 9, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup' },
  { id: 'marnie', name: 'Marnie', displayName: '玛妮', birthday: '秋季18日', canMarry: false, gender: 'female', description: '经营牧场，出售动物和饲料。', home: '玛妮的牧场', color: '#c86e3a', portraitUrl: PORTRAIT('Marnie'), wikiPortraitUrl: WIKI_AVATAR('Marnie'), birthSeason: 'fall', birthDay: 18, age: 'Adult', manner: 'Polite', socialAnxiety: 'Neutral', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'AnimalShop', homeTileX: 21, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Jas: '侄女', Shane: '侄子' } },
  { id: 'robin', name: 'Robin', displayName: '罗宾', birthday: '秋季21日', canMarry: false, gender: 'female', description: '木匠，可以帮你建造农场建筑。', home: '木匠铺', color: '#c8883a', portraitUrl: PORTRAIT('Robin'), wikiPortraitUrl: WIKI_AVATAR('Robin'), birthSeason: 'fall', birthDay: 21, age: 'Adult', manner: 'Neutral', socialAnxiety: 'Outgoing', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'ScienceHouse', homeTileX: 7, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Demetrius: '丈夫', Maru: '女儿', Sebastian: '儿子' } },
  { id: 'linus', name: 'Linus', displayName: '莱纳斯', birthday: '冬季3日', canMarry: false, gender: 'male', description: '住在帐篷里的野生采集者。', home: '帐篷', color: '#8b6b4a', portraitUrl: PORTRAIT('Linus'), wikiPortraitUrl: WIKI_AVATAR('Linus'), birthSeason: 'winter', birthDay: 3, age: 'Adult', manner: 'Polite', socialAnxiety: 'Shy', optimism: 'Neutral', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'Tent', homeTileX: 28, homeTileY: 10, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup' },
  { id: 'pam', name: 'Pam', displayName: '潘姆', birthday: '春季18日', canMarry: false, gender: 'female', description: '潘妮的母亲，巴士司机。', home: '拖车', color: '#c84a6b', portraitUrl: PORTRAIT('Pam'), wikiPortraitUrl: WIKI_AVATAR('Pam'), birthSeason: 'spring', birthDay: 18, age: 'Adult', manner: 'Rude', socialAnxiety: 'Outgoing', optimism: 'Negative', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'Trailer', homeTileX: 6, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Penny: '女儿' } },
  { id: 'jodi', name: 'Jodi', displayName: '乔迪', birthday: '秋季11日', canMarry: false, gender: 'female', description: '山姆和文森特的母亲，家庭主妇。', home: '柳巷1号', color: '#c44a8b', portraitUrl: PORTRAIT('Jodi'), wikiPortraitUrl: WIKI_AVATAR('Jodi'), birthSeason: 'fall', birthDay: 11, age: 'Adult', manner: 'Polite', socialAnxiety: 'Neutral', optimism: 'Neutral', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'SamHouse', homeTileX: 18, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Kent: '丈夫', Sam: '儿子', Vincent: '儿子' } },
  { id: 'kent', name: 'Kent', displayName: '肯特', birthday: '春季4日', canMarry: false, gender: 'male', description: '乔迪的丈夫，退伍军人。', home: '柳巷1号', color: '#5a7a4a', portraitUrl: PORTRAIT('Kent'), wikiPortraitUrl: WIKI_AVATAR('Kent'), birthSeason: 'spring', birthDay: 4, age: 'Adult', manner: 'Neutral', socialAnxiety: 'Shy', optimism: 'Negative', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'SamHouse', homeTileX: 18, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Jodi: '妻子', Sam: '儿子', Vincent: '儿子' } },
  { id: 'vincent', name: 'Vincent', displayName: '文森特', birthday: '春季10日', canMarry: false, gender: 'male', description: '乔迪和肯特的小儿子。', home: '柳巷1号', color: '#c8a85a', portraitUrl: PORTRAIT('Vincent'), wikiPortraitUrl: WIKI_AVATAR('Vincent'), birthSeason: 'spring', birthDay: 10, age: 'Child', manner: 'Neutral', socialAnxiety: 'Outgoing', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'SamHouse', homeTileX: 18, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Jodi: '妈妈', Kent: '爸爸', Sam: '兄弟' } },
  { id: 'jas', name: 'Jas', displayName: '贾斯', birthday: '夏季4日', canMarry: false, gender: 'female', description: '玛妮的侄女，和文森特是好朋友。', home: '玛妮的牧场', color: '#c89aba', portraitUrl: PORTRAIT('Jas'), wikiPortraitUrl: WIKI_AVATAR('Jas'), birthSeason: 'summer', birthDay: 4, age: 'Child', manner: 'Polite', socialAnxiety: 'Shy', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'AnimalShop', homeTileX: 21, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Marnie: '阿姨' } },
  { id: 'gus', name: 'Gus', displayName: '格斯', birthday: '夏季8日', canMarry: false, gender: 'male', description: '星落酒吧的老板，厨艺高超。', home: '星落酒吧', color: '#8b5e3c', portraitUrl: PORTRAIT('Gus'), wikiPortraitUrl: WIKI_AVATAR('Gus'), birthSeason: 'summer', birthDay: 8, age: 'Adult', manner: 'Polite', socialAnxiety: 'Outgoing', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'Saloon', homeTileX: 15, homeTileY: 21, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup' },
  { id: 'clint', name: 'Clint', displayName: '克林特', birthday: '冬季26日', canMarry: false, gender: 'male', description: '镇上的铁匠，帮你升级工具。', home: '铁匠铺', color: '#6b5e4a', portraitUrl: PORTRAIT('Clint'), wikiPortraitUrl: WIKI_AVATAR('Clint'), birthSeason: 'winter', birthDay: 26, age: 'Adult', manner: 'Neutral', socialAnxiety: 'Shy', optimism: 'Negative', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'Blacksmith', homeTileX: 5, homeTileY: 12, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup' },
  { id: 'demetrius', name: 'Demetrius', displayName: '德米特里厄斯', birthday: '夏季19日', canMarry: false, gender: 'male', description: '镇上的科学家，喜欢研究当地生态。', home: '木匠铺', color: '#3c6b4a', portraitUrl: PORTRAIT('Demetrius'), wikiPortraitUrl: WIKI_AVATAR('Demetrius'), birthSeason: 'summer', birthDay: 19, age: 'Adult', manner: 'Polite', socialAnxiety: 'Neutral', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'ScienceHouse', homeTileX: 7, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Robin: '妻子', Maru: '女儿', Sebastian: '继子' } },
  { id: 'george', name: 'George', displayName: '乔治', birthday: '秋季24日', canMarry: false, gender: 'male', description: '艾芙琳的丈夫，脾气有点暴躁。', home: '河路1号', color: '#5a5a7a', portraitUrl: PORTRAIT('George'), wikiPortraitUrl: WIKI_AVATAR('George'), birthSeason: 'fall', birthDay: 24, age: 'Adult', manner: 'Rude', socialAnxiety: 'Neutral', optimism: 'Negative', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'SamHouse', homeTileX: 18, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Evelyn: '妻子', Alex: '孙子' } },
  { id: 'evelyn', name: 'Evelyn', displayName: '艾芙琳', birthday: '冬季20日', canMarry: false, gender: 'female', description: '乔治的妻子，喜欢种花和烤饼干。', home: '河路1号', color: '#c48b9a', portraitUrl: PORTRAIT('Evelyn'), wikiPortraitUrl: WIKI_AVATAR('Evelyn'), birthSeason: 'winter', birthDay: 20, age: 'Adult', manner: 'Polite', socialAnxiety: 'Neutral', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'SamHouse', homeTileX: 18, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { George: '丈夫', Alex: '孙子' } },
  { id: 'willy', name: 'Willy', displayName: '威利', birthday: '夏季24日', canMarry: false, gender: 'male', description: '老渔夫，在沙滩经营鱼店。', home: '鱼店', color: '#3a6b7a', portraitUrl: PORTRAIT('Willy'), wikiPortraitUrl: WIKI_AVATAR('Willy'), birthSeason: 'summer', birthDay: 24, age: 'Adult', manner: 'Polite', socialAnxiety: 'Shy', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'FishShop', homeTileX: 5, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup' },

  // === 其他可社交NPC ===
  { id: 'wizard', name: 'Wizard', displayName: '法师', birthday: '冬季17日', canMarry: false, gender: 'male', description: '隐居在煤矿森林的法师塔中。', home: '法师塔', color: '#6b3ac8', portraitUrl: PORTRAIT('Wizard'), wikiPortraitUrl: WIKI_AVATAR('Wizard'), birthSeason: 'winter', birthDay: 17, age: 'Adult', manner: 'Neutral', socialAnxiety: 'Shy', optimism: 'Neutral', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'WizardHouse', homeTileX: 5, homeTileY: 10, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup' },
  { id: 'dwarf', name: 'Dwarf', displayName: '矮人', birthday: '夏季22日', canMarry: false, gender: 'male', description: '住在矿井里的矮人商人。', home: '矿井', color: '#c86b3a', portraitUrl: PORTRAIT('Dwarf'), wikiPortraitUrl: WIKI_AVATAR('Dwarf'), birthSeason: 'summer', birthDay: 22, age: 'Adult', manner: 'Neutral', socialAnxiety: 'Shy', optimism: 'Neutral', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'Mine', homeTileX: 14, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', language: 'Dwarvish' },
  { id: 'sandy', name: 'Sandy', displayName: '桑迪', birthday: '秋季15日', canMarry: false, gender: 'female', description: '在沙漠绿洲商店工作的友好女士。', home: '沙漠绿洲', color: '#c83a8b', portraitUrl: PORTRAIT('Sandy'), wikiPortraitUrl: WIKI_AVATAR('Sandy'), birthSeason: 'fall', birthDay: 15, age: 'Adult', manner: 'Polite', socialAnxiety: 'Outgoing', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'SandyHouse', homeTileX: 5, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup' },
  { id: 'krobus', name: 'Krobus', displayName: '科罗布斯', birthday: '冬季1日', canMarry: false, gender: 'male', description: '住在下水道的友善暗影生物，可以成为室友。', home: '下水道', color: '#1a1a2a', portraitUrl: PORTRAIT('Krobus'), wikiPortraitUrl: WIKI_AVATAR('Krobus'), birthSeason: 'winter', birthDay: 1, age: 'Adult', manner: 'Polite', socialAnxiety: 'Shy', optimism: 'Neutral', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'Sewer', homeTileX: 16, homeTileY: 19, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup' },
  { id: 'leo', name: 'ParrotBoy', displayName: '雷欧', birthday: '夏季26日', canMarry: false, gender: 'male', description: '住在姜岛上和鹦鹉生活的男孩。', home: '姜岛', color: '#c8a85a', portraitUrl: PORTRAIT('ParrotBoy'), wikiPortraitUrl: WIKI_AVATAR('ParrotBoy'), birthSeason: 'summer', birthDay: 26, age: 'Child', manner: 'Polite', socialAnxiety: 'Shy', optimism: 'Positive', canSocialize: true, canReceiveGifts: true, canVisitIsland: true, homeLocation: 'IslandHut', homeTileX: 5, homeTileY: 5, calendar: 'AlwaysShown', socialTab: 'AlwaysShown', perfectionScore: true, endSlideShow: 'MainGroup', friendsAndFamily: { Birdie: '妈妈' } },

  // === 不可社交NPC ===
  { id: 'gunther', name: 'Gunther', displayName: '冈瑟', birthday: '未知', canMarry: false, gender: 'male', description: '博物馆的馆长。', home: '博物馆', color: '#4a6b8b', portraitUrl: PORTRAIT('Gunther'), wikiPortraitUrl: WIKI_AVATAR('Gunther'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'marlon', name: 'Marlon', displayName: '马龙', birthday: '未知', canMarry: false, gender: 'male', description: '冒险者公会的领袖。', home: '冒险者公会', color: '#6b4a4a', portraitUrl: PORTRAIT('Marlon'), wikiPortraitUrl: WIKI_AVATAR('Marlon'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'morris', name: 'Morris', displayName: '莫里斯', birthday: '未知', canMarry: false, gender: 'male', description: 'Joja超市的经理。', home: 'Joja超市', color: '#4a6bc8', portraitUrl: PORTRAIT('Morris'), wikiPortraitUrl: WIKI_AVATAR('Morris'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'gil', name: 'Gil', displayName: '吉尔', birthday: '未知', canMarry: false, gender: 'male', description: '冒险者公会的奖励发放员。', home: '冒险者公会', color: '#5a6b4a', portraitUrl: PORTRAIT('Gil'), wikiPortraitUrl: WIKI_AVATAR('Gil'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'mrqi', name: 'MrQi', displayName: '齐先生', birthday: '未知', canMarry: false, gender: 'male', description: '神秘人物，经营赌场和齐氏核桃房。', home: '齐氏核桃房', color: '#4a6bc8', portraitUrl: PORTRAIT('MrQi'), wikiPortraitUrl: WIKI_AVATAR('MrQi'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'professorsnail', name: 'ProfessorSnail', displayName: '蜗牛教授', birthday: '未知', canMarry: false, gender: 'male', description: '在姜岛研究化石的考古学家。', home: '姜岛化石营', color: '#6b8b4a', portraitUrl: '', wikiPortraitUrl: WIKI_AVATAR('ProfessorSnail'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'birdie', name: 'Birdie', displayName: '伯蒂', birthday: '未知', canMarry: false, gender: 'female', description: '住在姜岛西侧的隐居者。', home: '姜岛', color: '#8b6b8b', portraitUrl: PORTRAIT('Birdie'), wikiPortraitUrl: WIKI_AVATAR('Birdie'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'governor', name: 'Governor', displayName: '州长', birthday: '未知', canMarry: false, gender: 'male', description: '参加夏威夷宴会的州长。', home: '鹈鹕镇', color: '#c84a4a', portraitUrl: PORTRAIT('Governor'), wikiPortraitUrl: WIKI_AVATAR('Governor'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'grandpa', name: 'Grandpa', displayName: '爷爷', birthday: '未知', canMarry: false, gender: 'male', description: '玩家的爷爷，把农场留给了玩家。', home: '农场', color: '#8b8b8b', portraitUrl: PORTRAIT('Grandpa'), wikiPortraitUrl: WIKI_AVATAR('Grandpa'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'henchman', name: 'Henchman', displayName: '守卫', birthday: '未知', canMarry: false, gender: 'male', description: '女巫沼泽的守护者。', home: '女巫沼泽', color: '#2a4a2a', portraitUrl: PORTRAIT('Henchman'), wikiPortraitUrl: WIKI_AVATAR('Henchman'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'bouncer', name: 'Bouncer', displayName: '保镖', birthday: '未知', canMarry: false, gender: 'male', description: '沙漠赌场的门卫。', home: '沙漠赌场', color: '#2a2a4a', portraitUrl: PORTRAIT('Bouncer'), wikiPortraitUrl: WIKI_AVATAR('Bouncer'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },

  // === 动物/特殊角色 ===
  { id: 'bear', name: 'Bear', displayName: '熊', birthday: '未知', canMarry: false, gender: 'male', description: '住在煤矿森林深处的熊，喜欢蜂蜜。', home: '煤矿森林', color: '#8b5a2a', portraitUrl: PORTRAIT('Bear'), wikiPortraitUrl: WIKI_AVATAR('Bear'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'trashbear', name: 'TrashBear', displayName: '垃圾熊', birthday: '未知', canMarry: false, gender: 'male', description: '在镇上四处游荡的熊，会请求玩家帮忙找东西。', home: '鹈鹕镇', color: '#6b8b3a', portraitUrl: '', wikiPortraitUrl: WIKI_AVATAR('TrashBear'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'raccoon', name: 'Raccoon', displayName: '浣熊', birthday: '未知', canMarry: false, gender: 'male', description: '断桥边的浣熊，会发布任务。', home: '煤矿森林', color: '#6b6b6b', portraitUrl: '', wikiPortraitUrl: WIKI_AVATAR('raccoon'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'junimo', name: 'Junimo', displayName: '祝尼魔', birthday: '未知', canMarry: false, gender: 'male', description: '森林里的小精灵，帮助玩家打理社区。', home: '社区中心', color: '#4ac84a', portraitUrl: '', wikiPortraitUrl: WIKI_AVATAR('Junimo'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'crow', name: 'Crow', displayName: '乌鸦', birthday: '未知', canMarry: false, gender: 'male', description: '会偷吃农作物的乌鸦。', home: '农场', color: '#3a3a3a', portraitUrl: '', wikiPortraitUrl: WIKI_AVATAR('Crow'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },

  // === 姜岛角色（不可社交） ===
  { id: 'fizz', name: 'Fizz', displayName: '菲兹', birthday: '未知', canMarry: false, gender: 'male', description: '姜岛上的火山地牢商人。', home: '姜岛火山', color: '#c86b3a', portraitUrl: PORTRAIT('Fizz'), wikiPortraitUrl: WIKI_AVATAR('Fizz'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'safariguy', name: 'SafariGuy', displayName: '探险家', birthday: '未知', canMarry: false, gender: 'male', description: '姜岛上的探险家。', home: '姜岛', color: '#8b8b4a', portraitUrl: PORTRAIT('SafariGuy'), wikiPortraitUrl: WIKI_AVATAR('SafariGuy'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'gourmand', name: 'Gourmand', displayName: '美食家', birthday: '未知', canMarry: false, gender: 'male', description: '姜岛核桃洞里的美食家熊。', home: '姜岛核桃洞', color: '#5a8b5a', portraitUrl: '', wikiPortraitUrl: WIKI_AVATAR('Gourmand'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'islandparrot', name: 'IslandParrot', displayName: '岛屿鹦鹉', birthday: '未知', canMarry: false, gender: 'male', description: '姜岛上的鹦鹉，可以用核桃交换。', home: '姜岛', color: '#4ac8c8', portraitUrl: '', wikiPortraitUrl: WIKI_AVATAR('IslandParrot'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },

  // === 其他 ===
  { id: 'marcello', name: 'Marcello', displayName: '马塞洛', birthday: '未知', canMarry: false, gender: 'male', description: '出现在特定事件中的NPC。', home: '鹈鹕镇', color: '#6b4a8b', portraitUrl: '', wikiPortraitUrl: WIKI_AVATAR('Marcello'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
  { id: 'oldmariner', name: 'OldMariner', displayName: '老水手', birthday: '未知', canMarry: false, gender: 'male', description: '在雨天出现在海滩的神秘老人，出售美人鱼吊坠。', home: '海滩', color: '#3a6b8b', portraitUrl: PORTRAIT('OldMariner'), wikiPortraitUrl: WIKI_AVATAR('OldMariner'), age: 'Adult', canSocialize: false, canReceiveGifts: false, canVisitIsland: false, calendar: 'HiddenAlways', socialTab: 'HiddenAlways', perfectionScore: false, endSlideShow: 'Hidden' },
]

export const expressionLabels: Record<string, string> = {
  '0': '普通', '1': '开心', '2': '悲伤', '3': '自定义',
  '4': '脸红', '5': '生气', '6': '专属6', '7': '专属7',
  '8': '专属8', '9': '专属9'
}

export const sceneTypes = [
  '默认',           // 0  - default
  '沙滩',           // 1  - beach
  '冬日',           // 2  - winter
  '春季',           // 3  - spring
  '夏季',           // 4  - summer
  '秋季',           // 5  - fall
  '花舞节',         // 6  - flowerdance
  '复活节',         // 7  - eggf
  '展览会',         // 8  - fair
  '果冻节',         // 9  - jellies
  '夏威夷宴',       // 10 - luau
  '万灵节',         // 11 - spiritseve
  '冬日星',         // 12 - winterstar
  '冰雪节',         // 13 - icef
  '冬季室内',       // 14 - winter_indoor
  '冬季室外',       // 15 - winter_outdoor
  '医院',           // 16 - hospital (Maru)
  'Joja超市',       // 17 - jojamart (Sam, Shane)
  '风衣',           // 18 - trenchcoat (Krobus)
]

export const walkStates = [
  { id: 'walk_up', label: '向上走' },
  { id: 'walk_down', label: '向下走' },
  { id: 'walk_left', label: '向左走' },
  { id: 'walk_right', label: '向右走' },
]

export const GIFT_CATEGORY_IDS = [
  { id: '-2', label: '所有宝石', desc: '所有矿物宝石类' },
  { id: '-4', label: '所有矿石', desc: '所有矿石类' },
  { id: '-6', label: '所有建材', desc: '所有建筑材料' },
  { id: '-7', label: '所有怪物掉落', desc: '怪物掉落物品' },
  { id: '-12', label: '所有种子', desc: '所有种子类' },
  { id: '-16', label: '所有鱼类', desc: '所有鱼类' },
  { id: '-18', label: '所有加工品', desc: '加工制作物品' },
  { id: '-20', label: '所有垃圾', desc: '垃圾类物品' },
  { id: '-22', label: '所有金属锭', desc: '金属锭类' },
  { id: '-24', label: '所有料理', desc: '烹饪料理' },
  { id: '-26', label: '所有制造品', desc: '制造类物品' },
  { id: '-28', label: '所有肥料', desc: '肥料类' },
  { id: '-74', label: '所有水果', desc: '水果类' },
  { id: '-75', label: '所有蔬菜', desc: '蔬菜类' },
  { id: '-76', label: '所有花卉', desc: '花卉类' },
  { id: '-77', label: '所有饲料', desc: '动物饲料' },
  { id: '-78', label: '所有工匠物品', desc: '工匠制品' },
  { id: '-79', label: '所有糖浆', desc: '糖浆类' },
  { id: '-80', label: '所有酒', desc: '酒类' },
  { id: '-81', label: '所有能量补品', desc: '能量恢复物品' },
]

export const DIALOGUE_VARIABLE_TOKENS = [
  { token: '{{PlayerName}}', label: '玩家名字', desc: '替换为当前玩家名字' },
  { token: '{{FarmName}}', label: '农场名字', desc: '替换为当前农场名字' },
  { token: '{{Spouse}}', label: '配偶名字', desc: '替换为玩家配偶名字' },
  { token: '{{Season}}', label: '当前季节', desc: '替换为当前季节' },
  { token: '{{DayOfMonth}}', label: '当前日期', desc: '替换为当前日期' },
  { token: '{{DayOfWeek}}', label: '当前星期', desc: '替换为当前星期' },
  { token: '{{Weather}}', label: '当前天气', desc: '替换为当前天气' },
  { token: '{{Year}}', label: '当前年份', desc: '替换为当前年份' },
  { token: '@', label: '玩家名字(简写)', desc: '同{{PlayerName}}' },
  { token: '%pet', label: '宠物名字', desc: '替换为宠物名字' },
  { token: '%farm', label: '农场名字', desc: '替换为农场名字' },
  { token: '%book', label: '孩子名字(老大)', desc: '替换为第一个孩子名字' },
  { token: '%books', label: '孩子名字(老二)', desc: '替换为第二个孩子名字' },
]

export const DIALOGUE_EMOTION_CODES = [
  { code: '$h', label: '开心', desc: '切换为开心表情' },
  { code: '$s', label: '悲伤', desc: '切换为悲伤表情' },
  { code: '$l', label: '大笑', desc: '切换为大笑表情' },
  { code: '$a', label: '生气', desc: '切换为生气表情' },
  { code: '$u', label: '惊讶', desc: '切换为惊讶表情' },
  { code: '$b', label: '眨眼', desc: '切换为眨眼表情' },
  { code: '$k', label: '亲吻', desc: '切换为亲吻表情' },
]

export const HEART_EVENT_PRESETS = [
  { hearts: 2, title: '2心初识', desc: '初次深入了解NPC', defaultMap: 'Town' },
  { hearts: 4, title: '4心分支', desc: '带选择分支的互动事件', defaultMap: 'Saloon' },
  { hearts: 6, title: '6心亲密', desc: 'NPC展示秘密地点', defaultMap: 'Mountain' },
  { hearts: 8, title: '8心告白前奏', desc: '情感升温的浪漫场景', defaultMap: 'Beach' },
  { hearts: 10, title: '10心告白', desc: '正式告白事件', defaultMap: 'Forest' },
  { hearts: 14, title: '14心婚后', desc: '婚后甜蜜日常', defaultMap: 'FarmHouse' },
]

// group: scene=日常场景, chore=家务反馈, weekday=婚后周几
export const MARRIAGE_DIALOGUE_KEYS: Array<{ key: string; label: string; desc: string; group: 'scene' | 'chore' | 'weekday' }> = [
  // 日常场景
  { key: 'Good_Morning', label: '早安', desc: '每天早上配偶的问候', group: 'scene' },
  { key: 'Good_Night', label: '晚安', desc: '每天晚上配偶的晚安', group: 'scene' },
  { key: 'Rainy_day', label: '雨天', desc: '雨天配偶待在家时的对话', group: 'scene' },
  { key: 'Snowy_day', label: '雪天', desc: '雪天配偶的对话', group: 'scene' },
  { key: 'Kitchen', label: '厨房', desc: '配偶在厨房做饭时的对话', group: 'scene' },
  { key: 'Outdoors', label: '户外', desc: '配偶在户外时的对话', group: 'scene' },
  { key: 'patio', label: '门廊', desc: '配偶站在门廊时随机触发', group: 'scene' },
  { key: 'oneBed', label: '一张床', desc: '配偶在一张床场景的对话', group: 'scene' },
  { key: 'indoor', label: '室内', desc: '配偶在室内（非厨房）时的对话', group: 'scene' },
  // 家务反馈
  { key: 'Spouse_After_Housework', label: '做完家务', desc: '配偶做完家务后', group: 'chore' },
  { key: 'Spouse_Watered_Crops', label: '浇了作物', desc: '配偶帮忙浇作物后', group: 'chore' },
  { key: 'Spouse_Pet_Animals', label: '喂了动物', desc: '配偶喂了动物后', group: 'chore' },
  { key: 'Spouse_Repaired', label: '修了围栏', desc: '配偶修好围栏后', group: 'chore' },
  // 婚后周几
  { key: 'Mon', label: '婚后周一', desc: '婚后周一的对话', group: 'weekday' },
  { key: 'Fri', label: '婚后周五', desc: '婚后周五的对话', group: 'weekday' },
  { key: 'Sun', label: '婚后周日', desc: '婚后周日的对话', group: 'weekday' },
]

// 婚后日程键（marriageSchedule 字段）
export const MARRIAGE_SCHEDULE_KEYS = [
  { key: 'marriage', label: '默认婚后日程', desc: '婚后默认日常行程' },
  { key: 'marriage_Mon', label: '婚后周一', desc: '婚后周一的行程' },
  { key: 'marriage_Tue', label: '婚后周二', desc: '婚后周二的行程' },
  { key: 'marriage_Wed', label: '婚后周三', desc: '婚后周三的行程' },
  { key: 'marriage_Thu', label: '婚后周四', desc: '婚后周四的行程' },
  { key: 'marriage_Fri', label: '婚后周五', desc: '婚后周五的行程' },
  { key: 'marriage_Sat', label: '婚后周六', desc: '婚后周六的行程' },
  { key: 'marriage_Sun', label: '婚后周日', desc: '婚后周日的行程' },
]
