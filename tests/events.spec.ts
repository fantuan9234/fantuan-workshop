/**
 * 饭团工坊 自动化测试 - 事件模块
 *
 * 测试事件列表、创建、编辑等功能
 */
import { test, expect } from './fixture'

test.describe('事件模块', () => {

  test.beforeEach(async ({ page }) => {
    const eventLink = page.locator('a[href="#/events"]')
    await eventLink.click()
    await page.waitForTimeout(2000)
  })

  test('事件页面应正确加载', async ({ page }) => {
    await expect(page.locator('text=事件').first()).toBeVisible()
  })

  test('事件页面应显示创建按钮', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建")').first()
    await expect(createBtn).toBeVisible()
  })

  test('点击创建事件应跳转到编辑器', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    // 验证跳转到事件编辑器
    expect(page.url()).toContain('/events/')
  })

  test('事件页面应显示参考素材区', async ({ page }) => {
    await expect(page.locator('text=参考').first()).toBeVisible()
  })

  test('事件编辑器应包含地图选择', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    // 验证编辑器中存在地图选择下拉框
    const mapSelect = page.locator('select, input[placeholder*="地图"]').first()
    await expect(mapSelect).toBeVisible({ timeout: 5000 })
  })
})
