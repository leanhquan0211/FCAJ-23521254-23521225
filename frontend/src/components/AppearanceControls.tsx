import { useLayoutEffect, useState } from 'react'
import { Popover } from 'radix-ui'
import { Droplets, Layers3, Lightbulb, Palette, SlidersHorizontal, SquareRoundCorner } from '@/components/DimensionalIcons'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'event-workshop:appearance'
const defaults = { transparency: 65, neon: 70, elevation: 60, hue: 350, roundness: 50 }
type Appearance = typeof defaults
const compactQuery = '(max-width: 639px)'
const controls = [
  { key: 'transparency', title: 'Trong suốt', label: 'Độ trong suốt', icon: Droplets, max: 100, unit: '%' },
  { key: 'neon', title: 'Neon', label: 'Độ neon', icon: Lightbulb, max: 100, unit: '%' },
  { key: 'elevation', title: 'Bóng nổi', label: 'Độ bóng nổi', icon: Layers3, max: 100, unit: '%' },
  { key: 'hue', title: 'Sắc màu chủ đạo', label: 'Sắc màu chủ đạo', icon: Palette, max: 360, unit: '°' },
  { key: 'roundness', title: 'Bo góc', label: 'Độ bo góc', icon: SquareRoundCorner, max: 100, unit: '%' },
] as const
type AppearanceControl = (typeof controls)[number]

function bounded(value: unknown, fallback: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(maximum, Math.max(0, value)) : fallback
}

function readAppearance(): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return {
      transparency: bounded(saved?.transparency, defaults.transparency, 100),
      neon: bounded(saved?.neon, defaults.neon, 100),
      elevation: bounded(saved?.elevation, defaults.elevation, 100),
      hue: bounded(saved?.hue, defaults.hue, 360),
      roundness: bounded(saved?.roundness, defaults.roundness, 100),
    }
  } catch { return defaults }
}

export function AppearanceControls() {
  const [appearance, setAppearance] = useState(readAppearance)
  const [compact, setCompact] = useState(() => window.matchMedia(compactQuery).matches)
  useLayoutEffect(() => {
    const media = window.matchMedia(compactQuery)
    const update = () => setCompact(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useLayoutEffect(() => {
    const style = document.documentElement.style
    const opacity = 1 - appearance.transparency / 100
    style.setProperty('--glass-opacity', String(opacity))
    style.setProperty('--header-opacity', String(opacity * (25 / 35)))
    style.setProperty('--neon-intensity', String(appearance.neon / 70))
    style.setProperty('--elevation-strength', String(appearance.elevation / 60))
    style.setProperty('--brand-hue', String(appearance.hue))
    style.setProperty('--roundness-level', String(appearance.roundness))
    // Cyan/green need a slightly deeper accent to keep light-theme text readable.
    const lightAccent = .52 - .05 * Math.max(0, Math.cos((appearance.hue - 180) * Math.PI / 180))
    style.setProperty('--light-accent-lightness', String(lightAccent))
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance)) } catch { /* Controls work without storage. */ }
  }, [appearance])

  function setting({ key, title, label, max, unit }: AppearanceControl) {
    return <>
      <label className="appearance-setting" data-setting={key} htmlFor={`appearance-${key}`}>
        <span>{title}<output htmlFor={`appearance-${key}`}>{appearance[key]}{unit}</output></span>
        <input id={`appearance-${key}`} type="range" min="0" max={max} step="1" value={appearance[key]}
          aria-label={label} aria-valuetext={key === 'hue' ? `${appearance[key]} độ` : `${appearance[key]}%`}
          onChange={event => setAppearance(previous => ({ ...previous, [key]: Number(event.target.value) }))} />
      </label>
      {key === 'hue' && <Button type="button" variant="outline" className="mt-2 min-h-11 w-full" data-reset-hue
        onClick={() => setAppearance(previous => ({ ...previous, hue: defaults.hue }))}>Về màu mặc định</Button>}
    </>
  }

  if (compact) return <div className="appearance-actions" role="group" aria-label="Tùy chỉnh giao diện">
    <Popover.Root>
      <Popover.Trigger asChild><Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" data-appearance-menu aria-label="Tùy chỉnh giao diện" title="Tùy chỉnh giao diện"><SlidersHorizontal size={20} aria-hidden="true" /></Button></Popover.Trigger>
      <Popover.Portal><Popover.Content className="appearance-popover appearance-panel" side="bottom" align="end" sideOffset={8} collisionPadding={12} aria-label="Tùy chỉnh giao diện">
        {controls.map(control => <div key={control.key} className="appearance-panel-row">{setting(control)}</div>)}
      </Popover.Content></Popover.Portal>
    </Popover.Root>
  </div>

  return <div className="appearance-actions" role="group" aria-label="Tùy chỉnh giao diện">
    {controls.map(control => {
      const { key, label, icon: Icon } = control
      return <Popover.Root key={key}>
        <Popover.Trigger asChild><Button type="button" variant="ghost" size="icon" className="size-11 shrink-0"
          data-appearance={key} aria-label={`Điều chỉnh ${label.toLowerCase()}`} title={`Điều chỉnh ${label.toLowerCase()}`}>
          <Icon size={20} aria-hidden="true" />
        </Button></Popover.Trigger>
        <Popover.Portal><Popover.Content className="appearance-popover" side="bottom" align="end" sideOffset={8} collisionPadding={12} aria-label={label}>
          {setting(control)}
        </Popover.Content></Popover.Portal>
      </Popover.Root>
    })}
  </div>
}
