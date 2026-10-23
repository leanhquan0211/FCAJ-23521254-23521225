import type { ReactElement } from 'react'
import { Tooltip } from 'radix-ui'

export function SidebarHint({ label, enabled, children }: { label: string; enabled: boolean; children: ReactElement }) {
  if (!enabled) return children
  return <Tooltip.Provider delayDuration={800}><Tooltip.Root><Tooltip.Trigger asChild>{children}</Tooltip.Trigger><Tooltip.Portal><Tooltip.Content side="right" sideOffset={8} className="z-50 rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-sm">{label}</Tooltip.Content></Tooltip.Portal></Tooltip.Root></Tooltip.Provider>
}
