import { useLayoutEffect, useState } from 'react'
import { Popover } from 'radix-ui'
import { Droplets, Layers3, Lightbulb } from '@/components/DimensionalIcons'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'event-workshop:appearance'
const defaults = { transparency: 65, neon: 70, elevation: 60 }
type Appearance = typeof defaults

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
    }
  } catch { return defaults }
}

export function AppearanceControls() {
  const [appearance, setAppearance] = useState(readAppearance)
  useLayoutEffect(() => {
    const style = document.documentElement.style
    const opacity = 1 - appearance.transparency / 100
    style.setProperty('--glass-opacity', String(opacity))
    style.setProperty('--header-opacity', String(opacity * (25 / 35)))
    style.setProperty('--neon-intensity', String(appearance.neon / 70))
    style.setProperty('--elevation-strength', String(appearance.elevation / 60))
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance)) } catch { /* Controls work without storage. */ }
  }, [appearance])

  return <div className="appearance-actions" role="group" aria-label="Tùy chỉnh giao diện">
    {([
      { key: 'transparency', title: 'Trong suốt', label: 'Độ trong suốt', icon: Droplets },
      { key: 'neon', title: 'Neon', label: 'Độ neon', icon: Lightbulb },
      { key: 'elevation', title: 'Bóng nổi', label: 'Độ bóng nổi', icon: Layers3 },
    ] as const).map(({ key, title, label, icon: Icon }) => <Popover.Root key={key}>
      <Popover.Trigger asChild><Button type="button" variant="ghost" size="icon" className="size-11 shrink-0"
        data-appearance={key} aria-label={`Điều chỉnh ${label.toLowerCase()}`} title={`Điều chỉnh ${label.toLowerCase()}`}>
        <Icon size={20} aria-hidden="true" />
      </Button></Popover.Trigger>
      <Popover.Portal><Popover.Content className="appearance-popover" side="bottom" align="end" sideOffset={8} collisionPadding={12} aria-label={label}>
        <label className="appearance-setting" htmlFor={`appearance-${key}`}>
          <span>{title}<output htmlFor={`appearance-${key}`}>{appearance[key]}%</output></span>
          <input id={`appearance-${key}`} type="range" min="0" max="100" step="1" value={appearance[key]}
            aria-label={label} aria-valuetext={`${appearance[key]}%`}
            onChange={event => setAppearance(previous => ({ ...previous, [key]: Number(event.target.value) }))} />
        </label>
      </Popover.Content></Popover.Portal>
    </Popover.Root>)}
  </div>
}
