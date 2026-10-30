import { useId } from 'react'

// Dimensional vector mark: shaded petals and highlights, no text glyphs.
export function BrandMark({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return <svg viewBox="0 0 80 80" className={`brand-mark ${className}`} fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-face`} x1="18" y1="6" x2="44" y2="38" gradientUnits="userSpaceOnUse"><stop stopColor="var(--color-petal-light)" /><stop offset=".45" stopColor="var(--color-petal)" /><stop offset="1" stopColor="var(--color-petal-deep)" /></linearGradient>
      <radialGradient id={`${id}-core`}><stop stopColor="var(--color-petal-light)" /><stop offset=".4" stopColor="var(--color-petal)" /><stop offset="1" stopColor="var(--color-petal-deep)" /></radialGradient>
    </defs>
    <g>
      {[0, 72, 144, 216, 288].map(angle => <g key={angle} transform={`rotate(${angle} 40 40)`}>
        <path d="M39 47C21 42 14 30 20 18C24 10 35 8 40 17C49 8 60 17 59 28C58 38 49 44 39 47Z" fill="var(--color-petal-deep)" transform="translate(0 3)" />
        <path d="M39 44C21 39 14 27 20 15C24 7 35 5 40 14C49 5 60 14 59 25C58 35 49 41 39 44Z" fill={`url(#${id}-face)`} />
        <path d="M24 17C25 12 33 10 37 17" stroke="var(--color-petal-light)" strokeWidth="2" strokeLinecap="round" opacity=".85" />
        <path d="M40 17Q35 30 40 42Q45 31 40 17Z" fill="var(--color-petal-deep)" opacity=".22" />
      </g>)}
    </g>
    <circle cx="40" cy="40" r="9" fill={`url(#${id}-core)`} />
    <circle cx="37" cy="37" r="2.5" fill="var(--color-petal-light)" />
  </svg>
}
