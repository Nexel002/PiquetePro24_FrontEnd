import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addAdmin, fetchAdmins, revokeAdmin } from '../services/adminAccounts'

const adminsKey = ['admin-accounts'] as const

export function useAdmins() {
  return useQuery({ queryKey: adminsKey, queryFn: fetchAdmins })
}

export function useAddAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addAdmin,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminsKey })
    },
  })
}

export function useRevokeAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeAdmin,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminsKey })
      // A conta rebaixada passa a CLIENTE: a lista de utilizadores mostra-a com o novo papel.
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}
