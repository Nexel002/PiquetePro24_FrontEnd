import { api } from '../lib/api'
import type { ProfessionalType, UserRole } from './profile'

// Espelha AdminUserSummary do backend (src/services/adminUserService.ts).
export interface AdminUserSummary {
  id: string
  full_name: string
  phone: string | null
  role: UserRole
  professional_type: ProfessionalType | null
  province: string | null
  district: string | null
  neighborhood: string | null
  avatar_url: string | null
  created_at: string
}

// Espelha AdminUserDetail do backend — inclui os campos agregados que só a ficha
// individual devolve (kyc_status, contagens de pedidos).
export interface AdminUserDetail extends AdminUserSummary {
  kyc_status: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  service_requests_as_client: number
  service_requests_as_professional: number
}

export interface AdminUserFilters {
  role?: UserRole
  search?: string
  province?: string
  limit: number
  offset: number
}

// TRD Adendo v1.9, item B: diretório de utilizadores — mesmo espírito de
// fetchKycSubmissions/fetchAuditLog (paginação via limit/offset do backend, sem
// paginação client-side sofisticada).
export async function fetchUsers(filters: AdminUserFilters): Promise<AdminUserSummary[]> {
  const response = await api.get<AdminUserSummary[]>('/admin/users', {
    params: {
      role: filters.role,
      search: filters.search || undefined,
      province: filters.province || undefined,
      limit: filters.limit,
      offset: filters.offset,
    },
  })
  return response.data
}

export async function fetchUserDetail(userId: string): Promise<AdminUserDetail> {
  const response = await api.get<AdminUserDetail>(`/admin/users/${userId}`)
  return response.data
}

// Espelha ResendEmailTemplate do backend (adminResendEmailService.ts).
export type ResendEmailTemplate = 'welcome' | 'kyc_aprovado' | 'kyc_rejeitado'

export interface ResendEmailResult {
  enviado: boolean
  motivo?: 'desligado' | 'falha'
}

// TRD Adendo v1.9, item F: se um utilizador disser "não recebi o email", o admin
// tem um botão em vez de precisar de reproduzir a ação de negócio original.
export async function resendEmail(userId: string, template: ResendEmailTemplate): Promise<ResendEmailResult> {
  const response = await api.post<ResendEmailResult>(`/admin/users/${userId}/resend-email`, { template })
  return response.data
}
