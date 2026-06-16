import { useState, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import { useT, asString } from '../i18n'
import ConfirmDialog from './ConfirmDialog'

/**
 * 在编辑器页面使用，当有未保存变更时阻止路由跳转并弹出确认框。
 *
 * 用法：
 * ```tsx
 * const [dirty, setDirty] = useState(false)
 * // 在组件 JSX 中渲染：
 * <UnsavedChangesGuard dirty={dirty} />
 * ```
 */
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }): JSX.Element | null {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const blocker = useBlocker(dirty)
  const [open, setOpen] = useState(false)
  // 用 ref 保存最新的 blocker，避免 useEffect 依赖频繁变化
  const blockerRef = useRef(blocker)
  blockerRef.current = blocker

  // 当 blocker 进入 blocked 状态时，打开确认弹窗（替代原生 window.confirm）
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setOpen(true)
    }
  }, [blocker.state])

  const handleConfirm = (): void => {
    setOpen(false)
    blockerRef.current.proceed?.()
  }

  const handleCancel = (): void => {
    setOpen(false)
    blockerRef.current.reset?.()
  }

  // 浏览器原生 beforeunload（关闭标签页/刷新时）
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent): void => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  if (!open) return null

  return (
    <ConfirmDialog
      open={open}
      title={ts('confirm.unsavedTitle')}
      message={ts('confirm.unsavedMessage')}
      confirmLabel={ts('confirm.leave')}
      cancelLabel={ts('confirm.cancel')}
      danger
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )
}
