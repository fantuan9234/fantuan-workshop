/**
 * UpdateStore — 跳过版本与用户偏好持久化
 * ----------------------------------------------------------------
 * 使用 app.getPath('userData')/updater-config.json 存储：
 *   - skippedVersions: string[] — 用户跳过的版本号列表
 *   - preferences: UpdatePreferences — 用户偏好
 *
 * 不引入 electron-store 依赖，用 fs 原生读写 JSON。
 */

import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { UpdatePreferences, DEFAULT_PREFERENCES } from './UpdaterState'

interface StoreData {
  skippedVersions: string[]
  preferences: UpdatePreferences
}

function getConfigPath(): string {
  const dir = app.getPath('userData')
  return join(dir, 'updater-config.json')
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function loadStore(): StoreData {
  try {
    const configPath = getConfigPath()
    if (!existsSync(configPath)) {
      return { skippedVersions: [], preferences: { ...DEFAULT_PREFERENCES } }
    }
    const raw = readFileSync(configPath, 'utf-8')
    const data = JSON.parse(raw) as Partial<StoreData>
    return {
      skippedVersions: Array.isArray(data.skippedVersions) ? data.skippedVersions : [],
      preferences: { ...DEFAULT_PREFERENCES, ...(data.preferences || {}) },
    }
  } catch {
    return { skippedVersions: [], preferences: { ...DEFAULT_PREFERENCES } }
  }
}

function saveStore(data: StoreData): void {
  try {
    const configPath = getConfigPath()
    ensureDir(configPath)
    writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('UpdateStore: 保存配置失败', err)
  }
}

/** 检查版本是否被跳过 */
export function isVersionSkipped(version: string): boolean {
  return loadStore().skippedVersions.includes(version)
}

/** 添加跳过的版本号 */
export function addSkippedVersion(version: string): void {
  const data = loadStore()
  if (!data.skippedVersions.includes(version)) {
    data.skippedVersions.push(version)
    saveStore(data)
  }
}

/** 清除跳过的版本号（安装新版本后调用） */
export function clearSkippedVersions(): void {
  const data = loadStore()
  data.skippedVersions = []
  saveStore(data)
}

/** 获取用户偏好 */
export function getPreferences(): UpdatePreferences {
  return loadStore().preferences
}

/** 更新用户偏好 */
export function setPreferences(prefs: Partial<UpdatePreferences>): UpdatePreferences {
  const data = loadStore()
  data.preferences = { ...data.preferences, ...prefs, lastCheckTimestamp: Date.now() }
  saveStore(data)
  return data.preferences
}

/** 获取已跳过的版本列表 */
export function getSkippedVersions(): string[] {
  return loadStore().skippedVersions
}