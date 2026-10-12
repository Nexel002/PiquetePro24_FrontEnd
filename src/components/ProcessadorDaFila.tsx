import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { myServiceRequestsKey } from '../hooks/useServiceRequests'
import { useEstadoDeLigacao } from '../lib/conectividade'
import { enviarPendentes, filaDisponivel } from '../lib/filaOffline'
import { createServiceRequest } from '../services/serviceRequests'
import { useAuth } from '../store/AuthContext'

const INTERVALO_MS = 60_000

// Não desenha nada: envia os pedidos guardados sem ligação quando há condições para isso.
// Dispara ao abrir a app, quando o navegador volta a ficar online, quando o servidor volta a
// responder e de minuto a minuto — este último apanha o caso «Wi-Fi sem dados que volta» em que
// nenhum evento é emitido. Com a fila vazia cada disparo é só uma leitura local.
export function ProcessadorDaFila() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const ligacao = useEstadoDeLigacao()
  const userId = session?.user.id

  useEffect(() => {
    if (!userId || !filaDisponivel() || ligacao === 'sem-rede') return

    let cancelado = false
    async function tentar() {
      try {
        const resultado = await enviarPendentes(userId!, createServiceRequest)
        if (cancelado) return
        if (resultado.enviados.length > 0) {
          queryClient.invalidateQueries({ queryKey: myServiceRequestsKey })
          toast.success(
            resultado.enviados.length === 1
              ? 'O pedido guardado foi enviado.'
              : `${resultado.enviados.length} pedidos guardados foram enviados.`,
          )
        }
        if (resultado.recusados > 0) {
          toast.error('Um pedido guardado foi recusado pelo servidor. Vê o motivo em «Os meus pedidos».', { duration: 10000 })
        }
      } catch {
        // IndexedDB indisponível ou a falhar: tenta de novo no próximo disparo.
      }
    }

    void tentar()
    window.addEventListener('online', tentar)
    const intervalo = setInterval(tentar, INTERVALO_MS)
    return () => {
      cancelado = true
      window.removeEventListener('online', tentar)
      clearInterval(intervalo)
    }
  }, [userId, ligacao, queryClient])

  return null
}
