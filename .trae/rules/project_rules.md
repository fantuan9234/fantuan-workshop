# 饭团工坊 (fantuan-workshop) 项目规则

## 项目概述
- **名称**：饭团工坊
- **类型**：Electron + React + Vite 桌面应用
- **目标**：星露谷物语模组制作工具，面向小白用户
- **GitHub 仓库**：https://github.com/fantuan9234/fantuan-workshop（**私有仓库**）
- **主分支**：main

## 技术栈
- **框架**：Electron 28.3.3
- **构建**：electron-vite + electron-builder 24.13.3
- **UI**：React 18 + TypeScript 5 + TailwindCSS 3
- **路由**：react-router-dom 6
- **打包**：NSIS (Windows x64)
- **更新**：electron-updater 6 (从 GitHub Releases 检测)

## 重要约束（绝对遵守）

### 代码仓库
- **GitHub 仓库是私有的**，**绝不能 push 任何源代码**
- 发布工具只上传 Release 资产（exe、yml、blockmap），不会上传代码
- 客户端更新源在 `src/main/index.ts` 的 `UPDATE_SOURCES` 中配置
- `electron-builder.yml` 的 `publish` 段控制自动发布行为

### 工具脚本
- 密钥只用环境变量传递：**`GH_TOKEN`**
- 不要修改 `scripts/publish-dual.js` 的核心逻辑（用 GitHub API + Gitee API）
- Gitee token 仅用于国内加速，可选

### 命名规范
- 安装包文件名必须固定为：`fantuan-workshop-setup-${version}.${ext}`（`electron-builder.yml` 里 `artifactName` 已配置）
- 不用中文文件名（避免 OpenList/移动云盘路径编码问题）

## 工作流程：发布新版本

当用户要求发布新版本（X.Y.Z）时，**严格按照以下步骤执行**：

### 步骤 1：修改版本号
编辑 [package.json](file:///d:/aaaawagjunhao/stardew-mod-studio/package.json) 第 3 行的 `version` 字段为新版本号。

### 步骤 2：构建
在项目根目录执行：
```bash
npx electron-vite build && npx electron-builder --win --x64 --publish never
```

构建产物在 `dist/` 目录：
- `fantuan-workshop-setup-X.Y.Z.exe`
- `fantuan-workshop-setup-X.Y.Z.exe.blockmap`
- `latest.yml`

### 步骤 3：发布到 GitHub
**优先用 GitHub API 直接发布**（避免 `electron-builder --publish always` 时的 win-unpacked 占用问题）：

```powershell
$env:GH_TOKEN="<用户的token>"

# 1. 创建 Release
$tag = "vX.Y.Z"
$body = @{
  tag_name = $tag
  name = "X.Y.Z"
  body = "饭团工坊 vX.Y.Z`n`n- 改动1`n- 改动2"
  draft = $false
  prerelease = $false
} | ConvertTo-Json
$r = Invoke-RestMethod -Uri "https://api.github.com/repos/fantuan9234/fantuan-workshop/releases" -Method Post -Headers @{"Authorization"="token $env:GH_TOKEN"} -Body $body -ContentType "application/json"

# 2. 上传 3 个资产
$uploadUrl = "https://uploads.github.com/repos/fantuan9234/fantuan-workshop/releases/$($r.id)/assets?name={0}"
foreach ($f in @("fantuan-workshop-setup-X.Y.Z.exe", "fantuan-workshop-setup-X.Y.Z.exe.blockmap", "latest.yml")) {
  Invoke-RestMethod -Uri ($uploadUrl -f $f) -Method Post -Headers @{"Authorization"="token $env:GH_TOKEN"} -ContentType "application/octet-stream" -InFile "dist\$f"
}
```

**如果用户要求同步到 Gitee**，再调用 `node scripts/publish-dual.js --sync-only --version=X.Y.Z` 同步资产。

### 步骤 4：验证
访问 https://github.com/fantuan9234/fantuan-workshop/releases/tag/vX.Y.Z 确认资产齐全。

## 用户偏好（UI 设计原则）

1. **内容优先**：不先让用户创建"文件/容器"，直接展示内容列表，空状态放创建入口
2. **创建醒目**：每个模块的创建按钮必须是页面视觉焦点，用大卡片或大按钮
3. **卡片化**：所有内容用卡片展示，包含图标/头像/标签，不用纯文字列表
4. **分区明确**：页面分上下两部分：上半"我的创作"，下半"游戏参考素材"
5. **导航精简**：侧边栏只放一级模块入口，具体功能在页面内完成
6. **不用 emoji**：所有 UI 图标必须用 SVG，不用 emoji
7. **图标风格**：极简线条风格，颜色克制，pixel art 元素
8. **字体大小**：文件夹名和 UI 元素要足够大

## 业务功能模块

软件包含 8 个核心模块 + 设置：
- 项目、事件、地图、物品、NPC、任务、邮件、游戏素材、模组设置、导出

每个模块遵循统一规范：
- 详情页用 Tab 布局（基本信息 / 属性数值 / 高级选项）
- 用 Section + 图标分组相关字段
- Buffs 等用可折叠面板
- 物品字段基于 Stardew Valley Wiki 1.6 完整数据

## 故障排查

### win-unpacked 占用错误
- **症状**：`The process cannot access the file because it is being used by another process`
- **解决**：杀掉 `饭团工坊.exe` / `Electron.exe` 进程后再构建
- **或**：直接用 GitHub API 发布，跳过 electron-builder 的 publish 流程

### GitHub 401/403
- 检查 `$env:GH_TOKEN` 是否设置
- 确认 token 有 `repo` 权限
- 仓库改成 Private 后，token 仍然有效（不需要重新生成）

### 文件名包含中文
- 检查 `electron-builder.yml` 的 `artifactName` 是否配置
- 应该用 `${version}` 占位符，不要用中文

## 内存参考

定期查看 `.trae-cn/memory/projects/-d-aaaawagjunhao-stardew-mod-studio/` 下的：
- `project_memory.md`（项目约束）
- `topics.md`（最近会话主题）

保持记忆连续性。
