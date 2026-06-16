import { useState, useCallback, useEffect, useRef } from 'react'
import { useT, asString } from '../i18n'

interface FolderItem {
  name: string
  path: string
  isDir: boolean
  size?: number
  children?: FolderItem[]
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

// 树节点组件
function TreeView({ items, depth = 0, selectedPath, onSelect, onExpand, expanded }: {
  items: FolderItem[]; depth?: number
  selectedPath: string; onSelect: (item: FolderItem) => void
  onExpand: (path: string) => void; expanded: Set<string>
}) {
  return (
    <div>
      {items.map(item => {
        const isExpanded = expanded.has(item.path)
        const hasChildren = item.isDir && (item.children?.length ?? 0) > 0
        return (
          <div key={item.path}>
            <button
              onClick={() => { onSelect(item); if (item.isDir) onExpand(item.path) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-md transition-colors ${
                selectedPath === item.path ? 'bg-[#2a4a6a] themed-text-primary' : 'themed-text-secondary themed-bg-hover'
              }`}
              style={{ paddingLeft: `${depth * 20 + 12}px` }}
            >
              {/* 展开/折叠箭头 */}
              <span className={`w-4 h-4 flex-shrink-0 flex items-center justify-center ${hasChildren ? '' : 'invisible'}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
              {/* 文件夹/文件图标 */}
              {item.isDir ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="1.5" className="flex-shrink-0">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" className="flex-shrink-0">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              )}
              <span className="truncate flex-1 text-[15px]">{item.name}</span>
              {!item.isDir && item.size != null && (
                <span className="text-xs themed-text-dimmed ml-2 flex-shrink-0">{formatSize(item.size)}</span>
              )}
            </button>
            {isExpanded && hasChildren && (
              <TreeView items={item.children || []} depth={depth + 1}
                selectedPath={selectedPath} onSelect={onSelect}
                onExpand={onExpand} expanded={expanded} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AssetsPage(): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [gameDir, setGameDir] = useState<string | null>(null)
  const [tree, setTree] = useState<FolderItem[]>([])
  const [rootPath, setRootPath] = useState('')
  const [selected, setSelected] = useState<FolderItem | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const mountedRef = useRef(true)

  // 解包操作
  const runUnpack = useCallback(async (dir: string, forceRefresh = false) => {
    if (!mountedRef.current) return
    setLoading(true)
    setError('')
    try {
      const result = await window.electronAPI!.xnbUnpack(`${dir}/Content`, forceRefresh)
      if (!mountedRef.current) return
      if (!result.success) {
        setError(result.error || t('assets.unpackFail'))
        setLoading(false)
        return
      }
      setTree(result.tree)
      setRootPath(result.rootPath)
      setSelected(null)
      setFileContent(null)
      // 默认全部闭合
      setExpanded(new Set())
    } catch (e) {
      if (mountedRef.current) setError(String(e))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [t])

  // 自动检测并解包（仅一次）
  useEffect(() => {
    mountedRef.current = true
    async function init() {
      try {
        const dir = await window.electronAPI?.autoDetectGameDir()
        if (!dir || !mountedRef.current) return
        setGameDir(dir)
        await runUnpack(dir)
      } catch {
        if (mountedRef.current) setError(t('assets.autoDetectFail'))
      }
    }
    init()
    return () => { mountedRef.current = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 选择项
  const handleSelect = async (item: FolderItem) => {
    setSelected(item)
    setFileContent(null)

    // 如果是未展开的文件夹，加载子项
    if (item.isDir && (!item.children || item.children.length === 0)) {
      try {
        const result = await window.electronAPI!.xnbReadDir(item.path)
        if (result.success) {
          updateTree(item.path, result.tree)
        }
      } catch { /* ignore */ }
      return
    }

    // 如果是文件，读取内容
    if (!item.isDir) {
      try {
        const content = await window.electronAPI!.xnbReadFile(item.path)
        setFileContent(content)
      } catch { /* ignore */ }
    }
  }

  // 展开/折叠
  const handleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  // 更新树中某个节点的子项
  const updateTree = (targetPath: string, newChildren: FolderItem[]) => {
    setTree(prev => deepUpdate(prev, targetPath, newChildren))
  }

  // 更换目录
  const handleChangeDir = async () => {
    const dir = await window.electronAPI?.selectGameDir()
    if (dir) { setGameDir(dir); runUnpack(dir) }
  }

  // 强制刷新（重新解包）
  const handleRefresh = () => {
    if (gameDir) runUnpack(gameDir, true)
  }

  const isImage = fileContent?.startsWith('data:image')

  return (
    <div className="p-5 md:p-6 h-full flex flex-col overflow-hidden">
      {/* 顶栏 */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <h2 className="text-xl font-bold themed-text-primary">{ts('assets.title')}</h2>
        <div className="flex items-center gap-3">
          {loading && (
            <span className="text-sm themed-text-muted flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              {ts('assets.unpacking')}
            </span>
          )}
          {!loading && gameDir && (
            <button onClick={handleRefresh}
              className="text-sm px-4 py-2 rounded-lg themed-bg-active themed-text-secondary transition-colors">
              {ts('assets.refresh')}
            </button>
          )}
          <button onClick={handleChangeDir}
            className="text-sm px-4 py-2 rounded-lg themed-bg-active themed-text-secondary transition-colors">
            {ts('assets.changeDir')}
          </button>
        </div>
      </div>

      {/* 错误 */}
      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-800/30 rounded-lg p-4 text-sm text-red-400">{error}</div>
      )}

      {/* 三栏主区域 */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        {/* 左侧：文件树 */}
        <div className="w-full lg:w-[280px] lg:min-w-[280px] themed-bg-primary rounded-xl border themed-border-secondary flex flex-col overflow-hidden flex-shrink-0 max-h-[240px] lg:max-h-none">
          <div className="px-4 py-3 border-b themed-border-secondary">
            <span className="text-base font-semibold themed-text-secondary">{ts('assets.content')}</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {loading && tree.length === 0 && (
              <div className="flex items-center justify-center py-10 themed-text-dimmed text-sm">{ts('assets.parsing')}</div>
            )}
            {!loading && tree.length === 0 && !error && (
              <p className="text-sm themed-text-dimmed text-center py-10">{ts('assets.noAssets')}</p>
            )}
            <TreeView items={tree} selectedPath={selected?.path ?? ''}
              onSelect={handleSelect} onExpand={handleExpand} expanded={expanded} />
          </div>
        </div>

        {/* 中间：文件详情 */}
        <div className="w-full lg:w-[240px] lg:min-w-[240px] themed-bg-primary rounded-xl border themed-border-secondary flex flex-col overflow-hidden flex-shrink-0">
          {selected ? (
            <>
              <div className="px-4 py-4 border-b themed-border-secondary">
                <div className="text-lg font-medium themed-text-secondary truncate">{selected.name}</div>
              <div className="text-sm themed-text-dimmed mt-1.5 truncate" title={selected.path}>
                {selected.path.replace(rootPath, '').replace(/^[/\\]/, '')}
              </div>
              </div>

              {/* 缩略图预览 */}
              {isImage && fileContent && (
                <div className="p-4 border-b themed-border-secondary">
                  <img src={fileContent} alt="" className="w-full rounded-lg border themed-border-primary object-contain" />
                  <div className="mt-3 text-sm themed-text-muted space-y-1">
                    <div>{ts('assets.format')}：{selected.name.split('.').pop()?.toUpperCase()}</div>
                    {selected.size != null && <div>{ts('assets.size')}：{formatSize(selected.size)}</div>}
                  </div>
                </div>
              )}

              {/* 非图片文件的文本预览 */}
              {fileContent && !isImage && (
                <div className="p-4 border-b themed-border-secondary max-h-[240px] overflow-hidden">
                  <pre className="text-xs themed-text-muted whitespace-pre-wrap break-all leading-relaxed font-mono">
                    {fileContent.substring(0, 600)}{fileContent.length > 600 ? '...' : ''}
                  </pre>
                </div>
              )}

              {/* 操作区 */}
              <div className="p-4 mt-auto">
                {isImage && (
                  <button className="w-full text-sm py-2.5 rounded-lg bg-green-900/30 text-green-400 border border-green-800/40 hover:bg-green-900/50 transition-colors">
                    {ts('assets.renovate')}
                  </button>
                )}
                {!fileContent && !selected.isDir && (
                  <p className="text-sm themed-text-dimmed text-center">{ts('assets.loading')}</p>
                )}
                {selected.isDir && (
                  <p className="text-sm themed-text-dimmed text-center">{ts('assets.selectFile')}</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center themed-text-disabled text-sm">
              {ts('assets.selectToView')}
            </div>
          )}
        </div>

        {/* 右侧：大图预览 */}
        <div className="flex-1 themed-bg-primary rounded-xl border themed-border-secondary flex flex-col overflow-hidden min-w-0">
          {isImage && fileContent ? (
            <div className="flex-1 overflow-auto flex items-center justify-center p-3">
              <img src={fileContent} alt="" className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} />
            </div>
          ) : fileContent && !isImage ? (
            <pre className="flex-1 overflow-auto p-5 text-sm themed-text-secondary leading-relaxed whitespace-pre-wrap break-all font-mono m-0">
              {fileContent}
            </pre>
          ) : (
            <div className="flex-1 flex items-center justify-center themed-text-disabled">
              {selected ? t('assets.noPreview') : t('assets.selectToPreview')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- 工具函数 ----
function deepUpdate(entries: FolderItem[], targetPath: string, newChildren: FolderItem[]): FolderItem[] {
  return entries.map(e => {
    if (e.path === targetPath) return { ...e, children: newChildren }
    if (e.children) return { ...e, children: deepUpdate(e.children, targetPath, newChildren) }
    return e
  })
}
