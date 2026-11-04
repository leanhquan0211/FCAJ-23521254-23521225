import { useLayoutEffect, useState } from 'react'
import { Moon, Sun } from '@/components/DimensionalIcons'
import { Button } from '@/components/ui/button'
import { THEME_STORAGE_KEY, applyTheme, readTheme } from '@/lib/appearance-preferences'

export function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme)
  useLayoutEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(THEME_STORAGE_KEY, theme) } catch { /* Theme works without storage. */ }
  }, [theme])
  const label = theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
  return <Button type="button" variant="ghost" size="icon" aria-label={label} title={label} className="theme-toggle size-11 shrink-0" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
    {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
  </Button>
}
