import { useQuery } from '@tanstack/react-query'
import { fetchUserDetail, fetchUsers, type AdminUserFilters } from '../services/adminUsers'

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
