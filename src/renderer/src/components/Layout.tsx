import { useEffect, useState, useCallback } from 'react'
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

  // 根据当前路径设置编辑器主题色
  useEffect(() => {
    const path = location.pathname
    let accent = ''
    if (path.startsWith('/events')) accent = 'events'
    else if (path.startsWith('/npc')) accent = 'npc'
    else if (path.startsWith('/maps')) accent = 'maps'
    else if (path.startsWith('/items')) accent = 'items'
    else if (path.startsWith('/quests')) accent = 'quests'
    else if (path.startsWith('/mails')) accent = 'mails'
    else if (path.startsWith('/export')) accent = 'export'
    else accent = ''
    document.documentElement.setAttribute('data-accent', accent)
  }, [location.pathname])

  const handleSave = useCallback(async () => {
    const ok = await saveProject()
    toast(ok ? ts('toast.saved') : ts('home.saveFail'), ok ? 'success' : 'error')
  }, [saveProject, toast, ts])

  const handleOpen = useCallback(async () => {
    const ok = await openProject()
    if (ok) navigate('/')
  }, [openProject, navigate])

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

  // 同步未保存状态到主进程（用于关闭窗口前的提示）
  useEffect(() => {
    window.electronAPI?.setUnsavedChanges?.(meta.hasUnsavedChanges)
  }, [meta.hasUnsavedChanges])

  return (
    <div className="flex h-screen themed-bg-base themed-text-primary overflow-hidden">
      {/* 左侧导航 */}
      <Sidebar onOpenSettings={() => setShowSettings(true)} />

      {/* 右侧：内容区 + 右面板 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部标题栏（拖拽区）- 横跨内容区和右面板 */}
        <div className="h-12 themed-bg-titlebar flex items-center justify-between px-3 flex-shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          {/* 左侧：品牌名 + 项目名 */}
          <div className="flex items-center gap-3 text-sm themed-text-muted min-w-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <span className="text-xs themed-text-disabled hidden sm:inline font-mono tracking-wider select-none">✦ 饭团工坊</span>
            <span className="text-xs themed-text-disabled hidden sm:inline">/</span>
            <span className="truncate max-w-[200px] font-medium themed-text-secondary">{meta.name}</span>
            {meta.hasUnsavedChanges && <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" title={ts('layout.unsaved')} />}
            {meta.filePath && <span className="text-xs themed-text-dimmed truncate max-w-[120px] hidden sm:inline">{meta.filePath.split(/[/\\]/).slice(-2).join('/')}</span>}
          </div>

          {/* 中间：保存/打开按钮 */}
          <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button onClick={handleOpen}
              className="text-sm px-2.5 py-1 rounded themed-text-muted hover:themed-text-primary themed-bg-hover transition-colors">
              {ts('layout.open')}
            </button>
            <button onClick={handleSave}
              className="text-sm px-2.5 py-1 rounded themed-btn-primary font-medium transition-colors">
              {ts('layout.save')}
            </button>
          </div>

          {/* 右侧：窗口控制 */}
          <div className="flex gap-1">
            <button onClick={handleMinimize}
              className="w-10 h-8 flex items-center justify-center rounded themed-bg-hover themed-text-muted transition-colors"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button onClick={handleMaximize}
              className="w-10 h-8 flex items-center justify-center rounded themed-bg-hover themed-text-muted transition-colors"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="5" y="5" width="14" height="14" />
              </svg>
            </button>
            <button onClick={handleClose}
              className="w-10 h-8 flex items-center justify-center rounded hover:bg-[#e81123] themed-text-muted hover:text-white transition-colors"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
