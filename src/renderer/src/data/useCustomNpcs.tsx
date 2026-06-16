import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useProject, type VanillaNpcOverride } from './ProjectContext'
import type { NPCInfo } from './npcData'

interface CustomNpcsContextValue {
  customNpcs: NPCInfo[]
  setCustomNpcs: React.Dispatch<React.SetStateAction<NPCInfo[]>>
  addCustomNpc: (npc: NPCInfo) => void
  removeCustomNpc: (id: string) => void
  updateCustomNpc: (id: string, updates: Partial<NPCInfo>) => void
  getCustomNpc: (id: string) => NPCInfo | undefined
}

const CustomNpcsContext = createContext<CustomNpcsContextValue | null>(null)

/**
 * 常驻 Provider，放在 App 层级，确保 customNpcs 的 registerSnapshot 永不被卸载删除。
 * 之前 NPCPage 和 NPCDetailPage 各自注册 customNpcs，页面切换时卸载导致注册被删除，
 * mutateSnapshot 静默失败，用户上传的肖像/行走图丢失。
 */
export function CustomNpcsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [customNpcs, setCustomNpcs] = useState<NPCInfo[]>([])
  const [vanillaNpcOverrides, setVanillaNpcOverrides] = useState<Record<string, VanillaNpcOverride>>({})
  const { registerSnapshot, markDirty } = useProject()

  // 用 ref 保存最新值，避免 registerSnapshot 反复重新注册
  const customNpcsRef = useRef(customNpcs)
  customNpcsRef.current = customNpcs
  const vanillaOverridesRef = useRef(vanillaNpcOverrides)
  vanillaOverridesRef.current = vanillaNpcOverrides

  useEffect(() => {
    return registerSnapshot('customNpcs',
      () => customNpcsRef.current,
      (data: unknown) => { setCustomNpcs(data as NPCInfo[]) }
    )
  }, [registerSnapshot])

  // 注册 vanillaNpcOverrides 到快照系统
  useEffect(() => {
    return registerSnapshot('vanillaNpcOverrides',
      () => vanillaOverridesRef.current,
      (data: unknown) => { setVanillaNpcOverrides((data as Record<string, VanillaNpcOverride>) || {}) }
    )
  }, [registerSnapshot])

  const addCustomNpc = useCallback((npc: NPCInfo) => {
    setCustomNpcs(prev => [...prev, npc])
    markDirty()
  }, [markDirty])

  const removeCustomNpc = useCallback((id: string) => {
    setCustomNpcs(prev => prev.filter(n => n.id !== id))
    markDirty()
  }, [markDirty])

  const updateCustomNpc = useCallback((id: string, updates: Partial<NPCInfo>) => {
    setCustomNpcs(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
    markDirty()
  }, [markDirty])

  const getCustomNpc = useCallback((id: string) => {
    return customNpcsRef.current.find(n => n.id === id)
  }, [])

  return (
    <CustomNpcsContext.Provider value={{
      customNpcs, setCustomNpcs,
      addCustomNpc, removeCustomNpc, updateCustomNpc, getCustomNpc
    }}>
      {children}
    </CustomNpcsContext.Provider>
  )
}

export function useCustomNpcs(): CustomNpcsContextValue {
  const ctx = useContext(CustomNpcsContext)
  if (!ctx) throw new Error('useCustomNpcs must be used within CustomNpcsProvider')
  return ctx
}
