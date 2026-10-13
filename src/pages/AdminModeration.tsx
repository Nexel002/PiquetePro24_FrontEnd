import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BackButton } from '../components/BackButton'
import { NavegacaoAdmin } from '../components/admin/NavegacaoAdmin'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAdminReports, useResolveReport, useUnhideTarget } from '../hooks/useModeration'
import {
  ROTULOS_DE_ALVO,
  ROTULOS_DE_MOTIVO,
  type AdminReport,
  type ReportStatus,
} from '../services/moderation'

const PAGE_SIZE = 25

type Filtro = ReportStatus | 'ALL'

const FILTROS: Record<Filtro, string> = {
  OPEN: 'Abertas',
  RESOLVED: 'Resolvidas',
  DISMISSED: 'Rejeitadas',
  ALL: 'Todas',
}

const ESTADOS: Record<ReportStatus, { rotulo: string; variante: 'pending' | 'approved' | 'rejected' }> = {
  OPEN: { rotulo: 'Aberta', variante: 'pending' },
  RESOLVED: { rotulo: 'Resolvida', variante: 'approved' },
  DISMISSED: { rotulo: 'Rejeitada', variante: 'rejected' },
}

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Maputo' })

// Só estes dois tipos têm conteúdo que se oculta; contas e pedidos moderam-se noutros ecrãs.
const OCULTAVEL = new Set(['PORTFOLIO_PROJECT', 'REVIEW'])

function CartaoDeDenuncia({ report }: { report: AdminReport }) {
  const resolver = useResolveReport()
  const repor = useUnhideTarget()
  const [aDecidir, setADecidir] = useState(false)
  const [nota, setNota] = useState('')
  const [ocultar, setOcultar] = useState(false)

  const podeOcultar = OCULTAVEL.has(report.target_type) && report.target.exists
  const estado = ESTADOS[report.status]

  function decidir(action: 'RESOLVE' | 'DISMISS') {
    if (!nota.trim()) {
      toast.error('Escreve uma nota sobre a decisão.')
      return
    }
    resolver.mutate(
      { reportId: report.id, payload: { action, note: nota.trim(), hide_target: action === 'RESOLVE' && ocultar } },
      {
        onSuccess: () => {
          toast.success(action === 'RESOLVE' ? 'Denúncia resolvida.' : 'Denúncia rejeitada.')
          setADecidir(false)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível guardar a decisão.'),
      },
    )
  }

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
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Nota da decisão (fica no registo de auditoria)
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              maxLength={500}
              rows={2}
              className="rounded-xl border border-gray-200 p-2 text-sm font-normal"
            />
          </label>
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setADecidir(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// Fase 15: fila de denúncias. Contas moderam-se na ficha do utilizador (banir) e pedidos no
// ecrã de pedidos; aqui decide-se e oculta-se conteúdo. O guard de role está na rota.
export function AdminModeration() {
  const [filtro, setFiltro] = useState<Filtro>('OPEN')
  const [offset, setOffset] = useState(0)
  const { data: reports, isLoading, isError } = useAdminReports({ status: filtro, limit: PAGE_SIZE, offset })

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">Moderação</h1>
      </header>

      <NavegacaoAdmin />

      <div className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(FILTROS) as Filtro[]).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filtro === f}
            onClick={() => {
              setFiltro(f)
              setOffset(0)
            }}
            className={`rounded-xl px-3 py-1.5 font-semibold transition-colors ${
              filtro === f ? 'bg-piquete-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {FILTROS[f]}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2" role="status" aria-label="A carregar">
          <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      )}

      {isError && <p className="text-sm text-gray-600">Não foi possível carregar as denúncias. Verifica a tua ligação e tenta novamente.</p>}

      {reports && reports.length === 0 && (
        <p className="text-sm text-gray-600">{filtro === 'OPEN' ? 'Nenhuma denúncia por tratar.' : 'Nenhuma denúncia neste estado.'}</p>
      )}

      {reports && reports.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {reports.map((report) => (
              <li key={report.id}>
                <CartaoDeDenuncia report={report} />
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              Anterior
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={reports.length < PAGE_SIZE} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Seguinte
            </Button>
          </div>
        </>
      )}
    </main>
  )
}
