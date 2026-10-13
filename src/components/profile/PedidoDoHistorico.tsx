import type { RequestStatus, ServiceRequest } from '../../services/serviceRequests'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: 'Aberto',
  ASSIGNED: 'Atribuído',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const STATUS_BADGE_VARIANT: Record<RequestStatus, 'info' | 'pending' | 'approved' | 'rejected'> = {
  OPEN: 'info',
  ASSIGNED: 'pending',
  COMPLETED: 'approved',
  CANCELLED: 'rejected',
}

const orderDateFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })

interface PedidoDoHistoricoProps {
  pedido: ServiceRequest
  nomeDaCategoria: string | null
  aConcluir: boolean
  aCancelar: boolean
  aoConcluir: () => void
  aoCancelar: () => void
}

export function PedidoDoHistorico({ pedido, nomeDaCategoria, aConcluir, aCancelar, aoConcluir, aoCancelar }: PedidoDoHistoricoProps) {
  const podeAgir = pedido.status === 'OPEN' || pedido.status === 'ASSIGNED'

  return (
    <li className="group flex flex-col gap-2.5 rounded-2xl bg-white border border-gray-100 shadow-card p-4 transition-all duration-300 hover:border-piquete-blue/20 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 self-start rounded-lg bg-piquete-blue/5 border border-piquete-blue/10 px-2 py-0.5 text-[11px] font-bold text-piquete-blue">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {nomeDaCategoria ?? 'Serviço Geral'}
          </span>
          <h3 className="text-sm font-bold text-piquete-blue group-hover:text-piquete-blue-light transition-colors">{pedido.title}</h3>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[pedido.status]}>{STATUS_LABELS[pedido.status]}</Badge>
      </div>

      {pedido.description && <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{pedido.description}</p>}

      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px] text-gray-400">
        <span>{[pedido.province, pedido.district, pedido.neighborhood].filter(Boolean).join(' — ') || 'Localização GPS'}</span>
        <span>{orderDateFormatter.format(new Date(pedido.created_at))}</span>
      </div>

      {podeAgir && (
        <div className="flex gap-2 pt-1">
          {pedido.status === 'ASSIGNED' && (
            <Button type="button" variant="primary" size="sm" onClick={aoConcluir} disabled={aConcluir} isLoading={aConcluir}>
              Concluir
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={aoCancelar} disabled={aCancelar} className="text-red-600 hover:text-red-700">
            Cancelar
          </Button>
        </div>
      )}
    </li>
  )
}
