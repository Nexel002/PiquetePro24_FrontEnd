import { api } from '../lib/api'

// Espelha communicationService.ts do backend (Fase 20).
export type AudienceRole = 'CLIENT' | 'PROFESSIONAL' | 'ALL'

export const ROTULOS_DE_GRUPO: Record<AudienceRole, string> = {
  CLIENT: 'Clientes',
  PROFESSIONAL: 'Profissionais',
  ALL: 'Clientes e profissionais',
}

export interface Audience {
  role: AudienceRole
  province: string | null
}

export interface Broadcast {
  id: string
  author_name: string | null
  subject: string
  message: string
  audience_role: AudienceRole
  audience_province: string | null
  status: 'SENDING' | 'DONE'
  recipient_count: number
  sent_count: number
  failed_count: number
  created_at: string
  finished_at: string | null
}

export interface SendBroadcastPayload {
  subject: string
  message: string
  audience: Audience
  confirm_recipients: number
}

export async function previewBroadcast(audience: Audience): Promise<{ recipients: number }> {
  const response = await api.post<{ recipients: number }>('/admin/broadcasts/preview', audience)
  return response.data
}

export async function sendBroadcast(payload: SendBroadcastPayload): Promise<Broadcast> {
  const response = await api.post<Broadcast>('/admin/broadcasts', payload)
  return response.data
}

export async function fetchBroadcasts(): Promise<Broadcast[]> {
  const response = await api.get<Broadcast[]>('/admin/broadcasts')
  return response.data
}
