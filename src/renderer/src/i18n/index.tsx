import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useSettings, type Locale } from '../data/useSettings'
import zh from './zh'
import en from './en'
import type { Translations } from './zh'

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
