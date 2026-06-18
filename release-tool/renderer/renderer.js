/**
 * 饭团工坊发布工具 - 渲染进程逻辑
 */

// ============================================================
// DOM 元素
// ============================================================
const $ = (id) => document.getElementById(id)

const elements = {
  currentVersion: $('currentVersion'),
  projectPath: $('projectPath'),
  btnSelectDir: $('btnSelectDir'),
  newVersion: $('newVersion'),
  githubToken: $('githubToken'),
  giteeToken: $('giteeToken'),
  btnSaveConfig: $('btnSaveConfig'),
  btnPublish: $('btnPublish'),
  progressContainer: $('progressContainer'),
  progressStep: $('progressStep'),
  progressMessage: $('progressMessage'),
  progressFill: $('progressFill'),
  resultContainer: $('resultContainer'),
  resultVersion: $('resultVersion'),
  resultGithubUrl: $('resultGithubUrl'),
  resultGiteeUrl: $('resultGiteeUrl'),
  resultInstaller: $('resultInstaller'),
  logContent: $('logContent'),
  btnClearLog: $('btnClearLog'),
  statusText: $('statusText'),
}

// ============================================================
// 状态
// ============================================================
let isPublishing = false
let currentConfig = null

// ============================================================
// 日志
// ============================================================
function addLog(level, message) {
  // 移除空状态提示
  const empty = elements.logContent.querySelector('.log-empty')
  if (empty) empty.remove()

  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  const line = document.createElement('div')
  line.className = 'log-line'
  line.innerHTML = `<span class="log-time">${time}</span><span class="log-level-${level}">${escapeHtml(message)}</span>`
  elements.logContent.appendChild(line)
  elements.logContent.scrollTop = elements.logContent.scrollHeight
}

function clearLog() {
  elements.logContent.innerHTML = '<div class="log-empty">日志将在这里显示...</div>'
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ============================================================
// 状态栏
// ============================================================
function setStatus(text) {
  elements.statusText.textContent = text
}

// ============================================================
// 配置加载与保存
// ============================================================
async function loadConfig() {
  try {
    const config = await window.api.config.load()
    currentConfig = config
    elements.projectPath.value = config.projectPath || ''
    elements.githubToken.value = config.githubToken || ''
    elements.giteeToken.value = config.giteeToken || ''

    // 加载当前版本号
    if (config.projectPath) {
      await refreshVersion()
    }
  } catch (e) {
    addLog('error', '加载配置失败: ' + e.message)
  }
}

async function saveConfig() {
  const config = {
    projectPath: elements.projectPath.value,
    githubToken: elements.githubToken.value,
    giteeToken: elements.giteeToken.value,
  }
  try {
    await window.api.config.save(config)
    currentConfig = config
    addLog('ok', '配置已保存')
    setStatus('配置已保存')
  } catch (e) {
    addLog('error', '保存配置失败: ' + e.message)
  }
}

// ============================================================
// 版本号
// ============================================================
async function refreshVersion() {
  const projectPath = elements.projectPath.value
  if (!projectPath) {
    elements.currentVersion.textContent = '当前版本: 未设置项目路径'
    return
  }
  try {
    const result = await window.api.version.read(projectPath)
    if (result.success) {
      elements.currentVersion.textContent = `当前版本: v${result.version}`
      addLog('info', `读取到当前版本: v${result.version}`)
    } else {
      elements.currentVersion.textContent = '当前版本: 读取失败'
      addLog('error', '读取版本失败: ' + result.error)
    }
  } catch (e) {
    elements.currentVersion.textContent = '当前版本: 读取失败'
    addLog('error', '读取版本失败: ' + e.message)
  }
}

// 版本号自增
function handleBump(bumpType) {
  const versionText = elements.currentVersion.textContent
  const match = versionText.match(/v(\d+\.\d+\.\d+)/)
  if (!match) {
    addLog('error', '无法获取当前版本号，请先设置项目路径')
    return
  }

  const current = match[1]
  const parts = current.split('.').map((n) => parseInt(n, 10))
  let [major, minor, patch] = parts

  if (bumpType === 'major') {
    major += 1
    minor = 0
    patch = 0
  } else if (bumpType === 'minor') {
    minor += 1
    patch = 0
  } else if (bumpType === 'patch') {
    patch += 1
  }

  elements.newVersion.value = `${major}.${minor}.${patch}`
  addLog('info', `版本号自增 (${bumpType}): ${current} → ${major}.${minor}.${patch}`)
}

// ============================================================
// 目录选择
// ============================================================
async function selectDirectory() {
  try {
    const result = await window.api.dialog.selectDirectory()
    if (result.canceled) {
      if (result.error) {
        addLog('error', result.error)
      }
      return
    }
    elements.projectPath.value = result.path
    addLog('ok', `已选择项目目录: ${result.path}`)
    await refreshVersion()
  } catch (e) {
    addLog('error', '选择目录失败: ' + e.message)
  }
}

// ============================================================
// 发布
// ============================================================
async function publish() {
  if (isPublishing) {
    addLog('warn', '已有发布任务正在执行')
    return
  }

  // 参数校验
  const projectPath = elements.projectPath.value
  const newVersion = elements.newVersion.value.trim()
  const githubToken = elements.githubToken.value.trim()
  const giteeToken = elements.giteeToken.value.trim()

  if (!projectPath) {
    addLog('error', '请先选择项目路径')
    return
  }
  if (!githubToken || !giteeToken) {
    addLog('error', '请配置 GitHub 和 Gitee Token')
    return
  }
  if (!newVersion) {
    addLog('error', '请输入新版本号或点击版本自增按钮')
    return
  }
  if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(newVersion)) {
    addLog('error', '版本号格式无效，应为 x.y.z 格式（如 0.2.0）')
    return
  }

  // 确认发布
  const confirmed = confirm(`确认发布版本 v${newVersion}？\n\n将执行以下操作：\n1. 修改 package.json 版本号\n2. 构建并发布到 GitHub\n3. 同步到 Gitee\n\n发布过程中请勿关闭窗口。`)
  if (!confirmed) return

  // 开始发布
  isPublishing = true
  setPublishingState(true)
  clearLog()
  elements.resultContainer.style.display = 'none'
  elements.progressContainer.style.display = 'block'
  updateProgress(0, 6, '准备中...')

  addLog('step', '═══════════════════════════════════════════')
  addLog('step', `开始发布版本 v${newVersion}`)
  addLog('step', '═══════════════════════════════════════════')

  try {
    const result = await window.api.publish.run({
      projectPath,
      newVersion,
      githubToken,
      giteeToken,
    })

    if (result.success) {
      updateProgress(6, 6, '完成')
      showResult(result)
      addLog('ok', '发布流程全部完成！')
      setStatus(`发布完成: v${newVersion}`)
      // 刷新当前版本号显示
      await refreshVersion()
      elements.newVersion.value = ''
    } else {
      addLog('error', '发布失败: ' + result.error)
      setStatus('发布失败')
    }
  } catch (e) {
    addLog('error', '发布异常: ' + e.message)
    setStatus('发布异常')
  } finally {
    isPublishing = false
    setPublishingState(false)
  }
}

function setPublishingState(publishing) {
  elements.btnPublish.disabled = publishing
  elements.btnPublish.textContent = publishing ? '⏳ 发布中...' : '🚀 一键发布'
  elements.projectPath.readOnly = publishing
  elements.githubToken.readOnly = publishing
  elements.giteeToken.readOnly = publishing
  elements.btnSaveConfig.disabled = publishing
  elements.btnSelectDir.disabled = publishing
  document.querySelectorAll('.btn-bump').forEach((btn) => {
    btn.disabled = publishing
  })
}

function updateProgress(step, total, message) {
  elements.progressStep.textContent = `步骤 ${step}/${total}`
  elements.progressMessage.textContent = message
  const pct = (step / total) * 100
  elements.progressFill.style.width = `${pct}%`
}

function showResult(result) {
  elements.resultContainer.style.display = 'block'
  elements.resultVersion.textContent = `v${result.version}`
  elements.resultGithubUrl.textContent = result.githubUrl
  elements.resultGithubUrl.href = result.githubUrl
  elements.resultGiteeUrl.textContent = result.giteeUrl
  elements.resultGiteeUrl.href = result.giteeUrl
  elements.resultInstaller.textContent = result.installerPath
}

// ============================================================
// 事件绑定
// ============================================================
function initEvents() {
  // 选择目录
  elements.btnSelectDir.addEventListener('click', selectDirectory)

  // 保存配置
  elements.btnSaveConfig.addEventListener('click', saveConfig)

  // 版本自增按钮
  document.querySelectorAll('.btn-bump').forEach((btn) => {
    btn.addEventListener('click', () => handleBump(btn.dataset.bump))
  })

  // 发布
  elements.btnPublish.addEventListener('click', publish)

  // 清空日志
  elements.btnClearLog.addEventListener('click', clearLog)

  // Token 显示/隐藏切换
  document.querySelectorAll('.btn-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = $(btn.dataset.target)
      target.type = target.type === 'password' ? 'text' : 'password'
    })
  })

  // 监听主进程推送的日志
  window.api.publish.onLog((data) => {
    addLog(data.level, data.message)
  })

  // 监听主进程推送的进度
  window.api.publish.onProgress((data) => {
    updateProgress(data.step, data.totalSteps, data.message)
  })

  // 输入框变化时自动保存到内存配置
  [elements.projectPath, elements.githubToken, elements.giteeToken].forEach((input) => {
    input.addEventListener('change', () => {
      if (currentConfig) {
        currentConfig.projectPath = elements.projectPath.value
        currentConfig.githubToken = elements.githubToken.value
        currentConfig.giteeToken = elements.giteeToken.value
      }
    })
  })

  // 项目路径变化时刷新版本号
  elements.projectPath.addEventListener('change', refreshVersion)
}

// ============================================================
// 初始化
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  initEvents()
  addLog('info', '饭团工坊发布工具已启动')
  await loadConfig()
  setStatus('就绪')
})
