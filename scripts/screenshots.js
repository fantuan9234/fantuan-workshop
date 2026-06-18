/**
 * 饭团工坊 - 自动化截图工具
 * 
 * 使用方法：
 * 1. 确保饭团工坊已构建好 (npm run build)
 * 2. 运行: node scripts/screenshots.js
 * 3. 截图将保存到 fantuan-website-php/assets/images/
 * 
 * 需要安装: npm install -D playwright
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'fantuan-website-php', 'assets', 'images');
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'screenshots');

// 要截图的页面
const PAGES = [
  { name: 'home', file: 'index.html', selector: '#app', wait: 3000 },
  { name: 'npc-editor', file: 'index.html#/npc', selector: '#app', wait: 3000 },
  { name: 'event-editor', file: 'index.html#/events', selector: '#app', wait: 3000 },
  { name: 'item-editor', file: 'index.html#/items', selector: '#app', wait: 3000 },
  { name: 'map-editor', file: 'index.html#/maps', selector: '#app', wait: 3000 },
];

async function takeScreenshots() {
  console.log('=== 饭团工坊 截图工具 ===\n');

  // 确保输出目录存在
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // 检查依赖
  try {
    execSync('npx playwright --version', { stdio: 'pipe', cwd: PROJECT_ROOT });
  } catch (e) {
    console.log('❌ 需要安装 Playwright:');
    console.log('   npm install -D playwright');
    console.log('   npx playwright install chromium');
    process.exit(1);
  }

  // 检查构建产物
  const distDir = path.join(PROJECT_ROOT, 'dist');
  if (!fs.existsSync(distDir)) {
    console.log('❌ 未找到构建产物，请先运行: npm run build');
    process.exit(1);
  }

  console.log('✅ 启动 Electron 应用...');
  
  // 使用 Playwright 启动 Electron
  const { _electron: electron } = require('playwright');
  
  let electronApp;
  try {
    electronApp = await electron.launch({
      args: [path.join(distDir, 'main', 'index.js')],
      cwd: PROJECT_ROOT,
    });
    console.log('✅ 应用已启动\n');

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('networkidle');

    for (const page of PAGES) {
      console.log(`📸 截图: ${page.name}...`);

      // 导航到对应页面
      if (page.file !== 'index.html') {
        await window.goto(`file://${path.join(distDir, 'renderer', page.file)}`);
      }
      
      // 等待页面加载
      await window.waitForTimeout(page.wait || 2000);

      // 截图
      const screenshotPath = path.join(SCREENSHOT_DIR, `${page.name}.png`);
      await window.screenshot({
        path: screenshotPath,
        fullPage: false,
      });
      
      // 也截取全页
      const fullPagePath = path.join(SCREENSHOT_DIR, `${page.name}-full.png`);
      await window.screenshot({
        path: fullPagePath,
        fullPage: true,
      });

      console.log(`   ✅ 已保存: ${page.name}.png`);
    }

    console.log('\n🎉 所有截图完成！');
    console.log(`📁 截图位置: ${SCREENSHOT_DIR}`);
    
    // 复制到网站资源目录
    console.log('\n📋 复制到网站资源目录...');
    const files = fs.readdirSync(SCREENSHOT_DIR);
    files.forEach(file => {
      const src = path.join(SCREENSHOT_DIR, file);
      const dest = path.join(OUTPUT_DIR, file.replace('-full', ''));
      fs.copyFileSync(src, dest);
      console.log(`   → assets/images/${file.replace('-full', '')}`);
    });

  } catch (error) {
    console.error('❌ 截图失败:', error.message);
  } finally {
    if (electronApp) {
      await electronApp.close();
      console.log('\n🔒 应用已关闭');
    }
  }
}

takeScreenshots();
