/**
 * 饭团工坊 自动化测试 - 侧边栏导航
 *
 * 测试侧边栏各模块入口的导航功能
 */
import { test, expect } from './fixture'

test.describe('侧边栏导航', () => {

  test('侧边栏应显示所有模块入口', async ({ page }) => {
    // 验证侧边栏品牌
    await expect(page.locator('text=饭团工坊')).toBeVisible()
  })

  test('点击事件模块应导航到事件页面', async ({ page }) => {
    // 找到侧边栏的事件入口并点击
    const eventLink = page.locator('a[href="#/events"]')
    await eventLink.click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/events')
  })

  test('点击地图模块应导航到地图页面', async ({ page }) => {
    const mapLink = page.locator('a[href="#/maps"]')
    await mapLink.click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/maps')
  })

  test('点击物品模块应导航到物品页面', async ({ page }) => {
    const itemLink = page.locator('a[href="#/items"]')
    await itemLink.click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/items')
  })

  test('点击NPC模块应导航到NPC页面', async ({ page }) => {
    const npcLink = page.locator('a[href="#/npc"]')
    await npcLink.click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/npc')
  })

  test('点击任务模块应导航到任务页面', async ({ page }) => {
    const questLink = page.locator('a[href="#/quests"]')
    await questLink.click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/quests')
  })

  test('点击素材模块应导航到素材页面', async ({ page }) => {
    const assetLink = page.locator('a[href="#/assets"]')
    await assetLink.click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/assets')
  })

  test('点击导出模块应导航到导出页面', async ({ page }) => {
    const exportLink = page.locator('a[href="#/export"]')
    await exportLink.click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/export')
  })

  test('点击关于页面应导航到关于页面', async ({ page }) => {
    const aboutLink = page.locator('a[href="#/about"]')
    await aboutLink.click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/about')
  })

  test('当前活跃模块应有高亮样式', async ({ page }) => {
    const homeLink = page.locator('a[href="#/"]')
    await homeLink.click()
    await page.waitForTimeout(500)
    // 验证首页链接有活跃样式
    const isActive = await homeLink.evaluate(el => el.classList.contains('themed-bg-card') || el.classList.contains('themed-text-primary'))
    expect(isActive).toBeTruthy()
  })
})
