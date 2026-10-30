import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'

// Animate the existing surface; do not key/remount routes or delay navigation.
export function PageMotion({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const surface = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    if (preference.matches || !surface.current?.animate) return
    const animation = surface.current.animate([
      { opacity: .12, transform: 'translate3d(10px, 0, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ], { duration: 320, easing: 'cubic-bezier(.16, 1, .3, 1)' })
    const stop = () => { if (preference.matches) animation.cancel() }
    preference.addEventListener('change', stop)
    return () => { animation.cancel(); preference.removeEventListener('change', stop) }
  }, [pathname])
  return <div ref={surface} className="page-motion">{children}</div>
}
