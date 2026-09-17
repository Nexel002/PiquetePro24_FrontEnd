import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchOwnKyc, submitKyc, uploadKycDocument, type SubmitKycPayload } from '../services/kyc'
import { useAuth } from '../store/AuthContext'

const kycQueryKey = ['kyc'] as const

export function useOwnKyc() {
  const { session } = useAuth()

  return useQuery({
    queryKey: kycQueryKey,
    queryFn: fetchOwnKyc,
    enabled: session !== null,
  })
}

// Encadeia upload do documento (Storage, via signed URL) + POST /kyc com o path
// resultante numa só mutation, mesmo padrão de useUploadAvatar — o componente só
// gere um isPending/isError em vez de coordenar duas chamadas separadas.
export function useSubmitKyc() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { bi_number: string; nuit_number: string; document: File }) => {
      const bi_document_path = await uploadKycDocument(input.document)
      const payload: SubmitKycPayload = {
        bi_number: input.bi_number,
        nuit_number: input.nuit_number,
        bi_document_path,
      }
      return submitKyc(payload)
    },
    onSuccess: (kyc) => {
      queryClient.setQueryData(kycQueryKey, kyc)
    },
  })
}
