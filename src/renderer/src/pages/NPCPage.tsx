import { useNavigate } from 'react-router-dom'
import { useState, useMemo, memo } from 'react'
import { defaultNPCs, type NPCInfo } from '../data/npcData'
import { useCustomNpcs } from '../data/useCustomNpcs'
import { useProject } from '../data/ProjectContext'
import { useT, asString } from '../i18n'
import { IconHeart } from '../components/Icons'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

// ---- 常用地图名（中文标签 + 英文值）----
const MAP_LOCATIONS = [
  { value: 'Farm', label: '农场' },
  { value: 'FarmHouse', label: '农舍' },
  { value: 'Town', label: '小镇' },
  { value: 'Forest', label: '森林' },
  { value: 'Beach', label: '海滩' },
  { value: 'Mountain', label: '山地' },
  { value: 'Desert', label: '沙漠' },
  { value: 'IslandWest', label: '姜岛西部' },
  { value: 'BusStop', label: '公交站' },
  { value: 'Backwoods', label: '后山' },
  { value: 'Woods', label: '树林' },
  { value: 'Railroad', label: '铁路' },
  { value: 'Summit', label: '山顶' },
  { value: 'SeedShop', label: '皮埃尔商店' },
  { value: 'Saloon', label: '酒吧' },
  { value: 'Hospital', label: '医院' },
  { value: 'Blacksmith', label: '铁匠铺' },
  { value: 'AnimalShop', label: '玛妮牧场' },
  { value: 'ArchaeologyHouse', label: '博物馆' },
  { value: 'ManorHouse', label: '路易斯家' },
  { value: 'JoshHouse', label: '乔希家' },
  { value: 'SamHouse', label: '萨姆家' },
  { value: 'HaleyHouse', label: '海莉家' },
  { value: 'Trailer', label: '拖车屋' },
  { value: 'ScienceHouse', label: '科学之家' },
  { value: 'Tent', label: '帐篷' },
  { value: 'Sewer', label: '下水道' },
  { value: 'WitchHut', label: '女巫小屋' },
  { value: 'WizardHouse', label: '巫师塔' },
]

const FACING_OPTIONS = [
  { value: 0, label: '↑ 上' },
  { value: 1, label: '→ 右' },
  { value: 2, label: '↓ 下' },
  { value: 3, label: '← 左' },
]

// ---- 判断是否自定义NPC ----
function isCustomNpc(npc: NPCInfo): boolean {
  return npc.id.startsWith('custom_')
}

// ---- NPC卡片 ----
const NPCCard = memo(function NPCCard({ npc }: { npc: NPCInfo }): JSX.Element {
  const navigate = useNavigate()
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const custom = isCustomNpc(npc)
  const avatarSrc = custom
    ? (npc.portraitUrl || npc.wikiPortraitUrl)
    : npc.wikiPortraitUrl

  return (
    <button
      onClick={() => navigate(`/npc/${npc.id}`)}
      className="themed-bg-card rounded-lg overflow-hidden hover:ring-1 hover:ring-[#555] text-left w-full flex flex-col relative"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 160px' }}
    >
      <div className="aspect-square themed-bg-primary relative overflow-hidden">
        <img src={avatarSrc} alt={npc.displayName}
          className="w-full h-full object-cover object-top"
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.nextElementSibling as HTMLElement; if (fb) fb.style.display = 'flex' }}
        />
        <div className="hidden absolute inset-0 items-center justify-center themed-text-muted themed-bg-primary text-3xl">
          {npc.displayName.charAt(0)}
        </div>
        {npc.canMarry && <span className="absolute top-1.5 right-1.5 text-[11px] px-1.5 py-0.5 rounded-full themed-bg-active themed-text-muted inline-flex items-center gap-0.5"><IconHeart /> {ts('npc.marry')}</span>}
        {custom && (
          <span className="absolute top-1.5 left-1.5 text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
            {ts('npc.custom')}
          </span>
        )}
      </div>
      <div className="p-2.5 text-center">
        <div className="text-[12px] font-medium themed-text-primary truncate">{npc.displayName}</div>
        <div className="text-xs themed-text-dimmed truncate">{npc.birthday}</div>
      </div>
    </button>
  )
})

// ---- 表单输入组件 ----
function Field({ label, value, onChange, placeholder, required, error }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean; error?: string }): JSX.Element {
  return (
    <div>
      <label className="text-sm themed-text-dimmed block mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full themed-bg-primary border rounded px-3 py-2 text-base themed-text-primary placeholder:themed-text-disabled focus:outline-none transition-colors ${
          error ? 'border-red-500 focus:border-red-400' : 'themed-border-primary themed-border-hover'
        }`} />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

// ---- 步骤指示器 ----
function StepIndicator({ current, steps }: { current: number; steps: string[] }): JSX.Element {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
            i < current ? 'bg-emerald-600 text-white' :
            i === current ? 'themed-btn-primary' :
            'themed-bg-active themed-text-dimmed'
          }`}>
            {i < current ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : i + 1}
          </div>
          <span className={`text-sm transition-colors ${i === current ? 'themed-text-primary' : 'themed-text-dimmed'}`}>{s}</span>
          {i < steps.length - 1 && <div className="w-4 h-px themed-border-primary mx-1" />}
        </div>
      ))}
    </div>
  )
}

// ---- 创建NPC弹窗（单步：仅基本信息）----
function CreateNpcModal({ onClose, onCreated }: { onClose: () => void; onCreated: (npc: NPCInfo) => void }): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [birthSeason, setBirthSeason] = useState('spring')
  const [birthDay, setBirthDay] = useState('1')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [canMarry, setCanMarry] = useState(false)
  const [description, setDescription] = useState('')
  const [touched, setTouched] = useState(false)

  const SEASONS = useMemo(() => [
    { value: 'spring', label: t('npc.spring') },
    { value: 'summer', label: t('npc.summer') },
    { value: 'fall', label: t('npc.fall') },
    { value: 'winter', label: t('npc.winter') },
  ], [t])

  const handleCreate = () => {
    setTouched(true)
    if (!name.trim() || !displayName.trim()) return
    const id = 'custom_' + Date.now()
    const seasonLabel = SEASONS.find(s => s.value === birthSeason)?.label || birthSeason
    const dayNum = Math.max(1, Math.min(28, parseInt(birthDay) || 1))
    const birthday = `${seasonLabel}${dayNum}日`

    onCreated({
      id,
      name: name.trim(),
      displayName: displayName.trim(),
      birthday,
      canMarry,
      gender,
      description: description || ts('npc.custom'),
      home: 'Town',
      color: '#888',
      portraitUrl: '',
      wikiPortraitUrl: '',
      birthSeason,
      birthDay: dayNum,
    })
  }

  const canSubmit = name.trim() !== '' && displayName.trim() !== ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="themed-bg-card rounded-xl w-[480px] max-h-[85vh] flex flex-col shadow-2xl border themed-border-primary" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-xl font-bold themed-text-primary">{ts('npc.createNpc')}</h2>
          <button onClick={onClose} className="themed-text-muted hover:themed-text-primary p-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* 提示文字 */}
        <div className="px-6 pb-3">
          <p className="text-[12px] themed-text-dimmed">{ts('npc.createNpcHint')}</p>
        </div>

        {/* 表单内容 */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={ts('npc.englishName')} value={name} onChange={setName} placeholder="Abigail" required error={touched && !name.trim() ? ts('npc.englishName') + ' ' + ts('common.confirm') : undefined} />
              <Field label={ts('npc.chineseName')} value={displayName} onChange={setDisplayName} placeholder="阿比盖尔" required error={touched && !displayName.trim() ? ts('npc.chineseName') + ' ' + ts('common.confirm') : undefined} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm themed-text-dimmed block mb-1">{ts('npc.birthSeason')}</label>
                <select value={birthSeason} onChange={e => setBirthSeason(e.target.value)}
                  className="w-full themed-bg-primary border themed-border-primary rounded px-3 py-2 text-base themed-text-primary focus:outline-none themed-border-hover">
                  {SEASONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm themed-text-dimmed block mb-1">{ts('npc.birthDay')}</label>
                <input type="text" inputMode="numeric" value={birthDay}
                  onChange={e => setBirthDay(e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => { const n = parseInt(birthDay) || 1; setBirthDay(String(Math.max(1, Math.min(28, n)))) }}
                  placeholder="1-28"
                  className="w-full themed-bg-primary border themed-border-primary rounded px-3 py-2 text-base themed-text-primary focus:outline-none themed-border-hover" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm themed-text-dimmed block mb-1">{ts('npc.gender')}</label>
                <select value={gender} onChange={e => setGender(e.target.value as 'male' | 'female')}
                  className="w-full themed-bg-primary border themed-border-primary rounded px-3 py-2 text-base themed-text-primary focus:outline-none themed-border-hover">
                  <option value="male">{ts('npc.male')}</option>
                  <option value="female">{ts('npc.female')}</option>
                </select>
              </div>
              <div>
                <label className="text-sm themed-text-dimmed block mb-1">{ts('npc.marryable')}</label>
                <label className="flex items-center gap-3 cursor-pointer pt-2">
                  <input type="checkbox" checked={canMarry} onChange={e => setCanMarry(e.target.checked)} className="rounded themed-bg-primary themed-border-primary" />
                  <span className="text-base themed-text-secondary">{ts('npc.marryableLabel')}</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm themed-text-dimmed block mb-1">{ts('npc.description')}</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={ts('npc.descriptionPlaceholder')} rows={2}
                className="w-full themed-bg-primary border themed-border-primary rounded px-3 py-2 text-base themed-text-primary placeholder:themed-text-disabled focus:outline-none themed-border-hover resize-none" />
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t themed-border-secondary">
          <button onClick={onClose} className="px-4 py-2 text-base themed-text-muted hover:themed-text-primary rounded-md themed-bg-hover transition-colors">{ts('npc.cancel')}</button>
          <button onClick={handleCreate} disabled={!canSubmit}
            className="px-6 py-2 text-base bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {ts('npc.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- 主页面 ----
export default function NPCPage(): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [showCreate, setShowCreate] = useState(false)
  const { customNpcs, addCustomNpc, removeCustomNpc } = useCustomNpcs()
  const { getFullSnapshot } = useProject()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'male' | 'female' | 'marry'>('all')
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filterButtons = useMemo(() => [
    { k: 'all' as const, l: t('npc.filterAll') },
    { k: 'male' as const, l: t('npc.filterMale') },
    { k: 'female' as const, l: t('npc.filterFemale') },
    { k: 'marry' as const, l: t('npc.filterMarry') },
  ], [t])

  const filteredDefault = useMemo(() => {
    let list = [...defaultNPCs]
    if (filter === 'male') list = list.filter(n => n.gender === 'male')
    if (filter === 'female') list = list.filter(n => n.gender === 'female')
    if (filter === 'marry') list = list.filter(n => n.canMarry)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(n => n.displayName.includes(q) || n.name.toLowerCase().includes(q) || n.birthday.includes(q) || n.description.includes(q))
    }
    return list
  }, [search, filter])

  const filteredCustom = useMemo(() => {
    if (!search.trim()) return customNpcs
    const q = search.toLowerCase()
    return customNpcs.filter(n => n.displayName.includes(q) || n.name.toLowerCase().includes(q))
  }, [search, customNpcs])

  // 从 vanillaNpcOverrides 计算已修改的原版NPC
  const modifiedNpcNames = useMemo(() => {
    const snap = getFullSnapshot()
    return snap.vanillaNpcOverrides ? Object.keys(snap.vanillaNpcOverrides) : []
  }, [getFullSnapshot])

  // 已修改的原版NPC完整信息（从 defaultNPCs 匹配）
  const modifiedDefaultNpcs = useMemo(() => {
    return defaultNPCs.filter(n => modifiedNpcNames.includes(n.name))
  }, [modifiedNpcNames])

  // 已修改的原版NPC搜索筛选
  const filteredModified = useMemo(() => {
    if (!search.trim()) return modifiedDefaultNpcs
    const q = search.toLowerCase()
    return modifiedDefaultNpcs.filter(n =>
      n.displayName.includes(q) || n.name.toLowerCase().includes(q)
    )
  }, [modifiedDefaultNpcs, search])

  const handleDeleteCustom = (id: string) => {
    setDeleteTarget(id)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      removeCustomNpc(deleteTarget)
      toast(ts('toast.deleted'), 'success')
      setDeleteTarget(null)
    }
  }

  return (
    <div className="p-4 md:p-8 min-h-full flex flex-col">
      {/* 顶部标题 */}
      <div className="flex-shrink-0 mb-5">
        <h2 className="text-3xl font-bold themed-text-primary">NPC</h2>
        <p className="text-base themed-text-muted mt-1">{ts('npc.subtitle')}</p>
      </div>

      {/* 搜索 + 筛选 */}
      <div className="flex items-center gap-3 md:gap-3 flex-shrink-0 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-xs min-w-[140px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 themed-text-dimmed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={ts('npc.search')} className="input pl-8" />
        </div>
        <div className="flex gap-1.5">
          {filterButtons.map(f => (
            <button key={f.k} onClick={() => setFilter(f.k === filter ? 'all' : f.k)}
              className={`text-sm px-2.5 py-1 rounded-md transition-colors ${filter === f.k ? 'themed-btn-primary font-medium' : 'themed-text-muted hover:themed-text-primary themed-bg-active'}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* ========== 上半: 我的创作 ========== */}
      <section className="mb-8 flex-shrink-0">
        <h3 className="text-base font-medium themed-text-secondary mb-3 flex items-center gap-3">
          <span className="w-1 h-4 rounded-full bg-emerald-500" />
          {ts('npc.myCreation')}
          {customNpcs.length > 0 && <span className="text-xs themed-text-dimmed ml-1">({customNpcs.length})</span>}
        </h3>
        {customNpcs.length === 0 ? (
          <button onClick={() => setShowCreate(true)}
            className="w-full themed-bg-card border themed-border-hover rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-emerald-600/50 transition-all group">
            <div className="w-14 h-14 rounded-full themed-bg-active flex items-center justify-center group-hover:bg-emerald-900/30 transition-colors">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                <line x1="10" y1="7" x2="14" y2="7"/><line x1="12" y1="5" x2="12" y2="9"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium themed-text-primary">{ts('npc.createCustom')}</p>
              <p className="text-sm themed-text-muted mt-1">{ts('npc.createCustomDesc')}</p>
            </div>
          </button>
        ) : (
          <div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-3 mb-3 contain-layout">
              {filteredCustom.map(npc => (
                <div key={npc.id} className="relative group">
                  <NPCCard npc={npc} />
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCustom(npc.id) }}
                    className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-red-900/80 text-red-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-800">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowCreate(true)}
              className="w-full border border-dashed themed-border-hover rounded-lg p-3 text-sm themed-text-muted hover:border-emerald-600/50 hover:text-emerald-400 transition-colors flex items-center justify-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {ts('npc.createAnother')}
            </button>
          </div>
        )}
      </section>

      {/* ========== 中间: 已修改的原版NPC ========== */}
      {filteredModified.length > 0 && (
        <section className="mb-8 flex-shrink-0">
          <h3 className="text-base font-medium themed-text-secondary mb-3 flex items-center gap-3">
            <span className="w-1 h-4 rounded-full bg-amber-500" />
            {ts('npc.modifiedVanilla')}
            <span className="text-xs themed-text-dimmed ml-1">({filteredModified.length})</span>
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-3 contain-layout">
            {filteredModified.map(npc => (
              <div key={npc.id} className="relative group">
                <NPCCard npc={npc} />
                {/* 已修改角标 */}
                <span className="absolute top-1 left-1 z-10 text-[11px] px-1.5 py-0.5 rounded-full bg-amber-600/80 text-amber-100 border border-amber-500/50">
                  {ts('npc.modified')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========== 下半: 游戏参考NPC ========== */}
      <section className="flex-1">
        <h3 className="text-base font-medium themed-text-secondary mb-3 flex items-center gap-3">
          <span className="w-1 h-4 rounded-full themed-text-dimmed" />
          {ts('npc.reference')}
          <span className="text-xs themed-text-dimmed ml-1">({filteredDefault.length})</span>
        </h3>
        {filteredDefault.length === 0 ? (
          <div className="flex flex-col items-center justify-center themed-text-dimmed gap-3 py-12">
            <p className="text-base">{ts('npc.noMatch')}</p>
            <button onClick={() => { setSearch(''); setFilter('all') }} className="text-sm themed-text-muted hover:themed-text-secondary">{ts('npc.clearFilter')}</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-3 contain-layout">
            {filteredDefault.map(npc => <NPCCard key={npc.id} npc={npc} />)}
          </div>
        )}
      </section>

      {showCreate && <CreateNpcModal onClose={() => setShowCreate(false)} onCreated={(npc) => { addCustomNpc(npc); setShowCreate(false) }} />}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={ts('confirm.deleteTitle')}
        message={ts('confirm.deleteMessage')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
