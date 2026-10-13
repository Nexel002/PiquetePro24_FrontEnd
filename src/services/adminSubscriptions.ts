import { api } from '../lib/api'
import type { PaymentTransaction, PaymentTransactionStatus, Subscription } from './subscriptions'

// Espelha adminSubscriptionService.ts do backend.
export type FiltroSubscricao = 'ALL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'INACTIVE'

export interface AdminSubscriptionRow extends Subscription {
  professional_name: string | null
}

export interface AdminPaymentRow extends PaymentTransaction {
  professional_name: string | null
}

export interface AdminSubscriptionFilters {
  filtro: FiltroSubscricao
  limit: number
  offset: number
}

export interface AdminPaymentFilters {
  status?: PaymentTransactionStatus
  limit: number
  offset: number
}

export async function fetchAdminSubscriptions(filters: AdminSubscriptionFilters): Promise<AdminSubscriptionRow[]> {
  const response = await api.get<AdminSubscriptionRow[]>('/admin/subscriptions', { params: filters })
  return response.data
}

export async function fetchAdminPayments(filters: AdminPaymentFilters): Promise<AdminPaymentRow[]> {
  const response = await api.get<AdminPaymentRow[]>('/admin/payments', { params: filters })
  return response.data
}

// Fecha já o período em vigor; o motivo fica no registo de auditoria do backend.
export async function revokeSubscription(userId: string, note: string): Promise<Subscription[]> {
  const response = await api.post<Subscription[]>(`/admin/users/${userId}/subscription/revoke`, { note })
  return response.data
}
