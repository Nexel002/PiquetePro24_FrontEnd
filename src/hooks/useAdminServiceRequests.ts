import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelServiceRequestAsAdmin,
  fetchAllServiceRequests,
  type AdminServiceRequestFilters,
} from '../services/adminServiceRequests'

const adminServiceRequestsQueryKey = (filters: AdminServiceRequestFilters) =>
  ['admin-service-requests', 'list', filters] as const

export function useAdminServiceRequests(filters: AdminServiceRequestFilters) {
  return useQuery({
    queryKey: adminServiceRequestsQueryKey(filters),
    queryFn: () => fetchAllServiceRequests(filters),
  })
}

export function useAdminCancelServiceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => cancelServiceRequestAsAdmin(requestId),
    onSuccess: () => {
      // Invalida em vez de setQueryData: a lista pode ter filtro de status ativo
      // (ex. ?status=OPEN) e o pedido cancelado já não deve lá aparecer — mesma
      // decisão de useReviewKyc para a fila de revisão de KYC.
      void queryClient.invalidateQueries({ queryKey: ['admin-service-requests'] })
    },
  })
}
