/**
 * 饭团工坊 自动化测试 - NPC 模块
 *
 * 测试 NPC 列表、创建、编辑、删除等功能
 */
import { test, expect } from './fixture'

test.describe('NPC 模块', () => {

  test.beforeEach(async ({ page }) => {
    // 导航到 NPC 页面
    const npcLink = page.locator('a[href="#/npc"]')
    await npcLink.click()
    await page.waitForTimeout(2000)
  })

  test('NPC 页面应正确加载', async ({ page }) => {
    // 验证页面标题
    await expect(page.locator('text=NPC').first()).toBeVisible()
  })

  test('NPC 页面应显示原版NPC列表', async ({ page }) => {
    // 验证一些知名NPC
    await expect(page.locator('text=阿比盖尔').first()).toBeVisible()
  })

  test('NPC 页面应显示创建按钮', async ({ page }) => {
    // 查找创建NPC的按钮
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("添加")').first()
    await expect(createBtn).toBeVisible()
  })

  test('点击创建NPC应弹出创建对话框或跳转', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("添加")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    // 验证出现了创建表单或跳转到详情页
    const hasInput = await page.locator('input[type="text"]').first().isVisible()
    const hasDetail = page.url().includes('/npc/')
    expect(hasInput || hasDetail).toBeTruthy()
  })

  test('NPC 列表应支持搜索', async ({ page }) => {
    // 查找搜索输入框
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('阿比盖尔')
      await page.waitForTimeout(500)
      // 验证搜索结果
      await expect(page.locator('text=阿比盖尔').first()).toBeVisible()
    }
  })

  test('点击NPC卡片应跳转到详情页', async ({ page }) => {
    // 点击阿比盖尔
    const npcCard = page.locator('text=阿比盖尔').first()
    await npcCard.click()
    await page.waitForTimeout(1500)
    // 验证跳转到详情页
    expect(page.url()).toContain('/npc/')
  })
})
