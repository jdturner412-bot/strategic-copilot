import { useEffect } from 'react'
import type { Settings } from '@/data/types'

/**
 * Resolve `auto` mode against the clock: light during the household's waking
 * hours, dark the rest of the time. The window wraps midnight when the dark
 * hour is later in the day than the light hour, which is the normal case.
 */
export function resolveTheme(settings: Settings, now = new Date()): 'light' | 'dark' {
  if (settings.themeMode !== 'auto') return settings.themeMode
  const hour = now.getHours()
  const { lightThemeStartHour: light, darkThemeStartHour: dark } = settings
  if (light === dark) return 'dark'
  const isLight = light < dark ? hour >= light && hour < dark : hour >= light || hour < dark
  return isLight ? 'light' : 'dark'
}

/** Apply the theme to <html> and keep it honest as the day rolls over. */
export function useTheme(settings: Settings): void {
  useEffect(() => {
    const apply = () => {
      const theme = resolveTheme(settings)
      document.documentElement.classList.toggle('dark', theme === 'dark')
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#0b1020' : '#f4f5f9')
    }
    apply()
    // A minute is precise enough for an hour-granularity switch and costs nothing.
    const timer = window.setInterval(apply, 60_000)
    return () => window.clearInterval(timer)
  }, [settings])
}
