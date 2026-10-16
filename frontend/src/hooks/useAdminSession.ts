import { createContext, useContext } from 'react'
import type { AdminSession } from '@/types/admin'

export const AdminSessionContext = createContext<AdminSession | null>(null)

export function useAdminSession() {
  const session = useContext(AdminSessionContext)
  if (!session) throw new Error('Trang này cần phiên quản trị viên.')
  return session
}
