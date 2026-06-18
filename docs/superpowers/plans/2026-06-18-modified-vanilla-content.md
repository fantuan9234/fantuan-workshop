# 已修改原版内容独立展示 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在所有内容列表页的「我的创作」和「参考素材」之间插入「已修改的原版内容」中间区域

**Architecture:** 分段式页面布局改造。利用 ProjectContext 的 snapshot 机制存储各类型的 override 数据。NPC 页改动最小（已有 `vanillaNpcOverrides`），物品页需新增 `vanillaItemOverrides` + 改为原位编辑模式，其他页面按优先级依次实现。

**Tech Stack:** React/TypeScript, ProjectContext snapshot, tailwind CSS

---

## 文件映射

| 文件 | 改动类型 | 职责 |
|------|----------|------|
| `src/renderer/src/data/ProjectContext.tsx` | 修改 | 向 `ProjectSnapshot` 接口追加 `vanillaItemOverrides`, `vanillaEventOverrides`, `questOverrides`，并在 `getFullSnapshot` / `newProject` 中处理 |
| `src/renderer/src/pages/NPCPage.tsx` | 修改 | NPCPage 组件——读取 `vanillaNpcOverrides`，在中间渲染已修改的原版NPC |
| `src/renderer/src/pages/ItemsPage.tsx` | 修改 | ItemsPage 组件——新增 `vanillaItemOverrides` 注册/修改/显示，改变点击原版物品行为为原位编辑 |
| `src/renderer/src/pages/events/EventEditor.tsx` | 修改 | EventEditor——增加保存到 `vanillaEventOverrides` 的逻辑 |
| `src/renderer/src/pages/EventsPage.tsx` | 修改 | EventsPage 组件——新增 `vanillaEventOverrides` 注册/显示 |
| `src/renderer/src/pages/QuestsPage.tsx` | 修改 | QuestsPage 组件——新增 `questOverrides` 注册/显示 |
| `src/renderer/src/pages/MapsPage.tsx` | 修改 | MapsPage 组件——从已有 `patches`（注册为 `maps` snapshot）提取被修改的原版地图名并展示 |

---

### Task 1: 向 ProjectSnapshot 接口追加新 override 字段

**Files:**
- Modify: `src/renderer/src/data/ProjectContext.tsx`

- [ ] **Step 1: 追加接口字段**

在 `ProjectSnapshot` 接口中，在 `vanillaNpcOverrides` 后面（第35行之后）追加三行新字段：

```typescript
  /** 原版NPC的覆盖数据（日程、对话、礼物偏好等） */
  vanillaNpcOverrides: Record<string, VanillaNpcOverride>
  /** 原版物品的覆盖数据 */
  vanillaItemOverrides: Record<string, Record<string, unknown>>
  /** 原版事件的覆盖数据 */
  vanillaEventOverrides: Record<string, Record<string, unknown>>
  /** 原版任务的覆盖数据 */
  questOverrides: Record<string, Record<string, unknown>>
  customNpcs: unknown[]
```

- [ ] **Step 2: 在 getFullSnapshot 中收集新字段**

在 `getFullSnapshot` 函数体（约第208行附近）追加：

```typescript
      vanillaItemOverrides: (collected.vanillaItemOverrides as ProjectSnapshot['vanillaItemOverrides']) || {},
      vanillaEventOverrides: (collected.vanillaEventOverrides as ProjectSnapshot['vanillaEventOverrides']) || {},
      questOverrides: (collected.questOverrides as ProjectSnapshot['questOverrides']) || {},
```

- [ ] **Step 3: 在 newProject 的 emptySnap 中初始化空值**

在 `emptySnap` 对象（约第523行附近）追加：

```typescript
      vanillaNpcOverrides: {},
      vanillaItemOverrides: {},
      vanillaEventOverrides: {},
      questOverrides: {},
      customNpcs: [],
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/data/ProjectContext.tsx
git commit -m "feat: add vanillaItemOverrides/vanillaEventOverrides/questOverrides to ProjectSnapshot"
```

---

### Task 2: NPCPage — 已修改的原版NPC区域

**Files:**
- Modify: `src/renderer/src/pages/NPCPage.tsx`

NPCPage 已有自定义NPC（id 以 `custom_` 开头）和默认NPC（`defaultNPCs`）。`vanillaNpcOverrides` 已存在于 project snapshot（key 为 NPC 的英文名），但页面未展示。

- [ ] **Step 1: 在 NPCPage 组件中获取 vanillaNpcOverrides**

在 `NPCPage` 函数组件顶部，添加对 `getFullSnapshot` 的引用：

```typescript
  const { customNpcs, addCustomNpc, removeCustomNpc } = useCustomNpcs()
  const { getFullSnapshot } = useProject()
```

并注释掉已有的仅 `useCustomNpcs()` 导入（如果需要）。

- [ ] **Step 2: 计算已修改的原版NPC列表**

在 `search` 的 `useMemo` 之前（约第266行），添加 `modifiedDefaultNpcs` 和 `filteredModified` 计算：

```typescript
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
```

- [ ] **Step 3: 在 render 的中间插入「已修改的原版NPC」区域**

在 `<section className="mb-8 flex-shrink-0">`（我的创作区域）和 `<section className="flex-1">`（参考素材区域）之间插入：

```tsx
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
```

- [ ] **Step 4: 添加 i18n key**

当前 NPCPage 使用 `npc.*` 开头的 i18n key。需要添加新 key。在 i18n 资源文件中（如 `src/renderer/src/i18n/zh.json` 等）添加：

```json
"npc.modifiedVanilla": "已修改的原版NPC",
"npc.modified": "已修改"
```

并相应地在英文资源中添加英文翻译。

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/pages/NPCPage.tsx src/renderer/src/i18n/
git commit -m "feat: add modified vanilla NPC section to NPCPage"
```

---

### Task 3: ItemsPage — 已修改的原版物品区域

**Files:**
- Modify: `src/renderer/src/pages/ItemsPage.tsx`

ItemsPage 需新增 `vanillaItemOverrides` 支持。当前点击原版物品（`handleVanillaClick`）会创建 CustomItem 副本。改为：点击时在原位修改，保存到 `vanillaItemOverrides`。

- [ ] **Step 1: 在 ItemsPage 组件中注册 vanillaItemOverrides snapshot**

在 `ItemsPage` 组件函数体顶部，追加 `registerSnapshot` / `mutateSnapshot` 调用：

```typescript
  const { registerSnapshot, mutateSnapshot, getFullSnapshot } = useProject()
  const [vanillaItemOverrides, setVanillaItemOverrides] = useState<Record<string, Record<string, unknown>>>({})
  const vanillaOverridesRef = useRef(vanillaItemOverrides)
  vanillaOverridesRef.current = vanillaItemOverrides

  useEffect(() => {
    return registerSnapshot('vanillaItemOverrides',
      () => vanillaOverridesRef.current,
      (data: unknown) => { setVanillaItemOverrides((data as Record<string, Record<string, unknown>>) || {}) }
    )
  }, [registerSnapshot])
```

- [ ] **Step 2: 计算已修改的原版物品列表**

在 `filteredItems` 之后（约第121行），添加：

```typescript
  // 已修改的原版物品
  const modifiedVanillaIds = useMemo(() => Object.keys(vanillaItemOverrides), [vanillaItemOverrides])
  const modifiedVanillaItems = useMemo(() => {
    return vanillaItems.filter(i => modifiedVanillaIds.includes(i.id))
  }, [vanillaItems, modifiedVanillaIds])
```

- [ ] **Step 3: 修改 handleVanillaClick 为原位编辑**

将原来的 `handleVanillaClick`（约第161-179行）改为将修改保存到 `vanillaItemOverrides` 并跳转到编辑器：

```typescript
  /** 点击原版物品：以该物品为模板创建自定义物品，直接进入编辑器 */
  const handleVanillaClick = (item: VanillaItem) => {
    // 写入 vanillaItemOverrides（标记该物品已被修改）
    mutateSnapshot<Record<string, Record<string, unknown>>>('vanillaItemOverrides', prev => ({
      ...(prev || {}),
      [item.id]: { displayName: item.displayName, description: item.description, price: item.price }
    }))
    // 创建基于原版的 CustomItem 作为编辑模板
    const newItem: CustomItem = {
      id: `vanilla_${item.id}_${Date.now()}`,
      name: item.name,
      displayName: item.displayName,
      description: item.description,
      dataType: 'object',
      price: item.price,
      imageUrl: '',
      color: '#888',
      canGift: true,
      objectType: item.type || 'Basic',
      objectCategory: item.category ?? 0,
      edibility: -300,
    }
    addCustomItem(newItem)
    toast(`${ts('items.customCreated')}「${item.displayName}」`, 'success')
    navigate(`/items/${newItem.id}`, { state: { newItem, allItems: [...customItems, newItem] } })
  }
```

- [ ] **Step 4: 在 render 中插入「已修改的原版物品」区域**

在参考素材 section 上方（约第316行之前），插入：

```tsx
      {/* ========== 中间: 已修改的原版物品 ========== */}
      {modifiedVanillaItems.length > 0 && (
        <section>
          <h3 className="text-base font-semibold themed-text-secondary mb-4 flex items-center gap-3">
            <span className="w-1.5 h-5 rounded-full bg-amber-500" />
            {ts('items.modifiedVanilla')}
            <span className="text-sm themed-text-dimmed font-normal">({modifiedVanillaItems.length})</span>
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 mb-6">
            {modifiedVanillaItems.map(item => (
              <div key={item.id} onClick={() => handleVanillaClick(item)}
                className="themed-bg-secondary rounded-lg p-2 themed-bg-card-hover transition-colors text-center cursor-pointer group border border-amber-500/30 hover:border-amber-500/60 relative"
                title={`${item.displayName}\n${item.description}\n${ts('items.price')}: ${item.price}g`}>
                <div className="w-9 h-9 rounded-lg themed-bg-card flex items-center justify-center mx-auto mb-1 overflow-hidden">
                  {imageCache[item.id] ? (
                    <img src={imageCache[item.id]} alt={item.displayName} className="w-9 h-9 object-contain" style={{ imageRendering: 'pixelated' }} />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    </svg>
                  )}
                </div>
                <p className="text-xs themed-text-secondary truncate leading-tight">{item.displayName}</p>
                <p className="text-[11px] themed-text-disabled">{item.price}g</p>
                <span className="absolute top-0.5 right-0.5 text-[10px] px-1 py-0.5 rounded-full bg-amber-600/80 text-amber-100">
                  {ts('items.modified')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
```

- [ ] **Step 5: 添加 i18n key**

```json
"items.modifiedVanilla": "已修改的原版物品",
"items.modified": "已修改"
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/pages/ItemsPage.tsx src/renderer/src/i18n/
git commit -m "feat: add modified vanilla items section to ItemsPage"
```

---

### Task 4: EventsPage — 已修改的原版事件区域

**Files:**
- Modify: `src/renderer/src/pages/EventsPage.tsx`
- Modify: `src/renderer/src/pages/events/EventEditor.tsx`

EventsPage 从解包数据加载 `VanillaEvent[]`，自定义事件存 `events` snapshot。需新增 `vanillaEventOverrides` 记录修改。

- [ ] **Step 1: 注册 vanillaEventOverrides snapshot**

在 EventsPage 中 `registerSnapshot('events')` 附近追加：

```typescript
  const [vanillaEventOverrides, setVanillaEventOverrides] = useState<Record<string, Record<string, unknown>>>({})
  const vanillaEventOverridesRef = useRef(vanillaEventOverrides)
  vanillaEventOverridesRef.current = vanillaEventOverrides
  useEffect(() => {
    return registerSnapshot('vanillaEventOverrides',
      () => vanillaEventOverridesRef.current,
      (data: unknown) => { if (data) setVanillaEventOverrides(data as Record<string, Record<string, unknown>>) }
    )
  }, [registerSnapshot])
```

- [ ] **Step 2: 计算已修改的原版事件列表**

在 `filteredEvents` 之后添加：

```typescript
  const modifiedVanillaEventIds = useMemo(() => Object.keys(vanillaEventOverrides), [vanillaEventOverrides])
  const modifiedVanillaEvents = useMemo(() => {
    return vanillaEvents.filter(e => modifiedVanillaEventIds.includes(e.id))
  }, [vanillaEvents, modifiedVanillaEventIds])
```

- [ ] **Step 3: 在 render 中插入「已修改的原版事件」区域**

在「我的创作」section 和「参考素材」section 之间插入（约第304行之后）。内容参考 ItemsPage 模式，使用 EventCard 样式展示，加 amber 角标。

- [ ] **Step 4: 添加 i18n key**

```json
"events.modifiedVanilla": "已修改的原版事件",
"events.modified": "已修改"
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/pages/EventsPage.tsx src/renderer/src/i18n/
git commit -m "feat: add modified vanilla events section to EventsPage"
```

---

### Task 5: QuestsPage — 已修改的原版任务区域

**Files:**
- Modify: `src/renderer/src/pages/QuestsPage.tsx`

- [ ] **Step 1: 注册 questOverrides snapshot**

在 `registerSnapshot('quests')` 附近添加类似 EventsPage 的 snapshot 注册。

- [ ] **Step 2: 计算已修改的原版任务列表**

筛选 `referenceQuests` 中 ID 出现在 `questOverrides` 里的任务。

- [ ] **Step 3: 在 render 中插入中间区域**

在「我的创作」section 和「参考素材」section 之间插入。

- [ ] **Step 4: 添加 i18n key**

- [ ] **Step 5: Commit**

---

### Task 6: MapsPage — 已修改的原版地图区域

**Files:**
- Modify: `src/renderer/src/pages/MapsPage.tsx`

MapsPage 已有 `patches`（MapOverlayPatch[]）存储在 `maps` snapshot 中。每个 patch 的 `target` 字段指向原版地图名。直接从已有数据提取即可，无需新增 snapshot 字段。

- [ ] **Step 1: 计算有覆盖补丁的原版地图**

在 MapsPage 中找到 `patches` 来源，添加：

```typescript
  // 已修改的原版地图（有覆盖补丁的）
  const modifiedVanillaMaps = useMemo(() => {
    if (!gameMaps || !patches) return []
    const patchedMapNames = new Set(patches.map(p => p.target))
    return gameMaps.filter(m => patchedMapNames.has(m.name))
  }, [gameMaps, patches])
```

- [ ] **Step 2: 在 render 中插入中间区域**

在 MapsPage 的「我的创作」区域和「参考素材」区域之间插入已修改地图区域。每张卡片显示地图名 + 覆盖补丁数量。

- [ ] **Step 3: Commit**

---

### Task 7: 数据持久化验证

- [ ] **Step 1: 手动测试**

打开应用，执行以下操作：
1. 打开 NPC 页面，编辑一个原版NPC的对话/行程，保存
2. 刷新页面（或关闭重开），确认该NPC出现在「已修改的原版NPC」区域
3. 打开物品页面，点击一个原版物品进入编辑，修改后保存
4. 确认该物品出现在「已修改的原版物品」区域
5. 打开事件/任务页面，重复验证

- [ ] **Step 2: 保存/加载项目验证**

1. 保存当前项目
2. 关闭应用
3. 通过文件打开项目
4. 确认所有 override 数据被正确恢复，修改内容仍然出现在中间区域
