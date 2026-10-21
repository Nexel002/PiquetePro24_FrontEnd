import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteCredential,
  fetchOwnCredentials,
  submitCredential,
  uploadCredentialDocument,
  type SubmitCredentialPayload,
} from '../services/credentials'
import { useAuth } from '../store/AuthContext'

const chave = ['credentials'] as const

export function useOwnCredentials() {
  const { session } = useAuth()
  return useQuery({ queryKey: chave, queryFn: fetchOwnCredentials, enabled: session !== null })
}

// Upload do documento + submissão numa só mutation, como useCreateProject (portfólio): a credencial
// só é criada depois de o ficheiro ter subido.
export function useSubmitCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, ...dados }: Omit<SubmitCredentialPayload, 'document_path'> & { file: File }) => {
      const document_path = await uploadCredentialDocument(file)
      return submitCredential({ ...dados, document_path })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chave }),
  })
}

export function useDeleteCredential() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: deleteCredential, onSuccess: () => void queryClient.invalidateQueries({ queryKey: chave }) })
}
