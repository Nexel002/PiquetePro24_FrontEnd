import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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

// O interceptor de lib/api.ts já desempacota error.response.data.error num Error
// simples — a mensagem do backend (ex. "Este pedido já não está disponível para
// atribuição.", 409) chega diretamente em .message, pronta para o toast.
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

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
      toast.success('Pedido criado com sucesso.')
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Não foi possível criar o pedido. Tenta novamente.'))
    },
  })
}

// Invalida a listagem de pedidos próximos depois de assign/complete/cancel: o pedido
// muda de estado (ex. sai de OPEN) e a lista de "pedidos disponíveis" do profissional
// tem de refletir isso, em vez de continuar a mostrar um pedido já indisponível.
//
// O erro mais comum aqui é a corrida de atribuição perdida (409, "já não está
// disponível") — a mensagem do backend já é específica o suficiente para o toast,
// sem precisar de um fallback dedicado a esse caso.
export function useAssignServiceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => assignServiceRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_requests', 'nearby'] })
      toast.success('Pedido aceite com sucesso.')
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Não foi possível aceitar este pedido. Tenta novamente.'))
    },
  })
}

export function useCompleteServiceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => completeServiceRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myServiceRequestsKey })
      toast.success('Pedido concluído.')
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Não foi possível concluir este pedido. Tenta novamente.'))
    },
  })
}

export function useCancelServiceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => cancelServiceRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myServiceRequestsKey })
      toast.success('Pedido cancelado.')
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Não foi possível cancelar este pedido. Tenta novamente.'))
    },
  })
}
