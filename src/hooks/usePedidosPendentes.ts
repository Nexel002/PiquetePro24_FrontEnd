import { useCallback, useEffect, useState } from 'react'
import { aoMudarAFila, descartar, filaDisponivel, listarPendentes, type PedidoPendente } from '../lib/filaOffline'
import { useAuth } from '../store/AuthContext'

// Pedidos guardados neste dispositivo à espera de ligação (ou recusados pelo servidor), só os
// do utilizador com sessão. Actualiza sozinho quando a fila muda.
export function usePedidosPendentes() {
  const { session } = useAuth()
  const userId = session?.user.id
  const [pedidos, setPedidos] = useState<PedidoPendente[]>([])

  const recarregar = useCallback(async () => {
    if (!userId || !filaDisponivel()) {
      setPedidos([])
      return
    }
    try {
      setPedidos(await listarPendentes(userId))
    } catch {
      // IndexedDB falhou a ler: sem fila visível, o resto da app continua.
      setPedidos([])
    }
  }, [userId])

  useEffect(() => {
    void recarregar()
    return aoMudarAFila(() => void recarregar())
  }, [recarregar])

  return { pedidos, descartar: (id: string) => descartar(id) }
}
