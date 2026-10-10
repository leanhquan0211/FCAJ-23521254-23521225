import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function PageState({ title, message }: { title: string; message: string }) {
  return <div className="max-w-2xl pt-16 sm:pt-20">
    <h1 className="font-display text-3xl font-bold leading-tight">{title}</h1>
    <p className="mt-4 text-base leading-relaxed text-muted-foreground">{message}</p>
    <Button asChild variant="outline" className="mt-8 min-h-11"><Link to="/events">Về danh sách sự kiện</Link></Button>
  </div>
}
