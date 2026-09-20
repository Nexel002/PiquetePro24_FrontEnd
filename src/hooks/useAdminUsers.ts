import { useMutation, useQuery } from '@tanstack/react-query'
import {
  fetchUserDetail,
  fetchUsers,
  resendEmail,
  type AdminUserFilters,
  type ResendEmailTemplate,
} from '../services/adminUsers'

// Sem `enabled: session !== null`, mesma decisão de useKycSubmissions/useAuditLog: a
// rota só é montada dentro de uma tela já protegida por role.
export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({
    queryKey: ['admin-users', 'list', filters],
    queryFn: () => fetchUsers(filters),
  })
}

export function useAdminUserDetail(userId: string) {
  return useQuery({
    queryKey: ['admin-users', 'detail', userId],
    queryFn: () => fetchUserDetail(userId),
  })
}

// Sem invalidação de cache no onSuccess: reenviar um email não muda nenhum dado do
// utilizador que a ficha mostre (ao contrário de useReviewKyc, por exemplo) — só o
// resultado do próprio envio interessa, tratado pelo componente chamador.
export function useResendEmail() {
  return useMutation({
    mutationFn: (input: { userId: string; template: ResendEmailTemplate }) =>
      resendEmail(input.userId, input.template),
  })
}
