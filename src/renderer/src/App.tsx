import { lazy, Suspense, useEffect } from 'react'
import { createHashRouter, RouterProvider, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { NpcAssetsProvider } from './data/useNpcAssets'
import { CustomNpcsProvider } from './data/useCustomNpcs'
import { CustomItemsProvider } from './data/useCustomItems'
import { ProjectProvider } from './data/ProjectContext'
import { SettingsProvider } from './data/useSettings'
import { I18nProvider, useT, asString } from './i18n'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import UpdateCenter from './components/UpdateCenter'
import ChangelogModal from './components/ChangelogModal'
import WelcomePage from './components/WelcomePage'
import PrivacyModal from './components/PrivacyModal'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'

// 懒加载非首屏页面，减少首屏加载时间
const EventsPage = lazy(() => import('./pages/EventsPage'))
const EventEditor = lazy(() => import('./pages/events/EventEditor'))
const MapsPage = lazy(() => import('./pages/MapsPage'))
const MapEditor = lazy(() => import('./pages/maps/MapEditor'))
const ItemsPage = lazy(() => import('./pages/ItemsPage'))
const ItemEditor = lazy(() => import('./pages/items/ItemEditor'))
const NPCPage = lazy(() => import('./pages/NPCPage'))
const NPCDetailPage = lazy(() => import('./pages/npc/NPCDetailPage'))
const NPCPortraitEditor = lazy(() => import('./pages/npc/NPCPortraitEditor'))
const NPCSpriteEditor = lazy(() => import('./pages/npc/NPCSpriteEditor'))
const QuestsPage = lazy(() => import('./pages/QuestsPage'))
const QuestEditor = lazy(() => import('./pages/quests/QuestEditor'))
const MailsPage = lazy(() => import('./pages/MailsPage'))
const MailEditor = lazy(() => import('./pages/mails/MailEditor'))
const XnbPreviewPage = lazy(() => import('./pages/XnbPreviewPage'))
const ExportPage = lazy(() => import('./pages/ExportPage'))
const ModSettingsPage = lazy(() => import('./pages/ModSettingsPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))

function LazyFallback(): JSX.Element {
  // 加载指示器：居中旋转动画，避免懒加载时出现黑屏
  return (
    <div className="h-full themed-bg-content flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// 预加载所有懒加载模块，空闲时执行，后续切换无延迟
const preloadModules = () => {
  const loaders = [
    () => import('./pages/EventsPage'),
    () => import('./pages/events/EventEditor'),
    () => import('./pages/MapsPage'),
    () => import('./pages/maps/MapEditor'),
    () => import('./pages/ItemsPage'),
    () => import('./pages/items/ItemEditor'),
    () => import('./pages/NPCPage'),
    () => import('./pages/npc/NPCDetailPage'),
    () => import('./pages/npc/NPCPortraitEditor'),
    () => import('./pages/npc/NPCSpriteEditor'),
    () => import('./pages/QuestsPage'),
    () => import('./pages/quests/QuestEditor'),
    () => import('./pages/MailsPage'),
    () => import('./pages/mails/MailEditor'),
    () => import('./pages/XnbPreviewPage'),
    () => import('./pages/ExportPage'),
    () => import('./pages/ModSettingsPage'),
    () => import('./pages/AboutPage'),
  ]
  // 逐个预加载，避免同时发起过多请求
  loaders.reduce<Promise<unknown>>((prev, loader) => prev.then(() => loader()), Promise.resolve())
}

function PreloadTrigger(): null {
  useEffect(() => {
    // 首屏渲染完成后，空闲时预加载所有模块
    const id = requestIdleCallback(() => { preloadModules() }, { timeout: 3000 })
    return () => cancelIdleCallback(id)
  }, [])
  return null
}

/** 404 页面 */
function NotFoundPage(): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const navigate = useNavigate()
  return (
    <div className="h-full flex flex-col items-center justify-center themed-bg-content p-8">
      <div className="w-20 h-20 rounded-2xl themed-bg-card flex items-center justify-center mb-6">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold themed-text-primary mb-2">{ts('notFound.title')}</h2>
      <p className="text-base themed-text-muted mb-6 text-center max-w-md">{ts('notFound.message')}</p>
      <button
        onClick={() => navigate('/')}
        className="px-5 py-2.5 themed-btn-primary rounded-lg text-base font-medium transition-colors"
      >
        {ts('notFound.backHome')}
      </button>
    </div>
  )
}

/**
 * 全局模态框容器。
 * 放在路由树根节点，确保可以访问 Router context (useNavigate 等)。
 */
function GlobalModals(): JSX.Element {
  return (
    <>
      <WelcomePage />
      <PrivacyModal />
      <UpdateCenter />
      <ChangelogModal />
      <Outlet />
    </>
  )
}

/**
 * 把所有懒加载页面统一包到 Suspense 里。
 * createHashRouter 路由表的 element 必须是同步组件，
 * 所以新增一层路由壳子挂载 Suspense + Outlet。
 * 每个页面独立包裹 ErrorBoundary，避免单个页面崩溃导致整个应用白屏。
 */
function RoutedPages(): JSX.Element {
  return (
    <>
      <PreloadTrigger />
      <Suspense fallback={<LazyFallback />}>
        <div className="h-full animate-[fadeIn_0.15s_ease-out]">
          <Outlet />
        </div>
      </Suspense>
    </>
  )
}

const router = createHashRouter([
  {
    path: '/',
    element: <GlobalModals />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            element: <RoutedPages />,
            children: [
              { index: true, element: <ErrorBoundary><HomePage /></ErrorBoundary> },
              { path: 'events', element: <ErrorBoundary><EventsPage /></ErrorBoundary> },
              { path: 'events/:id', element: <ErrorBoundary><EventEditor /></ErrorBoundary> },
              { path: 'maps', element: <ErrorBoundary><MapsPage /></ErrorBoundary> },
              { path: 'maps/:id', element: <ErrorBoundary><MapEditor /></ErrorBoundary> },
              { path: 'items', element: <ErrorBoundary><ItemsPage /></ErrorBoundary> },
              { path: 'items/:id', element: <ErrorBoundary><ItemEditor /></ErrorBoundary> },
              { path: 'npc', element: <ErrorBoundary><NPCPage /></ErrorBoundary> },
              { path: 'npc/:id', element: <ErrorBoundary><NPCDetailPage /></ErrorBoundary> },
              { path: 'npc/:id/portrait', element: <ErrorBoundary><NPCPortraitEditor /></ErrorBoundary> },
              { path: 'npc/:id/sprite', element: <ErrorBoundary><NPCSpriteEditor /></ErrorBoundary> },
              { path: 'quests', element: <ErrorBoundary><QuestsPage /></ErrorBoundary> },
              { path: 'quests/:id', element: <ErrorBoundary><QuestEditor /></ErrorBoundary> },
              { path: 'mails', element: <ErrorBoundary><MailsPage /></ErrorBoundary> },
              { path: 'mails/:id', element: <ErrorBoundary><MailEditor /></ErrorBoundary> },
              { path: 'assets', element: <ErrorBoundary><XnbPreviewPage /></ErrorBoundary> },
              { path: 'export', element: <ErrorBoundary><ExportPage /></ErrorBoundary> },
              { path: 'mod-settings', element: <ErrorBoundary><ModSettingsPage /></ErrorBoundary> },
              { path: 'about', element: <ErrorBoundary><AboutPage /></ErrorBoundary> },
              { path: '*', element: <ErrorBoundary><NotFoundPage /></ErrorBoundary> },
            ],
          },
        ],
      },
    ],
  },
])

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
