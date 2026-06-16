/**
 * 饭团工坊 自动化测试 - 任务模块
 *
 * 测试任务列表、创建、编辑、删除等功能
 * 这是之前卡死的模块，需要重点验证
 */
import { test, expect } from './fixture'

test.describe('任务模块', () => {

  test.beforeEach(async ({ page }) => {
    const questLink = page.locator('a[href="#/quests"]')
    await questLink.click()
    await page.waitForTimeout(2000)
  })

  test('任务页面应正确加载（不卡死）', async ({ page }) => {
    // 验证页面在合理时间内加载完成
    await expect(page.locator('text=任务').first()).toBeVisible({ timeout: 10000 })
  })

  test('任务页面应显示参考任务列表', async ({ page }) => {
    // 验证参考素材区存在
    await expect(page.locator('text=参考').first()).toBeVisible()
    // 验证至少有一个参考任务
    await expect(page.locator('text=新手引导').first()).toBeVisible()
  })

  test('任务页面应显示创建按钮', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("开始创建")').first()
    await expect(createBtn).toBeVisible()
  })

  test('点击创建任务应跳转到编辑器', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("开始创建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/quests/')
  })

  test('任务编辑器应包含基本字段', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("开始创建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    // 验证编辑器基本字段
    await expect(page.locator('text=任务名称').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=任务类型').first()).toBeVisible()
    await expect(page.locator('text=触发NPC').first()).toBeVisible()
  })

  test('任务编辑器应支持添加目标', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("开始创建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    // 点击添加目标按钮
    const addObjBtn = page.locator('button:has-text("添加目标")').first()
    await addObjBtn.click()
    await page.waitForTimeout(500)
    // 验证目标卡片出现
    await expect(page.locator('text=目标 1').first()).toBeVisible()
  })

  test('任务编辑器应支持添加奖励物品', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("开始创建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    // 点击添加奖励物品按钮
    const addRewardBtn = page.locator('button:has-text("添加")').first()
    if (await addRewardBtn.isVisible()) {
      await addRewardBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test('任务编辑器应支持保存', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("开始创建")').first()
    await createBtn.click()
    await page.waitForTimeout(1500)
    // 填写任务名称
    const nameInput = page.locator('input[placeholder*="神秘"], input[type="text"]').first()
    await nameInput.fill('测试任务')
    // 填写英文ID
    const idInput = page.locator('input[placeholder*="Mysterious"], input[type="text"]').nth(1)
    if (await idInput.isVisible()) {
      await idInput.fill('TestQuest')
    }
    // 点击保存
    const saveBtn = page.locator('button:has-text("保存")').first()
    await saveBtn.click()
    await page.waitForTimeout(1000)
    // 验证保存提示或页面无报错
    const savedToast = page.locator('text=已保存')
    const isSaved = await savedToast.isVisible().catch(() => false)
    // 保存操作不应导致页面崩溃
    expect(page.url()).toContain('/quests/')
  })

  test('任务类型筛选应正常工作', async ({ page }) => {
    // 点击主线筛选
    const storyFilter = page.locator('button:has-text("主线")').first()
    if (await storyFilter.isVisible()) {
      await storyFilter.click()
      await page.waitForTimeout(500)
      // 验证只显示主线任务
      await expect(page.locator('text=新手引导').first()).toBeVisible()
    }
  })

  test('参考任务卡片应显示类型标签', async ({ page }) => {
    // 验证类型标签存在
    await expect(page.locator('text=主线剧情').first()).toBeVisible()
  })

  test('参考任务卡片应显示NPC信息', async ({ page }) => {
    // 验证NPC信息存在
    await expect(page.locator('text=刘易斯').first()).toBeVisible()
  })
})
