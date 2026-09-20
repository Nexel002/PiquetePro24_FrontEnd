import { api } from '../lib/api'

// Espelha o registo que o backend grava em audit_log (TRD Adendo v1.8).
export interface AuditLogEntry {
  id: string
  user_id: string | null
  action: string
  description: string | null
  entity_type: string | null
  entity_id: string | null
  method: string
  path: string
  status_code: number
  success: boolean
  ip_address: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AuditLogFilters {
  action?: string
  success?: boolean
  limit: number
  offset: number
}

// TRD Adendo v1.8: superfície mínima para o ADMIN consultar o histórico de ações —
// mesmo espírito de fetchKycSubmissions (sem paginação client-side sofisticada, o
// backend já pagina via limit/offset em GET /admin/audit-log).
export async function fetchAuditLog(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
  const response = await api.get<AuditLogEntry[]>('/admin/audit-log', {
    params: {
      action: filters.action || undefined,
      // O backend espera 'true'/'false' na query string, não um boolean — axios
      // serializaria `false` como string 'false' de qualquer forma, mas fica
      // explícito para não depender desse comportamento por acidente.
      success: filters.success === undefined ? undefined : String(filters.success),
      limit: filters.limit,
      offset: filters.offset,
    },
  })
  return response.data
}
