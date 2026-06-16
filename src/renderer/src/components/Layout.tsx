import { useEffect, useMemo, useState } from 'react'
import Sidebar from './Sidebar'
import RightPanel from './RightPanel'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useProject } from '../data/ProjectContext'
import SettingsModal from './SettingsModal'
import { useT, asString } from '../i18n'
import { useToast } from './Toast'

export default function Layout(): JSX.Element {
  const { meta, saveProject, openProject, undo, redo, newProject } = useProject()
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()
  const { toast } = useToast()
  /** 强制收窄为 string 的本地 helper（key 始终对应字符串） */
  const ts = (k: string): string => asString(t, k)

  const handleSave = async () => {
    const ok = await saveProject()
    toast(ok ? ts('toast.saved') : ts('home.saveFail'), ok ? 'success' : 'error')
  }

  const handleOpen = async () => {
    const ok = await openProject()
    if (ok) navigate('/')
  }

  const handleMinimize = () => window.electronAPI?.windowMinimize?.()
  const handleMaximize = () => window.electronAPI?.windowMaximize?.()
  const handleClose = () => window.electronAPI?.windowClose?.()

  // Ctrl+S 保存 / Ctrl+O 打开 / Ctrl+Z 撤销 / Ctrl+Y 重做 / Ctrl+E 导出 / Ctrl+N 新建
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); handleOpen() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); navigate('/export') }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); newProject() }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave, handleOpen, undo, redo, navigate, newProject])

  // 关闭窗口前提示未保存变更
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (meta.hasUnsavedChanges) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [meta.hasUnsavedChanges])

  return (
    <div className="flex h-screen themed-bg-base themed-text-primary overflow-hidden">
      {/* 左侧导航 */}
      <Sidebar onOpenSettings={() => setShowSettings(true)} />

      {/* 右侧：内容区 + 右面板 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部标题栏（拖拽区）- 横跨内容区和右面板 */}
        <div className="h-10 themed-bg-titlebar flex items-center justify-between px-3 flex-shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          {/* 左侧：项目名 */}
          <div className="flex items-center gap-2 text-xs themed-text-muted min-w-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <span className="truncate max-w-[180px] font-medium themed-text-secondary">{meta.name}</span>
            {meta.hasUnsavedChanges && <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" title={ts('layout.unsaved')} />}
            {meta.filePath && <span className="text-[10px] themed-text-dimmed truncate max-w-[120px] hidden sm:inline">{meta.filePath.split(/[/\\]/).slice(-2).join('/')}</span>}
          </div>

          {/* 中间：保存/打开按钮 */}
          <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button onClick={handleOpen}
              className="text-[11px] px-2.5 py-1 rounded themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors">
              {ts('layout.open')}
            </button>
            <button onClick={handleSave}
              className="text-[11px] px-2.5 py-1 rounded themed-btn-primary font-medium transition-colors">
              {ts('layout.save')}
            </button>
          </div>

          {/* 右侧：窗口控制 */}
          <div className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button onClick={handleMinimize} className="w-10 h-8 flex items-center justify-center rounded themed-bg-hover themed-text-muted transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button onClick={handleMaximize} className="w-10 h-8 flex items-center justify-center rounded themed-bg-hover themed-text-muted transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="5" y="5" width="14" height="14" />
              </svg>
            </button>
            <button onClick={handleClose} className="w-10 h-8 flex items-center justify-center rounded hover:bg-[#e81123] themed-text-muted hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>
        </div>

        {/* 标题栏下方：内容区 + 右面板 */}
        <div className="flex-1 flex min-h-0">
          {/* 中间内容区 */}
          <main className="flex-1 min-w-0 themed-bg-content overflow-y-auto">
            <div className="h-full">
              <Outlet />
            </div>
          </main>

          {/* 右侧面板 */}
          <RightPanel currentPath={location.pathname} />
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
