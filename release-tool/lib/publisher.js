/**
 * 饭团工坊发布工具 - 发布逻辑核心
 *
 * 整合了：
 *   1. package.json 版本号修改
 *   2. electron-builder 构建 + GitHub Release 发布
 *   3. GitHub 资产下载
 *   4. Gitee Release 创建 + 资产上传
 *
 * 所有日志通过 onLog 回调推送，进度通过 onProgress 回调推送
 */

const { execSync } = require('child_process')
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')

// ============================================================
// 版本号工具
// ============================================================

function isValidVersion(v) {
  return /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v)
}

function bumpVersion(current, type) {
  const [mainPart] = current.split('-')
  const parts = mainPart.split('.').map((n) => parseInt(n, 10))
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`无法解析版本号: ${current}`)
  }
  let [major, minor, patch] = parts
  if (type === 'major') {
    major += 1
    minor = 0
    patch = 0
  } else if (type === 'minor') {
    minor += 1
    patch = 0
  } else if (type === 'patch') {
    patch += 1
  } else {
    throw new Error(`未知的版本类型: ${type}`)
  }
  return `${major}.${minor}.${patch}`
}

function readPackageVersion(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  return pkg.version
}

function setPackageVersion(projectPath, newVersion) {
  const pkgPath = path.join(projectPath, 'package.json')
  const pkgRaw = fs.readFileSync(pkgPath, 'utf-8')
  const pkg = JSON.parse(pkgRaw)
  const oldVersion = pkg.version
  pkg.version = newVersion
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
  return { oldVersion, newVersion }
}

// ============================================================
// HTTP 工具函数
// ============================================================

function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: { 'User-Agent': 'fantuan-release-tool', ...headers },
    }
    https.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGetJson(res.headers.location, headers).then(resolve).catch(reject)
        return
      }
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 500)}`))
          return
        }
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve(data)
        }
      })
    }).on('error', reject)
  })
}

function downloadFile(url, destPath, headers = {}, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    const handler = (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close()
        fs.unlinkSync(destPath)
        downloadFile(response.headers.location, destPath, headers, onProgress).then(resolve).catch(reject)
        return
      }
      if (response.statusCode >= 400) {
        file.close()
        fs.unlinkSync(destPath)
        reject(new Error(`下载失败 HTTP ${response.statusCode}`))
        return
      }
      const total = parseInt(response.headers['content-length'] || '0', 10)
      let downloaded = 0
      let lastLog = 0
      response.on('data', (chunk) => {
        downloaded += chunk.length
        if (total > 0 && onProgress) {
          const now = Date.now()
          if (now - lastLog > 500) {
            onProgress(downloaded, total)
            lastLog = now
          }
        }
      })
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }
    const client = url.startsWith('https://') ? https : http
    client.get(url, { headers: { 'User-Agent': 'fantuan-release-tool', ...headers } }, handler)
      .on('error', (err) => {
        file.close()
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
        reject(err)
      })
  })
}

// ============================================================
// Gitee API
// ============================================================

const GITEE_CONFIG = {
  owner: 'fantuan9234',
  repo: 'fantuan-workshop',
  apiHost: 'gitee.com',
}

function giteeCreateRelease(token, tag, name, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      access_token: token,
      tag_name: tag,
      name: name,
      body: body || `饭团工坊 v${name}`,
      target_commitish: 'main',
    })
    const opts = {
      hostname: GITEE_CONFIG.apiHost,
      path: `/api/v5/repos/${GITEE_CONFIG.owner}/${GITEE_CONFIG.repo}/releases`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Content-Length': Buffer.byteLength(postData),
      },
    }
    const req = https.request(opts, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Gitee 创建 Release 失败 HTTP ${res.statusCode}: ${data}`))
          return
        }
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error(`Gitee 返回非 JSON: ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

function giteeUploadAsset(token, releaseId, filePath, onLog) {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath)
    const fileBuffer = fs.readFileSync(filePath)
    const boundary = '----FormBoundary' + Math.random().toString(16).slice(2)

    const parts = []
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="access_token"\r\n\r\n` +
      `${token}\r\n`
    )

    const fileHeader = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`
    )
    const fileEnd = Buffer.from(`\r\n--${boundary}--\r\n`)

    const body = Buffer.concat([
      Buffer.from(parts[0]),
      fileHeader,
      fileBuffer,
      fileEnd,
    ])

    const opts = {
      hostname: GITEE_CONFIG.apiHost,
      path: `/api/v5/repos/${GITEE_CONFIG.owner}/${GITEE_CONFIG.repo}/releases/${releaseId}/attach_files`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }

    if (onLog) onLog('info', `  上传 ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)...`)

    const req = https.request(opts, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Gitee 上传 ${fileName} 失败 HTTP ${res.statusCode}: ${data.substring(0, 300)}`))
          return
        }
        try {
          const json = JSON.parse(data)
          if (onLog) onLog('ok', `  ${fileName} 上传成功`)
          resolve(json)
        } catch {
          if (onLog) onLog('ok', `  ${fileName} 上传完成`)
          resolve({ name: fileName })
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function giteeDeleteExistingRelease(token, tag, onLog) {
  return new Promise((resolve) => {
    httpsGetJson(
      `https://${GITEE_CONFIG.apiHost}/api/v5/repos/${GITEE_CONFIG.owner}/${GITEE_CONFIG.repo}/releases?access_token=${token}`
    ).then((releases) => {
      const existing = releases.find((r) => r.tag_name === tag)
      if (!existing) {
        resolve(false)
        return
      }
      if (onLog) onLog('warn', `Gitee 上已存在 tag=${tag} 的 Release，正在删除...`)
      const opts = {
        hostname: GITEE_CONFIG.apiHost,
        path: `/api/v5/repos/${GITEE_CONFIG.owner}/${GITEE_CONFIG.repo}/releases/${existing.id}?access_token=${token}`,
        method: 'DELETE',
      }
      const req = https.request(opts, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          if (onLog) onLog('ok', `已删除 Gitee 旧 Release (id=${existing.id})`)
          resolve(true)
        })
      })
      req.on('error', () => resolve(false))
      req.end()
    }).catch(() => resolve(false))
  })
}

// ============================================================
// 主发布流程
// ============================================================

/**
 * 执行完整发布流程
 * @param {Object} params
 *   - projectPath: 饭团工坊项目路径
 *   - newVersion: 新版本号（与 bumpType 二选一）
 *   - bumpType: 版本类型 patch/minor/major（与 newVersion 二选一）
 *   - githubToken: GitHub Token
 *   - giteeToken: Gitee Token
 *   - onLog: 日志回调 (level, message) => void
 *   - onProgress: 进度回调 (step, totalSteps, message) => void
 */
async function publishRelease(params) {
  const { projectPath, newVersion, bumpType, githubToken, giteeToken, onLog, onProgress } = params

  const log = (level, message) => onLog && onLog(level, message)
  const progress = (step, totalSteps, message) => onProgress && onProgress(step, totalSteps, message)

  const GITHUB_CONFIG = {
    owner: 'fantuan9234',
    repo: 'fantuan-workshop',
    token: githubToken,
    apiHost: 'api.github.com',
  }

  const TOTAL_STEPS = 6

  // ---- 计算目标版本号 ----
  const currentVersion = readPackageVersion(projectPath)
  let targetVersion

  if (newVersion && isValidVersion(newVersion)) {
    targetVersion = newVersion
  } else if (bumpType) {
    targetVersion = bumpVersion(currentVersion, bumpType)
  } else {
    throw new Error('未指定有效的版本号或版本类型')
  }

  log('info', `当前版本: ${currentVersion}`)
  log('info', `目标版本: ${targetVersion}`)
  log('info', `项目路径: ${projectPath}`)

  // ---- 步骤 1: 修改 package.json 版本号 ----
  progress(1, TOTAL_STEPS, '修改 package.json 版本号')
  log('info', `━━━ 步骤 1/6: 修改 package.json 版本号 ━━━`)

  const { oldVersion } = setPackageVersion(projectPath, targetVersion)
  log('ok', `package.json 版本号: ${oldVersion} → ${targetVersion}`)

  // ---- 步骤 2: 构建 + 发布到 GitHub ----
  progress(2, TOTAL_STEPS, '构建并发布到 GitHub Releases')
  log('info', `━━━ 步骤 2/6: 构建并发布到 GitHub Releases ━━━`)
  log('info', '运行 electron-builder --win --x64 --publish always ...')

  try {
    execSync('npx electron-builder --win --x64 --publish always', {
      stdio: 'pipe',
      cwd: projectPath,
      env: { ...process.env, GH_TOKEN: githubToken },
    })
    log('ok', 'GitHub Release 发布成功')
  } catch (e) {
    log('error', 'GitHub 发布失败: ' + e.message)
    throw new Error(`GitHub 发布失败。package.json 版本号已改为 ${targetVersion}，如需回滚请手动改回 ${oldVersion}`)
  }

  // ---- 步骤 3: 获取 GitHub Release 资产信息 ----
  progress(3, TOTAL_STEPS, '获取 GitHub Release 资产信息')
  log('info', `━━━ 步骤 3/6: 获取 GitHub Release 资产信息 ━━━`)

  const tag = `v${targetVersion}`
  let ghRelease
  try {
    ghRelease = await httpsGetJson(
      `https://${GITHUB_CONFIG.apiHost}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/releases/tags/${tag}`,
      { Authorization: `token ${githubToken}` }
    )
    log('ok', `GitHub Release: ${ghRelease.name} (tag=${ghRelease.tag_name})`)
    log('info', `资产数量: ${ghRelease.assets.length}`)
    ghRelease.assets.forEach((a) => {
      log('info', `  - ${a.name} (${(a.size / 1024 / 1024).toFixed(2)} MB)`)
    })
  } catch (e) {
    log('error', '获取 GitHub Release 信息失败: ' + e.message)
    throw e
  }

  // ---- 步骤 4: 下载资产到临时目录 ----
  progress(4, TOTAL_STEPS, '下载 GitHub 资产到临时目录')
  log('info', `━━━ 步骤 4/6: 下载 GitHub 资产到临时目录 ━━━`)

  const tmpDir = path.join(os.tmpdir(), `fantuan-publish-${targetVersion}-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  log('info', `临时目录: ${tmpDir}`)

  const ghDownloadBase = `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/releases/download/${tag}`
  const downloadedFiles = []
  const largeFiles = []

  for (const asset of ghRelease.assets) {
    const destPath = path.join(tmpDir, asset.name)
    log('info', `下载 ${asset.name} ...`)

    await downloadFile(asset.browser_download_url, destPath, {
      Authorization: `token ${githubToken}`,
      Accept: 'application/octet-stream',
    }, (downloaded, total) => {
      const pct = ((downloaded / total) * 100).toFixed(1)
      const mb = (downloaded / 1024 / 1024).toFixed(1)
      const totalMb = (total / 1024 / 1024).toFixed(1)
      log('info', `  ${asset.name}: ${pct}% (${mb}/${totalMb} MB)`)
    })

    downloadedFiles.push(destPath)
    log('ok', `  已保存: ${destPath}`)

    if (asset.size > 100 * 1024 * 1024) {
      largeFiles.push(asset.name)
      log('warn', `  ${asset.name} 超过 Gitee 100MB 限制，将跳过上传（URL 改写为 GitHub）`)
    }
  }

  // 改写 latest.yml（如果有超大文件）
  if (largeFiles.length > 0) {
    const ymlPath = path.join(tmpDir, 'latest.yml')
    if (fs.existsSync(ymlPath)) {
      let ymlContent = fs.readFileSync(ymlPath, 'utf-8')
      for (const fname of largeFiles) {
        const ghFullUrl = `${ghDownloadBase}/${fname}`
        const escapedFname = fname.replace(/\./g, '\\.')
        ymlContent = ymlContent.replace(
          new RegExp(`(^\\s*-\\s*url:\\s*)${escapedFname}`, 'gm'),
          `$1${ghFullUrl}`
        )
        ymlContent = ymlContent.replace(
          new RegExp(`(^path:\\s*)${escapedFname}`, 'gm'),
          `$1${ghFullUrl}`
        )
      }
      fs.writeFileSync(ymlPath, ymlContent, 'utf-8')
      log('ok', '已改写 latest.yml：安装包 URL 指向 GitHub')
    }
  }

  // ---- 步骤 5: 创建 Gitee Release + 上传资产 ----
  progress(5, TOTAL_STEPS, '创建 Gitee Release 并上传资产')
  log('info', `━━━ 步骤 5/6: 创建 Gitee Release 并上传资产 ━━━`)

  await giteeDeleteExistingRelease(giteeToken, tag, log)

  let giteeRelease
  try {
    giteeRelease = await giteeCreateRelease(giteeToken, tag, targetVersion, ghRelease.body || '')
    log('ok', `Gitee Release 创建成功: ${giteeRelease.name} (id=${giteeRelease.id})`)
  } catch (e) {
    log('error', 'Gitee Release 创建失败: ' + e.message)
    log('warn', '临时文件保留在: ' + tmpDir)
    throw e
  }

  for (const filePath of downloadedFiles) {
    const fileName = path.basename(filePath)
    if (largeFiles.includes(fileName)) {
      log('info', `  跳过 ${fileName}（超过 Gitee 100MB 限制）`)
      continue
    }
    try {
      await giteeUploadAsset(giteeToken, giteeRelease.id, filePath, log)
    } catch (e) {
      log('error', `上传 ${fileName} 失败: ${e.message}`)
      log('warn', '其他资产继续上传...')
    }
  }

  // ---- 步骤 6: 清理临时文件 ----
  progress(6, TOTAL_STEPS, '清理临时文件')
  log('info', `━━━ 步骤 6/6: 清理临时文件 ━━━`)

  try {
    for (const f of downloadedFiles) {
      if (fs.existsSync(f)) fs.unlinkSync(f)
    }
    fs.rmdirSync(tmpDir)
    log('ok', '临时文件已清理')
  } catch (e) {
    log('warn', '清理临时文件失败（不影响发布）: ' + e.message)
  }

  // ---- 完成 ----
  log('ok', '═══════════════════════════════════════════')
  log('ok', `✅ 双源发布完成！版本: v${targetVersion}`)
  log('ok', '═══════════════════════════════════════════')
  log('info', `GitHub: https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/releases/tag/${tag}`)
  log('info', `Gitee:  https://gitee.com/${GITEE_CONFIG.owner}/${GITEE_CONFIG.repo}/releases/${tag}`)
  log('info', `本地安装包: ${path.join(projectPath, 'dist', `饭团工坊 Setup ${targetVersion}.exe`)}`)

  return {
    version: targetVersion,
    githubUrl: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/releases/tag/${tag}`,
    giteeUrl: `https://gitee.com/${GITEE_CONFIG.owner}/${GITEE_CONFIG.repo}/releases/${tag}`,
    installerPath: path.join(projectPath, 'dist', `饭团工坊 Setup ${targetVersion}.exe`),
  }
}

module.exports = {
  publishRelease,
  readPackageVersion,
  setPackageVersion,
  isValidVersion,
  bumpVersion,
}
