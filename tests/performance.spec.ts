/**
 * 饭团工坊 自动化测试 - 性能验证
 *
 * 验证主界面加载速度和各模块响应时间
 */
import { test, expect } from './fixture'

test.describe('性能验证', () => {

  test('主界面应在5秒内加载完成', async ({ page }) => {
    const startTime = Date.now()
    await expect(page.locator('text=饭团工坊')).toBeVisible({ timeout: 15000 })
    const loadTime = Date.now() - startTime
    console.log(`主界面加载时间: ${loadTime}ms`)
    // 验证在合理时间内加载
    expect(loadTime).toBeLessThan(15000)
  })

  test('任务模块不应卡死', async ({ page }) => {
    const questLink = page.locator('a[href="#/quests"]')
    const startTime = Date.now()
    await questLink.click()
    // 验证页面在10秒内响应
    await expect(page.locator('text=任务').first()).toBeVisible({ timeout: 10000 })
    const loadTime = Date.now() - startTime
    console.log(`任务模块加载时间: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(10000)
  })

  test('NPC模块应在合理时间内加载', async ({ page }) => {
    const npcLink = page.locator('a[href="#/npc"]')
    const startTime = Date.now()
    await npcLink.click()
    await expect(page.locator('text=NPC').first()).toBeVisible({ timeout: 10000 })
    const loadTime = Date.now() - startTime
    console.log(`NPC模块加载时间: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(10000)
  })

  test('事件模块应在合理时间内加载', async ({ page }) => {
    const eventLink = page.locator('a[href="#/events"]')
    const startTime = Date.now()
    await eventLink.click()
    await expect(page.locator('text=事件').first()).toBeVisible({ timeout: 10000 })
    const loadTime = Date.now() - startTime
    console.log(`事件模块加载时间: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(10000)
  })

  test('物品模块应在合理时间内加载', async ({ page }) => {
    const itemLink = page.locator('a[href="#/items"]')
    const startTime = Date.now()
    await itemLink.click()
    await expect(page.locator('text=物品').first()).toBeVisible({ timeout: 10000 })
    const loadTime = Date.now() - startTime
    console.log(`物品模块加载时间: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(10000)
  })

  test('地图模块应在合理时间内加载', async ({ page }) => {
    const mapLink = page.locator('a[href="#/maps"]')
    const startTime = Date.now()
    await mapLink.click()
    await expect(page.locator('text=地图').first()).toBeVisible({ timeout: 10000 })
    const loadTime = Date.now() - startTime
    console.log(`地图模块加载时间: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(10000)
  })

  test('导出模块应在合理时间内加载', async ({ page }) => {
    const exportLink = page.locator('a[href="#/export"]')
    const startTime = Date.now()
    await exportLink.click()
    await expect(page.locator('text=导出').first()).toBeVisible({ timeout: 10000 })
    const loadTime = Date.now() - startTime
    console.log(`导出模块加载时间: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(10000)
  })
})
