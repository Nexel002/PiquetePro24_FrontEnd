import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useRevokeSubscription } from '../../../hooks/useAdminSubscriptions'
import type { AdminSubscriptionRow } from '../../../services/adminSubscriptions'
import type { SubscriptionStatus } from '../../../services/subscriptions'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { AreaDeTexto } from '../estrutura/CamposDeFormulario'
import { formatarData } from './formatos'

const ESTADOS: Record<SubscriptionStatus, { rotulo: string; variante: 'approved' | 'rejected' | 'info' }> = {
  ACTIVE: { rotulo: 'Activa', variante: 'approved' },
  EXPIRED: { rotulo: 'Expirada', variante: 'rejected' },
  INACTIVE: { rotulo: 'Inactiva', variante: 'info' },
}

export function LinhaDeSubscricao({ sub }: { sub: AdminSubscriptionRow }) {
  const revogar = useRevokeSubscription()
  const [aSuspender, setASuspender] = useState(false)
  const [motivo, setMotivo] = useState('')
  const estado = ESTADOS[sub.status]

  function confirmar() {
    if (!motivo.trim()) {
      toast.error('Indica o motivo da suspensão.')
      return
    }
    revogar.mutate(
      { userId: sub.professional_id, note: motivo.trim() },
      {
        onSuccess: () => {
          toast.success('Subscrição suspensa.')
          setASuspender(false)
          setMotivo('')
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível suspender a subscrição.'),
      },
    )
  }

  return (
    <Card variant="solid" className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/admin/utilizadores/${sub.professional_id}`} className="text-sm font-bold text-piquete-blue underline">
          {sub.professional_name ?? 'Profissional sem nome'}
        </Link>
        <Badge variant={estado.variante}>{estado.rotulo}</Badge>
      </div>
      <p className="text-xs text-gray-500">
        {sub.amount} MZN · {sub.gateway ?? 'sem pagamento'} · válida até {formatarData(sub.expires_at)}
      </p>

      {sub.status === 'ACTIVE' && !aSuspender && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setASuspender(true)}>
          Suspender
        </Button>
      )}
      {aSuspender && (
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-2">
          <AreaDeTexto
            rotulo="Motivo (fica no registo de auditoria)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={confirmar} isLoading={revogar.isPending} disabled={revogar.isPending}>
              Confirmar suspensão
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setASuspender(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
