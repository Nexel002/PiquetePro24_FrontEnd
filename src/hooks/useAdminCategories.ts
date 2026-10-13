import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAdminCategory,
  deleteAdminCategory,
  fetchAdminCategories,
  updateAdminCategory,
  type CategoryInput,
} from '../services/adminCategories'

const adminCategoriesKey = ['admin-categories'] as const

export function useAdminCategories() {
  return useQuery({ queryKey: adminCategoriesKey, queryFn: fetchAdminCategories })
}

// Qualquer alteração invalida também a lista pública, que alimenta a pesquisa e a edição do
// catálogo do profissional.
function useInvalidarCategorias() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: adminCategoriesKey })
    void queryClient.invalidateQueries({ queryKey: ['service-categories'] })
  }
}

export function useCreateAdminCategory() {
  const invalidar = useInvalidarCategorias()
  return useMutation({ mutationFn: (input: CategoryInput) => createAdminCategory(input), onSuccess: invalidar })
}

export function useUpdateAdminCategory() {
  const invalidar = useInvalidarCategorias()
  return useMutation({
    mutationFn: (input: { id: string; changes: Partial<CategoryInput> }) => updateAdminCategory(input.id, input.changes),
    onSuccess: invalidar,
  })
}

export function useDeleteAdminCategory() {
  const invalidar = useInvalidarCategorias()
  return useMutation({ mutationFn: (id: string) => deleteAdminCategory(id), onSuccess: invalidar })
}
