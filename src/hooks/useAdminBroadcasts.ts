import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchBroadcasts, previewBroadcast, sendBroadcast, type Broadcast } from '../services/adminBroadcasts'

const broadcastsKey = ['admin-broadcasts'] as const

// Enquanto algum comunicado ainda está a ser enviado, volta a pedir a lista de 5 em 5 segundos
// para os totais irem subindo; depois de todos concluídos, pára.
export function useBroadcasts() {
  return useQuery({
    queryKey: broadcastsKey,
    queryFn: fetchBroadcasts,
    refetchInterval: (query) => (query.state.data?.some((b: Broadcast) => b.status === 'SENDING') ? 5000 : false),
  })
}

export function usePreviewBroadcast() {
  return useMutation({ mutationFn: previewBroadcast })
}

export function useSendBroadcast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: sendBroadcast,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: broadcastsKey })
    },
  })
}
