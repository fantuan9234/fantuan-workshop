# 饭团工坊 - 双源发布流程（GitHub + OpenList）

## 前置条件

- Node.js 已安装
- 项目已 `npm install` 安装依赖
- GitHub Token 已配置
- OpenList Token 已配置（国内用户必须）

---

## 一、设置 Token（每次新开窗口都要设置）

```powershell
# GitHub Token
$env:GH_TOKEN="YOUR_GH_TOKEN"

# OpenList Token（必须设置，否则国内用户无法自动更新）
$env:OPENLIST_TOKEN="openlist-a1c1f182-dab5-442d-ac95-5b9be53a895anZaf43BVmqDWcvLIgxE29En3eTi9WpYkGODRrjK1hrezoRrXCzdV2w6GBatpcSur"
```

> Token 仅在当前 PowerShell 窗口有效，关闭窗口后需重新设置。

---

## 二、发布新版本

### 方式 A：一键发布（推荐）

```powershell
cd D:\aaaawagjunhao\stardew-mod-studio

# 设置 Token（两个都要设置）
$env:GH_TOKEN="YOUR_GH_TOKEN"
$env:OPENLIST_TOKEN="openlist-a1c1f182-dab5-442d-ac95-5b9be53a895anZaf43BVmqDWcvLIgxE29En3eTi9WpYkGODRrjK1hrezoRrXCzdV2w6GBatpcSur"

# 修改 package.json 中的版本号（先手动改好）
# 然后使用可靠构建脚本（自动编译 + 打包 + 上传 GitHub + 上传 OpenList）
node scripts/build-release.js publish
```

### 方式 B：手动分步发布

```powershell
cd D:\aaaawagjunhao\stardew-mod-studio

# 1. 修改 package.json 中的版本号
# 手动编辑 package.json，修改 version 字段

# 2. 编译 TypeScript
npm run build

# 3. 构建安装包（不上传）
node scripts/build-release.js

# 4. 手动上传到 GitHub / OpenList（见方式 C / D）
```

### 方式 C：手动上传到 GitHub

```powershell
$token = "YOUR_GH_TOKEN"
$headers = @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json" }

# 1. 创建 Release
$body = @{ tag_name = "v0.x.x"; name = "v0.x.x"; draft = $false; generate_release_notes = $true } | ConvertTo-Json
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/fantuan9234/fantuan-workshop/releases" -Headers $headers -Method Post -Body $body -ContentType "application/json"
Write-Host "Release ID: $($release.id)"

# 2. 上传文件（替换 $releaseId）
$releaseId = $release.id
$uploadUrl = "https://uploads.github.com/repos/fantuan9234/fantuan-workshop/releases/$releaseId/assets"
$files = @("fantuan-workshop-setup-0.x.x.exe", "fantuan-workshop-setup-0.x.x.exe.blockmap", "latest.yml")

foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes("dist\$file")
    $url = "$uploadUrl`?name=$file"
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body $bytes -ContentType "application/octet-stream"
    Write-Host "OK: $($result.name)"
}
```

### 方式 D：手动上传到 OpenList

```powershell
$token = "openlist-a1c1f182-dab5-442d-ac95-5b9be53a895anZaf43BVmqDWcvLIgxE29En3eTi9WpYkGODRrjK1hrezoRrXCzdV2w6GBatpcSur"
$version = "0.x.x"
$baseUrl = "https://wp.svlmod.cn"
$path = "/SVL/SVL/fantuangongfang/update"
$files = @("fantuan-workshop-setup-$version.exe", "fantuan-workshop-setup-$version.exe.blockmap", "latest.yml")

foreach ($file in $files) {
    $filePath = "dist\$file"
    if (Test-Path $filePath) {
        $url = "$baseUrl/dav$path/$file"
        $result = Invoke-RestMethod -Uri $url -Method Put -InFile $filePath -ContentType "application/octet-stream" -Headers @{ Authorization = "Bearer $token" }
        Write-Host "OpenList OK: $file"
    } else {
        Write-Host "OpenList 跳过: $file（文件不存在）"
    }
}
```

---

## 三、build-release.js 构建流程详解

```
1. npm run build                    # 编译 TypeScript → out/
2. 创建 prepackaged 目录            # 从 electron/dist 复制运行环境
3. @electron/rebuild canvas         # 为 Electron 28 编译原生模块
4. 复制所有生产依赖 (183个模块)      # → resources/node_modules/
5. 生成 package.json                # 写入 out/ 供 Electron 找入口
6. asar pack out → app.asar         # → resources/app.asar
7. 重命名 electron.exe              # → fantuan-workshop.exe
8. rcedit 嵌入自定义图标            # build/icons/icon.ico → exe
9. electron-builder --prepackaged   # 构建 NSIS 安装包
```

### 构建产物

- `dist/fantuan-workshop-setup-0.9.2.exe` - 安装包
- `dist/fantuan-workshop-setup-0.9.2.exe.blockmap` - 差分更新块映射
- `dist/prepackaged/` - 可直接运行的解压版（手动部署用）

---

## 四、已知问题与修复（必读）

### Q1：双击 exe 没反应，进程一闪而过
**原因**：app.asar 里缺少 package.json，Electron 找不到入口 main
**修复**：build-release.js 打包前生成 `{ main: "./main/index.js" }` 写入 out/

### Q2：Cannot find module 'canvas'
**原因**：canvas 是 C++ 原生模块，不能打包进 app.asar
**修复**：`@electron/rebuild -f -w canvas -v 28.3.3` 编译后复制到 resources/node_modules/canvas/

### Q3：Cannot find module 'electron-updater' 或其他 JS 模块
**原因**：所有 JS 生产依赖都没打包进安装包
**修复**：`npm ls --omit=dev --all --parseable` 获取全部依赖列表，复制到 resources/node_modules/

### Q4：图标显示 Electron 默认图标
**原因**：fantuan-workshop.exe 只是 electron.exe 改名，图标没换
**修复**：rcedit 把 build/icons/icon.ico 写入 exe（注意路径用正斜杠避开中文 bug）

### Q5：NSIS 安装器装完后没有 fantuan-workshop.exe
**原因**：electron-builder --prepackaged 模式不会重命名 electron.exe
**修复**：build-release.js 手动 renameSync 后再跑 electron-builder

### Q6：桌面快捷方式图标还是旧的 / 不显示
**原因**：Windows 图标缓存
**修复**：重启 Explorer（`Stop-Process -Name explorer -Force`）或指向独立 .ico 文件

---

## 五、手动部署步骤（安装器因 UAC 不便使用时代替方案）

```powershell
# 1. 构建
node scripts/build-release.js

# 2. 杀掉运行中的进程
Get-Process | Where-Object { $_.ProcessName -match 'fantuan|electron' } | Stop-Process -Force

# 3. 覆盖安装目录
Remove-Item "C:\Users\Administrator\AppData\Local\Programs\饭团工坊\*" -Recurse -Force
Copy-Item "dist\prepackaged\*" "C:\Users\Administrator\AppData\Local\Programs\饭团工坊\" -Recurse -Force

# 4. 创建桌面快捷方式（或跳过，如果已有）
$s = New-Object -ComObject WScript.Shell
$lnk = $s.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\饭团工坊.lnk')
$lnk.TargetPath = 'C:\Users\Administrator\AppData\Local\Programs\饭团工坊\fantuan-workshop.exe'
$lnk.WorkingDirectory = 'C:\Users\Administrator\AppData\Local\Programs\饭团工坊'
$lnk.Description = '饭团工坊 - Stardew Valley 模组制作工具'
$lnk.IconLocation = 'C:\Users\Administrator\AppData\Local\Programs\饭团工坊\fantuan-workshop.exe,0'
$lnk.Save()

# 5. 创建批处理启动器（可选）
Set-Content -Path "C:\Users\Administrator\AppData\Local\Programs\饭团工坊\启动饭团工坊.bat" -Value '@echo off\r\nstart "" "%~dp0fantuan-workshop.exe"' -Encoding ASCII
```

---

## 六、注意事项

### 1. 必须先编译再打包
```powershell
npm run build                    # 编译 TypeScript
node scripts/build-release.js    # 打包安装包
```
如果跳过 `npm run build`，安装包会用旧代码打包！

### 2. 必须用 build-release.js 而非 electron-builder
`app-builder-bin` 存在文件锁定 bug，`npx electron-builder` 直接打包会报错。
一律使用 `node scripts/build-release.js` 来构建。

### 3. Draft Release 冲突
如果 GitHub Release 已存在（Published 状态），electron-builder 无法自动覆盖。
此时需要手动删除旧文件后重新上传。删除旧文件方法：

```powershell
$token = "YOUR_GH_TOKEN"
$headers = @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json" }
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/fantuan9234/fantuan-workshop/releases/tags/v0.x.x" -Headers $headers
foreach ($asset in $release.assets) {
    Invoke-RestMethod -Uri "https://api.github.com/repos/fantuan9234/fantuan-workshop/releases/assets/$($asset.id)" -Headers $headers -Method Delete
}
```

### 4. 发布前检查：确认不是 Draft
electron-builder 默认创建 Draft（草稿）Release——文件已上传但未正式发布，用户客户端无法检测到更新。

**解决方法**：在 `electron-builder.yml` 中确保 publish 配置包含 `draft: false`：
```yaml
publish:
  provider: github
  owner: fantuan9234
  repo: fantuan-workshop
  draft: false
```

**如果不小心创建了 Draft Release，发布它：**
```powershell
$token = "YOUR_GH_TOKEN"
$headers = @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json" }
$releases = Invoke-RestMethod -Uri "https://api.github.com/repos/fantuan9234/fantuan-workshop/releases" -Headers $headers
$drafts = $releases | Where-Object { $_.draft -eq $true }
foreach ($d in $drafts) {
  $body = @{ draft = $false } | ConvertTo-Json
  $updated = Invoke-RestMethod -Uri "https://api.github.com/repos/fantuan9234/fantuan-workshop/releases/$($d.id)" -Headers $headers -Method Patch -Body $body -ContentType "application/json"
  Write-Host "Published: $($updated.html_url)"
}
```
可通过 https://github.com/fantuan9234/fantuan-workshop/releases 查看 Release 是否是 Draft。

### 5. electron-builder.yml 关键配置
```yaml
asar: true
npmRebuild: false              # 跳过原生模块编译（build-release.js 手动处理）
win:
  executableName: fantuan-workshop
  artifactName: fantuan-workshop-setup-${version}.${ext}
nsis:
  perMachine: true
  oneClick: false
  allowToChangeInstallationDirectory: true
```

### 6. 最简发布命令速查
```powershell
# 1. 设置 Token（两个都要）
$env:GH_TOKEN="YOUR_GH_TOKEN"
$env:OPENLIST_TOKEN="openlist-a1c1f182-dab5-442d-ac95-5b9be53a895anZaf43BVmqDWcvLIgxE29En3eTi9WpYkGODRrjK1hrezoRrXCzdV2w6GBatpcSur"

# 2. 编译 + 打包 + 上传（一键）
node scripts/build-release.js publish

# 3. 确认 Release 不是 Draft 状态
```

---

## 七、Release 地址

发布成功后访问：
```
GitHub:   https://github.com/fantuan9234/fantuan-workshop/releases
OpenList: https://wp.svlmod.cn/d/SVL/SVL/fantuangongfang/update/
```

用户客户端会自动检测更新（GitHub 为主，OpenList 为备用）：
- 国外用户优先从 GitHub 下载
- 国内用户 GitHub 访问失败时自动切换 OpenList 下载

---

## 八、双源更新机制

客户端自动更新逻辑：
1. **首次尝试 GitHub**：调用 GitHub Releases API 检查最新版本
2. **GitHub 失败时自动切换 OpenList**：如果 GitHub 请求超时或网络错误，自动切换到 OpenList 更新源
3. **下载源跟随检查源**：从哪个源检查到更新，就从哪个源下载安装包
4. **两个源都失败**：显示错误提示，等待下次自动重试

无需用户手动配置，国内外用户均可自动更新。