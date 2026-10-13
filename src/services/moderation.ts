import { api } from '../lib/api'

// Espelha moderationService.ts do backend (Fase 17).
export type ReportTargetType = 'USER' | 'PORTFOLIO_PROJECT' | 'REVIEW' | 'SERVICE_REQUEST'
export type ReportReason = 'INAPPROPRIATE' | 'FRAUD' | 'ABUSE' | 'OTHER'
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'

export const ROTULOS_DE_MOTIVO: Record<ReportReason, string> = {
  INAPPROPRIATE: 'Conteúdo impróprio',
  FRAUD: 'Fraude ou engano',
  ABUSE: 'Abuso ou ofensas',
  OTHER: 'Outro motivo',
}

export const ROTULOS_DE_ALVO: Record<ReportTargetType, string> = {
  USER: 'Conta',
  PORTFOLIO_PROJECT: 'Trabalho de portfólio',
  REVIEW: 'Avaliação',
  SERVICE_REQUEST: 'Pedido de serviço',
}

export interface CreateReportPayload {
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  details?: string
}

export interface AdminReport {
  id: string
  reporter_id: string | null
  reporter_name: string | null
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
  target: { label: string | null; exists: boolean; hidden: boolean }
}

export interface AdminReportFilters {
  status: ReportStatus | 'ALL'
  limit: number
  offset: number
}

export interface ResolveReportPayload {
  action: 'RESOLVE' | 'DISMISS'
  note: string
  hide_target: boolean
}

export async function createReport(payload: CreateReportPayload): Promise<{ id: string; status: ReportStatus }> {
  const response = await api.post<{ id: string; status: ReportStatus }>('/reports', payload)
  return response.data
}

export async function fetchAdminReports(filters: AdminReportFilters): Promise<AdminReport[]> {
  const response = await api.get<AdminReport[]>('/admin/reports', { params: filters })
  return response.data
}

export async function resolveReport(reportId: string, payload: ResolveReportPayload): Promise<AdminReport> {
  const response = await api.post<AdminReport>(`/admin/reports/${reportId}/resolve`, payload)
  return response.data
}

// Repor conteúdo ocultado (trabalho de portfólio ou comentário de avaliação).
export async function unhideTarget(targetType: 'PORTFOLIO_PROJECT' | 'REVIEW', targetId: string): Promise<void> {
  const caminho =
    targetType === 'PORTFOLIO_PROJECT'
      ? `/admin/moderation/projects/${targetId}/unhide`
      : `/admin/moderation/reviews/${targetId}/unhide-comment`
  await api.post(caminho)
}
