import { useLayoutEffect, useState } from 'react'
import { Moon, Sun } from '@/components/DimensionalIcons'
import { Button } from '@/components/ui/button'

type Theme = 'dark' | 'light'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem('event-workshop:theme') === 'light' ? 'light' : 'dark' }
    catch { return 'dark' }
  })
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('event-workshop:theme', theme) } catch { /* Theme works without storage. */ }
  }, [theme])
  const label = theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
  return <Button type="button" variant="ghost" size="icon" aria-label={label} title={label} className="theme-toggle size-11 shrink-0" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
    {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
  </Button>
}
