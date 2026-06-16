/**
 * 饭团工坊 自动化测试 - 导出模块
 *
 * 测试导出功能、ZIP打包等
 */
import { test, expect } from './fixture'

test.describe('导出模块', () => {

  test.beforeEach(async ({ page }) => {
    const exportLink = page.locator('a[href="#/export"]')
    await exportLink.click()
    await page.waitForTimeout(2000)
  })

  test('导出页面应正确加载', async ({ page }) => {
    await expect(page.locator('text=导出').first()).toBeVisible()
  })

  test('导出页面应显示项目统计', async ({ page }) => {
    // 验证统计信息
    await expect(page.locator('text=NPC').first()).toBeVisible()
  })

  test('导出页面应显示导出按钮', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("导出"), button:has-text("打包")').first()
    await expect(exportBtn).toBeVisible()
  })
})
