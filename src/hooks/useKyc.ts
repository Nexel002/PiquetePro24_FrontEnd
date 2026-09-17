import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchKycSubmissions,
  fetchOwnKyc,
  reviewKyc,
  submitKyc,
  uploadKycDocument,
  type KycStatus,
  type ReviewKycPayload,
  type SubmitKycPayload,
} from '../services/kyc'
import { useAuth } from '../store/AuthContext'

const kycQueryKey = ['kyc'] as const
const kycSubmissionsQueryKey = (status?: KycStatus) => ['kyc', 'admin', status ?? 'all'] as const

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

// TRD Adendo v1.6 — fila de revisão do ADMIN. Sem `enabled: session !== null` extra:
// a rota só é montada dentro de uma tela já protegida por role, e um 403 aqui é tão
// improvável quanto em qualquer outro hook autenticado.
export function useKycSubmissions(status?: KycStatus) {
  return useQuery({
    queryKey: kycSubmissionsQueryKey(status),
    queryFn: () => fetchKycSubmissions(status),
  })
}

export function useReviewKyc() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { kycId: string; payload: ReviewKycPayload }) => reviewKyc(input.kycId, input.payload),
    onSuccess: () => {
      // Invalida em vez de setQueryData: a resposta é só a submissão revista, mas a
      // lista pode ter filtro de status ativo (ex. ?status=PENDING) e a linha revista
      // já não deve lá aparecer — mais simples pedir a lista de novo do que replicar
      // a lógica do filtro no cliente.
      void queryClient.invalidateQueries({ queryKey: ['kyc', 'admin'] })
    },
  })
}
