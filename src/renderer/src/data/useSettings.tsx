import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light'
export type Locale = 'zh' | 'en'

interface SettingsContextValue {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  locale: Locale
  setLocale: (locale: Locale) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider')
  return ctx
}

const STORAGE_KEY_THEME = 'fantuan_theme'
const STORAGE_KEY_LOCALE = 'fantuan_locale'

export function SettingsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode) || 'dark'
  })
  const [locale, setLocaleState] = useState<Locale>(() => {
    return (localStorage.getItem(STORAGE_KEY_LOCALE) as Locale) || 'zh'
  })

  // 应用主题到 document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY_THEME, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOCALE, locale)
  }, [locale])

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), [])
  const setLocale = useCallback((l: Locale) => setLocaleState(l), [])

  return (
    <SettingsContext.Provider value={{ theme, setTheme, locale, setLocale }}>
      {children}
    </SettingsContext.Provider>
  )
}
