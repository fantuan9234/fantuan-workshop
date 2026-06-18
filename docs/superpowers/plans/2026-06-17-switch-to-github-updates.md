# 切换到 GitHub Releases 更新 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将客户端自动更新从自建 HTTP 服务器迁移到 GitHub Releases，完全删除旧服务器相关代码

**Architecture:** 使用 electron-updater 内置的 `github` provider 替代现有的 `generic` provider；electron-builder.yml 和 main/index.ts 两处修改即可完成切换

**Tech Stack:** electron-updater v6.8.9, electron-builder, GitHub Releases

---

### Task 1: 修改 electron-builder.yml — publish 改为 github provider

**Files:**
- Modify: `electron-builder.yml:15-17`

- [ ] **Step 1: 将 generic provider 替换为 github provider**

  ```yaml
  publish:
    provider: github
    owner: fantuan9234
    repo: fantuan-workshop
  ```

  完整替换代码：

  ```
  替换前:
  publish:
    provider: generic
    url: http://211.101.247.248:923/
    # 部署说明：
    #   1. 在宝塔面板新建网站，域名填 211.101.247.248，端口 923
    #   2. 将以下 3 个文件上传到网站根目录：
    #      - latest.yml
    #      - fantuan-workshop-setup-${version}.exe
    #      - fantuan-workshop-setup-${version}.exe.blockmap
    #   3. 上传时注意：宝塔 nginx 默认限制上传大小 1MB，需在网站设置里改为 500m：
    #      client_max_body_size 500m;

  替换后:
  publish:
    provider: github
    owner: fantuan9234
    repo: fantuan-workshop
  ```

- [ ] **Step 2: 提交改动**

  ```bash
  git add electron-builder.yml
  git commit -m "feat: 切换到 GitHub Releases 更新通道"
  ```

### Task 2: 修改 src/main/index.ts — 删除服务器配置，改为 GitHub provider

**Files:**
- Modify: `src/main/index.ts:10-20`
- Modify: `src/main/index.ts:496-498`
- Modify: `src/main/index.ts:580-586`

- [ ] **Step 1: 删除 UPDATE_SERVER_URL 常量和旧的注释块**

  删除第 10-20 行:

  ```
  替换前（10-20 行）:
  // https / http 原用于更新源探测，切换到 generic 后不再需要
  
  // ============================================================
  // 更新服务器配置
  // ============================================================
  // TODO: 将此 URL 替换为你实际部署更新文件的服务器地址
  // 服务器上需要放置 electron-builder 产出的以下文件：
  //   - latest.yml
  //   - fantuan-workshop-setup-${version}.exe
  //   - fantuan-workshop-setup-${version}.exe.blockmap
  const UPDATE_SERVER_URL = 'http://211.101.247.248:923/'

  替换后（仅保留 import 之后空行）:
  // (空行)
  ```

- [ ] **Step 2: 添加 GitHub 配置常量（在 import 之后，日志配置之前）**

  ```
  替换前（第 10 行后，第 22 行前）:
  // (刚才删除后的空行位置)

  替换后:
  // ============================================================
  // GitHub Releases 更新配置
  // ============================================================
  const GITHUB_OWNER = 'fantuan9234'
  const GITHUB_REPO = 'fantuan-workshop'
  ```

- [ ] **Step 3: 更新 setupAutoUpdater 的 JSDoc 注释**

  第 496-498 行:
  ```
  替换前:
  /**
   * 强制更新策略：
   *   1. 启动后延迟 N 秒自动检查更新（从 UPDATE_SERVER_URL 下载 latest.yml）
   *   2. ...

  替换后:
  /**
   * 强制更新策略：
   *   1. 启动后延迟 N 秒自动检查更新（从 GitHub Releases 获取 latest.yml）
   *   2. ...
  ```

- [ ] **Step 4: 更新 setFeedURL 调用为 github provider**

  第 580-586 行（`checkForUpdates` 函数）:

  ```
  替换前:
    // 直接使用配置的更新服务器地址（generic provider）
    const checkForUpdates = async (): Promise<void> => {
      try {
        autoUpdater.setFeedURL({
          provider: 'generic',
          url: UPDATE_SERVER_URL,
        })
        await autoUpdater.checkForUpdates()
      } catch (e) {
        log.warn('检查更新失败:', e?.message || e)
      }
    }

  替换后:
    // 使用 GitHub Releases 检查更新
    const checkForUpdates = async (): Promise<void> => {
      try {
        autoUpdater.setFeedURL({
          provider: 'github',
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
        })
        await autoUpdater.checkForUpdates()
      } catch (e) {
        log.warn('检查更新失败:', e?.message || e)
      }
    }
  ```

- [ ] **Step 5: 提交改动**

  ```bash
  git add src/main/index.ts
  git commit -m "feat: 将更新源从自建服务器切换到 GitHub Releases"
  ```

### Task 3: 验证改动

**Files:**
- Check: `src/main/index.ts`
- Check: `electron-builder.yml`

- [ ] **Step 1: 检查 electron-builder.yml 没有遗留旧的 generic 配置**

  确认 `publish:` 下只有:
  ```yaml
  publish:
    provider: github
    owner: fantuan9234
    repo: fantuan-workshop
  ```

- [ ] **Step 2: 检查 src/main/index.ts 没有遗留 UPDATE_SERVER_URL**

  使用 grep 验证:
  ```
  grep "UPDATE_SERVER_URL" src/main/index.ts
  ```
  预期输出: 无（空）

- [ ] **Step 3: 检查 src/main/index.ts 没有遗留 'generic' 引用**

  使用 grep 验证:
  ```
  grep "generic" src/main/index.ts
  ```
  预期输出: 无（空）

- [ ] **Step 4: 检查 src/main/index.ts 包含新的 github provider 配置**

  使用 grep 验证:
  ```
  grep "github" src/main/index.ts
  ```
  预期输出:
  ```
  // GitHub Releases 更新配置
  const GITHUB_OWNER = 'fantuan9234'
  const GITHUB_REPO = 'fantuan-workshop'
          provider: 'github',
  ```

- [ ] **Step 5: 提交最终验证清理**

  ```bash
  git add -A
  git commit -m "chore: 清理旧更新服务器相关代码"
  ```
