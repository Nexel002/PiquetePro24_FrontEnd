import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProfessionalCatalog, updateServiceArea, type ServiceArea } from '../services/catalog'
import { workedWithProfessionalsKey } from './useWorkedWithProfessionals'
import {
  addProjectPhotos,
  createPortfolioProject,
  removePortfolioProject,
  removeProjectPhoto,
  updatePortfolioProject,
  uploadPortfolioPhotos,
} from '../services/portfolio'
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

function useInvalidateCatalog(professionalId: string | undefined) {
  const queryClient = useQueryClient()
  return () => {
    if (professionalId) void queryClient.invalidateQueries({ queryKey: catalogQueryKey(professionalId) })
  }
}

// Fase 38 (N1): a zona muda a ordem da pesquisa, por isso a pesquisa em cache também é invalidada.
export function useUpdateServiceArea(professionalId: string | undefined) {
  const queryClient = useQueryClient()
  const invalidarCatalogo = useInvalidateCatalog(professionalId)

  return useMutation({
    mutationFn: (area: ServiceArea) => updateServiceArea(area),
    onSuccess: () => {
      invalidarCatalogo()
      void queryClient.invalidateQueries({ queryKey: ['professionals', 'search'] })
    },
  })
}

export interface CreateProjectVariables {
  files: File[]
  categoryId: string
  description: string
  onProgress?: (done: number, total: number) => void
}

// Encadeia o upload das fotos (Storage, via lib/imageConversion.ts) + POST
// /professionals/me/projects numa só mutation, mesmo padrão de useUploadAvatar. O trabalho
// só é criado quando todas as fotos subiram.
export function useCreateProject(professionalId: string | undefined) {
  const { session } = useAuth()
  const invalidate = useInvalidateCatalog(professionalId)

  return useMutation({
    mutationFn: async ({ files, categoryId, description, onProgress }: CreateProjectVariables) => {
      if (!session) throw new Error('Sessão expirada. Recarrega a página e tenta novamente.')
      const photoUrls = await uploadPortfolioPhotos(session.user.id, files, onProgress)
      return createPortfolioProject({
        category_id: categoryId,
        description: description.trim() || null,
        photo_urls: photoUrls,
      })
    },
    onSuccess: invalidate,
  })
}

export function useUpdateProject(professionalId: string | undefined) {
  const invalidate = useInvalidateCatalog(professionalId)

  return useMutation({
    mutationFn: (input: { projectId: string; categoryId?: string; description?: string | null }) =>
      updatePortfolioProject(input.projectId, { category_id: input.categoryId, description: input.description }),
    onSuccess: invalidate,
  })
}

export function useAddProjectPhotos(professionalId: string | undefined) {
  const { session } = useAuth()
  const invalidate = useInvalidateCatalog(professionalId)

  return useMutation({
    mutationFn: async (input: { projectId: string; files: File[] }) => {
      if (!session) throw new Error('Sessão expirada. Recarrega a página e tenta novamente.')
      const photoUrls = await uploadPortfolioPhotos(session.user.id, input.files)
      return addProjectPhotos(input.projectId, photoUrls)
    },
    onSuccess: invalidate,
  })
}

export function useRemoveProjectPhoto(professionalId: string | undefined) {
  const invalidate = useInvalidateCatalog(professionalId)

  return useMutation({
    mutationFn: (input: { projectId: string; photoId: string }) => removeProjectPhoto(input.projectId, input.photoId),
    onSuccess: invalidate,
  })
}

export function useRemoveProject(professionalId: string | undefined) {
  const invalidate = useInvalidateCatalog(professionalId)

  return useMutation({
    mutationFn: (projectId: string) => removePortfolioProject(projectId),
    onSuccess: invalidate,
  })
}

export function useSubmitReview(professionalId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { requestId: string; payload: ReviewPayload }) =>
      submitServiceRequestReview(input.requestId, input.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service_requests', 'mine'] })
      // A avaliação dada aparece em "Os meus profissionais".
      void queryClient.invalidateQueries({ queryKey: workedWithProfessionalsKey })
      if (professionalId) void queryClient.invalidateQueries({ queryKey: catalogQueryKey(professionalId) })
    },
  })
}
