import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activateSubscriptionManually,
  fetchMySubscription,
  fetchUserSubscription,
  initiateSubscription,
  type InitiateSubscriptionPayload,
  type SubscriptionSummary,
} from '../services/subscriptions'
import { useAuth } from '../store/AuthContext'

const mySubscriptionKey = ['subscription', 'mine'] as const

// O pedido de PIN no telemóvel pode demorar — o M-Pesa real espera até ~1 minuto que o
// pagador confirme. Enquanto a última transação estiver PENDING, perguntar ao backend
// de poucos em poucos segundos; fora disso, nenhum polling.
const INTERVALO_POLLING_PAGAMENTO_MS = 3000

function pagamentoPendente(summary: SubscriptionSummary | undefined): boolean {
  return summary?.latest_transaction?.status === 'PENDING'
}

// `enabled` para o caso de a página ser montada por um perfil que não é PROFESSIONAL
// (o backend responderia 403): Home.tsx só mostra os links a profissionais, mas
// NearbyServiceRequests também usa este hook.
export function useMySubscription(options: { enabled?: boolean } = {}) {
  const { session } = useAuth()

  return useQuery({
    queryKey: mySubscriptionKey,
    queryFn: fetchMySubscription,
    enabled: session !== null && (options.enabled ?? true),
    refetchInterval: (query) => (pagamentoPendente(query.state.data) ? INTERVALO_POLLING_PAGAMENTO_MS : false),
  })
}

export function useInitiateSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: InitiateSubscriptionPayload) => initiateSubscription(payload),
    onSuccess: () => {
      // Invalida (em vez de gravar a resposta na cache) para o resumo voltar com
      // latest_transaction = PENDING e o polling acima arrancar sozinho.
      void queryClient.invalidateQueries({ queryKey: mySubscriptionKey })
    },
  })
}

const userSubscriptionKey = (userId: string) => ['subscription', 'admin', userId] as const

export function useUserSubscription(userId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: userSubscriptionKey(userId),
    queryFn: () => fetchUserSubscription(userId),
    enabled: options.enabled ?? true,
  })
}

export function useActivateSubscriptionManually() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { userId: string; note: string }) => activateSubscriptionManually(input.userId, input.note),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: userSubscriptionKey(input.userId) })
    },
  })
}
