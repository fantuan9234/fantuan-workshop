import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useBlocker } from 'react-router-dom'
import { useT, asString } from '../i18n'
import { useToast } from './Toast'
import ConfirmDialog from './ConfirmDialog'

/**
 * 在编辑器页面使用，当有未保存变更时阻止路由跳转并弹出确认框。
 *
 * 用法：
 * ```tsx
 * const [dirty, setDirty] = useState(false)
 * useUnsavedChangesGuard(dirty)
 * ```
 */
export function useUnsavedChangesGuard(dirty: boolean): void {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const blocker = useBlocker(dirty)

  // 当 blocker 处于 blocked 状态时，我们通过 ConfirmDialog 让用户选择
  // 但这里我们不用 ConfirmDialog，而是用原生的 beforeunload + react-router blocker
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm(ts('confirm.unsavedMessage'))
      if (confirmed) {
        blocker.proceed?.()
      } else {
        blocker.reset?.()
      }
    }
  }, [blocker, ts])

  // 浏览器原生 beforeunload（关闭标签页/刷新时）
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
}
