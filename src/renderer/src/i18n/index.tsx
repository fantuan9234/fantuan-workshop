import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useSettings, type Locale } from '../data/useSettings'
import zh from './zh'
import en from './en'
import type { Translations } from './zh'
import { lookupItemName } from './zhItemNames'
import { genericTranslate } from './zhWordFallback'

const translations: Record<Locale, Translations> = { zh, en }

/** 模块级 locale 缓存，供非 React 上下文（如 ErrorBoundary）读取 */
let _currentLocale: Locale = 'zh'

/** 获取当前 locale（供非 React 上下文使用） */
export function getCurrentLocale(): Locale {
  return _currentLocale
}

/** 获取翻译函数（供非 React 上下文使用，如 class component） */
export function getT(): (key: string) => string {
  const dict = translations[_currentLocale]
  return (key: string): string => {
    const keys = key.split('.')
    let current: any = dict
    for (const k of keys) {
      if (current == null) return key
      current = current[k]
    }
    return typeof current === 'string' ? current : key
  }
}

/** 按点号路径获取嵌套值；返回 string 或 string[]，找不到时返回 key */
function getNestedValue(obj: any, path: string): string | string[] {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null) return path
    current = current[key]
  }
  if (typeof current === 'string') return current
  if (Array.isArray(current) && current.every(c => typeof c === 'string')) return current as string[]
  return path
}

interface I18nContextValue {
  locale: Locale
  t: (key: string) => string | string[]
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }): JSX.Element {
  const { locale } = useSettings()

  // 同步模块级 locale 缓存
  _currentLocale = locale

  const t = useCallback((key: string): string | string[] => {
    return getNestedValue(translations[locale], key) || key
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useT(): (key: string) => string | string[] {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be inside I18nProvider')
  return ctx.t
}

export function useLocale(): Locale {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useLocale must be inside I18nProvider')
  return ctx.locale
}

/** 安全地把 t 的返回值收窄为 string（找不到时回退到 key 自身） */
export function asString(t: (key: string) => string | string[], key: string, fallback?: string): string {
  const v = t(key)
  return typeof v === 'string' ? v : (fallback ?? key)
}

/** 把 t 的返回值收窄为 string[]（找不到时回退到空数组） */
export function asArray(t: (key: string) => string | string[], key: string): string[] {
  const v = t(key)
  return Array.isArray(v) ? v : []
}

/**
 * 判断文本是否包含中文字符
 */
function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}

/**
 * 翻译物品显示名称
 * - 已包含中文 → 直接返回
 * - 先查 zhItemNames 精确字典
 * - 再尝试通用英文→中文回退
 * - 都找不到 → 返回原英文名
 */
export function translateItemName(englishName: string, locale: string = 'zh'): string {
  if (!englishName || locale !== 'zh') return englishName
  if (hasChinese(englishName)) return englishName

  // 一级回退：精确字典查询
  const exact = lookupItemName(englishName)
  if (exact) return exact

  // 二级回退：通用单词级翻译
  const generic = genericTranslate(englishName)
  if (generic) return generic

  return englishName
}

/**
 * 翻译物品描述
 * - 已包含中文 → 直接返回
 * - 先尝试逐词替换已知物品名
 * - 再尝试通用单词级翻译
 * - 都找不到 → 返回原英文描述
 */
export function translateDescription(englishDesc: string, locale: string = 'zh', itemName?: string): string {
  if (!englishDesc || locale !== 'zh') return englishDesc
  if (hasChinese(englishDesc)) return englishDesc

  // 如果物品名已知且存在于描述中，先替换
  let desc = englishDesc
  if (itemName) {
    const translated = translateItemName(itemName, locale)
    if (translated !== itemName) {
      desc = desc.replace(new RegExp(itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), translated)
    }
  }

  // 尝试通用翻译
  const generic = genericTranslate(desc)
  if (generic) return generic

  return desc
}
