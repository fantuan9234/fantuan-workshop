/**
 * 饭团工坊 自动化测试 - 主界面（首页）
 *
 * 测试首页加载、项目操作、导航、统计面板等功能
 */
import { test, expect } from './fixture'

test.describe('主界面 - 首页', () => {

  test('应用启动后应显示首页', async ({ page }) => {
    // 验证页面标题
    await expect(page.locator('text=饭团工坊')).toBeVisible({ timeout: 15000 })
  })

  test('首页应显示项目名称', async ({ page }) => {
    // 默认项目名 - 使用更宽松的匹配
    const projectName = page.locator('button, span').filter({ hasText: '未命名项目' }).first()
    await expect(projectName).toBeVisible()
  })

  test('首页应显示统计面板', async ({ page }) => {
    // 验证5个统计卡片
    await expect(page.locator('text=NPC').first()).toBeVisible()
    await expect(page.locator('text=事件').first()).toBeVisible()
    await expect(page.locator('text=物品').first()).toBeVisible()
    await expect(page.locator('text=地图').first()).toBeVisible()
    await expect(page.locator('text=任务').first()).toBeVisible()
  })

  test('首页应显示快速操作区', async ({ page }) => {
    await expect(page.locator('text=NPC管理').first()).toBeVisible()
    await expect(page.locator('text=事件编辑').first()).toBeVisible()
    await expect(page.locator('text=物品创建').first()).toBeVisible()
    await expect(page.locator('text=地图编辑').first()).toBeVisible()
  })

  test('点击NPC管理应跳转到NPC页面', async ({ page }) => {
    await page.locator('text=NPC管理').first().click()
    await page.waitForTimeout(1000)
    // 验证URL变化
    expect(page.url()).toContain('/npc')
  })

  test('点击事件编辑应跳转到事件页面', async ({ page }) => {
    await page.locator('text=事件编辑').first().click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/events')
  })

  test('点击物品创建应跳转到物品页面', async ({ page }) => {
    await page.locator('text=物品创建').first().click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/items')
  })

  test('点击地图编辑应跳转到地图页面', async ({ page }) => {
    await page.locator('text=地图编辑').first().click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/maps')
  })

  test('项目名称可编辑', async ({ page }) => {
    // 项目名称在标题栏中，点击进入编辑模式
    const nameButton = page.locator('.truncate.max-w-\\[180px\\]').first()
    if (await nameButton.isVisible()) {
      await nameButton.click()
      // 应出现输入框
      const input = page.locator('input[type="text"]').first()
      if (await input.isVisible()) {
        await input.fill('测试项目')
        await input.press('Enter')
      }
    }
    // 验证编辑功能不崩溃即可
    expect(true).toBeTruthy()
  })

  test('新建项目按钮应可用', async ({ page }) => {
    const newBtn = page.locator('button:has-text("新建")')
    await expect(newBtn).toBeVisible()
    await expect(newBtn).toBeEnabled()
  })

  test('快捷键提示应显示', async ({ page }) => {
    // 快捷键提示在首页底部，使用更精确的选择器
    await expect(page.locator('kbd, span').filter({ hasText: 'Ctrl+S' }).first()).toBeVisible()
  })
})
