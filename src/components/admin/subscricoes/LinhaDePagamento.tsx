import { Link } from 'react-router-dom'
import type { AdminPaymentRow } from '../../../services/adminSubscriptions'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'
import { ESTADOS_DE_PAGAMENTO, formatarData } from './formatos'

export function LinhaDePagamento({ pagamento }: { pagamento: AdminPaymentRow }) {
  const estado = ESTADOS_DE_PAGAMENTO[pagamento.status]
  return (
    <Card variant="solid" className="flex flex-col gap-1 p-4">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/admin/utilizadores/${pagamento.professional_id}`} className="text-sm font-bold text-piquete-blue underline">
          {pagamento.professional_name ?? 'Profissional sem nome'}
        </Link>
        <Badge variant={estado.variante}>{estado.rotulo}</Badge>
      </div>
      <p className="text-xs text-gray-500">
        {pagamento.amount} MZN · {pagamento.gateway}
        {pagamento.payer_phone ? ` · ${pagamento.payer_phone}` : ''} · {formatarData(pagamento.created_at)}
      </p>
    </Card>
  )
}
