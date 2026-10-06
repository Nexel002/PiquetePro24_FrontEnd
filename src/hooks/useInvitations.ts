import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  chooseProposal,
  declineInvitation,
  fetchChosenProfessional,
  fetchMyInvitations,
  fetchRequestProposals,
  submitProposal,
  type SubmitProposalPayload,
} from '../services/invitations'
import { useAuth } from '../store/AuthContext'

const invitationsKey = ['invitations', 'mine'] as const
const proposalsKey = (requestId: string) => ['proposals', requestId] as const

// O interceptor de lib/api.ts desempacota a mensagem do backend em Error.message —
// "Para responder a pedidos precisas de ...", "Este pedido já não está aberto." —,
// já pronta para o toast.
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

// Convites recebidos pelo profissional + elegibilidade (Backend Fase 11).
export function useMyInvitations(enabled: boolean) {
  const { session } = useAuth()

  return useQuery({
    queryKey: invitationsKey,
    queryFn: fetchMyInvitations,
    enabled: session !== null && enabled,
  })
}

export function useSubmitProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { requestId: string; payload: SubmitProposalPayload }) =>
      submitProposal(input.requestId, input.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationsKey })
      toast.success('Proposta enviada. O cliente foi avisado.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Não foi possível enviar a proposta. Tenta novamente.')),
  })
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => declineInvitation(requestId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationsKey })
      toast.success('Pedido recusado.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Não foi possível recusar o pedido. Tenta novamente.')),
  })
}

export function useRequestProposals(requestId: string | undefined) {
  const { session } = useAuth()

  return useQuery({
    queryKey: proposalsKey(requestId ?? ''),
    queryFn: () => fetchRequestProposals(requestId as string),
    enabled: session !== null && Boolean(requestId),
  })
}

export function useChooseProposal(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (professionalId: string) => chooseProposal(requestId, professionalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: proposalsKey(requestId) })
      void queryClient.invalidateQueries({ queryKey: ['service_requests', 'mine'] })
      void queryClient.invalidateQueries({ queryKey: ['chosen-professional', requestId] })
      toast.success('Profissional escolhido. Já podes contactá-lo.')
    },
    onError: (error) => {
      // 409 = outro clique/separador ganhou a corrida; refrescar mostra o estado real.
      void queryClient.invalidateQueries({ queryKey: proposalsKey(requestId) })
      toast.error(errorMessage(error, 'Não foi possível escolher este profissional. Tenta novamente.'))
    },
  })
}

// Só depois de escolher (o backend recusa antes, com 409) — por isso `enabled`.
export function useChosenProfessional(requestId: string | undefined, enabled: boolean) {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['chosen-professional', requestId ?? ''],
    queryFn: () => fetchChosenProfessional(requestId as string),
    enabled: session !== null && Boolean(requestId) && enabled,
  })
}
