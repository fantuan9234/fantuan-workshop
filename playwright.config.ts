import { defineConfig } from '@playwright/test'

/**
 * Playwright 测试配置 - 饭团工坊 Electron 应用
 *
 * 测试策略：使用 @playwright/test 的 Electron 支持直接启动应用。
 * 测试脚本会通过 _electron.launch() 启动 Electron，然后操作渲染进程。
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60000,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
  },
})
