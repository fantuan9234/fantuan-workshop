import { useMemo } from 'react'
import { useProject } from '../data/ProjectContext'
import { useT, asString, asArray } from '../i18n'

export default function RightPanel({ currentPath }: { currentPath: string }): JSX.Element {
  const { getFullSnapshot } = useProject()
  const t = useT()

  const ts = (k: string): string => asString(t, k)
  const pageTitle = useMemo(() => getPageTitle(currentPath, t), [currentPath, t])
  const pageDesc = useMemo(() => getPageDesc(currentPath, t), [currentPath, t])
  const tips = useMemo(() => getPageTips(currentPath, t), [currentPath, t])

  // 项目统计 - 缓存计算结果，避免每次渲染都遍历注册表
  const stats = useMemo(() => {
    const snap = getFullSnapshot()
    // NPC 数量：合并 npcAssets（有肖像/行走图的NPC）、customNpcs（自定义NPC）和 vanillaNpcOverrides（原版NPC修改）
    const npcAssetIds = Object.keys(snap.npcAssets || {})
    const customNpcIds = (snap.customNpcs as Array<Record<string, unknown>> || []).map(n => (n.id as string) || (n.name as string)).filter(Boolean)
    const overriddenNpcIds = Object.keys(snap.vanillaNpcOverrides || {})
    const allNpcIds = new Set([...npcAssetIds, ...customNpcIds, ...overriddenNpcIds])
    return {
      npcs: allNpcIds.size,
      events: ((snap.events as unknown[])?.length ?? 0),
      items: ((snap.customItems as unknown[])?.length ?? 0),
      maps: ((snap.customMaps as unknown[])?.length ?? 0),
      quests: ((snap.quests as unknown[])?.length ?? 0),
    }
  }, [getFullSnapshot, currentPath])
  const totalCustom = stats.npcs + stats.events + stats.items + stats.maps + stats.quests

  return (
    <aside className="hidden xl:flex w-[300px] min-w-[300px] themed-bg-secondary flex-col border-l themed-border-secondary overflow-y-auto">
      {/* 当前页面标题 */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-xs themed-text-dimmed uppercase tracking-wider mb-1">{ts('rightPanel.currentPage')}</p>
        <h3 className="text-base font-medium themed-text-primary">{pageTitle}</h3>
        {pageDesc && <p className="text-sm themed-text-dimmed mt-0.5">{pageDesc}</p>}
      </div>

      {/* 分隔 */}
      <div className="border-t themed-border-secondary mx-4" />

      {/* 项目统计 */}
      <div className="px-5 py-4">
        <p className="text-xs themed-text-dimmed uppercase tracking-wider mb-3">{asString(t, 'rightPanel.projectStats')}</p>
        <div className="grid grid-cols-3 gap-3">
          <StatItem label="NPC" count={stats.npcs} />
          <StatItem label={asString(t, 'sidebar.events')} count={stats.events} />
          <StatItem label={asString(t, 'sidebar.items')} count={stats.items} />
          <StatItem label={asString(t, 'sidebar.maps')} count={stats.maps} />
          <StatItem label={asString(t, 'sidebar.quests')} count={stats.quests} />
          <StatItem label={asString(t, 'export.total')} count={totalCustom} />
        </div>
      </div>

      {/* 分隔 */}
      <div className="border-t themed-border-secondary mx-4" />

      {/* 快捷提示 */}
      {tips.length > 0 && (
        <div className="px-5 py-4">
          <p className="text-xs themed-text-dimmed uppercase tracking-wider mb-3">{asString(t, 'rightPanel.tips')}</p>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-xs themed-text-muted flex items-start gap-1.5">
                <span className="themed-text-disabled flex-shrink-0 mt-0.5"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg></span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 快捷键 */}
      <div className="px-5 py-4 mt-auto border-t themed-border-secondary">
        <p className="text-xs themed-text-dimmed uppercase tracking-wider mb-2">{ts('rightPanel.shortcuts')}</p>
        <div className="space-y-1.5">
          <Kbd keys="Ctrl+S" label={ts('rightPanel.saveProject')} />
          <Kbd keys="Ctrl+O" label={ts('rightPanel.openProject')} />
          <Kbd keys="Ctrl+Z" label={ts('rightPanel.undo')} />
          <Kbd keys="Ctrl+Y" label={ts('rightPanel.redo')} />
        </div>
      </div>
    </aside>
  )
}

function StatItem({ label, count }: { label: string; count: number }): JSX.Element {
  return (
    <div className="themed-bg-card rounded-lg p-2 text-center">
      <div className={`text-base font-semibold ${count > 0 ? 'themed-text-primary' : 'themed-text-disabled'}`}>{count}</div>
      <div className="text-[11px] themed-text-dimmed">{label}</div>
    </div>
  )
}

function Kbd({ keys, label }: { keys: string; label: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="themed-text-dimmed">{label}</span>
      <kbd className="px-1.5 py-0.5 rounded text-[11px] themed-bg-card themed-text-secondary border themed-border-primary">{keys}</kbd>
    </div>
  )
}

function getPageTitle(path: string, t: (key: string) => string | string[]): string {
  if (path === '/') return asString(t, 'rightPanel.home')
  if (path.startsWith('/npc')) return asString(t, 'rightPanel.npc')
  if (path.startsWith('/events')) return asString(t, 'rightPanel.events')
  if (path.startsWith('/items')) return asString(t, 'rightPanel.items')
  if (path.startsWith('/maps')) return asString(t, 'rightPanel.maps')
  if (path.startsWith('/quests')) return asString(t, 'rightPanel.quests')
  if (path.startsWith('/export')) return asString(t, 'rightPanel.export')
  if (path.startsWith('/mod-settings')) return asString(t, 'rightPanel.modSettings')
  if (path.startsWith('/about')) return asString(t, 'rightPanel.about')
  return '饭团工坊'
}

function getPageDesc(path: string, t: (key: string) => string | string[]): string {
  if (path === '/') return asString(t, 'rightPanel.homeDesc')
  if (path.startsWith('/npc')) return asString(t, 'rightPanel.npcDesc')
  if (path.startsWith('/events')) return asString(t, 'rightPanel.eventsDesc')
  if (path.startsWith('/items')) return asString(t, 'rightPanel.itemsDesc')
  if (path.startsWith('/maps')) return asString(t, 'rightPanel.mapsDesc')
  if (path.startsWith('/quests')) return asString(t, 'rightPanel.questsDesc')
  if (path.startsWith('/export')) return asString(t, 'rightPanel.exportDesc')
  if (path.startsWith('/mod-settings')) return asString(t, 'rightPanel.modSettingsDesc')
  if (path.startsWith('/about')) return asString(t, 'rightPanel.aboutDesc')
  return ''
}

function getPageTips(path: string, t: (key: string) => string | string[]): string[] {
  if (path === '/') return asArray(t, 'rightPanel.homeTips')
  if (path.startsWith('/npc')) return asArray(t, 'rightPanel.npcTips')
  if (path.startsWith('/events')) return asArray(t, 'rightPanel.eventsTips')
  if (path.startsWith('/items')) return asArray(t, 'rightPanel.itemsTips')
  if (path.startsWith('/maps')) return asArray(t, 'rightPanel.mapsTips')
  if (path.startsWith('/quests')) return asArray(t, 'rightPanel.questsTips')
  if (path.startsWith('/export')) return asArray(t, 'rightPanel.exportTips')
  if (path.startsWith('/mod-settings')) return asArray(t, 'rightPanel.modSettingsTips')
  return []
}
