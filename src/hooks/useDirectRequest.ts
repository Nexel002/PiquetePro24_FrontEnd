import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { gerarUuid } from '../lib/uuid'
import { createDirectRequest, type DirectRequestPayload } from '../services/directRequest'
import { myServiceRequestsKey } from './useServiceRequests'

// Uma chave por formulário: um duplo toque, ou um reenvio depois de a resposta se perder, devolve o
// pedido que já existe em vez de criar outro. Só se renova depois de um sucesso.
export function useCreateDirectRequest() {
  const queryClient = useQueryClient()
  const chave = useRef(gerarUuid())

  return useMutation({
    mutationFn: (payload: DirectRequestPayload) => createDirectRequest(payload, chave.current),
    onSuccess: () => {
      chave.current = gerarUuid()
      void queryClient.invalidateQueries({ queryKey: myServiceRequestsKey })
    },
  })
}
