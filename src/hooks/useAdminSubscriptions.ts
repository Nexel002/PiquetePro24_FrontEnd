import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAdminPayments,
  fetchAdminSubscriptions,
  revokeSubscription,
  type AdminPaymentFilters,
  type AdminSubscriptionFilters,
} from '../services/adminSubscriptions'

export function useAdminSubscriptions(filters: AdminSubscriptionFilters) {
  return useQuery({
    queryKey: ['admin-subscriptions', 'list', filters],
    queryFn: () => fetchAdminSubscriptions(filters),
  })
}

export function useAdminPayments(filters: AdminPaymentFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['admin-subscriptions', 'payments', filters],
    queryFn: () => fetchAdminPayments(filters),
    enabled: options.enabled ?? true,
  })
}

export function useRevokeSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { userId: string; note: string }) => revokeSubscription(input.userId, input.note),
    onSuccess: (_data, input) => {
      // A linha suspensa muda de filtro (sai de «Activas») e a ficha do utilizador mostra o estado.
      void queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      void queryClient.invalidateQueries({ queryKey: ['subscription', 'admin', input.userId] })
    },
  })
}
