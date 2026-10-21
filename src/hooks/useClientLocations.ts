import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClientLocation, deleteClientLocation, exportMyRequests, fetchClientLocations } from '../services/clientLocations'
import { useAuth } from '../store/AuthContext'

const chaveDosLocais = ['client-locations'] as const

// Só para clientes (o backend responde 403 a outros papéis): quem chama decide se pede. Ficam em
// cache como o resto do TanStack Query, por isso escolher um local num pedido funciona sem rede
// depois de a lista ter sido carregada uma vez.
export function useClientLocations(activo: boolean) {
  const { session } = useAuth()
  return useQuery({ queryKey: chaveDosLocais, queryFn: fetchClientLocations, enabled: session !== null && activo })
}

export function useCreateClientLocation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: createClientLocation, onSuccess: () => void queryClient.invalidateQueries({ queryKey: chaveDosLocais }) })
}

export function useDeleteClientLocation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: deleteClientLocation, onSuccess: () => void queryClient.invalidateQueries({ queryKey: chaveDosLocais }) })
}

export function useExportMyRequests() {
  return useMutation({ mutationFn: exportMyRequests })
}
