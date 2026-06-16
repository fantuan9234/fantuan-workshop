import { useState, useMemo, useCallback } from 'react'
import { useProject } from '../data/ProjectContext'
import { useNpcAssets } from '../data/useNpcAssets'
import { performExport, exportAsZip, calcStats, type ExportConfig } from '../data/exportUtils'
import { useT, asString } from '../i18n'

const api = (window as any).electronAPI

const defaultConfig: ExportConfig & Record<string, unknown> = {
  modName: '',
  author: '',
  version: '1.0.0',
  description: '',
}

export default function ExportPage(): JSX.Element {
  const { meta, getFullSnapshot } = useProject()
  const { gameDir } = useNpcAssets()
  const t = useT()
  /** 强制收窄为 string 的本地 helper */
  const ts = (k: string): string => asString(t, k)
  const [cfg, setCfg] = useState({ ...defaultConfig, modName: meta.name })
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; modDir: string; fileCount: number; error?: string } | null>(null)
  const [zipResult, setZipResult] = useState<{ success: boolean; zipPath: string; error?: string } | null>(null)
  const [actionType, setActionType] = useState<'folder' | 'zip' | null>(null)
  const [installResult, setInstallResult] = useState<{ success: boolean; message?: string; error?: string; targetDir?: string } | null>(null)
  const [installing, setInstalling] = useState(false)
  const [smapiLog, setSmapiLog] = useState<{ lines: string[]; errors: string[] } | null>(null)
  const [loadingLog, setLoadingLog] = useState(false)
  const [exportProgress, setExportProgress] = useState<{ step: string; current: number; total: number } | null>(null)

  const snap = getFullSnapshot()
  const stats = useMemo(() => calcStats(snap), [snap])
  const dialogueCount = (snap.customNpcs || []).reduce((sum, n) => sum + Object.keys((n as any).dialogues || {}).length, 0)
  const totalChanges = stats.portraitCount + stats.spriteCount + stats.eventCount
    + stats.itemCount + stats.mapCount + stats.questCount + stats.npcDataCount + dialogueCount

  const hasContent = totalChanges > 0

  const handleExportFolder = async () => {
    if (!cfg.modName.trim()) {
      setResult({ success: false, modDir: '', fileCount: 0, error: t('export.enterModName') })
      return
    }
    setActionType('folder')
    setExporting(true)
    setResult(null)
    setZipResult(null)
    setExportProgress({ step: t('export.preparing'), current: 0, total: 5 })
    try {
      const r = await performExport(snap, cfg as ExportConfig, gameDir, (step, current, total) => {
        setExportProgress({ step, current, total })
      })
      setResult(r)
    } catch (e) {
      setResult({ success: false, modDir: '', fileCount: 0, error: String(e) })
    }
    setExporting(false)
    setActionType(null)
    setExportProgress(null)
  }

  const handleExportZip = async () => {
    if (!cfg.modName.trim()) {
      setZipResult({ success: false, zipPath: '', error: t('export.enterModName') })
      return
    }
    setActionType('zip')
    setExporting(true)
    setResult(null)
    setZipResult(null)
    setExportProgress({ step: t('export.preparing'), current: 0, total: 5 })
    try {
      const r = await exportAsZip(snap, cfg as ExportConfig, gameDir, (step, current, total) => {
        setExportProgress({ step, current, total })
      })
      setZipResult(r)
    } catch (e) {
      setZipResult({ success: false, zipPath: '', error: String(e) })
    }
    setExporting(false)
    setActionType(null)
    setExportProgress(null)
  }

  const handleInstallMod = useCallback(async () => {
    if (!result?.success || !result.modDir) return
    setInstalling(true)
    setInstallResult(null)
    try {
      const r = await api.gameInstallMod(result.modDir)
      setInstallResult(r)
    } catch (e) {
      setInstallResult({ success: false, error: String(e) })
    }
    setInstalling(false)
  }, [result])

  const handleReadLog = useCallback(async () => {
    setLoadingLog(true)
    try {
      const r = await api.gameReadSmapiLog()
      if (r.success) {
        setSmapiLog({ lines: r.lines, errors: r.errors })
      } else {
        setSmapiLog({ lines: [], errors: [r.error || ts('export.cannotReadLog')] })
      }
    } catch (e) {
      setSmapiLog({ lines: [], errors: [String(e)] })
    }
    setLoadingLog(false)
  }, [])

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-y-auto">
      {/* 顶部 */}
      <div className="flex items-center justify-between flex-shrink-0 mb-6">
        <div>
          <h2 className="text-2xl font-bold themed-text-primary">{ts('export.title')}</h2>
          <p className="text-sm themed-text-muted mt-1">{ts('export.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 flex-1 min-h-0">
        {/* 左侧：配置 */}
        <div className="w-full lg:w-[340px] lg:flex-shrink-0 space-y-4 overflow-y-auto">
          {/* 模组信息 */}
          <div className="themed-bg-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <h3 className="text-sm font-medium themed-text-secondary">{ts('export.modInfo')}</h3>
            </div>
            <F label={ts('export.modName')}>
              <input type="text" value={cfg.modName} onChange={e => setCfg({ ...cfg, modName: e.target.value })}
                placeholder={ts('export.modNamePlaceholder')} className="input" />
              <p className="text-[10px] themed-text-disabled mt-1">{ts('export.modNameHint')}</p>
            </F>
            <F label={ts('export.author')}>
              <input type="text" value={cfg.author} onChange={e => setCfg({ ...cfg, author: e.target.value })}
                placeholder={ts('export.authorPlaceholder')} className="input" />
              <p className="text-[10px] themed-text-disabled mt-1">{ts('export.authorHint')}</p>
            </F>
            <div className="flex-1"><F label={ts('export.version')}><input type="text" value={cfg.version}
              onChange={e => setCfg({ ...cfg, version: e.target.value })} placeholder="1.0.0" className="input" /></F></div>
            <F label={ts('export.description')}>
              <textarea value={cfg.description} onChange={e => setCfg({ ...cfg, description: e.target.value })}
                rows={2} placeholder={ts('export.descriptionPlaceholder')} className="input resize-none" /></F>
          </div>

          {/* 导出操作大卡片 */}
          <div className="space-y-3">
            {/* 导出文件夹 */}
            <button onClick={handleExportFolder} disabled={exporting || !hasContent}
              className={`w-full rounded-xl p-5 text-left transition-all group ${
                hasContent
                  ? 'themed-bg-card border themed-border-active hover:border-[#666] hover:shadow-lg'
                  : 'themed-bg-card border themed-border-primary opacity-50 cursor-not-allowed'
              }`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg themed-bg-active flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium themed-text-primary">{ts('export.exportFolder')}</div>
                  <div className="text-[11px] themed-text-muted mt-0.5">{ts('export.exportFolderDesc')}</div>
                </div>
                {actionType === 'folder' && exporting && (
                  <span className="text-xs themed-text-muted ml-auto animate-pulse">
                    {ts('export.exporting')}
                    {exportProgress && (
                      <span className="text-[10px] themed-text-dimmed ml-2">
                        {exportProgress.step} ({exportProgress.current}/{exportProgress.total})
                      </span>
                    )}
                  </span>
                )}
              </div>
            </button>

            {/* 打包 ZIP */}
            <button onClick={handleExportZip} disabled={exporting || !hasContent}
              className={`w-full rounded-xl p-5 text-left transition-all group ${
                hasContent
                  ? 'themed-bg-card border themed-border-active hover:border-[#666] hover:shadow-lg'
                  : 'themed-bg-card border themed-border-primary opacity-50 cursor-not-allowed'
              }`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg themed-bg-active flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
                    <line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium themed-text-primary">{ts('export.exportZip')}</div>
                  <div className="text-[11px] themed-text-muted mt-0.5">{ts('export.exportZipDesc')}</div>
                </div>
                {actionType === 'zip' && exporting && (
                  <span className="text-xs themed-text-muted ml-auto animate-pulse">
                    {ts('export.packaging')}
                    {exportProgress && (
                      <span className="text-[10px] themed-text-dimmed ml-2">
                        {exportProgress.step} ({exportProgress.current}/{exportProgress.total})
                      </span>
                    )}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* 结果提示 */}
          {result && (
            <div className={`rounded-xl p-4 ${result.success ? 'themed-bg-primary border themed-border-active' : 'themed-bg-primary border themed-border-hover'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                )}
                <span className={`text-sm font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                  {result.success ? ts('export.exportSuccess') : ts('export.exportFail')}
                </span>
              </div>
              {result.success ? (
                <div className="space-y-2 text-xs themed-text-muted">
                  <p>{ts('export.location')}: <span className="themed-text-secondary break-all">{result.modDir}</span></p>
                  <p>{ts('export.totalCount')} <span className="themed-text-primary font-medium">{result.fileCount}</span> {ts('export.fileCount')}</p>
                  {/* 一键安装到 Mods 按钮 */}
                  <button
                    onClick={handleInstallMod}
                    disabled={installing}
                    className="w-full mt-2 px-4 py-2.5 bg-[#4a7c4a] hover:bg-[#5a9c5a] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {installing ? ts('export.installing') : ts('export.installMod')}
                  </button>
                  {installResult && (
                    <p className={installResult.success ? 'text-green-400' : 'text-red-400'}>
                      {installResult.success ? installResult.message : installResult.error}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs themed-text-muted">{result.error}</p>
              )}
            </div>
          )}

          {zipResult && (
            <div className={`rounded-xl p-4 ${zipResult.success ? 'themed-bg-primary border themed-border-active' : 'themed-bg-primary border themed-border-hover'}`}>
              <div className="flex items-center gap-2 mb-2">
                {zipResult.success ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                )}
                <span className={`text-sm font-medium ${zipResult.success ? 'themed-text-secondary' : 'themed-text-muted'}`}>
                  {zipResult.success ? ts('export.zipSuccess') : ts('export.zipFail')}
                </span>
              </div>
              {zipResult.success ? (
                <p className="text-xs themed-text-muted">{ts('export.zipSaved')}: <span className="themed-text-secondary break-all">{zipResult.zipPath}</span></p>
              ) : (
                <p className="text-xs themed-text-muted">{zipResult.error}</p>
              )}
            </div>
          )}

          {/* 使用说明 */}
          <div className="themed-bg-card rounded-xl p-4">
            <h3 className="text-sm font-medium themed-text-secondary mb-2">{ts('export.usageSteps')}</h3>
            <ol className="text-[11px] themed-text-muted space-y-1.5 list-decimal list-inside">
              <li>{ts('export.step1')}</li>
              <li>{ts('export.step2')}</li>
              <li>{ts('export.step3')}</li>
              <li>{ts('export.step4')}</li>
              <li>{ts('export.step5')}</li>
            </ol>
          </div>

          {/* SMAPI 日志 */}
          <div className="themed-bg-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium themed-text-secondary flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                  <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                {ts('export.smapiLog')}
              </h3>
              <button
                onClick={handleReadLog}
                disabled={loadingLog}
                className="px-3 py-1 themed-bg-active themed-text-secondary text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingLog ? t('export.reading') : t('export.readLog')}
              </button>
            </div>
            {smapiLog ? (
              <div className="bg-[#111] rounded-lg p-3 max-h-[300px] overflow-y-auto">
                {smapiLog.errors.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[10px] text-red-400 font-medium mb-1">{ts('export.errorsWarnings')}</div>
                    {smapiLog.errors.map((line, i) => (
                      <p key={i} className="text-[10px] text-red-300 font-mono leading-relaxed break-all">{line}</p>
                    ))}
                  </div>
                )}
                <details>
                  <summary className="text-[10px] themed-text-dimmed cursor-pointer hover:text-gray-300">
                    {ts('export.fullLog')} ({smapiLog.lines.length} {ts('export.lines')})
                  </summary>
                  <pre className="text-[9px] font-mono themed-text-dimmed mt-1 leading-relaxed whitespace-pre-wrap">
                    {smapiLog.lines.join('\n')}
                  </pre>
                </details>
              </div>
            ) : (
              <p className="text-[11px] themed-text-dimmed">{ts('export.logHint')}</p>
            )}
          </div>
        </div>

        {/* 右侧：预览 */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* 统计卡片 */}
          <div className="themed-bg-card rounded-xl p-5">
            <h3 className="text-sm font-medium themed-text-secondary mb-4">{ts('export.exportContent')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
              <StatBox icon={<PortraitIcon />} label={ts('export.npcPortrait')} value={stats.portraitCount} />
              <StatBox icon={<SpriteIcon />} label={ts('export.sprite')} value={stats.spriteCount} />
              <StatBox icon={<EventIcon />} label={ts('export.npcData')} value={stats.npcDataCount} />
              <StatBox icon={<ItemIcon />} label={ts('export.item')} value={stats.itemCount} />
              <StatBox icon={<CalendarIcon />} label={ts('export.event')} value={stats.eventCount} />
              <StatBox icon={<MapIcon />} label={ts('export.map')} value={stats.mapCount} />
              <StatBox icon={<DocIcon />} label={ts('export.quest')} value={stats.questCount} />
              <StatBox icon={<TotalIcon />} label={ts('export.total')} value={totalChanges} highlight />
            </div>
          </div>

          {/* 输出结构预览 */}
          <div className="themed-bg-card rounded-xl p-5">
            <h3 className="text-sm font-medium themed-text-secondary mb-3">{ts('export.outputStructure')}</h3>
            <pre className="text-[11px] font-mono themed-text-muted leading-relaxed">
{`[CP] ${(cfg.modName || 'MyMod').replace(/[<>:"/\\|?*]/g, '_')}/
├── manifest.json    (UniqueID: ${(cfg.author || 'user').replace(/[^a-zA-Z0-9_.]/g, '') || 'user'}.${(cfg.modName || 'MyMod').replace(/[^a-zA-Z0-9]/g, '') || 'MyMod'})
├── content.json
└── assets/
    ├── portraits/    (${stats.portraitCount} ${ts('export.npcPortrait')})
    ├── sprites/      (${stats.spriteCount} ${ts('export.sprite')})
    ├── maps/         (${stats.mapCount} ${ts('export.map')})
    └── items/        (${stats.itemCount} ${ts('export.item')})`}
            </pre>
          </div>

          {/* content.json 预览 */}
          <div className="themed-bg-card rounded-xl p-5">
            <h3 className="text-sm font-medium themed-text-secondary mb-3">{ts('export.cpPreview')}</h3>
            <div className="space-y-1.5 text-[11px] themed-text-muted">
              {stats.portraitCount > 0 && (
                <div className="flex items-center gap-2"><span className="themed-text-secondary">Load</span> <span className="themed-text-disabled">→</span> <span>Portraits/{'{NpcName}'}</span> <span className="themed-text-dimmed ml-auto">{stats.portraitCount}{ts('export.items')}</span></div>
              )}
              {stats.spriteCount > 0 && (
                <div className="flex items-center gap-2"><span className="themed-text-secondary">Load</span> <span className="themed-text-disabled">→</span> <span>Characters/{'{NpcName}'}</span> <span className="themed-text-dimmed ml-auto">{stats.spriteCount}{ts('export.items')}</span></div>
              )}
              {stats.mapCount > 0 && (
                <div className="flex items-center gap-2"><span className="themed-text-secondary">EditMap</span> <span className="themed-text-disabled">→</span> <span>Maps/{'{MapName}'}</span> <span className="themed-text-dimmed ml-auto">{stats.mapCount}{ts('export.items')}</span></div>
              )}
              {stats.npcDataCount > 0 && (
                <div className="flex items-center gap-2"><span className="themed-text-secondary">EditData</span> <span className="themed-text-disabled">→</span> <span>Data/Characters</span> <span className="themed-text-dimmed ml-auto">{stats.npcDataCount}{ts('export.items')}</span></div>
              )}
              {dialogueCount > 0 && (
                <div className="flex items-center gap-2"><span className="themed-text-secondary">EditData</span> <span className="themed-text-disabled">→</span> <span>Characters/Dialogue/{'{NpcName}'}</span> <span className="themed-text-dimmed ml-auto">{dialogueCount}{ts('export.dialogues')}</span></div>
              )}
              {stats.itemCount > 0 && (
                <div className="flex items-center gap-2"><span className="themed-text-secondary">EditData</span> <span className="themed-text-disabled">→</span> <span>Data/Objects</span> <span className="themed-text-dimmed ml-auto">{stats.itemCount}{ts('export.items')}</span></div>
              )}
              {stats.eventCount > 0 && (
                <div className="flex items-center gap-2"><span className="themed-text-secondary">EditData</span> <span className="themed-text-disabled">→</span> <span>Data/Events</span> <span className="themed-text-dimmed ml-auto">{stats.eventCount}{ts('export.items')}</span></div>
              )}
              {totalChanges === 0 && <div className="themed-text-disabled italic">{ts('export.noContent')}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[11px] themed-text-dimmed block mb-1">{label}</label>{children}</div>
}

function StatBox({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'themed-bg-active ring-1 themed-border-hover' : 'themed-bg-primary'}`}>
      <div className="themed-text-muted mb-1 flex items-center justify-center scale-75">{icon}</div>
      <div className={`text-lg font-semibold ${value > 0 ? 'themed-text-primary' : 'themed-text-disabled'}`}>{value}</div>
      <div className="text-[9px] themed-text-dimmed">{label}</div>
    </div>
  )
}

function PortraitIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function SpriteIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>
}
function EventIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
}
function ItemIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
}
function MapIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg>
}
function CalendarIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function DocIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
}
function TotalIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
