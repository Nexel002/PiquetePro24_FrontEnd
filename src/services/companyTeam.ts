import { api } from '../lib/api'
import type { KycStatus } from './kyc'

// Espelha companyTeamService.ts do backend (Fase 25).

// Decisão do utilizador (14/10/2026): no máximo 15 técnicos ativos por empresa. O backend é quem
// impõe o limite; aqui serve para mostrar «X de 15» e desativar o botão de adicionar.
export const MAX_TECNICOS_POR_EMPRESA = 15

export type MemberStatus = 'ACTIVE' | 'INACTIVE'

export interface TeamMember {
  id: string
  user_id: string
  full_name: string
  email: string | null
  title: string
  status: MemberStatus
  // Trabalhos em curso: enquanto houver, o técnico não se pode desativar.
  active_jobs: number
  // KYC do próprio técnico (mesma lógica do singular). NONE = ainda não enviou documentos.
  kyc_status: KycStatus | 'NONE'
  services: { id: string; name: string }[]
  created_at: string
}

export interface AddMemberPayload {
  full_name: string
  email: string
  title: string
  category_ids: string[]
}

export interface AddMemberResult {
  member: TeamMember
  // Só nesta resposta: o backend não a guarda.
  temporary_password: string
}

export async function fetchTeam(): Promise<TeamMember[]> {
  const response = await api.get<TeamMember[]>('/company/members')
  return response.data
}

export async function addMember(payload: AddMemberPayload): Promise<AddMemberResult> {
  const response = await api.post<AddMemberResult>('/company/members', payload)
  return response.data
}

export async function updateMember(id: string, changes: { title?: string; category_ids?: string[] }): Promise<TeamMember> {
  const response = await api.patch<TeamMember>(`/company/members/${id}`, changes)
  return response.data
}

export async function setMemberStatus(id: string, status: MemberStatus): Promise<TeamMember> {
  const response = await api.post<TeamMember>(`/company/members/${id}/${status === 'ACTIVE' ? 'reactivate' : 'deactivate'}`)
  return response.data
}

// Atribui o técnico a um pedido já atribuído à empresa (Fase 26).
export async function assignMember(requestId: string, memberId: string): Promise<void> {
  await api.post(`/service_requests/${requestId}/assign-member`, { member_id: memberId })
}
