import { api } from '../lib/api'
import type { EstadoDaCredencial, OwnCredential } from './credentials'

// Fase 41 (TRD Adendo v1.66, N5): a fila de credenciais do admin (Backend Fase 34).
export interface CredentialForReview extends OwnCredential {
  user_id: string
  holder_name: string
  holder_role: string
  holder_kyc_status: string | null
}

export async function fetchCredentialsForReview(status?: EstadoDaCredencial): Promise<CredentialForReview[]> {
  const response = await api.get<CredentialForReview[]>('/admin/credentials', { params: status ? { status } : undefined })
  return response.data
}

// URL de 60 s, pedido só quando o admin carrega em «Ver documento» (e registado na auditoria).
export async function fetchCredentialDocument(id: string): Promise<{ url: string; expires_in: number }> {
  const response = await api.get<{ url: string; expires_in: number }>(`/admin/credentials/${id}/document`)
  return response.data
}

export async function reviewCredential(id: string, payload: { status: 'APPROVED' | 'REJECTED'; review_notes?: string }): Promise<CredentialForReview> {
  const response = await api.patch<CredentialForReview>(`/admin/credentials/${id}`, payload)
  return response.data
}
