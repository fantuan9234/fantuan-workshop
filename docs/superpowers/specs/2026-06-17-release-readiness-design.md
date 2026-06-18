# 饭团工坊上线准备方案

## 概述

为饭团工坊 v0.1.x 正式面向公众发布做准备，补充当前缺失的用户体验和安全基础设施。

## 优先级分层

### P0 — 必须优先完成

#### 1. 错误上报 (Sentry)

**需求：**
- 在 Electron main process 和 renderer process 分别集成 Sentry SDK
- 捕获未捕获异常、Promise rejection、渲染进程崩溃
- 上报附带：应用版本、操作系统、错误堆栈、触发时的页面路由
- 免费额度：Sentry 免费计划每月 5k 事件，足够个人项目使用

**关键细节：**
- main process：`@sentry/electron/main`
- renderer process：`@sentry/electron/renderer`
- DSN 从环境变量读取，打包时注入（或硬编码 DSN，Sentry DSN 不属于敏感信息）
- 不上报用户的实际 mod 编辑内容（仅元数据）

**体验：**
- 用户无感知静默上报
- 如果用户愿意，可在"关于"页面提供"手动发送反馈"按钮附带日志

---

#### 2. 首次使用欢迎页 & 空状态引导

**需求：**
- 启动时检测是否为首次运行（无项目文件、无已配置游戏目录）
- 显示欢迎页面，包含：
  - 快速操作：选择游戏目录、新建项目、打开已有项目、查看教程
  - 简要的产品定位介绍
- 各编辑页面 (NPC/事件/物品/地图等) 当无数据时显示空状态提示
- 首页（HomePage）改为仪表盘风格：最近项目、快速入口、使用提示

**关键细节：**
- 使用 localStorage 记录"是否已引导"
- 引导页面可跳过，可在帮助菜单中重新打开
- 空状态每个页面不同，但复用同一个 `EmptyState` 组件

---

#### 3. 应用图标

**需求：**
- `src/renderer/public/icon.png` — 重建已删除的文件
- 如果暂时没有设计资源，可以先用一个占位图标

---

### P1 — 强烈建议

#### 4. 用户反馈入口

**需求：**
- 菜单/关于页面增加"反馈问题"入口
- 反馈对话框：
  - 输入框：问题描述
  - 可选：上传截图（粘贴或文件选择）
  - 附加信息：应用版本、操作系统、操作日志（最近 200 条 console）
  - 提交方式：调用 GitHub Issues API / mailto 链接
- 简单 MVP 版本：直接 mailto 链接（可快速上线）

**关键细节：**
- 使用 `shell.openExternal` 打开 `mailto:` 或 GitHub Issues 预填链接
- GitHub Issues API 方式需要 token，简单起见先用 mailto

---

#### 5. NSIS 安装脚本检查

**需求：**
- 检查 `build/installer.nsh` 是否存在硬编码路径、注册表残留清理不足的问题
- 确保卸载时清理：安装目录、AppData 缓存、注册表写入
- 差异化更新（differentialPackage）配置是否正确

---

#### 6. 关于页面完善

**需求：**
- 显示：版本号、构建时间、Git commit hash
- 更新日志按钮（弹窗展示 changelog）
- 开源链接（跳转 GitHub）
- 反馈入口
- 作者信息 / 捐赠入口（如果有）
- 检查更新按钮

---

### P2 — 锦上添花

#### 7. 自动更新迁移至 GitHub Releases

**需求：**
- 修改 `electron-builder.yml` 的 publish provider 从 `generic` 切换为 `github`
- 移除 `electron-updater` 中手动设置的 `setFeedURL` 调用
- 发布脚本适配 GitHub Releases
- 参考已有设计文档：`2026-06-17-switch-to-github-updates-design.md`

---

#### 8. 自动备份

**需求：**
- 编辑器支持自动保存备份：每次保存项目时，在 `.stardew-mod` 同目录下生成时间戳备份
- 限制保留最近 5-10 个备份
- 用户可在设置中关闭

---

#### 9. 隐私政策声明

**需求：**
- 首次启动时弹窗显示隐私政策
- 说明：收集哪些数据（错误信息、应用版本、OS）、如何存储、如何删除
- 用户可选择"同意"或"退出（退出应用）"
- 隐私政策内容从本地或在线 URL 加载

---

## 技术方案

### 错误上报架构

```
┌────────────────────────────────────────────────┐
│                Main Process                     │
│  @sentry/electron/main                          │
│  ┌─────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ init()  │→ │uncaught  │→ │Electron crash│  │
│  │         │  │Exception  │  │reporter      │  │
│  └─────────┘  └──────────┘  └──────────────┘  │
└────────────────────┬───────────────────────────┘
                     │ IPC event forwarding
┌────────────────────▼───────────────────────────┐
│              Renderer Process                   │
│  @sentry/electron/renderer                      │
│  ┌─────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ init()  │→ │React err │→ │User feedback │  │
│  │         │  │boundary  │  │manual report │  │
│  └─────────┘  └──────────┘  └──────────────┘  │
└────────────────────────────────────────────────┘
                     │
                     ▼
              Sentry Dashboard
```

### 欢迎页架构

```
App.tsx
  │
  ├── isFirstRun? (localStorage)
  │     ├── true  → WelcomePage (全屏引导, 可跳过)
  │     └── false → 正常路由
  │
  └── Header "帮助" 菜单 → "重新打开欢迎引导"

HomePage.tsx (改造为仪表盘)
  ├── 最近项目列表 (recentProjects from localStorage)
  ├── 快速操作卡片：新建项目 / 打开项目 / 选择游戏目录
  └── 使用提示 / 快捷技巧轮播
```

### 空状态组件

```
components/EmptyState.tsx
  Props:
    - icon: ReactNode (可选图标)
    - title: string
    - description: string
    - action?: { label: string, onClick: () => void }
    - secondaryAction?: { label: string, onClick: () => void }

使用场景:
  - NPCPage: "暂无自定义NPC，点击创建第一个"
  - EventsPage: "暂无自定义事件..."
  - ItemsPage: "暂无自定义物品..."
  - 等等
```

### 用户反馈对话框

```
components/FeedbackDialog.tsx
  ├── 问题描述 (textarea)
  ├── 截图 (粘贴或文件选择, base64)
  ├── 系统信息 (自动收集: 版本, OS, 架构)
  ├── 日志预览 (最近200行, 可选包含)
  └── 提交按钮
        ├── MVP: mailto:fantuan9234@example.com?subject=...&body=...
        └── 未来: GitHub Issues API
```

## 文件变更清单

### 新增文件
- `src/renderer/src/components/EmptyState.tsx` — 空状态组件
- `src/renderer/src/components/FeedbackDialog.tsx` — 反馈对话框
- `src/renderer/src/components/WelcomePage.tsx` — 欢迎引导页
- `src/renderer/src/components/PrivacyModal.tsx` — 隐私政策弹窗
- `src/renderer/src/public/icon.png` — 应用图标（重建）

### 修改文件
- `src/main/index.ts` — Sentry main process 集成
- `src/preload/index.ts` — 新增反馈相关 API
- `src/renderer/src/main.tsx` — Sentry renderer 集成 + 首次启动检测
- `src/renderer/src/App.tsx` — 路由调整，增加欢迎页路由
- `src/renderer/src/pages/HomePage.tsx` — 改造为仪表盘风格
- `src/renderer/src/pages/AboutPage.tsx` — 完善信息
- `src/renderer/src/pages/npc/NPCPage.tsx` — 空状态
- `src/renderer/src/pages/events/EventsPage.tsx` — 空状态
- `src/renderer/src/pages/items/ItemsPage.tsx` — 空状态
- `src/renderer/src/pages/maps/MapsPage.tsx` — 空状态
- `src/renderer/src/pages/quests/QuestsPage.tsx` — 空状态
- `src/renderer/src/pages/mails/MailsPage.tsx` — 空状态
- `build/installer.nsh` — 检查并修复
- `electron-builder.yml` — GitHub Releases 迁移（P2）
- `scripts/publish-dual.js` — 根据发布方案调整

## 不做的范围

- 不添加用户登录/账户系统（YAGNI）
- 不添加使用统计/遥测（用户隐私优先，除 Sentry 错误上报外不收集行为数据）
- 不重构现有编辑功能
- 不做 Mac/Linux 平台适配