import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAdminCancelServiceRequest } from '../../../hooks/useAdminServiceRequests'
import type { RequestStatus, ServiceRequest } from '../../../services/serviceRequests'
import { Card } from '../../ui/Card'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'
import { NotasInternas } from '../NotasInternas'
import { rotaDaAuditoria } from '../layout/rotas'

const ESTADOS: Record<RequestStatus, { rotulo: string; badge: string; ponto: string }> = {
  OPEN: { rotulo: 'Aberto', badge: 'bg-blue-50 text-blue-700 border-blue-200/90', ponto: 'bg-blue-500 animate-pulse' },
  ASSIGNED: { rotulo: 'Atribuído', badge: 'bg-amber-50 text-amber-800 border-amber-200/90', ponto: 'bg-amber-500' },
  COMPLETED: { rotulo: 'Concluído', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/90', ponto: 'bg-emerald-500' },
  CANCELLED: { rotulo: 'Cancelado', badge: 'bg-rose-50 text-rose-700 border-rose-200/90', ponto: 'bg-rose-500' },
}

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })

const CLASSE_DA_ACCAO = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors'

// Cada cartão guarda o seu estado (confirmação de cancelar, notas abertas): é dele, e assim a
// página não tem de saber qual dos pedidos está a meio de quê.
export function CartaoDePedido({ pedido }: { pedido: ServiceRequest }) {
  const cancelar = useAdminCancelServiceRequest()
  const [aConfirmarCancelamento, setAConfirmarCancelamento] = useState(false)
  const [notasAbertas, setNotasAbertas] = useState(false)

  const estado = ESTADOS[pedido.status]
  const localidade = [pedido.province, pedido.district, pedido.neighborhood].filter(Boolean).join(', ')
  const podeCancelar = pedido.status !== 'COMPLETED' && pedido.status !== 'CANCELLED'

  function confirmarCancelamento() {
    cancelar.mutate(pedido.id, {
      onSuccess: () => {
        toast.success(`Pedido "${pedido.title}" cancelado.`)
        setAConfirmarCancelamento(false)
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível cancelar este pedido.'),
    })
  }

  return (
    <Card variant="solid" className="p-4 sm:p-5 hover:border-gray-300 transition-all duration-200">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900 font-heading leading-snug">{pedido.title}</h3>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm shrink-0 ${estado.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${estado.ponto}`} />
            <span>{estado.rotulo}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          {localidade && (
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <IconeDeAdmin nome="local" className="w-3.5 h-3.5 text-gray-400" />
              <span>{localidade}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-gray-400">
            <IconeDeAdmin nome="relogio" className="w-3.5 h-3.5 text-gray-400" />
            <span>{dataFormatter.format(new Date(pedido.created_at))}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 mt-1 border-t border-gray-100">
          <Link
            to={rotaDaAuditoria({ entity_type: 'service_requests', entity_id: pedido.id })}
            className={`${CLASSE_DA_ACCAO} bg-piquete-blue/5 hover:bg-piquete-blue/10 text-piquete-blue`}
          >
            <IconeDeAdmin nome="relogio" className="w-3.5 h-3.5" />
            <span>Ver histórico</span>
          </Link>

          <button
            type="button"
            aria-expanded={notasAbertas}
            onClick={() => setNotasAbertas((abertas) => !abertas)}
            className={`${CLASSE_DA_ACCAO} ${notasAbertas ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            <IconeDeAdmin nome="lapis" className="w-3.5 h-3.5" />
            <span>Notas</span>
          </button>

          {podeCancelar &&
            (aConfirmarCancelamento ? (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1 text-xs">
                <span className="font-medium text-rose-800">Cancelar este pedido?</span>
                <button
                  type="button"
                  onClick={confirmarCancelamento}
                  disabled={cancelar.isPending}
                  className="font-bold text-rose-700 hover:underline disabled:opacity-50"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setAConfirmarCancelamento(false)}
                  disabled={cancelar.isPending}
                  className="text-gray-500 hover:underline disabled:opacity-50"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAConfirmarCancelamento(true)}
                className={`${CLASSE_DA_ACCAO} bg-rose-50 hover:bg-rose-100 text-rose-700`}
              >
                <IconeDeAdmin nome="fechar" className="w-3.5 h-3.5" />
                <span>Cancelar pedido</span>
              </button>
            ))}
        </div>

        {notasAbertas && (
          <div className="pt-2">
            <NotasInternas targetType="SERVICE_REQUEST" targetId={pedido.id} />
          </div>
        )}
      </div>
    </Card>
  )
}
