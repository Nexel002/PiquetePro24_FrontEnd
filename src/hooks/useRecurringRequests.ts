import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRecurringRequest,
  declineRecurringRequest,
  fetchAssignedRecurringRequests,
  fetchMyRecurringRequests,
  updateRecurringRequest,
  type EstadoDaRecorrencia,
  type Frequencia,
} from '../services/recurringRequests'
import { useAuth } from '../store/AuthContext'

const chave = ['recurring-requests'] as const

export function useMyRecurringRequests() {
  const { session } = useAuth()
  return useQuery({ queryKey: [...chave, 'meus'], queryFn: fetchMyRecurringRequests, enabled: session !== null })
}

export function useAssignedRecurringRequests() {
  const { session } = useAuth()
  return useQuery({ queryKey: [...chave, 'atribuidos'], queryFn: fetchAssignedRecurringRequests, enabled: session !== null })
}

function useInvalidar() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: chave })
}

export function useCreateRecurringRequest() {
  const invalidar = useInvalidar()
  return useMutation({ mutationFn: createRecurringRequest, onSuccess: invalidar })
}

export function useUpdateRecurringRequest() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: (input: { id: string; frequency?: Frequencia; next_date?: string; status?: EstadoDaRecorrencia }) => {
      const { id, ...alteracoes } = input
      return updateRecurringRequest(id, alteracoes)
    },
    onSuccess: invalidar,
  })
}

export function useDeclineRecurringRequest() {
  const invalidar = useInvalidar()
  return useMutation({ mutationFn: (input: { id: string; reason: string }) => declineRecurringRequest(input.id, input.reason), onSuccess: invalidar })
}
