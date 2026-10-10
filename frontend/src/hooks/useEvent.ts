import { useEffect, useState } from 'react'
import { getEvent } from '@/services/mock-events'
import type { EventItem } from '@/types/event'

export function useEvent(eventId: string | undefined) {
  const [state, setState] = useState<{ id: string | undefined; event: EventItem | null; loading: boolean; error: string }>({id: eventId, event: null, loading: true, error: ''})
  useEffect(() => {
    let active = true
    if (!eventId) return
    getEvent(eventId).then((event) => {
      if (active) setState({id: eventId, event, loading: false, error: ''})
    }).catch(() => {
      if (active) setState({id: eventId, event: null, loading: false, error: 'Không thể tải sự kiện. Vui lòng tải lại trang.'})
    })
    return () => { active = false }
  }, [eventId])
  return state.id === eventId ? state : { event: null, loading: true, error: '' }
}
