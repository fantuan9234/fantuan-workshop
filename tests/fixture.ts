/**
 * 饭团工坊 自动化测试 - 全局 Fixture
 *
 * 启动 Electron 应用并提供 page 对象给所有测试用例使用。
 * 每个测试用例都会获得一个全新的应用实例。
 */
import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { join } from 'path'

type FantuanFixture = {
  app: ElectronApplication
  page: Page
}

export const test = base.extend<FantuanFixture>({
  app: async ({}, use) => {
    const appPath = join(__dirname, '..')
    const app = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        // 使用 dev 模式加载
        ELECTRON_RENDERER_URL: undefined,
      },
    })
    await use(app)
    await app.close()
  },
  page: async ({ app }, use) => {
    // 等待渲染进程加载完成
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    // 等待 React 渲染完成
    await page.waitForTimeout(2000)
    await use(page)
  },
})

export { expect } from '@playwright/test'
