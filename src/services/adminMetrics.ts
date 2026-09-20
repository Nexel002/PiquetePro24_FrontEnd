import { api } from '../lib/api'

// Espelha AdminMetrics do backend (src/services/adminMetricsService.ts) — vem
// diretamente da função RPC admin_metrics(), sem componente financeiro (depende da
// Fase 5 do backend, que não existe).
export interface AdminMetrics {
  usersByRole: Record<string, number>
  signupsLast30Days: Array<{ date: string; count: number }>
  kycByStatus: Record<string, number>
  activeProfessionalsByProvince: Array<{ province: string; count: number }>
  serviceRequestsByStatus: Record<string, number>
  avgTimeToAssignmentMinutes: number | null
  avgTimeToCompletionMinutes: number | null
}

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const response = await api.get<AdminMetrics>('/admin/metrics')
  return response.data
}
