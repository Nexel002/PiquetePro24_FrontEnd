import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCredentialDocument, fetchCredentialsForReview, reviewCredential } from '../services/adminCredentials'
import type { EstadoDaCredencial } from '../services/credentials'

export function useCredentialsForReview(status?: EstadoDaCredencial) {
  return useQuery({ queryKey: ['admin-credentials', status ?? 'ALL'], queryFn: () => fetchCredentialsForReview(status) })
}

// Mutation e não query: cada abertura gera um URL novo e uma linha de auditoria; não se faz em cache
// nem ao montar o ecrã.
export function useCredentialDocument() {
  return useMutation({ mutationFn: fetchCredentialDocument })
}

export function useReviewCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: 'APPROVED' | 'REJECTED'; review_notes?: string }) =>
      reviewCredential(input.id, { status: input.status, review_notes: input.review_notes }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-credentials'] }),
  })
}
