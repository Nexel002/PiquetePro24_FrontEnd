import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchServiceCategories, replaceMyServices } from '../services/serviceCategories'
import { useAuth } from '../store/AuthContext'

export function useServiceCategories() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['service-categories'],
    queryFn: fetchServiceCategories,
    enabled: session !== null,
    // Lista fixa (só muda com uma migration no backend): não há razão para a voltar a
    // pedir a cada ecrã.
    staleTime: 60 * 60 * 1000,
  })
}

export function useReplaceMyServices(professionalId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categoryIds: string[]) => replaceMyServices(categoryIds),
    onSuccess: () => {
      if (professionalId) void queryClient.invalidateQueries({ queryKey: ['catalog', professionalId] })
      void queryClient.invalidateQueries({ queryKey: ['professionals', 'search'] })
    },
  })
}
