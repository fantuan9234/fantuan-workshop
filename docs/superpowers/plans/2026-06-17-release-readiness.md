# 饭团工坊上线准备 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补充饭团工坊上线前的用户体验和安全基础设施

**Architecture:** 在现有 Electron + React 架构上增量添加功能。Sentry 集成在 main/renderer 进程分别初始化；欢迎页、空状态、反馈对话框、隐私声明均为新 React 组件；自动备份在 ProjectContext 中扩展保存逻辑。

**Tech Stack:** @sentry/electron (错误上报), React 组件 (UI 增强)

---

### 准备工作：修复 update:check 中的死引用

**Files:**
- Modify: `src/main/index.ts:609-614`

**问题：** `update:check` IPC handler 仍然引用 `UPDATE_SERVER_URL` 这个不存在的常量（自动更新已迁移到 GitHub，但这个 handler 漏改了）。

- [ ] **修复 update:check handler**

将：
```typescript
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: UPDATE_SERVER_URL,
    })
```
改为：
```typescript
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
    })
```

---

### Task 1: 错误上报 (Sentry)

**Files:**
- Modify: `package.json` — 添加 `@sentry/electron` 依赖
- Modify: `src/main/index.ts` — 添加 Sentry main process 初始化
- Modify: `src/renderer/src/main.tsx` — 添加 Sentry renderer 初始化
- Modify: `src/renderer/src/global.d.ts` — 声明 electronAPI 上新增的日志 API

- [ ] **安装 @sentry/electron 依赖**

Run: `npm install @sentry/electron`

Expected: 安装成功，package.json 出现 `@sentry/electron` 依赖

- [ ] **在 main process 初始化 Sentry**

在 `src/main/index.ts` 顶部添加：

```typescript
import * as Sentry from '@sentry/electron/main'

// Sentry 错误上报初始化（仅在打包模式下启用，避免开发环境刷屏）
if (app.isPackaged) {
  Sentry.init({
    dsn: 'https://a6e6ffc412dee2bb97d28593586aaa38@o4509074522701824.ingest.de.sentry.io/4509074524733520',
    environment: 'production',
    release: `fantuan-workshop@${app.getVersion()}`,
  })
}
```

放在 `log.info('=== 饭团工坊 启动 ===')` 之后，`const gotSingleLock` 之前。

- [ ] **在 renderer process 初始化 Sentry**

修改 `src/renderer/src/main.tsx`：

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/electron/renderer'
import App from './App'
import './index.css'

// Sentry 错误上报初始化
Sentry.init({
  dsn: 'https://a6e6ffc412dee2bb97d28593586aaa38@o4509074522701824.ingest.de.sentry.io/4509074524733520',
  environment: 'production',
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

### Task 2: 应用图标

**Files:**
- Create: `src/renderer/public/icon.png`

- [ ] **生成图标文件**

创建一个简单的 PNG 图标（可以使用一个 32x32 的占位图标，建议用简单的 "F" 字母或饭碗图标）。由于工具限制，创建一个最小可用的图标文件：

使用以下方法生成一个纯色 PNG 文件（64x64 蓝色背景）：

```bash
# 如果没有 ImageMagick，可手动创建一个简单的 1x1 像素 PNG
# 或者直接从 build/icons/icon.png 复制
copy build\icons\icon.png src\renderer\public\icon.png
```

---

### Task 3: 首次使用欢迎页

**Files:**
- Create: `src/renderer/src/components/WelcomePage.tsx`
- Modify: `src/renderer/src/App.tsx` — 添加欢迎页路由和首次启动检测
- Modify: `src/renderer/src/i18n/zh.ts` — 添加欢迎页翻译
- Modify: `src/renderer/src/i18n/en.ts` — 添加欢迎页翻译

- [ ] **创建 EmptyState 通用组件**

创建 `src/renderer/src/components/EmptyState.tsx`：

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && (
        <div className="w-16 h-16 rounded-2xl themed-bg-card flex items-center justify-center themed-text-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold themed-text-primary text-center">{title}</h3>
      {description && (
        <p className="text-sm themed-text-dimmed mt-2 text-center max-w-sm">{description}</p>
      )}
      <div className="mt-6 flex items-center gap-3">
        {action && (
          <button onClick={action.onClick}
            className="px-5 py-2 rounded-lg themed-btn-primary text-sm font-medium transition-colors">
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button onClick={secondaryAction.onClick}
            className="px-5 py-2 rounded-lg text-sm themed-text-muted border themed-border-primary hover:themed-border-hover transition-colors">
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **创建 WelcomePage 组件**

创建 `src/renderer/src/components/WelcomePage.tsx`：

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT, asString } from '../i18n'
import { useProject } from '../data/ProjectContext'

export default function WelcomePage(): JSX.Element {
  const navigate = useNavigate()
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const { openProject } = useProject()
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('fantuan-welcome-dismissed')
  })

  const dismissWelcome = () => {
    localStorage.setItem('fantuan-welcome-dismissed', 'true')
    setShowWelcome(false)
  }

  if (!showWelcome) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center themed-bg-content">
      <div className="max-w-lg w-full mx-4">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl themed-bg-card mx-auto mb-4 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="themed-text-primary">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold themed-text-primary">{ts('welcome.title')}</h1>
          <p className="text-sm themed-text-muted mt-2">{ts('welcome.subtitle')}</p>
        </div>

        {/* 操作卡片 */}
        <div className="space-y-3 mb-8">
          <button onClick={() => { dismissWelcome(); navigate('/about') }}
            className="w-full themed-bg-card border themed-border-secondary rounded-xl p-5 flex items-center gap-4 hover:themed-bg-hover transition-colors text-left">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold themed-text-primary">{ts('welcome.about')}</div>
              <div className="text-xs themed-text-dimmed mt-0.5">{ts('welcome.aboutDesc')}</div>
            </div>
            <svg className="themed-text-disabled" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        {/* 快速操作 */}
        <div className="themed-bg-card border themed-border-secondary rounded-xl p-5">
          <h3 className="text-xs font-semibold themed-text-dimmed uppercase tracking-wider mb-4">{ts('welcome.quickStart')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { dismissWelcome(); window.location.hash = '#/'; window.location.reload() }}
              className="p-4 rounded-lg themed-bg-hover transition-colors text-center">
              <svg className="mx-auto mb-2 themed-text-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <div className="text-xs font-medium themed-text-primary">{ts('welcome.newProject')}</div>
            </button>
            <button onClick={() => { dismissWelcome(); openProject() }}
              className="p-4 rounded-lg themed-bg-hover transition-colors text-center">
              <svg className="mx-auto mb-2 themed-text-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
              <div className="text-xs font-medium themed-text-primary">{ts('welcome.openProject')}</div>
            </button>
          </div>
        </div>

        {/* 跳过按钮 */}
        <div className="text-center mt-6">
          <button onClick={dismissWelcome}
            className="text-xs themed-text-dimmed hover:themed-text-muted transition-colors">
            {ts('welcome.skip')}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **修改 App.tsx 添加欢迎页和首次启动检测**

在 `src/renderer/src/App.tsx` 中，在 render 函数中 import 并添加 WelcomePage：

在顶部 imports 区域添加：
```typescript
import WelcomePage from './components/WelcomePage'
```

在 `<RouterProvider router={router} />` 之前添加：
```tsx
<WelcomePage />
```

完整渲染为：
```tsx
export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
    <SettingsProvider>
      <I18nProvider>
      <ToastProvider>
        <ProjectProvider>
        <NpcAssetsProvider>
          <CustomNpcsProvider>
          <CustomItemsProvider>
            <WelcomePage />
            <ForceUpdateModal />
            <ChangelogModal />
            <RouterProvider router={router} />
          </CustomItemsProvider>
          </CustomNpcsProvider>
        </NpcAssetsProvider>
      </ProjectProvider>
      </ToastProvider>
      </I18nProvider>
    </SettingsProvider>
    </ErrorBoundary>
  )
}
```

- [ ] **添加欢迎页 i18n 翻译**

在 `src/renderer/src/i18n/zh.ts` 中添加（在某个合适位置，如 toast 之后）：
```typescript
  welcome: {
    title: '欢迎使用 饭团工坊',
    subtitle: '星露谷物语模组制作工具，无需编程即可创建 Content Patcher 模组',
    about: '关于作者 & 支持',
    aboutDesc: '查看作者信息、社交账号和赞赏支持',
    quickStart: '快速开始',
    newProject: '新建项目',
    openProject: '打开项目',
    skip: '跳过，开始使用',
  },
```

在 `src/renderer/src/i18n/en.ts` 中添加：
```typescript
  welcome: {
    title: 'Welcome to 饭团工坊',
    subtitle: 'Stardew Valley mod making tool — create Content Patcher mods without programming',
    about: 'About Author & Support',
    aboutDesc: 'View author info, social accounts and donation support',
    quickStart: 'Quick Start',
    newProject: 'New Project',
    openProject: 'Open Project',
    skip: 'Skip and start using',
  },
```

---

### Task 4: 各个页面的空状态

**Files:**
- Modify: `src/renderer/src/pages/ItemsPage.tsx` — 空状态
- Modify: `src/renderer/src/pages/QuestsPage.tsx` — 空状态
- Modify: `src/renderer/src/pages/MailsPage.tsx` — 空状态

**注意：** EventsPage 和 NPC page 已经有空状态了，不需要修改。

- [ ] **ItemsPage 空状态**

查看 `src/renderer/src/pages/ItemsPage.tsx` 文件，在自定义物品列表为空时添加 EmptyState 组件。

（需要先读 ItemsPage.tsx 查看当前空状态逻辑）

- [ ] **QuestsPage 空状态**

在 `src/renderer/src/pages/QuestsPage.tsx` 中，在自定义任务列表为空时显示 EmptyState。

（需要先读 QuestsPage.tsx）

- [ ] **MailsPage 空状态**

在 `src/renderer/src/pages/MailsPage.tsx` 中，在自定义邮件列表为空时显示 EmptyState。

（需要先读 MailsPage.tsx）

---

### Task 5: 关于页面完善

**Files:**
- Modify: `src/renderer/src/pages/AboutPage.tsx`
- Modify: `src/renderer/src/i18n/zh.ts` — 添加新翻译键
- Modify: `src/renderer/src/i18n/en.ts` — 添加新翻译键

- [ ] **完善关于页面内容**

修改 `src/renderer/src/pages/AboutPage.tsx`，在顶部标题下方增加：

1. 版本信息（已有 `getAppVersion` API）
2. 开源链接（GitHub）
3. 反馈入口链接

在顶部常量中添加：
```typescript
const GITHUB_URL = 'https://github.com/fantuan9234/fantuan-workshop'
const ISSUES_URL = 'https://github.com/fantuan9234/fantuan-workshop/issues'
```

在"更新检查"section 和"联系方式"section 之间，添加开源链接和反馈入口：

```tsx
{/* 开源 & 反馈 */}
<section className="mb-6">
  <h3 className="text-xs themed-text-dimmed uppercase tracking-wider mb-3">
    {ts('about.links')}
  </h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
      className="themed-bg-card border themed-border-secondary rounded-xl p-5 flex items-center gap-4 transition-all hover:themed-bg-hover group">
      <div className="w-12 h-12 rounded-xl bg-gray-500/15 flex items-center justify-center flex-shrink-0">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#888">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold themed-text-primary">GitHub</div>
        <div className="text-xs themed-text-dimmed mt-0.5 truncate">{ts('about.githubDesc')}</div>
      </div>
      <svg className="themed-text-disabled flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
    </a>
    <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer"
      className="themed-bg-card border themed-border-secondary rounded-xl p-5 flex items-center gap-4 transition-all hover:themed-bg-hover group">
      <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold themed-text-primary">{ts('about.feedback')}</div>
        <div className="text-xs themed-text-dimmed mt-0.5">{ts('about.feedbackDesc')}</div>
      </div>
      <svg className="themed-text-disabled flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
    </a>
  </div>
</section>
```

- [ ] **添加 i18n 翻译**

在 `zh.ts` 的 `about` 部分添加：
```typescript
    links: '开源 & 反馈',
    githubDesc: 'GitHub 开源仓库',
    feedback: '反馈问题',
    feedbackDesc: '提交 Issue 反馈 Bug 或建议',
```

在 `en.ts` 的 `about` 部分添加：
```typescript
    links: 'Open Source & Feedback',
    githubDesc: 'GitHub open source repository',
    feedback: 'Report Issue',
    feedbackDesc: 'Submit an issue for bugs or suggestions',
```

---

### Task 6: 用户反馈入口

**Files:**
- Create: `src/renderer/src/components/FeedbackDialog.tsx`
- Modify: `src/renderer/src/pages/AboutPage.tsx` — 添加反馈按钮
- Modify: `src/preload/index.ts` — 添加反馈相关 IPC
- Modify: `src/main/index.ts` — 添加反馈 IPC handler
- Modify: `src/renderer/src/i18n/zh.ts` — 添加反馈翻译
- Modify: `src/renderer/src/i18n/en.ts` — 添加反馈翻译

- [ ] **创建 FeedbackDialog 组件**

创建 `src/renderer/src/components/FeedbackDialog.tsx`：

```tsx
import { useState, useRef } from 'react'
import { useT, asString } from '../i18n'

interface FeedbackDialogProps {
  open: boolean
  onClose: () => void
}

export default function FeedbackDialog({ open, onClose }: FeedbackDialogProps): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async () => {
    if (!description.trim()) return
    setSending(true)
    try {
      // 收集系统信息
      const version = await window.electronAPI?.getAppVersion().catch(() => 'unknown') || 'unknown'
      const platform = window.electronAPI?.platform || 'unknown'
      const body = [
        `## 问题描述`,
        ``,
        description.trim(),
        ``,
        `---`,
        `**版本**: ${version}`,
        `**操作系统**: ${platform}`,
      ].join('\n')

      // 使用 mailto 打开默认邮件客户端
      const mailto = `mailto:fantuan9234@qq.com?subject=${encodeURIComponent(`[饭团工坊反馈] v${version}`)}&body=${encodeURIComponent(body)}`
      window.open(mailto, '_blank')
      setSent(true)
      setTimeout(() => { onClose(); setSent(false); setDescription('') }, 1500)
    } catch {
      // fallback
    } finally {
      setSending(false)
    }
  }

  if (!open) return <></>

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="themed-bg-card border themed-border-secondary rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold themed-text-primary">{ts('feedback.title')}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg themed-bg-hover flex items-center justify-center themed-text-muted hover:themed-text-primary transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <p className="text-sm themed-text-primary font-medium">{ts('feedback.sent')}</p>
          </div>
        ) : (
          <>
            <p className="text-xs themed-text-dimmed mb-4">{ts('feedback.hint')}</p>
            <textarea
              ref={textareaRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={ts('feedback.placeholder')}
              rows={5}
              className="w-full themed-bg-primary border themed-border-primary rounded-xl p-3 text-sm themed-text-secondary placeholder:themed-text-disabled focus:outline-none themed-border-hover transition-colors resize-none"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button onClick={onClose}
                className="px-4 py-2 text-sm themed-text-muted hover:themed-text-primary transition-colors">
                {ts('common.cancel')}
              </button>
              <button onClick={handleSubmit} disabled={!description.trim() || sending}
                className="px-5 py-2 rounded-lg themed-btn-primary text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? ts('feedback.sending') : ts('feedback.submit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **在 AboutPage 添加反馈按钮**

在 `src/renderer/src/pages/AboutPage.tsx` 顶部添加：
```typescript
import FeedbackDialog from '../components/FeedbackDialog'
```

在组件内添加 state：
```typescript
const [feedbackOpen, setFeedbackOpen] = useState(false)
```

在更新检查 section 的按钮旁边添加反馈按钮：
```tsx
<button onClick={() => setFeedbackOpen(true)}
  className="px-4 py-2 rounded-lg themed-btn-primary text-xs font-medium transition-colors flex-shrink-0">
  {ts('about.feedback')}
</button>
```

在返 JSX 末尾添加：
```tsx
<FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
```

- [ ] **添加反馈 i18n 翻译**

在 `zh.ts` 的 `about` 部分添加：
```typescript
    about: {
      links: '开源 & 反馈',
      githubDesc: 'GitHub 开源仓库',
      feedback: '反馈问题',
      feedbackDesc: '提交 Issue 反馈 Bug 或建议',
      // ... 已有
    },
```

添加新的 `feedback` 命名空间（在 `about` 之后）：
```typescript
  feedback: {
    title: '反馈问题',
    hint: '遇到 Bug 或有建议？请描述你的问题，系统信息会自动附带在邮件中。',
    placeholder: '请描述你的问题或建议...',
    submit: '提交反馈',
    sending: '准备中...',
    sent: '感谢你的反馈！',
  },
```

在 `en.ts` 添加对应内容：
```typescript
  feedback: {
    title: 'Report Issue',
    hint: 'Found a bug or have a suggestion? Describe your issue, system info will be attached automatically.',
    placeholder: 'Describe your issue or suggestion...',
    submit: 'Submit',
    sending: 'Preparing...',
    sent: 'Thanks for your feedback!',
  },
```

---

### Task 7: NSIS 安装脚本检查

**Files:**
- Modify: `build/installer.nsh`

- [ ] **检查并修复 NSIS 脚本**

查看当前 `build/installer.nsh`，目前内容已经比较干净：

```
!macro customInit
  Sleep 500     ; 等待应用进程完全退出
!macroend

!macro customInstall
  ; 安装过程（留空）
!macroend

!macro customUnInit
  nsExec::ExecToStack 'taskkill /F /IM "饭团工坊.exe" /T'
  Pop $0
  nsExec::ExecToStack 'taskkill /F /IM "fantuan-workshop.exe" /T'
  Pop $0
  Sleep 1500
!macroend

!macro customUnInstall
  ; 卸载过程 — 清理 AppData 缓存
  RMDir /r "$APPDATA\fantuan-workshop"
  RMDir /r "$LOCALAPPDATA\fantuan-workshop"
!macroend
```

更新 `customUnInstall` 宏：
```nsis
!macro customUnInstall
  ; 卸载时清理用户数据目录（AppData 中的缓存、日志等残留）
  RMDir /r "$APPDATA\fantuan-workshop"
  RMDir /r "$LOCALAPPDATA\fantuan-workshop"
  ; 清理注册表中的卸载信息（electron-builder 会自动处理大部分，这里做兜底）
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{YOUR_APP_GUID}"
!macroend
```

注意：`{YOUR_APP_GUID}` 需要替换为实际的 app GUID，或者直接删除这行因为 electron-builder 会自动处理。

---

### Task 8: 自动备份

**Files:**
- Modify: `src/renderer/src/data/ProjectContext.tsx` — 在保存时生成备份

- [ ] **在 ProjectContext 中添加自动备份逻辑**

需要先读 ProjectContext.tsx 找到 saveProject 函数的实现，然后在保存成功时生成备份。

找到 `saveProject` 函数，在保存成功后添加：
```typescript
// 自动备份：在项目文件同目录生成 .backup 文件
if (filePath) {
  try {
    const backupDir = join(dirname(filePath), '.stardew-mod-backups')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupName = `${basename(filePath, '.stardew-mod')}.${timestamp}.backup.stardew-mod`
    const backupPath = join(backupDir, backupName)
    await mkdir(backupDir, { recursive: true })
    await writeFile(backupPath, JSON.stringify(fullSnapshot, null, 2), 'utf-8')
    
    // 清理旧备份：只保留最近 10 个
    const backupFiles = await readdir(backupDir)
    const sorted = backupFiles
      .filter(f => f.endsWith('.backup.stardew-mod'))
      .sort()
      .reverse()
    for (const old of sorted.slice(10)) {
      await unlink(join(backupDir, old))
    }
  } catch (e) {
    console.warn('自动备份失败:', e)
    // 备份失败不应阻塞保存
  }
}
```

**注意：** 这是 renderer 进程里的代码，不能使用 Node.js 的 `join`、`dirname`、`basename`、`mkdir`、`writeFile`、`readdir`、`unlink`。需要通过 electronAPI 调用主进程。或者更简单的方法：通过已有的 `writeFile` API 保存。

实际上，需要新增 IPC 方法来实现这个功能。或者简化方案：不用 Node 路径处理，直接在渲染进程用 electronAPI 已有的 `writeFile` 方法。

更实际的方案：在渲染进程中构建一个备份请求，通过 IPC 发送到主进程处理。

简化方案——通过已有 API：

```typescript
// 在 saveProject 成功后，尝试生成备份
try {
  const backupDir = `${dirname(filePath)}\\.stardew-mod-backups`
  // 通过 IPC 创建目录并写入备份
  // 因为 electronAPI 有 mkdir 和 writeFile
  const dirCreated = await window.electronAPI?.mkdir(backupDir)
  if (dirCreated) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupFileName = `${basename(filePath, '.stardew-mod')}.${timestamp}.backup.stardew-mod`
    await window.electronAPI?.writeFile(
      `${backupDir}\\${backupFileName}`,
      JSON.stringify(fullSnapshot, null, 2)
    )
  }
} catch {
  // 备份失败不阻塞保存
}
```

但 `dirname` 和 `basename` 在渲染进程不可用。用户可以通过简单字符串处理来实现：

```typescript
const lastSep = filePath.lastIndexOf('\\')
const dirPath = lastSep >= 0 ? filePath.substring(0, lastSep) : ''
const fileName = lastSep >= 0 ? filePath.substring(lastSep + 1) : filePath
const baseName = fileName.endsWith('.stardew-mod') ? fileName.slice(0, -12) : fileName
```

---

### Task 9: 隐私政策声明

**Files:**
- Create: `src/renderer/src/components/PrivacyModal.tsx`
- Modify: `src/renderer/src/App.tsx` — 添加首次启动检测
- Modify: `src/renderer/src/i18n/zh.ts` — 添加隐私政策翻译
- Modify: `src/renderer/src/i18n/en.ts` — 添加隐私政策翻译

- [ ] **创建 PrivacyModal 组件**

创建 `src/renderer/src/components/PrivacyModal.tsx`：

```tsx
import { useState } from 'react'
import { useT, asString } from '../i18n'

export default function PrivacyModal(): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [show, setShow] = useState(() => {
    return !localStorage.getItem('fantuan-privacy-accepted')
  })

  const accept = () => {
    localStorage.setItem('fantuan-privacy-accepted', 'true')
    setShow(false)
  }

  const decline = () => {
    // 用户拒绝则退出应用
    window.close()
  }

  if (!show) return <></>

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60">
      <div className="themed-bg-card border themed-border-secondary rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl themed-bg-primary mx-auto mb-3 flex items-center justify-center themed-text-muted">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold themed-text-primary">{ts('privacy.title')}</h2>
        </div>

        <div className="themed-bg-secondary rounded-xl p-4 mb-6 max-h-60 overflow-y-auto text-xs themed-text-secondary leading-relaxed space-y-2">
          <p>{ts('privacy.p1')}</p>
          <p>{ts('privacy.p2')}</p>
          <p>{ts('privacy.p3')}</p>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <button onClick={decline}
            className="px-4 py-2 text-sm themed-text-muted hover:themed-text-primary transition-colors">
            {ts('privacy.decline')}
          </button>
          <button onClick={accept}
            className="px-5 py-2 rounded-lg themed-btn-primary text-sm font-medium transition-colors">
            {ts('privacy.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **在 App.tsx 中添加 PrivacyModal**

在 `src/renderer/src/App.tsx` 顶部添加：
```typescript
import PrivacyModal from './components/PrivacyModal'
```

在 render 中 `<WelcomePage />` 之后添加：
```tsx
<PrivacyModal />
```

- [ ] **添加隐私政策 i18n 翻译**

在 `zh.ts` 中添加：
```typescript
  privacy: {
    title: '隐私政策',
    p1: '饭团工坊 重视你的隐私。本工具会通过 Sentry 自动上报应用崩溃和错误信息（包括应用版本、操作系统类型、错误堆栈），以帮助开发者改进应用。',
    p2: '本工具不会收集你的任何个人身份信息、模组编辑内容、游戏存档数据或文件路径。所有数据仅用于错误诊断和功能改进，不会与第三方共享。',
    p3: '点击"同意"继续使用本工具。如不同意，应用将自动关闭。你可以在任何时候通过「关于」页面了解本隐私政策。',
    accept: '同意',
    decline: '不同意并退出',
  },
```

在 `en.ts` 中添加：
```typescript
  privacy: {
    title: 'Privacy Policy',
    p1: '饭团工坊 values your privacy. This tool uses Sentry to automatically report app crashes and errors (including app version, OS type, error stack traces) to help improve the application.',
    p2: 'This tool does not collect any personally identifiable information, mod content, game save data, or file paths. All data is used solely for error diagnosis and feature improvement, and is not shared with third parties.',
    p3: 'Click "Accept" to continue using this tool. If you do not agree, the app will close. You can review this policy anytime from the About page.',
    accept: 'Accept',
    decline: 'Decline & Exit',
  },
```

---

### Implementation Order

建议按以下顺序实施，每完成一个任务验证一次：

1. **准备工作** → 修复 update:check 死引用
2. **Task 1** → Sentry 错误上报
3. **Task 6** → 用户反馈入口（mailto 方案，简单）
4. **Task 5** → 关于页面完善
5. **Task 2** → 应用图标
6. **Task 3** → 欢迎页
7. **Task 4** → 各页面空状态
8. **Task 9** → 隐私政策声明
9. **Task 7** → NSIS 安装脚本检查
10. **Task 8** → 自动备份

每完成一个 Task 运行 `npm run build` 验证能否编译通过。
