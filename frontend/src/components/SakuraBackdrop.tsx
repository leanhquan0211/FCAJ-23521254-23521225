import { useId, type CSSProperties } from 'react'

// Deterministic positions avoid random re-renders. SVG petals stay behind every route.
const petals = Array.from({ length: 28 }, (_, index) => ({
  left: (index * 37 + 7) % 100,
  size: 9 + (index % 5) * 3,
  duration: 12 + (index % 7) * 1.3,
  delay: -(index * 1.7 + 2),
  drift: (index % 2 ? -1 : 1) * (45 + (index % 4) * 28),
  rotation: (index * 43) % 180,
}))

export function SakuraBackdrop() {
  const id = useId().replace(/:/g, '')
  return <div className="sakura-backdrop" aria-hidden="true" inert>
    <svg className="sakura-definitions" width="0" height="0" focusable="false">
      <defs>
        <linearGradient id={`${id}-petal`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--color-petal-light)" /><stop offset=".48" stopColor="var(--color-petal)" /><stop offset="1" stopColor="var(--color-petal-deep)" />
        </linearGradient>
        <symbol id={`${id}-shape`} viewBox="0 0 32 36">
          <path d="M16 34C-3 24-2 7 9 2L16 7L22 1C36 9 34 25 16 34Z" fill={`url(#${id}-petal)`} />
          <path d="M9 6Q1 16 14 29Q7 16 12 10Z" fill="var(--color-petal-light)" opacity=".48" />
          <path d="M17 9Q25 20 16 33Q30 24 27 12Z" fill="var(--color-petal-deep)" opacity=".3" />
        </symbol>
      </defs>
    </svg>
    {petals.map((petal, index) => <div key={index} className="background-petal" style={{
      left: `${petal.left}%`, '--petal-size': `${petal.size}px`, '--petal-duration': `${petal.duration}s`,
      '--petal-delay': `${petal.delay}s`, '--petal-drift': `${petal.drift}px`, '--petal-rotation': `${petal.rotation}deg`,
    } as CSSProperties}>
      <svg viewBox="0 0 32 36" focusable="false"><use href={`#${id}-shape`} /></svg>
    </div>)}
  </div>
}
