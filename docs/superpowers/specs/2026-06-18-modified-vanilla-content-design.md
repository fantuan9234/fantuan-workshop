# 已修改原版内容独立展示 — 设计文档

## 1. 背景与目标

当前所有列表页都采用两段式布局：**「我的创作」**（完全新建的自定义内容）+ **「游戏参考素材」**（全部原版内容）。用户修改原版 NPC/物品后，修改痕迹被淹没在庞大的原版列表中，无法快速定位自己改了什么。

**目标：** 在每个列表页的「我的创作」和「参考素材」之间，插入 **「已修改的原版内容」** 中间区域，把用户编辑过的原版项目单独列出。

## 2. 统一的三段式布局

```
┌─ 我的创作 ──────────────────────┐
│  (完全新建的自定义内容，含创建入口)    │
├─ 已修改的原版 ────────────────────┤
│  (编辑过的原版内容，显示差异/修改状态) │
├─ 游戏参考素材 ────────────────────┤
│  (全部原版内容，用于参考查阅)        │
└──────────────────────────────────┘
```

- 每个区域独立，支持筛选/分页
- 已修改区域为空（没有做过任何原版修改）时不显示
- 中间区域的卡片样式与其他区域一致，但加「已修改」角标（橙色/琥珀色）

## 3. 各页面实现方案

### 3.1 NPC 页面（NPCPage.tsx）

**当前状态：** `useCustomNpcsProvider` 已经在快照中保存了 `vanillaNpcOverrides: Record<string, VanillaNpcOverride>`，但页面只展示自定义NPC和全部默认NPC。

**改动：**
- 从 `getFullSnapshot().vanillaNpcOverrides` 读取已修改的原版NPC列表
- 这些NPC的 `id` 以 `vanilla_` 为前缀，对应 `defaultNPCs` 中的同名NPC
- 中间区域卡片跳转到 `/npc/原版NPC名`（已有编辑器）
- 卡片右上角加橙色「已修改」角标

### 3.2 物品页面（ItemsPage.tsx）

**当前状态：** 无 `vanillaItemOverrides`，点击原版物品会创建一整个新的CustomItem副本。

**改动：**
- 在 ProjectContext 中新增 `vanillaItemOverrides: Record<string, VanillaItemOverride>`
- `VanillaItemOverride` 接口：包含可修改字段（`displayName`, `description`, `price`, `type`, `category`, `edibility`, `texture`, `spriteIndex` 等）
- 点击原版物品改为**进入原版物品编辑器**（而非创建副本），保存时写入 `vanillaItemOverrides`
- 中间区域显示 `vanillaItemOverrides` 中记录的所有已修改原版物品
- 原始参考列表保持全部原版物品不变

### 3.3 事件页面（EventsPage.tsx）

**当前状态：** 从解包数据加载 `VanillaEvent[]`，自定义事件存 `events` 快照。无修改原版机制。

**改动：**
- 在 ProjectContext 中新增 `vanillaEventOverrides: Record<string, VanillaEventOverride>`
- 原版事件编辑入口：点击参考事件卡片进入编辑器，修改后保存到 `vanillaEventOverrides`
- 中间区域展示已修改的原版事件（从 `vanillaEventOverrides` 的 key 匹配 `vanillaEvents`）

### 3.4 任务页面（QuestsPage.tsx）

**当前状态：** 参考任务来自 `referenceQuests` 数据文件，自定义任务存 `quests` 快照。

**改动：**
- 在 ProjectContext 中新增 `questOverrides: Record<string, QuestOverride>`
- 参考任务卡片增加编辑入口，修改字段保存到 `questOverrides`
- 中间区域展示已修改的参考任务

### 3.5 地图页面（MapsPage.tsx）

**当前状态：** 自定义地图 + 地图覆盖补丁（MapOverlayPatch），补丁本身就是对原版地图的修改。

**改动：**
- 已有 `mapOverlays` 快照，在地图列表的中间区域展示有覆盖补丁的原版地图
- 从 `mapOverlays` 中提取唯一目标地图名，展示为「已修改的原版地图」
- 卡片显示覆盖补丁数量

### 3.6 邮件页面（MailsPage.tsx）

**当前状态：** 无原版邮件列表展示，只有自定义邮件 + 参考模板。

**改动：**
- 无原版邮件列表可修改，此页不增加中间区域
- 后续如果添加原版邮件列表时再扩展

## 4. 新增数据类型

### 4.1 VanillaItemOverride

```typescript
interface VanillaItemOverride {
  id: string            // 原版物品ID
  displayName?: string  // 修改后的显示名
  description?: string  // 修改后的描述
  price?: number        // 修改后的价格
  type?: string         // 修改后的类型
  category?: number     // 修改后的类别
  edibility?: number    // 修改后的食用值
  texture?: string      // 自定义贴图路径
  spriteIndex?: number  // 自定义精灵索引
}
```

### 4.2 VanillaEventOverride

```typescript
interface VanillaEventOverride {
  id: string       // 原版事件ID
  title?: string   // 修改后的标题
  script?: string  // 修改后的事件脚本
}
```

### 4.3 QuestOverride

```typescript
interface QuestOverride {
  id: string
  displayName?: string
  description?: string
}
```

## 5. 样式规范

- 中间区域标题栏使用**橙色/琥珀色**色系（<span class="w-1.5 h-5 rounded-full bg-amber-500" />），区别于「我的创作」的白色和「参考素材」的灰色
- 已修改角标：橙底白字 `bg-amber-600/80 text-amber-100`
- 卡片交互：与同页其他卡片一致

## 6. 实现优先级

1. **NPC 页面** — 改动最小（已有 `vanillaNpcOverrides`），最快见效
2. **物品页面** — 需要新增 `vanillaItemOverrides` + 编辑器改造
3. **事件页面** — 新增 `vanillaEventOverrides` + 编辑器入口
4. **任务页面** — 新增 `questOverrides` + 编辑器入口
5. **地图页面** — 利用现有 `mapOverlays` 数据
