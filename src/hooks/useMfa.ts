import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { iniciarRegistoDeFactor, obterEstadoDoMfa, verificarCodigo } from '../services/mfa'

const mfaKey = ['mfa'] as const

export function useEstadoDoMfa(options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: mfaKey, queryFn: obterEstadoDoMfa, enabled: options.enabled ?? true })
}

export function useIniciarRegistoDeFactor() {
  return useMutation({ mutationFn: iniciarRegistoDeFactor })
}

export function useVerificarCodigo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { factorId: string; codigo: string }) => verificarCodigo(input.factorId, input.codigo),
    onSuccess: () => {
      // O nível da sessão subiu para aal2: o estado tem de ser lido de novo.
      void queryClient.invalidateQueries({ queryKey: mfaKey })
    },
  })
}
