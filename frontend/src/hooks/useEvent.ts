import { useEffect, useState } from 'react'
import { getEvent } from '@/services/events'
import type { EventItem } from '@/types/event'

export function useEvent(eventId: string | undefined) {
  const [state, setState] = useState<{ id: string | undefined; event: EventItem | null; loading: boolean; error: string }>({id: eventId, event: null, loading: true, error: ''})
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    if (!eventId) return
    function load() {
      getEvent(eventId!).then((event) => {
        if (!active) return
        setState({id: eventId, event, loading: false, error: ''})
        if (event?.status === 'not_open' && event.salesOpenAt) {
          // The server response, not the browser clock, decides when booking is enabled.
          const delay = Math.min(60_000, Math.max(1000, new Date(event.salesOpenAt).getTime() - Date.now() + 250))
          timer = setTimeout(load, delay)
        }
      }).catch((cause) => {
        if (active) setState({id: eventId, event: null, loading: false, error: cause instanceof Error ? cause.message : 'Không thể tải sự kiện. Vui lòng tải lại trang.'})
      })
    }
    load()
    return () => { active = false; clearTimeout(timer) }
  }, [eventId])
  return state.id === eventId ? state : { event: null, loading: true, error: '' }
}
