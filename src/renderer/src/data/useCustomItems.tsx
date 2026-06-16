import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useProject } from './ProjectContext'
import type { CustomItem } from '../pages/items/ItemEditor'

interface CustomItemsContextValue {
  customItems: CustomItem[]
  setCustomItems: React.Dispatch<React.SetStateAction<CustomItem[]>>
  addCustomItem: (item: CustomItem) => void
  removeCustomItem: (id: string) => void
  updateCustomItem: (id: string, updates: Partial<CustomItem>) => void
  getCustomItem: (id: string) => CustomItem | undefined
}

const CustomItemsContext = createContext<CustomItemsContextValue | null>(null)

/**
 * 常驻 Provider，放在 App 层级，确保 customItems 的 registerSnapshot 永不被卸载删除。
 * 之前 ItemsPage 内注册 customItems，页面切换到 ItemEditor 时卸载导致注册被删除，
 * mutateSnapshot 静默失败，用户保存的物品数据丢失。
 */
export function CustomItemsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
  const { registerSnapshot, markDirty } = useProject()

  const customItemsRef = useRef(customItems)
  customItemsRef.current = customItems

  useEffect(() => {
    return registerSnapshot('customItems',
      () => customItemsRef.current,
      (data: unknown) => { if (Array.isArray(data)) setCustomItems(data as CustomItem[]) }
    )
  }, [registerSnapshot])

  const addCustomItem = useCallback((item: CustomItem) => {
    setCustomItems(prev => [...prev, item])
    markDirty()
  }, [markDirty])

  const removeCustomItem = useCallback((id: string) => {
    setCustomItems(prev => prev.filter(i => i.id !== id))
    markDirty()
  }, [markDirty])

  const updateCustomItem = useCallback((id: string, updates: Partial<CustomItem>) => {
    setCustomItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    markDirty()
  }, [markDirty])

  const getCustomItem = useCallback((id: string) => {
    return customItemsRef.current.find(i => i.id === id)
  }, [])

  return (
    <CustomItemsContext.Provider value={{
      customItems, setCustomItems,
      addCustomItem, removeCustomItem, updateCustomItem, getCustomItem
    }}>
      {children}
    </CustomItemsContext.Provider>
  )
}

export function useCustomItems(): CustomItemsContextValue {
  const ctx = useContext(CustomItemsContext)
  if (!ctx) throw new Error('useCustomItems must be used within CustomItemsProvider')
  return ctx
}
