import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { toast } from 'sonner'
import {
  assignServiceRequest,
  cancelServiceRequest,
  completeServiceRequest,
  createServiceRequest,
  fetchAssignedServiceRequests,
  fetchMyServiceRequests,
  fetchNearbyServiceRequests,
  fetchServiceRequestContact,
  type CreateServiceRequestPayload,
  type NearbyServiceRequestsParams,
} from '../services/serviceRequests'
import { workedWithProfessionalsKey } from './useWorkedWithProfessionals'
import { ErroDeApi } from '../lib/api'
import { enfileirar, filaDisponivel } from '../lib/filaOffline'
import { gerarUuid } from '../lib/uuid'
import { useEstadoDeLigacao } from '../lib/conectividade'
import { useAuth } from '../store/AuthContext'

// O interceptor de lib/api.ts já desempacota error.response.data.error num Error
// simples — a mensagem do backend (ex. "Este pedido já não está disponível para
// atribuição.", 409) chega diretamente em .message, pronta para o toast.
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export const myServiceRequestsKey = ['service_requests', 'mine'] as const
const assignedServiceRequestsKey = ['service_requests', 'assigned'] as const

// Pedidos que o profissional aceitou (Backend TRD Adendo v1.12, item G).
export function useAssignedServiceRequests() {
  return useQuery({
    queryKey: assignedServiceRequestsKey,
    queryFn: fetchAssignedServiceRequests,
  })
}

// Sem retry: os erros daqui são regras de negócio (403 sem KYC/subscrição, 409 pedido
// já concluído), não falhas transitórias — repetir três vezes só atrasa a mensagem.
// `enabled` para só pedir quando o profissional abre o contacto, não para todos os
// pedidos da lista de uma vez.
export function useServiceRequestContact(requestId: string, options: { enabled: boolean }) {
  return useQuery({
    queryKey: ['service_requests', 'contact', requestId],
    queryFn: () => fetchServiceRequestContact(requestId),
    enabled: options.enabled,
    retry: false,
  })
}

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

// Criar um pedido sem perder dados em rede instável (Fase 5, TRD Adendo v1.27):
//  - sem ligação à partida, ou sem resposta do servidor, o pedido vai para a fila local e é
//    enviado quando a ligação volta (ProcessadorDaFila);
//  - a Idempotency-Key é gerada UMA vez por formulário e reutilizada em todas as tentativas
//    (inclusive o reenvio manual depois de um erro), por isso um pedido que chegou ao servidor
//    mas cuja resposta se perdeu nunca é criado duas vezes.
// Só a falta de resposta vai para a fila. Um erro do servidor (400, 403, ...) é mostrado já:
// guardar um pedido inválido só o faria falhar mais tarde, longe do formulário.
export type ResultadoDaCriacao = { estado: 'enviado' } | { estado: 'guardado' }

export function useCreateServiceRequest() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const ligacao = useEstadoDeLigacao()
  const chave = useRef(gerarUuid())

  return useMutation({
    // 'always': por omissão o TanStack Query PAUSA as mutações sem rede e o botão ficava a
    // rodar para sempre — o contrário do que esta fase quer.
    networkMode: 'always',
    mutationFn: async (payload: CreateServiceRequestPayload): Promise<ResultadoDaCriacao> => {
      const userId = session?.user.id
      const guardar = async (): Promise<ResultadoDaCriacao> => {
        if (!userId || !filaDisponivel()) {
          throw new Error('Sem ligação e sem forma de guardar o pedido neste dispositivo. Tenta novamente quando tiveres rede.')
        }
        await enfileirar({ id: chave.current, userId, payload })
        chave.current = gerarUuid()
        return { estado: 'guardado' }
      }

      if (ligacao === 'sem-rede') return guardar()

      try {
        await createServiceRequest(payload, chave.current)
        chave.current = gerarUuid()
        return { estado: 'enviado' }
      } catch (error) {
        if (error instanceof ErroDeApi && error.semResposta) return guardar()
        throw error
      }
    },
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: myServiceRequestsKey })
      if (resultado.estado === 'enviado') {
        toast.success('Pedido criado com sucesso.')
      } else {
        toast.info('Sem ligação: o pedido ficou guardado neste telemóvel e será enviado quando a ligação voltar.', { duration: 8000 })
      }
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
      queryClient.invalidateQueries({ queryKey: assignedServiceRequestsKey })
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
      // Concluir faz o profissional entrar no histórico "Os meus profissionais".
      queryClient.invalidateQueries({ queryKey: workedWithProfessionalsKey })
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
