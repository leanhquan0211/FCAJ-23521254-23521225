export const APPEARANCE_STORAGE_KEY = 'event-workshop:appearance'
export const THEME_STORAGE_KEY = 'event-workshop:theme'
export const DEFAULT_APPEARANCE = { transparency: 90, neon: 45, elevation: 35, hue: 24, roundness: 0 }
export type Appearance = typeof DEFAULT_APPEARANCE
export type Theme = 'light' | 'dark'
export const DEFAULT_THEME: Theme = 'light'

function bounded(value: unknown, fallback: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(maximum, Math.max(0, value)) : fallback
}

export function readAppearance(): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? 'null')
    return {
      transparency: bounded(saved?.transparency, DEFAULT_APPEARANCE.transparency, 100),
      neon: bounded(saved?.neon, DEFAULT_APPEARANCE.neon, 100),
      elevation: bounded(saved?.elevation, DEFAULT_APPEARANCE.elevation, 100),
      hue: bounded(saved?.hue, DEFAULT_APPEARANCE.hue, 360),
      roundness: bounded(saved?.roundness, DEFAULT_APPEARANCE.roundness, 100),
    }
  } catch { return { ...DEFAULT_APPEARANCE } }
}

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'dark' || saved === 'light' ? saved : DEFAULT_THEME
  } catch { return DEFAULT_THEME }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function applyAppearance(appearance: Appearance) {
  const style = document.documentElement.style
  const opacity = 1 - appearance.transparency / 100
  style.setProperty('--glass-opacity', String(opacity))
  style.setProperty('--header-opacity', String(opacity * (25 / 35)))
  style.setProperty('--neon-intensity', String(appearance.neon / 70))
  style.setProperty('--elevation-strength', String(appearance.elevation / 60))
  style.setProperty('--brand-hue', String(appearance.hue))
  style.setProperty('--roundness-level', String(appearance.roundness))
  // Keep light-theme text readable around cyan/green without changing the hue.
  const lightAccent = .52 - .05 * Math.max(0, Math.cos((appearance.hue - 180) * Math.PI / 180))
  style.setProperty('--light-accent-lightness', String(lightAccent))
}
