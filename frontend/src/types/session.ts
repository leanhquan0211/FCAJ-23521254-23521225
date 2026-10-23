import type { AdminSession } from '@/types/admin'
import type { BuyerSession } from '@/types/buyer'

export type Session = AdminSession | (BuyerSession & { role: 'user' })
