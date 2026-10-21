import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSearchAlert, deleteSearchAlert, fetchSearchAlerts } from '../services/searchAlerts'
import { useAuth } from '../store/AuthContext'

const chaveDosAvisos = ['search-alerts'] as const

// Só para clientes: o backend responde 403 a outros papéis, por isso quem chama decide se pede.
export function useSearchAlerts(activo: boolean) {
  const { session } = useAuth()
  return useQuery({ queryKey: chaveDosAvisos, queryFn: fetchSearchAlerts, enabled: session !== null && activo })
}

export function useCreateSearchAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSearchAlert,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chaveDosAvisos }),
  })
}

export function useDeleteSearchAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSearchAlert,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chaveDosAvisos }),
  })
}
