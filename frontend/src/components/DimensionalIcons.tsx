import { useId } from 'react'
import {
  ArrowDown as BaseArrowDown, ArrowLeft as BaseArrowLeft, ArrowRight as BaseArrowRight,
  ArrowUpRight as BaseArrowUpRight, Building2 as BaseBuilding2, CalendarDays as BaseCalendarDays,
  CheckCircle2 as BaseCheckCircle2, Flower2 as BaseFlower2, HeartHandshake as BaseHeartHandshake,
  LayoutList as BaseLayoutList, Lightbulb as BaseLightbulb, LogOut as BaseLogOut, MapPin as BaseMapPin,
  Menu as BaseMenu, Moon as BaseMoon, Pencil as BasePencil, PenTool as BasePenTool, Plus as BasePlus,
  Search as BaseSearch, SearchX as BaseSearchX, ShieldCheck as BaseShieldCheck, Sun as BaseSun,
  Ticket as BaseTicket, Trash2 as BaseTrash2, UserRound as BaseUserRound, Users as BaseUsers,
  UsersRound as BaseUsersRound, X as BaseX, Droplets as BaseDroplets, Layers3 as BaseLayers3, Palette as BasePalette, type LucideIcon, type LucideProps,
} from 'lucide-react'

// Keep Lucide's recognizable geometry; build a raised, shaded vector object from it.
// The rear and middle layers form a visible edge, rather than a flat icon with a shadow.
function RaisedIcon({ icon: Base, name, ref,
    size = 24, width, height, className = '', color = 'currentColor', strokeWidth = 2,
    children, absoluteStrokeWidth, nonScalingStroke, ...props
  }: LucideProps & { icon: LucideIcon; name: string }) {
    const id = useId().replace(/:/g, '')
    const weight = Number(strokeWidth) + .7
    const common = { size: 24, strokeWidth: weight, 'aria-hidden': true as const, focusable: false as const, absoluteStrokeWidth, nonScalingStroke }
    return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 31 31" width={width ?? size} height={height ?? size}
      fill="none" color={color} className={`dimensional-icon lucide ${className}`} data-icon={name}
      aria-hidden="true" focusable="false" {...props}>
      <defs>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--color-icon-edge)" /><stop offset="1" stopColor="var(--color-icon-shadow)" />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2=".75" y2="1">
          <stop stopColor="color-mix(in oklch, currentColor 45%, var(--color-icon-shine))" />
          <stop offset=".38" stopColor="currentColor" /><stop offset="1" stopColor="color-mix(in oklch, currentColor 80%, var(--color-icon-edge))" />
        </linearGradient>
      </defs>
      <g transform="translate(1.5 2)"><Base {...common} stroke={`url(#${id}-edge)`} /></g>
      <g transform="translate(.7 .9)"><Base {...common} stroke="var(--color-icon-edge)" /></g>
      <Base {...common} stroke={`url(#${id}-face)`} />
      <g transform="translate(-.25 -.4)" opacity=".58"><Base {...common} strokeWidth=".65" stroke="var(--color-icon-shine)" /></g>
      {children}
    </svg>
}

export function ArrowDown(props: LucideProps) { return <RaisedIcon icon={BaseArrowDown} name="ArrowDown" {...props} /> }
export function ArrowLeft(props: LucideProps) { return <RaisedIcon icon={BaseArrowLeft} name="ArrowLeft" {...props} /> }
export function ArrowRight(props: LucideProps) { return <RaisedIcon icon={BaseArrowRight} name="ArrowRight" {...props} /> }
export function ArrowUpRight(props: LucideProps) { return <RaisedIcon icon={BaseArrowUpRight} name="ArrowUpRight" {...props} /> }
export function Building2(props: LucideProps) { return <RaisedIcon icon={BaseBuilding2} name="Building2" {...props} /> }
export function CalendarDays(props: LucideProps) { return <RaisedIcon icon={BaseCalendarDays} name="CalendarDays" {...props} /> }
export function CheckCircle2(props: LucideProps) { return <RaisedIcon icon={BaseCheckCircle2} name="CheckCircle2" {...props} /> }
export function Flower2(props: LucideProps) { return <RaisedIcon icon={BaseFlower2} name="Flower2" {...props} /> }
export function HeartHandshake(props: LucideProps) { return <RaisedIcon icon={BaseHeartHandshake} name="HeartHandshake" {...props} /> }
export function LayoutList(props: LucideProps) { return <RaisedIcon icon={BaseLayoutList} name="LayoutList" {...props} /> }
export function Lightbulb(props: LucideProps) { return <RaisedIcon icon={BaseLightbulb} name="Lightbulb" {...props} /> }
export function LogOut(props: LucideProps) { return <RaisedIcon icon={BaseLogOut} name="LogOut" {...props} /> }
export function MapPin(props: LucideProps) { return <RaisedIcon icon={BaseMapPin} name="MapPin" {...props} /> }
export function Menu(props: LucideProps) { return <RaisedIcon icon={BaseMenu} name="Menu" {...props} /> }
export function Moon(props: LucideProps) { return <RaisedIcon icon={BaseMoon} name="Moon" {...props} /> }
export function Pencil(props: LucideProps) { return <RaisedIcon icon={BasePencil} name="Pencil" {...props} /> }
export function PenTool(props: LucideProps) { return <RaisedIcon icon={BasePenTool} name="PenTool" {...props} /> }
export function Plus(props: LucideProps) { return <RaisedIcon icon={BasePlus} name="Plus" {...props} /> }
export function Search(props: LucideProps) { return <RaisedIcon icon={BaseSearch} name="Search" {...props} /> }
export function SearchX(props: LucideProps) { return <RaisedIcon icon={BaseSearchX} name="SearchX" {...props} /> }
export function ShieldCheck(props: LucideProps) { return <RaisedIcon icon={BaseShieldCheck} name="ShieldCheck" {...props} /> }
export function Sun(props: LucideProps) { return <RaisedIcon icon={BaseSun} name="Sun" {...props} /> }
export function Ticket(props: LucideProps) { return <RaisedIcon icon={BaseTicket} name="Ticket" {...props} /> }
export function Trash2(props: LucideProps) { return <RaisedIcon icon={BaseTrash2} name="Trash2" {...props} /> }
export function UserRound(props: LucideProps) { return <RaisedIcon icon={BaseUserRound} name="UserRound" {...props} /> }
export function Users(props: LucideProps) { return <RaisedIcon icon={BaseUsers} name="Users" {...props} /> }
export function UsersRound(props: LucideProps) { return <RaisedIcon icon={BaseUsersRound} name="UsersRound" {...props} /> }
export function X(props: LucideProps) { return <RaisedIcon icon={BaseX} name="X" {...props} /> }
export function XIcon(props: LucideProps) { return <X {...props} /> }
export function Droplets(props: LucideProps) { return <RaisedIcon icon={BaseDroplets} name="Droplets" {...props} /> }
export function Layers3(props: LucideProps) { return <RaisedIcon icon={BaseLayers3} name="Layers3" {...props} /> }
export function Palette(props: LucideProps) { return <RaisedIcon icon={BasePalette} name="Palette" {...props} /> }
