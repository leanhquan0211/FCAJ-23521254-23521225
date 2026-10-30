export interface Buyer {
  userId: string
  fullName: string
  email: string
  role: 'user'
  createdAt: string
}

export interface BuyerSession {
  user: Buyer
  csrfToken: string
  expiresAt: number
}
