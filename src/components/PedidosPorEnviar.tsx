import { usePedidosPendentes } from '../hooks/usePedidosPendentes'
import { Button } from './ui/Button'

// Pedidos criados sem ligação e ainda não aceites pelo servidor. Fica visível até serem
// enviados: o utilizador tem de saber que o pedido existe, senão volta a criá-lo.
export function PedidosPorEnviar() {
  const { pedidos, descartar } = usePedidosPendentes()
  if (pedidos.length === 0) return null

  return (
    <section aria-label="Pedidos por enviar" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-900">Por enviar ({pedidos.length})</h2>
      <ul className="flex flex-col gap-2">
        {pedidos.map((pedido) => (
          <li
            key={pedido.id}
            className={`flex flex-col gap-2 rounded-lg border p-3 ${pedido.recusado ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
          >
            <p className="text-sm font-medium text-gray-900">{pedido.payload.title}</p>
            {pedido.recusado ? (
              <p className="text-xs text-red-700">O servidor recusou este pedido: {pedido.recusado}</p>
            ) : (
              <p className="text-xs text-amber-800">Guardado neste telemóvel. Envia-se sozinho quando a ligação voltar.</p>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="self-start"
              onClick={() => {
                if (window.confirm('Descartar este pedido? Não será enviado.')) void descartar(pedido.id)
              }}
            >
              Descartar
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
