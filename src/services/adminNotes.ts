import { api } from '../lib/api'

// Espelha adminNoteService.ts do backend (Fase 18).
export type NoteTargetType = 'USER' | 'SERVICE_REQUEST'

export interface AdminNote {
  id: string
  target_type: NoteTargetType
  target_id: string
  author_id: string | null
  author_name: string | null
  body: string
  created_at: string
}

export async function fetchAdminNotes(targetType: NoteTargetType, targetId: string): Promise<AdminNote[]> {
  const response = await api.get<AdminNote[]>('/admin/notes', { params: { target_type: targetType, target_id: targetId } })
  return response.data
}

export async function createAdminNote(targetType: NoteTargetType, targetId: string, body: string): Promise<AdminNote> {
  const response = await api.post<AdminNote>('/admin/notes', { target_type: targetType, target_id: targetId, body })
  return response.data
}
