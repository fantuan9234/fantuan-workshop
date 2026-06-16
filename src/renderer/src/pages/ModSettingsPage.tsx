import { useState, useEffect, useRef } from 'react'
import { useProject } from '../data/ProjectContext'
import type { ConfigSchemaEntry, DynamicTokenEntry } from '../data/ProjectContext'
import { useT, asString } from '../i18n'

type TabKey = 'configSchema' | 'dynamicTokens' | 'whenConditions' | 'i18n' | 'advanced'

export default function ModSettingsPage(): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const { registerSnapshot, markDirty } = useProject()
  const [activeTab, setActiveTab] = useState<TabKey>('configSchema')

  // ---- 状态 ----
  const [configSchema, setConfigSchema] = useState<Record<string, ConfigSchemaEntry>>({})
  const [dynamicTokens, setDynamicTokens] = useState<DynamicTokenEntry[]>([])
  const [whenConditions, setWhenConditions] = useState<Record<string, string>>({})
  const [enableI18n, setEnableI18n] = useState(false)
  const [i18nEntries, setI18nEntries] = useState<Record<string, Record<string, string>>>({})
  const [splitContentFiles, setSplitContentFiles] = useState(false)
  const [patchPriority, setPatchPriority] = useState<'Low' | 'Normal' | 'High'>('Normal')

  const configSchemaRef = useRef(configSchema)
  configSchemaRef.current = configSchema
  const dynamicTokensRef = useRef(dynamicTokens)
  dynamicTokensRef.current = dynamicTokens
  const whenConditionsRef = useRef(whenConditions)
  whenConditionsRef.current = whenConditions
  const enableI18nRef = useRef(enableI18n)
  enableI18nRef.current = enableI18n
  const i18nEntriesRef = useRef(i18nEntries)
  i18nEntriesRef.current = i18nEntries
  const splitContentFilesRef = useRef(splitContentFiles)
  splitContentFilesRef.current = splitContentFiles
  const patchPriorityRef = useRef(patchPriority)
  patchPriorityRef.current = patchPriority

  // ---- 注册快照 ----
  useEffect(() => {
    const unreg1 = registerSnapshot('configSchema',
      () => configSchemaRef.current,
      (data: unknown) => { setConfigSchema(data as Record<string, ConfigSchemaEntry>) }
    )
    const unreg2 = registerSnapshot('dynamicTokens',
      () => dynamicTokensRef.current,
      (data: unknown) => { setDynamicTokens(data as DynamicTokenEntry[]) }
    )
    const unreg3 = registerSnapshot('whenConditions',
      () => whenConditionsRef.current,
      (data: unknown) => { setWhenConditions(data as Record<string, string>) }
    )
    const unreg4 = registerSnapshot('enableI18n',
      () => enableI18nRef.current,
      (data: unknown) => { setEnableI18n(data as boolean) }
    )
    const unreg5 = registerSnapshot('i18nEntries',
      () => i18nEntriesRef.current,
      (data: unknown) => { setI18nEntries(data as Record<string, Record<string, string>>) }
    )
    const unreg6 = registerSnapshot('splitContentFiles',
      () => splitContentFilesRef.current,
      (data: unknown) => { setSplitContentFiles(data as boolean) }
    )
    const unreg7 = registerSnapshot('patchPriority',
      () => patchPriorityRef.current,
      (data: unknown) => { setPatchPriority(data as 'Low' | 'Normal' | 'High') }
    )
    return () => { unreg1(); unreg2(); unreg3(); unreg4(); unreg5(); unreg6(); unreg7() }
  }, [registerSnapshot])

  // ---- 通用更新函数 ----
  const update = <K extends string>(key: K, updater: () => void) => {
    updater()
    // 只标记脏数据，不通过 mutateSnapshot 回写（因为 setState 异步，ref 还没更新，回写会覆盖新值）
    markDirty()
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'configSchema', label: ts('modSettings.tabConfigSchema') },
    { key: 'dynamicTokens', label: ts('modSettings.tabDynamicTokens') },
    { key: 'whenConditions', label: ts('modSettings.tabWhenConditions') },
    { key: 'i18n', label: ts('modSettings.tabI18n') },
    { key: 'advanced', label: ts('modSettings.tabAdvanced') },
  ]

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-y-auto">
      {/* 顶部 */}
      <div className="flex items-center justify-between flex-shrink-0 mb-6">
        <div>
          <h2 className="text-2xl font-bold themed-text-primary">{ts('modSettings.title')}</h2>
          <p className="text-sm themed-text-muted mt-1">{ts('modSettings.subtitle')}</p>
        </div>
      </div>

      {/* Tab 栏 */}
      <div className="flex gap-1 mb-6 border-b themed-border-secondary pb-0 overflow-x-auto flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.key
                ? 'border-[#07c160] text-[#07c160]'
                : 'border-transparent themed-text-muted hover:themed-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 min-h-0">
        {activeTab === 'configSchema' && <ConfigSchemaTab configSchema={configSchema} setConfigSchema={setConfigSchema} update={update} />}
        {activeTab === 'dynamicTokens' && <DynamicTokensTab dynamicTokens={dynamicTokens} setDynamicTokens={setDynamicTokens} update={update} />}
        {activeTab === 'whenConditions' && <WhenConditionsTab whenConditions={whenConditions} setWhenConditions={setWhenConditions} update={update} />}
        {activeTab === 'i18n' && <I18nTab enableI18n={enableI18n} setEnableI18n={setEnableI18n} i18nEntries={i18nEntries} setI18nEntries={setI18nEntries} update={update} />}
        {activeTab === 'advanced' && (
          <AdvancedTab
            splitContentFiles={splitContentFiles}
            setSplitContentFiles={setSplitContentFiles}
            patchPriority={patchPriority}
            setPatchPriority={setPatchPriority}
            update={update}
          />
        )}
      </div>
    </div>
  )
}

// ========== ConfigSchema Tab ==========
function ConfigSchemaTab({ configSchema, setConfigSchema, update }: {
  configSchema: Record<string, ConfigSchemaEntry>
  setConfigSchema: React.Dispatch<React.SetStateAction<Record<string, ConfigSchemaEntry>>>
  update: <K extends string>(key: K, updater: () => void) => void
}) {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [newKey, setNewKey] = useState('')

  const handleAdd = () => {
    const key = newKey.trim()
    if (!key || configSchema[key]) return
    update('configSchema', () => {
      setConfigSchema(prev => ({ ...prev, [key]: { Default: '', Description: '' } }))
      setNewKey('')
    })
  }

  const handleUpdate = (key: string, field: keyof ConfigSchemaEntry, value: unknown) => {
    update('configSchema', () => {
      setConfigSchema(prev => ({
        ...prev,
        [key]: { ...prev[key], [field]: value }
      }))
    })
  }

  const handleDelete = (key: string) => {
    update('configSchema', () => {
      setConfigSchema(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    })
  }

  const entries = Object.entries(configSchema)

  return (
    <div className="space-y-4">
      {/* 添加新配置项 */}
      <div className="themed-bg-card rounded-xl p-5">
        <h3 className="text-sm font-medium themed-text-secondary mb-3">{ts('modSettings.addConfig')}</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder={ts('modSettings.configNamePlaceholder')}
            className="input flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="px-4 py-2 bg-[#07c160] hover:bg-[#06a850] text-white rounded-lg text-sm font-medium transition-colors">
            {ts('modSettings.addBtn')}
          </button>
        </div>
        <p className="text-[10px] themed-text-dimmed mt-2">{ts('modSettings.configNameHint')}</p>
      </div>

      {/* 配置项列表 */}
      {entries.length === 0 ? (
        <div className="themed-bg-card rounded-xl p-8 text-center">
          <div className="themed-text-dimmed text-sm">{ts('modSettings.noConfigEntries')}</div>
          <p className="text-[11px] themed-text-dimmed mt-1">{ts('modSettings.noConfigEntriesHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(([key, entry]) => (
            <div key={key} className="themed-bg-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#07c160]/15 text-[#07c160]">{key}</span>
                  <span className="text-[10px] themed-text-dimmed">{'{{' + key + '}}'}</span>
                </div>
                <button onClick={() => handleDelete(key)} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  {ts('modSettings.deleteBtn')}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label={ts('modSettings.configDefault')}>
                  <input type="text" value={String(entry.Default ?? '')} onChange={e => handleUpdate(key, 'Default', e.target.value)} className="input" placeholder={ts('modSettings.configDefaultPlaceholder')} />
                </Field>
                <Field label={ts('modSettings.configAllowValues')}>
                  <input type="text" value={entry.AllowValues ?? ''} onChange={e => handleUpdate(key, 'AllowValues', e.target.value)} className="input" placeholder={ts('modSettings.configAllowValuesPlaceholder')} />
                </Field>
                <Field label={ts('modSettings.configDescription')}>
                  <input type="text" value={entry.Description ?? ''} onChange={e => handleUpdate(key, 'Description', e.target.value)} className="input" placeholder={ts('modSettings.configDescriptionPlaceholder')} />
                </Field>
                <div className="flex items-end gap-4">
                  <Field label={ts('modSettings.configAllowBlank')}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={entry.AllowBlank ?? false} onChange={e => handleUpdate(key, 'AllowBlank', e.target.checked)} className="w-4 h-4 rounded" />
                      <span className="text-xs themed-text-muted">{ts('modSettings.configAllowBlankHint')}</span>
                    </label>
                  </Field>
                </div>
              </div>
              {entry.AllowRange && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] themed-text-dimmed">{ts('modSettings.configAllowRange')}</span>
                  <input type="number" value={entry.AllowRange[0]} onChange={e => handleUpdate(key, 'AllowRange', [Number(e.target.value), entry.AllowRange![1]])} className="input w-20" />
                  <span className="text-xs themed-text-dimmed">~</span>
                  <input type="number" value={entry.AllowRange[1]} onChange={e => handleUpdate(key, 'AllowRange', [entry.AllowRange![0], Number(e.target.value)])} className="input w-20" />
                  <button onClick={() => handleUpdate(key, 'AllowRange', undefined)} className="text-[10px] text-red-400 hover:text-red-300">{ts('modSettings.removeBtn')}</button>
                </div>
              )}
              {!entry.AllowRange && entry.AllowValues && entry.AllowValues.split(',').some(v => !isNaN(Number(v.trim())) && v.trim() !== '') && (
                <button onClick={() => {
                  const values = entry.AllowValues!.split(',').map(v => Number(v.trim())).filter(n => !isNaN(n))
                  if (values.length >= 2) handleUpdate(key, 'AllowRange', [Math.min(...values), Math.max(...values)])
                }} className="mt-2 text-[10px] text-[#07c160] hover:underline">{ts('modSettings.convertToRange')}</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 使用说明 */}
      <div className="themed-bg-card rounded-xl p-4">
        <h3 className="text-sm font-medium themed-text-secondary mb-2">{ts('modSettings.usageGuide')}</h3>
        <div className="text-[11px] themed-text-muted space-y-1 font-mono">
          <p>{ts('modSettings.configUsage1')}</p>
          <p>{ts('modSettings.configUsage2')}</p>
          <p>{ts('modSettings.configUsage3')}</p>
        </div>
      </div>
    </div>
  )
}

// ========== DynamicTokens Tab ==========
function DynamicTokensTab({ dynamicTokens, setDynamicTokens, update }: {
  dynamicTokens: DynamicTokenEntry[]
  setDynamicTokens: React.Dispatch<React.SetStateAction<DynamicTokenEntry[]>>
  update: <K extends string>(key: K, updater: () => void) => void
}) {
  const t = useT()
  const ts = (k: string): string => asString(t, k)

  const handleAdd = () => {
    update('dynamicTokens', () => {
      setDynamicTokens(prev => [...prev, { Name: '', Value: '' }])
    })
  }

  const handleUpdate = (index: number, field: keyof DynamicTokenEntry, value: unknown) => {
    update('dynamicTokens', () => {
      setDynamicTokens(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
    })
  }

  const handleDelete = (index: number) => {
    update('dynamicTokens', () => {
      setDynamicTokens(prev => prev.filter((_, i) => i !== index))
    })
  }

  const handleAddWhen = (index: number, whenKey: string, whenValue: string) => {
    update('dynamicTokens', () => {
      setDynamicTokens(prev => prev.map((t, i) => {
        if (i !== index) return t
        return { ...t, When: { ...(t.When || {}), [whenKey]: whenValue } }
      }))
    })
  }

  const handleRemoveWhen = (index: number, whenKey: string) => {
    update('dynamicTokens', () => {
      setDynamicTokens(prev => prev.map((t, i) => {
        if (i !== index) return t
        const nextWhen = { ...(t.When || {}) }
        delete nextWhen[whenKey]
        return { ...t, When: Object.keys(nextWhen).length > 0 ? nextWhen : undefined }
      }))
    })
  }

  return (
    <div className="space-y-4">
      {/* 添加按钮 */}
      <button onClick={handleAdd} className="w-full themed-bg-card rounded-xl p-5 text-left border border-dashed themed-border-active hover:border-[#07c160] transition-colors group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#07c160]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#07c160]/20 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#07c160" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </div>
          <div>
            <div className="text-sm font-medium themed-text-primary">{ts('modSettings.addToken')}</div>
            <div className="text-[11px] themed-text-muted mt-0.5">{ts('modSettings.addTokenDesc')}</div>
          </div>
        </div>
      </button>

      {/* 令牌列表 */}
      {dynamicTokens.length === 0 ? (
        <div className="themed-bg-card rounded-xl p-8 text-center">
          <div className="themed-text-dimmed text-sm">{ts('modSettings.noTokens')}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {dynamicTokens.map((token, index) => (
            <div key={index} className="themed-bg-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/15 text-purple-300">
                    {'{{' + (token.Name || '...') + '}}'}
                  </span>
                </div>
                <button onClick={() => handleDelete(index)} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  {ts('modSettings.deleteBtn')}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label={ts('modSettings.tokenName')}>
                  <input type="text" value={token.Name} onChange={e => handleUpdate(index, 'Name', e.target.value)} className="input" placeholder={ts('modSettings.tokenNamePlaceholder')} />
                </Field>
                <Field label={ts('modSettings.tokenValue')}>
                  <input type="text" value={token.Value} onChange={e => handleUpdate(index, 'Value', e.target.value)} className="input" placeholder={ts('modSettings.tokenValuePlaceholder')} />
                </Field>
              </div>
              {/* When 条件 */}
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] themed-text-dimmed font-medium">When</span>
                  {token.When && Object.keys(token.When).map(wk => (
                    <span key={wk} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300">
                      {wk}={token.When![wk]}
                      <button onClick={() => handleRemoveWhen(index, wk)} className="hover:text-red-300 ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={ts('modSettings.whenKeyPlaceholder')}
                    className="input w-32"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement
                        const next = target.nextElementSibling as HTMLInputElement
                        if (next) next.focus()
                      }
                    }}
                    id={`when-key-${index}`}
                  />
                  <input
                    type="text"
                    placeholder={ts('modSettings.whenValuePlaceholder')}
                    className="input flex-1"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const keyInput = document.getElementById(`when-key-${index}`) as HTMLInputElement
                        const valInput = e.target as HTMLInputElement
                        if (keyInput?.value && valInput.value) {
                          handleAddWhen(index, keyInput.value, valInput.value)
                          keyInput.value = ''
                          valInput.value = ''
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const keyInput = document.getElementById(`when-key-${index}`) as HTMLInputElement
                      const valInput = keyInput?.nextElementSibling as HTMLInputElement
                      if (keyInput?.value && valInput?.value) {
                        handleAddWhen(index, keyInput.value, valInput.value)
                        keyInput.value = ''
                        valInput.value = ''
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 使用说明 */}
      <div className="themed-bg-card rounded-xl p-4">
        <h3 className="text-sm font-medium themed-text-secondary mb-2">{ts('modSettings.usageGuide')}</h3>
        <div className="text-[11px] themed-text-muted space-y-1 font-mono">
          <p>{ts('modSettings.tokenUsage1')}</p>
          <p>{ts('modSettings.tokenUsage2')}</p>
          <p>{ts('modSettings.tokenUsage3')}</p>
        </div>
      </div>
    </div>
  )
}

// ========== WhenConditions Tab ==========
function WhenConditionsTab({ whenConditions, setWhenConditions, update }: {
  whenConditions: Record<string, string>
  setWhenConditions: React.Dispatch<React.SetStateAction<Record<string, string>>>
  update: <K extends string>(key: K, updater: () => void) => void
}) {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const handleAdd = () => {
    const key = newKey.trim()
    if (!key) return
    update('whenConditions', () => {
      setWhenConditions(prev => ({ ...prev, [key]: newValue.trim() }))
      setNewKey('')
      setNewValue('')
    })
  }

  const handleUpdate = (key: string, value: string) => {
    update('whenConditions', () => {
      setWhenConditions(prev => ({ ...prev, [key]: value }))
    })
  }

  const handleDelete = (key: string) => {
    update('whenConditions', () => {
      setWhenConditions(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    })
  }

  const entries = Object.entries(whenConditions)

  // 常用条件令牌
  const commonTokens = [
    { key: 'Season', values: ['Spring', 'Summer', 'Fall', 'Winter'] },
    { key: 'Weather', values: ['Sun', 'Rain', 'Snow', 'Storm'] },
    { key: 'DayOfWeek', values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    { key: 'Year', values: ['1', '2', '3'] },
    { key: 'Time', values: ['600', '1200', '1800', '2400'] },
    { key: 'Language', values: ['zh', 'en', 'ja', 'de', 'pt', 'ru'] },
  ]

  return (
    <div className="space-y-4">
      {/* 添加条件 */}
      <div className="themed-bg-card rounded-xl p-5">
        <h3 className="text-sm font-medium themed-text-secondary mb-3">{ts('modSettings.addWhenCondition')}</h3>
        <div className="flex gap-2">
          <input type="text" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder={ts('modSettings.whenKeyPlaceholder')} className="input flex-1" />
          <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder={ts('modSettings.whenValuePlaceholder')} className="input flex-1" />
          <button onClick={handleAdd} className="px-4 py-2 bg-[#07c160] hover:bg-[#06a850] text-white rounded-lg text-sm font-medium transition-colors">
            {ts('modSettings.addBtn')}
          </button>
        </div>
      </div>

      {/* 快捷添加 */}
      <div className="themed-bg-card rounded-xl p-4">
        <h3 className="text-sm font-medium themed-text-secondary mb-3">{ts('modSettings.quickAddCondition')}</h3>
        <div className="flex flex-wrap gap-2">
          {commonTokens.map(token => (
            <div key={token.key} className="flex items-center gap-1">
              <span className="text-[10px] themed-text-dimmed font-medium">{token.key}:</span>
              {token.values.map(val => (
                <button
                  key={val}
                  onClick={() => {
                    update('whenConditions', () => {
                      setWhenConditions(prev => ({ ...prev, [token.key]: val }))
                    })
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    whenConditions[token.key] === val
                      ? 'bg-[#07c160]/20 text-[#07c160]'
                      : 'themed-bg-active themed-text-muted hover:themed-text-secondary'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 条件列表 */}
      {entries.length === 0 ? (
        <div className="themed-bg-card rounded-xl p-8 text-center">
          <div className="themed-text-dimmed text-sm">{ts('modSettings.noWhenConditions')}</div>
          <p className="text-[11px] themed-text-dimmed mt-1">{ts('modSettings.noWhenConditionsHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="themed-bg-card rounded-lg p-3 flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/15 text-amber-300">{key}</span>
              <span className="text-[11px] themed-text-dimmed">=</span>
              <input type="text" value={value} onChange={e => handleUpdate(key, e.target.value)} className="input flex-1 text-sm" />
              <button onClick={() => handleDelete(key)} className="text-xs text-red-400 hover:text-red-300 transition-colors flex-shrink-0">
                {ts('modSettings.deleteBtn')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 条件说明 */}
      <div className="themed-bg-card rounded-xl p-4">
        <h3 className="text-sm font-medium themed-text-secondary mb-2">{ts('modSettings.whenConditionGuide')}</h3>
        <div className="text-[11px] themed-text-muted space-y-1">
          <p>{ts('modSettings.whenConditionGuide1')}</p>
          <p>{ts('modSettings.whenConditionGuide2')}</p>
          <p>{ts('modSettings.whenConditionGuide3')}</p>
          <p>{ts('modSettings.whenConditionGuide4')}</p>
        </div>
      </div>
    </div>
  )
}

// ========== i18n Tab ==========
function I18nTab({ enableI18n, setEnableI18n, i18nEntries, setI18nEntries, update }: {
  enableI18n: boolean
  setEnableI18n: React.Dispatch<React.SetStateAction<boolean>>
  i18nEntries: Record<string, Record<string, string>>
  setI18nEntries: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>
  update: <K extends string>(key: K, updater: () => void) => void
}) {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [selectedLang, setSelectedLang] = useState('default')
  const [newLang, setNewLang] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const languages = Object.keys(i18nEntries)
  const currentEntries = i18nEntries[selectedLang] || {}

  const handleToggleI18n = (val: boolean) => {
    update('enableI18n', () => {
      setEnableI18n(val)
      if (val && !i18nEntries['default']) {
        setI18nEntries(prev => ({ ...prev, default: {} }))
        setSelectedLang('default')
      }
    })
  }

  const handleAddLanguage = () => {
    const lang = newLang.trim().toLowerCase()
    if (!lang || i18nEntries[lang]) return
    update('i18nEntries', () => {
      setI18nEntries(prev => ({ ...prev, [lang]: {} }))
      setNewLang('')
      setSelectedLang(lang)
    })
  }

  const handleAddEntry = () => {
    const key = newKey.trim()
    if (!key) return
    update('i18nEntries', () => {
      setI18nEntries(prev => ({
        ...prev,
        [selectedLang]: { ...(prev[selectedLang] || {}), [key]: newValue }
      }))
      setNewKey('')
      setNewValue('')
    })
  }

  const handleUpdateEntry = (key: string, value: string) => {
    update('i18nEntries', () => {
      setI18nEntries(prev => ({
        ...prev,
        [selectedLang]: { ...(prev[selectedLang] || {}), [key]: value }
      }))
    })
  }

  const handleDeleteEntry = (key: string) => {
    update('i18nEntries', () => {
      setI18nEntries(prev => {
        const next = { ...prev, [selectedLang]: { ...(prev[selectedLang] || {}) } }
        delete next[selectedLang][key]
        return next
      })
    })
  }

  const handleDeleteLang = (lang: string) => {
    if (lang === 'default') return
    update('i18nEntries', () => {
      setI18nEntries(prev => {
        const next = { ...prev }
        delete next[lang]
        return next
      })
      if (selectedLang === lang) setSelectedLang('default')
    })
  }

  return (
    <div className="space-y-4">
      {/* 开关 */}
      <div className="themed-bg-card rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium themed-text-primary">{ts('modSettings.enableI18n')}</h3>
            <p className="text-[11px] themed-text-muted mt-1">{ts('modSettings.enableI18nHint')}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={enableI18n} onChange={e => handleToggleI18n(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#07c160]"></div>
          </label>
        </div>
      </div>

      {enableI18n && (
        <>
          {/* 语言管理 */}
          <div className="themed-bg-card rounded-xl p-5">
            <h3 className="text-sm font-medium themed-text-secondary mb-3">{ts('modSettings.languageManage')}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {languages.map(lang => (
                <div key={lang} className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedLang(lang)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedLang === lang
                        ? 'bg-[#07c160]/20 text-[#07c160] ring-1 ring-[#07c160]/30'
                        : 'themed-bg-active themed-text-muted hover:themed-text-secondary'
                    }`}
                  >
                    {lang}.json
                  </button>
                  {lang !== 'default' && (
                    <button onClick={() => handleDeleteLang(lang)} className="text-[10px] text-red-400 hover:text-red-300">&times;</button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newLang} onChange={e => setNewLang(e.target.value)} placeholder={ts('modSettings.newLangPlaceholder')} className="input w-32" />
              <button onClick={handleAddLanguage} className="px-3 py-2 text-xs bg-[#07c160] hover:bg-[#06a850] text-white rounded-lg transition-colors">
                {ts('modSettings.addLangBtn')}
              </button>
            </div>
          </div>

          {/* 翻译条目 */}
          <div className="themed-bg-card rounded-xl p-5">
            <h3 className="text-sm font-medium themed-text-secondary mb-3">
              {selectedLang}.json ({Object.keys(currentEntries).length} {ts('modSettings.entries')})
            </h3>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder={ts('modSettings.i18nKeyPlaceholder')} className="input flex-1" />
              <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder={ts('modSettings.i18nValuePlaceholder')} className="input flex-1" />
              <button onClick={handleAddEntry} className="px-3 py-2 text-xs bg-[#07c160] hover:bg-[#06a850] text-white rounded-lg transition-colors">
                {ts('modSettings.addBtn')}
              </button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {Object.entries(currentEntries).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-300 flex-shrink-0 max-w-[200px] truncate">{key}</span>
                  <input type="text" value={value} onChange={e => handleUpdateEntry(key, e.target.value)} className="input flex-1 text-sm" />
                  <button onClick={() => handleDeleteEntry(key)} className="text-[10px] text-red-400 hover:text-red-300 flex-shrink-0">&times;</button>
                </div>
              ))}
              {Object.keys(currentEntries).length === 0 && (
                <div className="text-center py-4 text-[11px] themed-text-dimmed">{ts('modSettings.noI18nEntries')}</div>
              )}
            </div>
          </div>

          {/* 使用说明 */}
          <div className="themed-bg-card rounded-xl p-4">
            <h3 className="text-sm font-medium themed-text-secondary mb-2">{ts('modSettings.usageGuide')}</h3>
            <div className="text-[11px] themed-text-muted space-y-1 font-mono">
              <p>{ts('modSettings.i18nUsage1')}</p>
              <p>{ts('modSettings.i18nUsage2')}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ========== Advanced Tab ==========
function AdvancedTab({ splitContentFiles, setSplitContentFiles, patchPriority, setPatchPriority, update }: {
  splitContentFiles: boolean
  setSplitContentFiles: React.Dispatch<React.SetStateAction<boolean>>
  patchPriority: 'Low' | 'Normal' | 'High'
  setPatchPriority: React.Dispatch<React.SetStateAction<'Low' | 'Normal' | 'High'>>
  update: <K extends string>(key: K, updater: () => void) => void
}) {
  const t = useT()
  const ts = (k: string): string => asString(t, k)

  return (
    <div className="space-y-4">
      {/* 文件拆分 */}
      <div className="themed-bg-card rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium themed-text-primary">{ts('modSettings.splitContentFiles')}</h3>
            <p className="text-[11px] themed-text-muted mt-1">{ts('modSettings.splitContentFilesHint')}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={splitContentFiles} onChange={e => {
              update('splitContentFiles', () => { setSplitContentFiles(e.target.checked) })
            }} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#07c160]"></div>
          </label>
        </div>
        {splitContentFiles && (
          <div className="mt-3 p-3 themed-bg-primary rounded-lg">
            <p className="text-[11px] themed-text-muted">{ts('modSettings.splitContentFilesDesc')}</p>
          </div>
        )}
      </div>

      {/* 补丁优先级 */}
      <div className="themed-bg-card rounded-xl p-5">
        <h3 className="text-sm font-medium themed-text-primary mb-3">{ts('modSettings.patchPriority')}</h3>
        <p className="text-[11px] themed-text-muted mb-3">{ts('modSettings.patchPriorityHint')}</p>
        <div className="flex gap-2">
          {(['Low', 'Normal', 'High'] as const).map(p => (
            <button
              key={p}
              onClick={() => update('patchPriority', () => { setPatchPriority(p) })}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                patchPriority === p
                  ? p === 'High' ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'
                    : p === 'Low' ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                    : 'bg-[#07c160]/20 text-[#07c160] ring-1 ring-[#07c160]/30'
                  : 'themed-bg-active themed-text-muted hover:themed-text-secondary'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Include 说明 */}
      <div className="themed-bg-card rounded-xl p-4">
        <h3 className="text-sm font-medium themed-text-secondary mb-2">{ts('modSettings.includeGuide')}</h3>
        <div className="text-[11px] themed-text-muted space-y-1 font-mono">
          <p>{ts('modSettings.includeGuide1')}</p>
          <p>{ts('modSettings.includeGuide2')}</p>
        </div>
      </div>
    </div>
  )
}

// ========== 通用组件 ==========
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[11px] themed-text-dimmed block mb-1">{label}</label>{children}</div>
}
