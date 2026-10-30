import { useId } from 'react'

// Original vector illustration. Every visible shape is SVG geometry, never text art.
export function BlossomArtwork({ className = '', variant = 'fan' }: { className?: string; variant?: 'fan' | 'branch' }) {
  const id = useId().replace(/:/g, '')
  const paper = `${id}-paper`
  const petal = `${id}-petal`
  const blossom = `${id}-blossom`
  const fan = 'M 70 307 A 259 259 0 0 1 550 307 L 310 439 Z'
  const petals = variant === 'branch'
    ? [[35, 310], [200, 330], [65, 475], [185, 445], [145, 292]]
    : [[40, 200], [95, 125], [180, 70], [410, 70], [560, 115], [585, 250], [555, 370], [470, 445], [380, 510], [225, 480], [70, 450], [110, 380], [525, 475], [295, 90], [35, 295], [425, 155]]
  return <div className={`blossom-artwork ${className}`} aria-hidden="true">
    <svg viewBox={variant === 'branch' ? '10 275 205 245' : '0 0 620 570'} fill="none" focusable="false">
      <defs>
        <linearGradient id={paper} x1="310" y1="80" x2="310" y2="440" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-petal-light)" /><stop offset=".6" stopColor="var(--color-petal)" /><stop offset="1" stopColor="var(--color-petal-deep)" />
        </linearGradient>
        <radialGradient id={petal}><stop stopColor="var(--color-petal-light)" /><stop offset="1" stopColor="var(--color-petal)" /></radialGradient>
        <clipPath id={`${id}-clip`}><path d={fan} /></clipPath>
        <g id={blossom}>
          {[0, 72, 144, 216, 288].map(angle => <path key={angle} transform={`rotate(${angle})`} d="M0 2 C-19-5-19-22-9-26 C-4-29 0-24 0-21 C4-28 11-28 14-22 C21-10 9-1 0 2Z" fill={`url(#${petal})`} stroke="var(--color-petal-deep)" strokeWidth=".6" />)}
          <circle r="3" fill="var(--color-petal-deep)" />
          {[-40, 15, 65, 115, 165].map(angle => <path key={angle} d="M0 0L0-11" transform={`rotate(${angle})`} stroke="var(--color-petal-deep)" strokeWidth=".8" />)}
        </g>
      </defs>
      <g className={`sakura-fan ${variant === 'branch' ? 'sakura-hidden' : ''}`}>
        <path d={fan} fill={`url(#${paper})`} stroke="var(--color-petal)" strokeWidth="2" />
        <g clipPath={`url(#${id}-clip)`}>
          {Array.from({ length: 23 }, (_, index) => {
            const angle = (203 + index * 5.18) * Math.PI / 180
            const next = angle + .043
            return <path key={index} d={`M310 439 L${310 + 370 * Math.cos(angle)} ${439 + 370 * Math.sin(angle)} L${310 + 370 * Math.cos(next)} ${439 + 370 * Math.sin(next)}Z`} fill="var(--color-petal-deep)" opacity=".18" />
          })}
          <path d="M518 257C426 191 344 217 231 148M435 220C418 174 438 145 453 133M337 189C324 139 285 128 259 115M394 207C359 226 328 229 290 217" stroke="var(--color-wood)" strokeWidth="5" strokeLinecap="round" />
          {[[455, 228, .75], [417, 190, .9], [369, 205, .55], [333, 174, .8], [287, 145, .7], [447, 153, .65], [300, 223, .55], [479, 248, .6]].map(([x, y, scale], index) => <use key={index} href={`#${blossom}`} transform={`translate(${x} ${y}) scale(${scale}) rotate(${index * 23})`} />)}
          <path d="M175 363 A156 156 0 0 1 445 363 L310 439Z" fill="var(--color-wood)" />
          {Array.from({ length: 19 }, (_, index) => {
            const angle = (210 + index * 6.66) * Math.PI / 180
            return <path key={index} d={`M310 439L${310 + 157 * Math.cos(angle)} ${439 + 157 * Math.sin(angle)}`} stroke="var(--color-wood-light)" strokeWidth="1.5" />
          })}
        </g>
        <circle cx="310" cy="439" r="8" fill="var(--color-petal-light)" />
        <path d="M310 448C323 461 312 478 310 485" stroke="var(--color-petal)" strokeWidth="4" />
        <path d="M297 487Q310 476 323 487L330 539Q310 553 291 539Z" fill="var(--color-petal-deep)" />
        {[298, 302, 306, 310, 314, 318, 322].map(x => <path key={x} d={`M${x} 492L${x + (x - 310) * .4} 540`} stroke="var(--color-petal)" strokeWidth="1.5" />)}
        <path d="M294 493H326" stroke="var(--color-petal-light)" strokeWidth="4" />
      </g>
      <g className="sakura-branch">
        <path d="M60 480C112 439 94 361 158 305M108 402C67 393 47 366 39 342M122 369C153 370 186 349 194 324" stroke="var(--color-wood-light)" strokeWidth="5" strokeLinecap="round" />
        {[[64, 373, .68], [107, 412, .82], [128, 357, .68], [162, 331, .8], [53, 346, .65], [178, 356, .55]].map(([x, y, scale], index) => <use key={index} href={`#${blossom}`} transform={`translate(${x} ${y}) scale(${scale}) rotate(${index * 38})`} />)}
      </g>
      {petals.map(([x, y], index) => <g key={index} transform={`translate(${x} ${y}) rotate(${index * 41}) scale(${.55 + (index % 4) * .15})`}>
        <path className="sakura-petal" style={{ animationDelay: `${-index * .7}s` }} d="M-7 0C-14-10-2-20 1-13C10-18 17-8 6 1Q0 6-7 0Z" fill={index % 3 === 0 ? 'var(--color-petal-light)' : 'var(--color-petal)'} />
      </g>)}
    </svg>
  </div>
}
