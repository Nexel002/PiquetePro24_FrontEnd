import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProfessionalCatalog } from '../services/catalog'
import { addPortfolioPhoto, removePortfolioPhoto, uploadPortfolioPhoto } from '../services/portfolio'
import { submitServiceRequestReview, type ReviewPayload } from '../services/serviceRequests'
import { useAuth } from '../store/AuthContext'

const catalogQueryKey = (professionalId: string) => ['catalog', professionalId] as const

export function useProfessionalCatalog(professionalId: string | undefined) {
  const { session } = useAuth()

  return useQuery({
    queryKey: catalogQueryKey(professionalId ?? ''),
    queryFn: () => fetchProfessionalCatalog(professionalId as string),
    enabled: session !== null && Boolean(professionalId),
  })
}

// Encadeia upload (Storage, via lib/imageConversion.ts) + POST /professionals/me/portfolio
// numa só mutation, mesmo padrão de useUploadAvatar.
export function useAddPortfolioPhoto(professionalId: string | undefined) {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!session) throw new Error('Sessão expirada. Recarrega a página e tenta novamente.')
      const photoUrl = await uploadPortfolioPhoto(session.user.id, file)
      return addPortfolioPhoto(photoUrl)
    },
    onSuccess: () => {
      if (professionalId) void queryClient.invalidateQueries({ queryKey: catalogQueryKey(professionalId) })
    },
  })
}

export function useRemovePortfolioPhoto(professionalId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (photoId: string) => removePortfolioPhoto(photoId),
    onSuccess: () => {
      if (professionalId) void queryClient.invalidateQueries({ queryKey: catalogQueryKey(professionalId) })
    },
  })
}

export function useSubmitReview(professionalId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { requestId: string; payload: ReviewPayload }) =>
      submitServiceRequestReview(input.requestId, input.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service_requests', 'mine'] })
      if (professionalId) void queryClient.invalidateQueries({ queryKey: catalogQueryKey(professionalId) })
    },
  })
}
