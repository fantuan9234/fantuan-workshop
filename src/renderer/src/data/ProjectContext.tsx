import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { getT } from '../i18n'

const MAX_HISTORY = 50

// ---- 项目数据格式 ----

/** ConfigSchema 条目 */
export interface ConfigSchemaEntry {
  AllowValues?: string
  AllowRange?: [number, number]
  Default?: unknown
  AllowBlank?: boolean
  Description?: string
}

/** DynamicToken 条目 */
export interface DynamicTokenEntry {
  Name: string
  Value: string
  When?: Record<string, string>
}

export interface ProjectSnapshot {
  meta: { name: string; createdAt: string; lastSaved: string; version?: string }
  /** 项目文件格式版本号，用于向后兼容迁移 */
  formatVersion: string
  /** 游戏目录路径（保存后重新打开项目时恢复，避免重复选择） */
  gameDir?: string
  /** XNB 解包目录路径（保存后重新打开项目时恢复，避免重复解包） */
  unpackedRoot?: string
  npcAssets: Record<string, { portraits: Record<string, string>; sprites: Record<string, string> }>
  npcDialogues: Record<string, Record<string, string>>
  /** 原版NPC的覆盖数据（日程、对话、礼物偏好等） */
  vanillaNpcOverrides: Record<string, VanillaNpcOverride>
  /** 原版物品的覆盖数据 */
  vanillaItemOverrides: Record<string, Record<string, unknown>>
  /** 原版事件的覆盖数据 */
  vanillaEventOverrides: Record<string, Record<string, unknown>>
  /** 任务覆盖数据 */
  questOverrides: Record<string, Record<string, unknown>>
  customNpcs: unknown[]
  events: unknown[]
  customItems: unknown[]
  maps: unknown[]
  customMaps: unknown[]
  quests: unknown[]
  buildings: unknown[]
  mails: unknown[]
  /** CP 高级功能：配置系统 */
  configSchema: Record<string, ConfigSchemaEntry>
  /** CP 高级功能：动态令牌 */
  dynamicTokens: DynamicTokenEntry[]
  /** CP 高级功能：全局 When 条件 */
  whenConditions: Record<string, string>
  /** CP 高级功能：国际化开关 */
  enableI18n: boolean
  /** CP 高级功能：i18n 翻译条目 (语言 → key → value) */
  i18nEntries: Record<string, Record<string, string>>
  /** CP 高级功能：是否拆分 content.json */
  splitContentFiles: boolean
  /** CP 高级功能：补丁优先级 */
  patchPriority: 'Low' | 'Normal' | 'High'
}

/** 原版NPC覆盖数据结构 */
export interface VanillaNpcOverride {
  schedule?: Record<string, Array<{ time: string; location: string; tileX: number; tileY: number; facing: number; command?: string }>>
  dialogues?: Record<string, string>
  giftTastes?: Record<string, string>
  /** 原版NPC的礼物偏好英文台词（用于英文模式显示） */
  giftTasteLines?: { loved?: string; liked?: string; disliked?: string; hated?: string; neutral?: string }
  /** 属性修改（使用 Fields 模式只修改指定字段） */
  characterFields?: {
    BirthSeason?: string
    BirthDay?: number
    Manner?: 'Polite' | 'Neutral' | 'Rude'
    SocialAnxiety?: 'Shy' | 'Neutral' | 'Outgoing'
    Optimism?: 'Positive' | 'Neutral' | 'Negative'
    Gender?: 'Male' | 'Female' | 'Undefined'
    Age?: 'Child' | 'Teen' | 'Adult'
    HomeRegion?: 'Town' | 'Desert' | 'Other'
    IsDarkSkinned?: boolean
    CanSocialize?: boolean | string
    CanBeRomanced?: boolean
    CanVisitIsland?: boolean | string
    Calendar?: 'HiddenAlways' | 'HiddenUntilMet' | 'AlwaysShown'
    SocialTab?: 'HiddenAlways' | 'HiddenUntilMet' | 'UnknownUntilMet' | 'AlwaysShown'
    SpouseAdopts?: boolean | string | null
    SpouseWantsChildren?: boolean | string
    SpouseGiftJealousy?: boolean | string
    SpouseGiftJealousyFriendshipChange?: number
    PerfectionScore?: boolean
    EndSlideShow?: 'Hidden' | 'MainGroup' | 'TrailingGroup'
    FriendsAndFamily?: Record<string, string>
  }
  /** 婚姻系统（给原版NPC添加婚姻功能） */
  marriage?: {
    spouseRoom?: {
      mapAsset: string
      mapSourceRect: { x: number; y: number; width: number; height: number }
    }
    spousePatio?: {
      mapAsset: string
      mapSourceRect: { x: number; y: number; width: number; height: number }
      spriteAnimationFrames?: Array<[number, number]>
      spriteAnimationPixelOffset?: { x: number; y: number }
    }
    engagementDialogue?: [string, string]
    marriageDialogue?: Record<string, string>
    marriageSchedule?: Record<string, Array<{ time: string; location: string; tileX: number; tileY: number; facing: number; command?: string }>>
  }
  /** 外观动态切换 */
  appearance?: Array<{
    id: string
    season?: 'spring' | 'summer' | 'fall' | 'winter'
    isIslandAttire?: boolean
    portraitSprite?: string
    sprite?: string
    precedence?: number
    weight?: number
  }>
}

export interface ProjectMeta {
  name: string
  filePath: string | null
  lastSaved: string | null
  hasUnsavedChanges: boolean
  /** 项目创建时间（保存时保留，不被 lastSaved 覆盖） */
  createdAt: string
}

/** 当前项目文件格式版本号（未来 schema 变更时递增，用于兼容性迁移） */
const CURRENT_FORMAT_VERSION = '1.0.0'

interface ProjectContextValue {
  meta: ProjectMeta
  setProjectName: (name: string) => void
  markDirty: () => void
  saveProject: () => Promise<boolean>
  openProject: () => Promise<boolean>
  newProject: () => void
  registerSnapshot: (key: string, getter: () => unknown, setter: (data: unknown) => void) => () => void
  /** 直接修改已注册的快照数据（供子编辑器调用） */
  mutateSnapshot: <T>(key: string, updater: (prev: T) => T) => void
  getFullSnapshot: () => ProjectSnapshot
  restoreSnapshot: (snap: ProjectSnapshot) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be inside ProjectProvider')
  return ctx
}

export function ProjectProvider({ children }: { children: ReactNode }): JSX.Element {
  const [meta, setMeta] = useState<ProjectMeta>({
    name: getT()('project.untitledProject'),
    filePath: null,
    lastSaved: null,
    hasUnsavedChanges: false,
    createdAt: new Date().toISOString()
  })

  // 注册表：key → { getter, setter }
  const registryRef = useRef<Map<string, { getter: () => unknown; setter: (data: unknown) => void }>>(new Map())
  // 最近一次加载的原始快照（用于恢复模块状态）
  const lastSnapshotRef = useRef<ProjectSnapshot | null>(null)

  // 撤销/重做历史 — 用 ref 保存最新值，避免 registerSnapshot 因 history 变化而重建
  const [history, setHistory] = useState<ProjectSnapshot[][]>(() => [[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  const historyRef = useRef(history)
  historyRef.current = history
  const historyIndexRef = useRef(historyIndex)
  historyIndexRef.current = historyIndex
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const pushHistory = useCallback((snap: ProjectSnapshot) => {
    setHistory(prev => {
      const idx = historyIndexRef.current
      const cleaned = prev.slice(0, idx + 1)
      const next = [...cleaned, [snap]]
      if (next.length > MAX_HISTORY) next.shift()
      return next
    })
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1))
  }, [])

  const getFullSnapshot = useCallback((): ProjectSnapshot => {
    const collected: Record<string, unknown> = {}
    registryRef.current.forEach(({ getter }, key) => {
      try { collected[key] = getter() } catch { collected[key] = null }
    })
    return {
      // 保留原始 createdAt，避免被 lastSaved 覆盖导致创建时间丢失
      meta: { name: meta.name, createdAt: meta.createdAt || meta.lastSaved || new Date().toISOString(), lastSaved: new Date().toISOString(), version: '0.1.0' },
      // 项目文件格式版本号，未来 schema 变更时用于兼容性迁移
      formatVersion: CURRENT_FORMAT_VERSION,
      // 游戏目录和解包路径：保存后重新打开项目时恢复，避免重复选择/解包
      gameDir: (collected.npcGameDir as string | null) || undefined,
      unpackedRoot: (collected.npcUnpackedRoot as string | null) || undefined,
      npcAssets: (collected.npcAssets as ProjectSnapshot['npcAssets']) || {},
      npcDialogues: (collected.npcDialogues as ProjectSnapshot['npcDialogues']) || {},
      vanillaNpcOverrides: (collected.vanillaNpcOverrides as ProjectSnapshot['vanillaNpcOverrides']) || {},
      vanillaItemOverrides: (collected.vanillaItemOverrides as ProjectSnapshot['vanillaItemOverrides']) || {},
      vanillaEventOverrides: (collected.vanillaEventOverrides as ProjectSnapshot['vanillaEventOverrides']) || {},
      questOverrides: (collected.questOverrides as ProjectSnapshot['questOverrides']) || {},
      customNpcs: (collected.customNpcs as ProjectSnapshot['customNpcs']) || [],
      events: (collected.events as ProjectSnapshot['events']) || [],
      customItems: (collected.customItems as ProjectSnapshot['customItems']) || [],
      maps: (collected.maps as ProjectSnapshot['maps']) || [],
      customMaps: (collected.customMaps as ProjectSnapshot['customMaps']) || [],
      quests: (collected.quests as ProjectSnapshot['quests']) || [],
      buildings: (collected.buildings as ProjectSnapshot['buildings']) || [],
      mails: (collected.mails as ProjectSnapshot['mails']) || [],
      configSchema: (collected.configSchema as ProjectSnapshot['configSchema']) || {},
      dynamicTokens: (collected.dynamicTokens as ProjectSnapshot['dynamicTokens']) || [],
      whenConditions: (collected.whenConditions as ProjectSnapshot['whenConditions']) || {},
      enableI18n: (collected.enableI18n as ProjectSnapshot['enableI18n']) ?? false,
      i18nEntries: (collected.i18nEntries as ProjectSnapshot['i18nEntries']) || {},
      splitContentFiles: (collected.splitContentFiles as ProjectSnapshot['splitContentFiles']) ?? false,
      patchPriority: (collected.patchPriority as ProjectSnapshot['patchPriority']) ?? 'Normal',
    }
  }, [meta.name, meta.lastSaved, meta.createdAt])

  const restoreSnapshot = useCallback((snap: ProjectSnapshot) => {
    lastSnapshotRef.current = snap
    // 保留原始 createdAt，优先使用快照中的 createdAt，回退到当前 meta.createdAt
    setMeta({ name: snap.meta.name, filePath: meta.filePath, lastSaved: snap.meta.lastSaved, hasUnsavedChanges: false, createdAt: snap.meta.createdAt || meta.createdAt })

    // 迁移：将旧版 npcDialogues 快照数据合并到 customNpcs 中（新版对话直接存 npc.dialogues）
    let migratedCustomNpcs = snap.customNpcs
    if (snap.npcDialogues && Array.isArray(snap.customNpcs)) {
      const oldDialogues = snap.npcDialogues
      migratedCustomNpcs = snap.customNpcs.map((n: any) => {
        const npcId = n?.id as string | undefined
        if (npcId && oldDialogues[npcId] && (!n.dialogues || Object.keys(n.dialogues).length === 0)) {
          return { ...n, dialogues: oldDialogues[npcId] }
        }
        return n
      })
    }

    const dataMap: Record<string, unknown> = {
      npcAssets: snap.npcAssets,
      npcDialogues: snap.npcDialogues,
      vanillaNpcOverrides: snap.vanillaNpcOverrides || {},
      customNpcs: migratedCustomNpcs,
      events: snap.events,
      customItems: snap.customItems,
      maps: snap.maps,
      customMaps: snap.customMaps,
      quests: snap.quests,
      buildings: snap.buildings,
      mails: snap.mails,
      configSchema: snap.configSchema || {},
      dynamicTokens: snap.dynamicTokens || [],
      whenConditions: snap.whenConditions || {},
      enableI18n: snap.enableI18n ?? false,
      i18nEntries: snap.i18nEntries || {},
      splitContentFiles: snap.splitContentFiles ?? false,
      patchPriority: snap.patchPriority ?? 'Normal',
      // 恢复游戏目录和解包路径，避免重新打开项目时重复选择/解包
      npcGameDir: snap.gameDir || null,
      npcUnpackedRoot: snap.unpackedRoot || null,
    }
    registryRef.current.forEach(({ setter }, key) => {
      if (dataMap[key] !== undefined) {
        try { setter(dataMap[key]) } catch { /* ignore */ }
      }
    })
  }, [meta.filePath, meta.createdAt])

  // 每次标记dirty时自动拍快照（防抖500ms）
  const autoSnapshot = useCallback(() => {
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
    snapshotTimerRef.current = setTimeout(() => {
      const snap = getFullSnapshot()
      pushHistory(snap)
    }, 500)
  }, [getFullSnapshot, pushHistory])

  const markDirty = useCallback(() => {
    setMeta(prev => prev.hasUnsavedChanges ? prev : { ...prev, hasUnsavedChanges: true })
    autoSnapshot()
  }, [autoSnapshot])

  // 自动保存：每次 markDirty 后 3 秒自动写入磁盘（需已打开/保存过项目）
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!meta.hasUnsavedChanges || !meta.filePath) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      const snap = getFullSnapshot()
      const json = JSON.stringify(snap, null, 2)
      window.electronAPI?.writeFile(meta.filePath!, json).then(ok => {
        if (ok) {
          setMeta(prev => ({ ...prev, lastSaved: new Date().toISOString(), hasUnsavedChanges: false }))
          // localStorage 在隐私模式或存储已满时会抛异常，需 try-catch 避免中断保存流程
          try { localStorage.setItem('fantuan_last_project', meta.filePath!) } catch { /* ignore quota/privacy errors */ }
        }
      })
    }, 3000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [meta.hasUnsavedChanges, meta.filePath, getFullSnapshot])

  // 启动时恢复上次项目
  const hasRestoredRef = useRef(false)
  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    const lastPath = localStorage.getItem('fantuan_last_project')
    if (lastPath) {
      window.electronAPI?.readTextFile(lastPath).then(raw => {
        if (!raw) return
        try {
          const snap: ProjectSnapshot = JSON.parse(raw)
          const name = lastPath.split(/[/\\]/).pop()?.replace('.stardew-mod', '') || snap.meta.name
          setMeta({ name, filePath: lastPath, lastSaved: snap.meta.lastSaved, hasUnsavedChanges: false, createdAt: snap.meta.createdAt || new Date().toISOString() })
          restoreSnapshot(snap)
        } catch { /* ignore */ }
      })
    }
  }, [restoreSnapshot])

  const undo = useCallback(() => {
    if (!canUndo) return
    const newIdx = historyIndex - 1
    const snap = history[newIdx]?.[0]
    if (snap) {
      restoreSnapshot(snap)
      setHistoryIndex(newIdx)
      setMeta(prev => ({ ...prev, hasUnsavedChanges: true }))
    }
  }, [canUndo, historyIndex, history, restoreSnapshot])

  const redo = useCallback(() => {
    if (!canRedo) return
    const newIdx = historyIndex + 1
    const snap = history[newIdx]?.[0]
    if (snap) {
      restoreSnapshot(snap)
      setHistoryIndex(newIdx)
      setMeta(prev => ({ ...prev, hasUnsavedChanges: true }))
    }
  }, [canRedo, historyIndex, history, restoreSnapshot])

  const setProjectName = useCallback((name: string) => {
    setMeta(prev => ({ ...prev, name, hasUnsavedChanges: true }))
    autoSnapshot()
  }, [autoSnapshot])

  // ★ 关键修复：registerSnapshot 不再依赖 history/historyIndex，引用永远稳定
  // 通过 ref 读取最新值，避免 history 变化导致所有消费组件的 useEffect 重跑
  const registerSnapshot = useCallback((key: string, getter: () => unknown, setter: (data: unknown) => void) => {
    const existed = registryRef.current.has(key)
    registryRef.current.set(key, { getter, setter })

    // 如果已经注册过，不恢复数据
    if (existed) return () => { registryRef.current.delete(key) }

    // 首次注册时，如果组件当前已有数据（非空数组/非空对象），不覆盖
    try {
      const current = getter()
      if (Array.isArray(current) && current.length > 0) return () => { registryRef.current.delete(key) }
      if (current && typeof current === 'object' && !Array.isArray(current) && Object.keys(current).length > 0) {
        return () => { registryRef.current.delete(key) }
      }
    } catch { /* ignore */ }

    const dataMap: Record<string, unknown> = {}
    // 优先从最近打开的项目快照恢复
    if (lastSnapshotRef.current) {
      const snap = lastSnapshotRef.current
      dataMap.npcAssets = snap.npcAssets
      dataMap.npcDialogues = snap.npcDialogues
      dataMap.vanillaNpcOverrides = snap.vanillaNpcOverrides || {}
      dataMap.customNpcs = snap.customNpcs
      dataMap.events = snap.events
      dataMap.customItems = snap.customItems
      dataMap.maps = snap.maps
      dataMap.customMaps = snap.customMaps
      dataMap.quests = snap.quests
      dataMap.buildings = snap.buildings
      dataMap.mails = snap.mails
      dataMap.configSchema = snap.configSchema || {}
      dataMap.dynamicTokens = snap.dynamicTokens || []
      dataMap.whenConditions = snap.whenConditions || {}
      dataMap.enableI18n = snap.enableI18n ?? false
      dataMap.i18nEntries = snap.i18nEntries || {}
      dataMap.splitContentFiles = snap.splitContentFiles ?? false
      dataMap.patchPriority = snap.patchPriority ?? 'Normal'
    } else {
      // 通过 ref 读取最新历史，不闭包捕获 state
      const latest = historyRef.current[historyIndexRef.current]?.[0]
      if (latest) {
        dataMap.npcAssets = latest.npcAssets
        dataMap.npcDialogues = latest.npcDialogues
        dataMap.vanillaNpcOverrides = latest.vanillaNpcOverrides || {}
        dataMap.customNpcs = latest.customNpcs
        dataMap.events = latest.events
        dataMap.customItems = latest.customItems
        dataMap.maps = latest.maps
        dataMap.customMaps = latest.customMaps
        dataMap.quests = latest.quests
        dataMap.buildings = latest.buildings
        dataMap.mails = latest.mails
        dataMap.configSchema = latest.configSchema || {}
        dataMap.dynamicTokens = latest.dynamicTokens || []
        dataMap.whenConditions = latest.whenConditions || {}
        dataMap.enableI18n = latest.enableI18n ?? false
        dataMap.i18nEntries = latest.i18nEntries || {}
        dataMap.splitContentFiles = latest.splitContentFiles ?? false
        dataMap.patchPriority = latest.patchPriority ?? 'Normal'
      }
    }
    if (dataMap[key] !== undefined) {
      try { setter(dataMap[key]) } catch { /* ignore */ }
    }

    return () => { registryRef.current.delete(key) }
  }, []) // ★ 空依赖 — 引用永远不变

  // 直接修改已注册的快照数据
  const mutateSnapshot = useCallback(<T,>(key: string, updater: (prev: T) => T) => {
    const entry = registryRef.current.get(key)
    if (!entry) return
    try {
      const current = entry.getter()
      const next = updater(current as T)
      entry.setter(next)
      markDirty()
    } catch { /* ignore */ }
  }, [markDirty])

  const saveProject = useCallback(async (): Promise<boolean> => {
    const snap = getFullSnapshot()
    const json = JSON.stringify(snap, null, 2)

    let savedPath = meta.filePath

    if (savedPath) {
      const ok = await window.electronAPI?.writeFile(savedPath, json)
      if (ok) {
        setMeta(prev => ({ ...prev, lastSaved: snap.meta.lastSaved, hasUnsavedChanges: false }))
        localStorage.setItem('fantuan_last_project', savedPath)
      }
      if (!ok) return false
    } else {
      const filePath = await window.electronAPI?.saveProjectDialog(`${meta.name}.stardew-mod`)
      if (!filePath) return false
      const ok = await window.electronAPI?.writeFile(filePath, json)
      if (ok) {
        savedPath = filePath
        setMeta(prev => ({ ...prev, filePath, lastSaved: snap.meta.lastSaved, hasUnsavedChanges: false }))
        localStorage.setItem('fantuan_last_project', filePath)
      }
      if (!ok) return false
    }

    // 自动备份：在项目文件同目录生成时间戳备份
    if (savedPath) {
      try {
        const lastSep = savedPath.lastIndexOf('\\')
        const dirPath = lastSep >= 0 ? savedPath.substring(0, lastSep) : ''
        const baseName = savedPath.substring(lastSep + 1).replace('.stardew-mod', '')
        const backupDir = dirPath + '\\.stardew-mod-backups'
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const backupName = baseName + '.' + timestamp + '.backup.stardew-mod'
        const backupPath = backupDir + '\\' + backupName

        const dirCreated = await window.electronAPI?.mkdir(backupDir)
        if (dirCreated) {
          await window.electronAPI?.writeFile(backupPath, json)
          // 清理旧备份：只保留最近 10 个
          const entries = await window.electronAPI?.readdir(backupDir)
          if (entries) {
            const backupFiles = entries
              .filter(e => e.isFile && e.name.endsWith('.backup.stardew-mod'))
              .sort()
              .reverse()
            for (const old of backupFiles.slice(10)) {
              await window.electronAPI?.unlink(backupDir + '\\' + old.name)
            }
          }
        }
      } catch {
        // 备份失败不应阻塞保存
      }
    }

    return true
  }, [getFullSnapshot, meta.filePath, meta.name])

  const openProject = useCallback(async (): Promise<boolean> => {
    const filePath = await window.electronAPI?.openProjectDialog()
    if (!filePath) return false
    const raw = await window.electronAPI?.readTextFile(filePath)
    if (!raw) return false
    try {
      const snap: ProjectSnapshot = JSON.parse(raw)
      const name = filePath.split(/[/\\]/).pop()?.replace('.stardew-mod', '') || snap.meta.name
      setMeta({ name, filePath, lastSaved: snap.meta.lastSaved, hasUnsavedChanges: false, createdAt: snap.meta.createdAt || new Date().toISOString() })
      restoreSnapshot(snap)
      return true
    } catch {
      return false
    }
  }, [restoreSnapshot])

  const newProject = useCallback(() => {
    // 注意：不能调用 registryRef.current.clear()，否则常驻 Provider 的 useEffect 不会重新执行，
    // 导致注册表永久为空，getFullSnapshot 返回空快照，自动保存会用空数据覆盖原项目文件。
    // 正确做法：通过 restoreSnapshot 传入空快照，让各 Provider 的 setter 清空自己的状态。
    const emptySnap: ProjectSnapshot = {
      meta: { name: getT()('project.untitledProject'), createdAt: new Date().toISOString(), lastSaved: new Date().toISOString(), version: '0.1.0' },
      formatVersion: CURRENT_FORMAT_VERSION,
      gameDir: undefined,
      unpackedRoot: undefined,
      npcAssets: {},
      npcDialogues: {},
      vanillaNpcOverrides: {},
      vanillaItemOverrides: {},
      vanillaEventOverrides: {},
      questOverrides: {},
      customNpcs: [],
      events: [],
      customItems: [],
      maps: [],
      customMaps: [],
      quests: [],
      buildings: [],
      mails: [],
      configSchema: {},
      dynamicTokens: [],
      whenConditions: {},
      enableI18n: false,
      i18nEntries: {},
      splitContentFiles: false,
      patchPriority: 'Normal',
    }
    lastSnapshotRef.current = emptySnap
    setMeta({ name: emptySnap.meta.name, filePath: null, lastSaved: null, hasUnsavedChanges: false, createdAt: emptySnap.meta.createdAt })
    // 通过 restoreSnapshot 清空各模块状态（保留注册表，避免数据丢失）
    restoreSnapshot(emptySnap)
  }, [restoreSnapshot])

  return (
    <ProjectContext.Provider value={{
      meta, setProjectName, markDirty, saveProject, openProject, newProject,
      registerSnapshot, mutateSnapshot, getFullSnapshot, restoreSnapshot,
      undo, redo, canUndo, canRedo
    }}>
      {children}
    </ProjectContext.Provider>
  )
}
