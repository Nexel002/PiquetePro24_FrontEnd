import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignServiceRequest,
  cancelServiceRequest,
  completeServiceRequest,
  createServiceRequest,
  fetchMyServiceRequests,
  fetchNearbyServiceRequests,
  type CreateServiceRequestPayload,
  type NearbyServiceRequestsParams,
} from '../services/serviceRequests'

const myServiceRequestsKey = ['service_requests', 'mine'] as const

export function useMyServiceRequests() {
  return useQuery({
    queryKey: myServiceRequestsKey,
    queryFn: fetchMyServiceRequests,
  })
}

const nearbyServiceRequestsKey = (coordinates: { latitude: number; longitude: number } | null) =>
  ['service_requests', 'nearby', coordinates] as const

export function useNearbyServiceRequests(
  coordinates: { latitude: number; longitude: number } | null,
  options?: Pick<NearbyServiceRequestsParams, 'radiusKm' | 'limit' | 'offset'>,
) {
  return useQuery({
    queryKey: [...nearbyServiceRequestsKey(coordinates), options?.radiusKm, options?.offset],
    queryFn: () =>
      fetchNearbyServiceRequests({
        latitude: coordinates!.latitude,
        longitude: coordinates!.longitude,
        ...options,
      }),
    enabled: coordinates !== null,
  })
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateServiceRequestPayload) => createServiceRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myServiceRequestsKey })
    },
  })
}

// Invalida a listagem de pedidos próximos depois de assign/complete/cancel: o pedido
// muda de estado (ex. sai de OPEN) e a lista de "pedidos disponíveis" do profissional
// tem de refletir isso, em vez de continuar a mostrar um pedido já indisponível.
export function useAssignServiceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => assignServiceRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_requests', 'nearby'] })
    },
  })
}

export function useCompleteServiceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => completeServiceRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myServiceRequestsKey })
    },
  })
}

export function useCancelServiceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => cancelServiceRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myServiceRequestsKey })
    },
  })
}
