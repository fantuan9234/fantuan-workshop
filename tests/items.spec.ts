/**
 * 饭团工坊 自动化测试 - 物品模块
 *
 * 测试物品列表、创建、编辑、类型切换等功能
 */
import { test, expect } from './fixture'

test.describe('物品模块', () => {

  test.beforeEach(async ({ page }) => {
    const itemLink = page.locator('a[href="#/items"]')
    await itemLink.click()
    await page.waitForTimeout(2000)
  })

  test('物品页面应正确加载', async ({ page }) => {
    await expect(page.locator('text=物品').first()).toBeVisible()
  })

  test('物品页面应显示创建按钮', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建")').first()
    await expect(createBtn).toBeVisible()
  })

  test('物品页面应显示快捷类型按钮', async ({ page }) => {
    // 验证物品类型按钮存在
    const typeButtons = page.locator('button:has-text("普通物品"), button:has-text("武器"), button:has-text("靴子"), button:has-text("帽子"), button:has-text("戒指")')
    const count = await typeButtons.count()
    expect(count).toBeGreaterThan(0)
  })

  test('点击创建物品应跳转到编辑器', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/items/')
  })

  test('物品编辑器应包含基本信息Tab', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=基本信息').first()).toBeVisible({ timeout: 5000 })
  })

  test('物品编辑器应包含属性数值Tab', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=属性数值').first()).toBeVisible({ timeout: 5000 })
  })

  test('物品编辑器应包含高级选项Tab', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=高级选项').first()).toBeVisible({ timeout: 5000 })
  })

  test('物品编辑器应支持切换物品类型', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    // 点击武器类型按钮
    const weaponBtn = page.locator('button:has-text("武器")').first()
    if (await weaponBtn.isVisible()) {
      await weaponBtn.click()
      await page.waitForTimeout(500)
      // 验证武器特有字段出现
      await expect(page.locator('text=伤害').first()).toBeVisible({ timeout: 3000 })
    }
  })

  test('物品页面应显示参考素材区', async ({ page }) => {
    await expect(page.locator('text=参考').first()).toBeVisible()
  })
})
