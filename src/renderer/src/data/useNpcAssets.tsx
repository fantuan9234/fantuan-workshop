import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useProject } from './ProjectContext'

interface NpcAssetsStore {
  portraits: Record<string, string>
  sprites: Record<string, string>
}

export type UnpackStatus = 'idle' | 'unpacking' | 'done' | 'error'

interface AssetsContextValue {
  assets: Record<string, NpcAssetsStore>
  gameDir: string | null
  unpackedRoot: string | null
  unpackStatus: UnpackStatus
  unpackError: string | null
  setGameDir: (dir: string | null) => void
  setPortrait: (npcId: string, sceneIdx: number, exprIdx: number, dataUrl: string | null) => void
  setSpriteFrame: (npcId: string, stateId: string, frameIdx: number, dataUrl: string | null) => void
  replaceAllPortrait: (npcId: string, sceneIdx: number, dataUrl: string) => void
  replaceAllSprite: (npcId: string, stateId: string, dataUrl: string) => void
  resetAllPortraits: (npcId: string, sceneIdx: number) => void
  resetAllSprites: (npcId: string, stateId: string) => void
  retryUnpack: () => void
}

const AssetsContext = createContext<AssetsContextValue | null>(null)

function clone(prev: Record<string, NpcAssetsStore>, npcId: string): NpcAssetsStore {
  const cur = prev[npcId]
  return cur ? { portraits: { ...cur.portraits }, sprites: { ...cur.sprites } } : { portraits: {}, sprites: {} }
}

export function NpcAssetsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [assets, setAssets] = useState<Record<string, NpcAssetsStore>>({})
  const [gameDir, setGameDir] = useState<string | null>(null)
  const [unpackedRoot, setUnpackedRoot] = useState<string | null>(null)
  const [unpackStatus, setUnpackStatus] = useState<UnpackStatus>('idle')
  const [unpackError, setUnpackError] = useState<string | null>(null)
  const { registerSnapshot, markDirty } = useProject()

  // 自动检测游戏目录（仅首次）
  const gameDirTried = useRef(false)
  useEffect(() => {
    if (gameDirTried.current || gameDir) return
    gameDirTried.current = true
    window.electronAPI?.autoDetectGameDir?.().then(dir => { if (dir) setGameDir(dir) })
  }, [gameDir])

  // 执行解包
  const doUnpack = useCallback((gDir: string) => {
    setUnpackStatus('unpacking')
    setUnpackError(null)
    window.electronAPI?.xnbUnpack(`${gDir}/Content`, false).then(r => {
      if (r?.success && r.rootPath) {
        setUnpackedRoot(r.rootPath)
        setUnpackStatus('done')
      } else {
        setUnpackStatus('error')
        setUnpackError(r?.error || '解包失败，未知错误')
      }
    }).catch((err) => {
      setUnpackStatus('error')
      setUnpackError(String(err?.message || err))
    })
  }, [])

  // 游戏目录就绪后自动解包（仅首次，且 unpackedRoot 尚未恢复时）
  const unpackTried = useRef(false)
  useEffect(() => {
    if (!gameDir || unpackTried.current) return
    unpackTried.current = true
    // 如果 unpackedRoot 已从快照恢复，验证目录是否仍然存在
    if (unpackedRoot) {
      window.electronAPI?.xnbUnpack(`${gameDir}/Content`, false).then(r => {
        if (r?.success && r.rootPath) {
          setUnpackedRoot(r.rootPath)
          setUnpackStatus('done')
        } else {
          // 目录不存在了，需要重新解包
          doUnpack(gameDir)
        }
      }).catch(() => doUnpack(gameDir))
    } else {
      doUnpack(gameDir)
    }
  }, [gameDir, doUnpack, unpackedRoot])

  // 手动重试解包
  const retryUnpack = useCallback(() => {
    if (gameDir) {
      unpackTried.current = false
      doUnpack(gameDir)
    }
  }, [gameDir, doUnpack])

  // 向项目系统注册 NPC 资产数据的存取方法
  // 注意：不能把 assets 放入依赖数组，否则每次更新都会重新注册导致快照丢失
  const assetsRef = useRef(assets)
  assetsRef.current = assets
  useEffect(() => {
    const unreg = registerSnapshot('npcAssets',
      () => assetsRef.current,
      (data: unknown) => { setAssets(data as Record<string, NpcAssetsStore>) }
    )
    return unreg
  }, [registerSnapshot])

  // 持久化游戏目录
  const gameDirRef = useRef(gameDir)
  gameDirRef.current = gameDir
  const gameDirRegistered = useRef(false)
  useEffect(() => {
    if (gameDirRegistered.current) return
    gameDirRegistered.current = true
    return registerSnapshot('npcGameDir',
      () => gameDirRef.current,
      (data: unknown) => { if (data) setGameDir(data as string | null) }
    )
  }, [registerSnapshot])

  // 持久化 unpackedRoot（避免每次重启都需要重新解包）
  const unpackedRootRef = useRef(unpackedRoot)
  unpackedRootRef.current = unpackedRoot
  const unpackedRootRegistered = useRef(false)
  useEffect(() => {
    if (unpackedRootRegistered.current) return
    unpackedRootRegistered.current = true
    return registerSnapshot('npcUnpackedRoot',
      () => unpackedRootRef.current,
      (data: unknown) => { if (data) setUnpackedRoot(data as string | null) }
    )
  }, [registerSnapshot])

  const setPortrait = useCallback((npcId: string, sceneIdx: number, exprIdx: number, dataUrl: string | null) => {
    setAssets(prev => {
      const cur = clone(prev, npcId)
      const k = `${sceneIdx}_${exprIdx}`
      if (dataUrl) cur.portraits[k] = dataUrl
      else delete cur.portraits[k]
      return { ...prev, [npcId]: cur }
    })
    markDirty()
  }, [markDirty])

  const setSpriteFrame = useCallback((npcId: string, stateId: string, frameIdx: number, dataUrl: string | null) => {
    setAssets(prev => {
      const cur = clone(prev, npcId)
      const k = `${stateId}_${frameIdx}`
      if (dataUrl) cur.sprites[k] = dataUrl
      else delete cur.sprites[k]
      return { ...prev, [npcId]: cur }
    })
    markDirty()
  }, [markDirty])

  const replaceAllPortrait = useCallback((npcId: string, sceneIdx: number, dataUrl: string) => {
    setAssets(prev => {
      const cur = clone(prev, npcId)
      for (let i = 0; i < 10; i++) cur.portraits[`${sceneIdx}_${i}`] = dataUrl
      return { ...prev, [npcId]: cur }
    })
    markDirty()
  }, [markDirty])

  const replaceAllSprite = useCallback((npcId: string, stateId: string, dataUrl: string) => {
    setAssets(prev => {
      const cur = clone(prev, npcId)
      cur.sprites[`${stateId}_0`] = dataUrl
      return { ...prev, [npcId]: cur }
    })
    markDirty()
  }, [markDirty])

  const resetAllPortraits = useCallback((npcId: string, sceneIdx: number) => {
    setAssets(prev => {
      const cur = clone(prev, npcId)
      for (let i = 0; i < 10; i++) delete cur.portraits[`${sceneIdx}_${i}`]
      return { ...prev, [npcId]: cur }
    })
    markDirty()
  }, [markDirty])

  const resetAllSprites = useCallback((npcId: string, stateId: string) => {
    setAssets(prev => {
      const cur = clone(prev, npcId)
      delete cur.sprites[`${stateId}_0`]
      return { ...prev, [npcId]: cur }
    })
    markDirty()
  }, [markDirty])

  return (
    <AssetsContext.Provider value={{
      assets, gameDir, unpackedRoot, unpackStatus, unpackError, setGameDir,
      setPortrait, setSpriteFrame,
      replaceAllPortrait, replaceAllSprite,
      resetAllPortraits, resetAllSprites,
      retryUnpack
    }}>
      {children}
    </AssetsContext.Provider>
  )
}

export function useNpcAssets(): AssetsContextValue {
  const ctx = useContext(AssetsContext)
  if (!ctx) throw new Error('useNpcAssets must be used within NpcAssetsProvider')
  return ctx
}
