import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useResolveReport, useUnhideTarget } from '../../../hooks/useModeration'
import { ROTULOS_DE_ALVO, ROTULOS_DE_MOTIVO, type AdminReport, type ReportStatus } from '../../../services/moderation'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { AreaDeTexto } from '../estrutura/CamposDeFormulario'

const ESTADOS: Record<ReportStatus, { rotulo: string; variante: 'pending' | 'approved' | 'rejected' }> = {
  OPEN: { rotulo: 'Aberta', variante: 'pending' },
  RESOLVED: { rotulo: 'Resolvida', variante: 'approved' },
  DISMISSED: { rotulo: 'Rejeitada', variante: 'rejected' },
}

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Maputo' })

// Só estes dois tipos têm conteúdo que se oculta; contas e pedidos moderam-se noutros ecrãs.
const OCULTAVEL = new Set(['PORTFOLIO_PROJECT', 'REVIEW'])

function FormularioDeDecisao({ report, podeOcultar, aoFechar }: { report: AdminReport; podeOcultar: boolean; aoFechar: () => void }) {
  const resolver = useResolveReport()
  const [nota, setNota] = useState('')
  const [ocultar, setOcultar] = useState(false)

  function decidir(action: 'RESOLVE' | 'DISMISS') {
    if (!nota.trim()) {
      toast.error('Escreve uma nota sobre a decisão.')
      return
    }
    resolver.mutate(
      // Rejeitar uma denúncia nunca oculta, mesmo que a caixa tenha ficado marcada.
      { reportId: report.id, payload: { action, note: nota.trim(), hide_target: action === 'RESOLVE' && ocultar } },
      {
        onSuccess: () => {
          toast.success(action === 'RESOLVE' ? 'Denúncia resolvida.' : 'Denúncia rejeitada.')
          aoFechar()
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível guardar a decisão.'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-2">
      <AreaDeTexto
        rotulo="Nota da decisão (fica no registo de auditoria)"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        maxLength={500}
      />
      {podeOcultar && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={ocultar} onChange={(e) => setOcultar(e.target.checked)} />
          Ocultar o conteúdo denunciado
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => decidir('RESOLVE')} disabled={resolver.isPending}>
          Resolver
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => decidir('DISMISS')} disabled={resolver.isPending}>
          Rejeitar denúncia
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={aoFechar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

export function CartaoDeDenuncia({ report }: { report: AdminReport }) {
  const repor = useUnhideTarget()
  const [aDecidir, setADecidir] = useState(false)

  const podeOcultar = OCULTAVEL.has(report.target_type) && report.target.exists
  const estado = ESTADOS[report.status]

  function reporConteudo() {
    repor.mutate(
      { targetType: report.target_type as 'PORTFOLIO_PROJECT' | 'REVIEW', targetId: report.target_id },
      {
        onSuccess: () => toast.success('Conteúdo reposto.'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível repor o conteúdo.'),
      },
    )
  }

  return (
    <Card variant="solid" className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-piquete-blue">
            {ROTULOS_DE_ALVO[report.target_type]} · {ROTULOS_DE_MOTIVO[report.reason]}
          </p>
          <p className="text-xs text-gray-500">
            {report.reporter_name ?? 'Conta apagada'} · {dataFormatter.format(new Date(report.created_at))}
          </p>
        </div>
        <Badge variant={estado.variante}>{estado.rotulo}</Badge>
      </div>

      <p className="text-sm text-gray-700">
        {report.target.exists ? (report.target.label ?? 'Sem texto') : 'O conteúdo denunciado já não existe.'}
        {report.target.hidden && <span className="ml-2 text-xs font-semibold text-amber-700">(oculto)</span>}
      </p>
      {report.details && <p className="text-sm text-gray-600">“{report.details}”</p>}
      {report.resolution_note && <p className="text-sm text-gray-600">Decisão: {report.resolution_note}</p>}

      {report.target_type === 'USER' && report.target.exists && (
        <Link to={`/admin/utilizadores/${report.target_id}`} className="self-start text-sm font-semibold text-piquete-blue underline">
          Ver conta
        </Link>
      )}

      {report.target.hidden && podeOcultar && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={reporConteudo} disabled={repor.isPending}>
          Repor conteúdo
        </Button>
      )}

      {report.status === 'OPEN' && !aDecidir && (
        <Button type="button" size="sm" className="self-start" onClick={() => setADecidir(true)}>
          Decidir
        </Button>
      )}

      {report.status === 'OPEN' && aDecidir && (
        <FormularioDeDecisao report={report} podeOcultar={podeOcultar} aoFechar={() => setADecidir(false)} />
      )}
    </Card>
  )
}
