import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  banUser,
  changeUserRole,
  fetchUserDetail,
  fetchUsers,
  resendEmail,
  unbanUser,
  type AdminUserFilters,
  type ChangeRolePayload,
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

// Ban/unban/role, ao contrário de resendEmail, mudam algo que a própria ficha
// mostra (banned_until, role) — invalidam a query de detalhe para refletir de
// imediato, em vez de o admin ver o estado antigo até recarregar a página.
export function useBanUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => banUser(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users', 'detail', userId] })
    },
  })
}

export function useUnbanUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => unbanUser(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users', 'detail', userId] })
    },
  })
}

export function useChangeUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string; payload: ChangeRolePayload }) => changeUserRole(input.userId, input.payload),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users', 'detail', input.userId] })
    },
  })
}
