import { useLayoutEffect, useState } from 'react'
import { Popover } from 'radix-ui'
import { Droplets, Layers3, Lightbulb, Palette, SlidersHorizontal, SquareRoundCorner } from '@/components/DimensionalIcons'
import { Button } from '@/components/ui/button'
import { APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE as defaults, applyAppearance, readAppearance } from '@/lib/appearance-preferences'

const compactQuery = '(max-width: 639px)'
const controls = [
  { key: 'transparency', title: 'Trong suốt', label: 'Độ trong suốt', icon: Droplets, max: 100, unit: '%' },
  { key: 'neon', title: 'Neon', label: 'Độ neon', icon: Lightbulb, max: 100, unit: '%' },
  { key: 'elevation', title: 'Bóng nổi', label: 'Độ bóng nổi', icon: Layers3, max: 100, unit: '%' },
  { key: 'hue', title: 'Sắc màu chủ đạo', label: 'Sắc màu chủ đạo', icon: Palette, max: 360, unit: '°' },
  { key: 'roundness', title: 'Bo góc', label: 'Độ bo góc', icon: SquareRoundCorner, max: 100, unit: '%' },
] as const
type AppearanceControl = (typeof controls)[number]

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
    applyAppearance(appearance)
    try { localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance)) } catch { /* Controls work without storage. */ }
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
