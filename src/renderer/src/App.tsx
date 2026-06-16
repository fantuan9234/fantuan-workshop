import { lazy, Suspense, useEffect } from 'react'
import { createHashRouter, RouterProvider, Outlet } from 'react-router-dom'
import { NpcAssetsProvider } from './data/useNpcAssets'
import { CustomNpcsProvider } from './data/useCustomNpcs'
import { CustomItemsProvider } from './data/useCustomItems'
import { ProjectProvider } from './data/ProjectContext'
import { SettingsProvider } from './data/useSettings'
import { I18nProvider } from './i18n'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import ForceUpdateModal from './components/ForceUpdateModal'
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
  loaders.reduce((prev, loader) => prev.then(() => loader()), Promise.resolve())
}

function PreloadTrigger(): null {
  useEffect(() => {
    // 首屏渲染完成后，空闲时预加载所有模块
    const id = requestIdleCallback(() => { preloadModules() }, { timeout: 3000 })
    return () => cancelIdleCallback(id)
  }, [])
  return null
}

/**
 * 把所有懒加载页面统一包到 Suspense 里。
 * createHashRouter 路由表的 element 必须是同步组件，
 * 所以新增一层路由壳子挂载 Suspense + Outlet。
 */
function RoutedPages(): JSX.Element {
  return (
    <>
      <PreloadTrigger />
      <Suspense fallback={<LazyFallback />}>
        <Outlet />
      </Suspense>
    </>
  )
}

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        element: <RoutedPages />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'events', element: <EventsPage /> },
          { path: 'events/:id', element: <EventEditor /> },
          { path: 'maps', element: <MapsPage /> },
          { path: 'maps/:id', element: <MapEditor /> },
          { path: 'items', element: <ItemsPage /> },
          { path: 'items/:id', element: <ItemEditor /> },
          { path: 'npc', element: <NPCPage /> },
          { path: 'npc/:id', element: <NPCDetailPage /> },
          { path: 'npc/:id/portrait', element: <NPCPortraitEditor /> },
          { path: 'npc/:id/sprite', element: <NPCSpriteEditor /> },
          { path: 'quests', element: <QuestsPage /> },
          { path: 'quests/:id', element: <QuestEditor /> },
          { path: 'mails', element: <MailsPage /> },
          { path: 'mails/:id', element: <MailEditor /> },
          { path: 'assets', element: <XnbPreviewPage /> },
          { path: 'export', element: <ExportPage /> },
          { path: 'mod-settings', element: <ModSettingsPage /> },
          { path: 'about', element: <AboutPage /> },
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
            {/* 强制更新弹窗 — 放在最外层，确保任何页面下都覆盖在最上面 */}
            <ForceUpdateModal />
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
