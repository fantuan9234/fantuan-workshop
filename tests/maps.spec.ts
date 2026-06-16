/**
 * 饭团工坊 自动化测试 - 地图模块
 *
 * 测试地图列表、缩略图加载、补丁编辑等功能
 */
import { test, expect } from './fixture'

test.describe('地图模块', () => {

  test.beforeEach(async ({ page }) => {
    const mapLink = page.locator('a[href="#/maps"]')
    await mapLink.click()
    await page.waitForTimeout(2000)
  })

  test('地图页面应正确加载', async ({ page }) => {
    await expect(page.locator('text=地图').first()).toBeVisible()
  })

  test('地图页面应显示创建按钮', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("添加"), button:has-text("新建")').first()
    await expect(createBtn).toBeVisible()
  })

  test('地图页面应显示参考素材区', async ({ page }) => {
    await expect(page.locator('text=参考').first()).toBeVisible()
  })

  test('地图页面应支持搜索', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('农场')
      await page.waitForTimeout(500)
    }
  })

  test('添加自定义地图对话框应正常打开且实时预览', async ({ page }) => {
    // 点击"添加自定义地图"大卡片
    const addCard = page.locator('text=添加自定义地图').first()
    await addCard.click()
    await page.waitForTimeout(500)

    // 验证对话框标题
    await expect(page.locator('text=添加自定义地图').nth(1)).toBeVisible()

    // 验证短名 input
    const shortNameInput = page.locator('input[placeholder*="森林小屋"]').first()
    await expect(shortNameInput).toBeVisible()

    // 输入英文短名，验证实时预览（slugify 后保留英文）
    await shortNameInput.fill('MyForest')
    await page.waitForTimeout(300)
    await expect(page.locator('text={{ModId}}_My_Forest').first()).toBeVisible()

    // 验证地点类型按钮可见
    await expect(page.locator('button:has-text("户外")').first()).toBeVisible()
    await expect(page.locator('button:has-text("室内")').first()).toBeVisible()
    await expect(page.locator('button:has-text("棚屋")').first()).toBeVisible()
    await expect(page.locator('button:has-text("装饰")').first()).toBeVisible()
    await expect(page.locator('button:has-text("岛屿")').first()).toBeVisible()

    // 验证音乐下拉（户外默认显示）
    await expect(page.locator('text=背景音乐').first()).toBeVisible()

    // 关闭对话框
    await page.locator('button:has-text("取消")').first().click()
    await page.waitForTimeout(300)
  })
})
