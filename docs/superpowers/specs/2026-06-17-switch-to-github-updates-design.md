# 切换到 GitHub Releases 更新方案

## 背景

当前客户端使用 `electron-updater` 的 `generic` provider，指向自建 HTTP 服务器 `http://211.101.247.248:923/` 获取更新。该方案有以下问题：

1. 需要维护宝塔 Nginx 服务器
2. 使用 HTTP 明文传输，存在中间人攻击风险
3. 硬编码 IP 地址，灵活性差
4. 发布时需要手动上传文件到服务器

同时，`publish-dual.js` 发布脚本已经将安装包上传到 GitHub Releases（以及 Gitee），但客户端并未使用 GitHub Releases 来检查更新。

## 目标

将自动更新从 `generic` HTTP 服务器迁移到 GitHub Releases，利用 `electron-updater` 内置的 `github` provider。

## 改动文件

| 文件 | 改动内容 | 风险 |
|------|---------|------|
| `electron-builder.yml` | `publish` 从 `generic` 改为 `github` | 低，构建配置 |
| `src/main/index.ts` | `setFeedURL()` 改为 GitHub provider | 低，API 调用方式变化 |
| `scripts/publish-dual.js` | 可能需要适配 GitHub provider 的发布行为 | 中，构建命令可能需要微调 |

## 不变的文件

- `src/preload/index.ts` — IPC 接口不变
- `src/renderer/src/components/ForceUpdateModal.tsx` — UI 逻辑不变
- `src/renderer/src/global.d.ts` — 类型定义不变
- `build/installer.nsh` — 安装器脚本不变

## 详细变更

### 1. electron-builder.yml

**当前：**
```yaml
publish:
  provider: generic
  url: http://211.101.247.248:923/
```

**改为：**
```yaml
publish:
  provider: github
  owner: fantuan9234
  repo: fantuan-workshop
```

`electron-builder` 在构建时会将此配置写入 `app-update.yml` 中。客户端启动时，`electron-updater` 读取该配置文件，自动使用 GitHub API 检查最新 Release。

### 2. src/main/index.ts

**删除：**
```typescript
const UPDATE_SERVER_URL = 'http://211.101.247.248:923/'
```

**添加：**
```typescript
const GITHUB_OWNER = 'fantuan9234'
const GITHUB_REPO = 'fantuan-workshop'
```

**修改 `setupAutoUpdater 中的 setFeedURL 调用：`**
```typescript
// 之前
autoUpdater.setFeedURL({
  provider: 'generic' as any,
  url: UPDATE_SERVER_URL,
})

// 之后
autoUpdater.setFeedURL({
  provider: 'github',
  owner: GITHUB_OWNER,
  repo: GITHUB_REPO,
})
```

### 3. 脚本验证

`scripts/publish-dual.js` 和 `scripts/release.js` 中使用了 `electron-builder --win --x64 --publish always`。由于 `electron-builder.yml` 中 publish 改为 `github` provider，构建时 `--publish always` 会自动上传 Release 资产到 GitHub，无需修改发布脚本。

## 数据流

```
客户端启动
  ↓
autoUpdater.checkForUpdates()
  ↓  GET /repos/fantuan9234/fantuan-workshop/releases/latest
GitHub API
  ↓  返回 latest release 信息
electron-updater 解析 latest.yml，比较版本号
  ↓  有新版本
从 GitHub Releases CDN 下载安装包 + blockmap
  ↓  下载完成
推送 update:downloaded → 用户点击重启 → NSIS 安装
```

## Token 使用说明

| 用途 | Token | 方式 |
|------|-------|------|
| 发布 Release 到 GitHub | `GH_TOKEN` 环境变量 | 保持不变，已在 `publish-dual.js` 中使用 |
| 客户端检查/下载更新 | 无需 Token（公开仓库） | 无变化 |

用户提供的 token `YOUR_GH_TOKEN` 应设置为 `GH_TOKEN` 环境变量，用于发布流程。

## 回滚方案

如果 GitHub Provider 出现问题，恢复方案：
1. `electron-builder.yml` 改回 `generic` provider
2. `src/main/index.ts` 恢复 `UPDATE_SERVER_URL` 常量
3. 重新构建并发布

## 验收标准

1. 客户端启动后 5 秒开始检查更新
2. 检查更新时请求 GitHub API，而非旧的 HTTP 服务器
3. 发现新版本后自动下载，显示进度
4. 下载完成后提示用户重启安装
5. `npm run publish` 能正常构建并上传 Release 到 GitHub
