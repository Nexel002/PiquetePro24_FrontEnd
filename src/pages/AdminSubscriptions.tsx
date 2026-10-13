import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BackButton } from '../components/BackButton'
import { NavegacaoAdmin } from '../components/admin/NavegacaoAdmin'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAdminPayments, useAdminSubscriptions, useRevokeSubscription } from '../hooks/useAdminSubscriptions'
import type { AdminPaymentRow, AdminSubscriptionRow, FiltroSubscricao } from '../services/adminSubscriptions'
import type { PaymentTransactionStatus, SubscriptionStatus } from '../services/subscriptions'

const PAGE_SIZE = 25

type Separador = 'SUBSCRICOES' | 'PAGAMENTOS'

const FILTROS: Record<FiltroSubscricao, string> = {
  ALL: 'Todas',
  ACTIVE: 'Activas',
  EXPIRING: 'A expirar (7 dias)',
  EXPIRED: 'Expiradas',
  INACTIVE: 'Sem pagamento',
}

const ESTADOS_PAGAMENTO: Record<PaymentTransactionStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  FAILED: 'Falhado',
}

const VARIANTE_SUBSCRICAO: Record<SubscriptionStatus, 'approved' | 'rejected' | 'info'> = {
  ACTIVE: 'approved',
  EXPIRED: 'rejected',
  INACTIVE: 'info',
}
const ROTULO_SUBSCRICAO: Record<SubscriptionStatus, string> = { ACTIVE: 'Activa', EXPIRED: 'Expirada', INACTIVE: 'Inactiva' }

const VARIANTE_PAGAMENTO: Record<PaymentTransactionStatus, 'approved' | 'rejected' | 'pending'> = {
  CONFIRMED: 'approved',
  FAILED: 'rejected',
  PENDING: 'pending',
}

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeZone: 'Africa/Maputo' })
const formatarData = (iso: string | null) => (iso ? dataFormatter.format(new Date(iso)) : '—')

function Paginacao({ offset, quantos, aoMudar }: { offset: number; quantos: number; aoMudar: (offset: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <Button type="button" variant="outline" size="sm" disabled={offset === 0} onClick={() => aoMudar(Math.max(0, offset - PAGE_SIZE))}>
        Anterior
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={quantos < PAGE_SIZE} onClick={() => aoMudar(offset + PAGE_SIZE)}>
        Seguinte
      </Button>
    </div>
  )
}

function LinhaDeSubscricao({ sub }: { sub: AdminSubscriptionRow }) {
  const revogar = useRevokeSubscription()
  const [aSuspender, setASuspender] = useState(false)
  const [motivo, setMotivo] = useState('')

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
        <Badge variant={VARIANTE_SUBSCRICAO[sub.status]}>{ROTULO_SUBSCRICAO[sub.status]}</Badge>
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
          <label className="text-xs font-semibold text-gray-600" htmlFor={`motivo-${sub.id}`}>
            Motivo (fica no registo de auditoria)
          </label>
          <textarea
            id={`motivo-${sub.id}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            rows={2}
            className="rounded-xl border border-gray-200 p-2 text-sm"
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

function LinhaDePagamento({ pagamento }: { pagamento: AdminPaymentRow }) {
  return (
    <Card variant="solid" className="flex flex-col gap-1 p-4">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/admin/utilizadores/${pagamento.professional_id}`} className="text-sm font-bold text-piquete-blue underline">
          {pagamento.professional_name ?? 'Profissional sem nome'}
        </Link>
        <Badge variant={VARIANTE_PAGAMENTO[pagamento.status]}>{ESTADOS_PAGAMENTO[pagamento.status]}</Badge>
      </div>
      <p className="text-xs text-gray-500">
        {pagamento.amount} MZN · {pagamento.gateway}
        {pagamento.payer_phone ? ` · ${pagamento.payer_phone}` : ''} · {formatarData(pagamento.created_at)}
      </p>
    </Card>
  )
}

function Estados({ isLoading, isError, vazio, mensagemVazio }: { isLoading: boolean; isError: boolean; vazio: boolean; mensagemVazio: string }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="A carregar">
        <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
        <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
      </div>
    )
  }
  if (isError) return <p className="text-sm text-gray-600">Não foi possível carregar. Verifica a tua ligação e tenta novamente.</p>
  if (vazio) return <p className="text-sm text-gray-600">{mensagemVazio}</p>
  return null
}

// Fase 13: visão global de subscrições e pagamentos. A activação manual continua na ficha
// do utilizador; aqui vê-se quem expira e suspende-se. O guard de role está na rota.
export function AdminSubscriptions() {
  const [separador, setSeparador] = useState<Separador>('SUBSCRICOES')
  const [filtro, setFiltro] = useState<FiltroSubscricao>('EXPIRING')
  const [estado, setEstado] = useState<PaymentTransactionStatus | 'ALL'>('ALL')
  const [offset, setOffset] = useState(0)

  const subscricoes = useAdminSubscriptions({ filtro, limit: PAGE_SIZE, offset })
  const pagamentos = useAdminPayments(
    { status: estado === 'ALL' ? undefined : estado, limit: PAGE_SIZE, offset },
    { enabled: separador === 'PAGAMENTOS' },
  )

  function mudarSeparador(novo: Separador) {
    setSeparador(novo)
    setOffset(0)
  }

  const classeSeparador = (activo: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold ${activo ? 'bg-piquete-blue text-white' : 'bg-gray-100 text-gray-700'}`

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">Subscrições</h1>
      </header>

      <NavegacaoAdmin />

      <div className="flex gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={separador === 'SUBSCRICOES'} className={classeSeparador(separador === 'SUBSCRICOES')} onClick={() => mudarSeparador('SUBSCRICOES')}>
          Subscrições
        </button>
        <button type="button" role="tab" aria-selected={separador === 'PAGAMENTOS'} className={classeSeparador(separador === 'PAGAMENTOS')} onClick={() => mudarSeparador('PAGAMENTOS')}>
          Pagamentos
        </button>
      </div>

      {separador === 'SUBSCRICOES' ? (
        <>
          <select
            aria-label="Filtro de subscrições"
            value={filtro}
            onChange={(e) => {
              setFiltro(e.target.value as FiltroSubscricao)
              setOffset(0)
            }}
            className="self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {Object.entries(FILTROS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <Estados isLoading={subscricoes.isLoading} isError={subscricoes.isError} vazio={subscricoes.data?.length === 0} mensagemVazio="Nenhuma subscrição neste filtro." />
          {subscricoes.data && subscricoes.data.length > 0 && (
            <>
              <ul className="flex flex-col gap-3">
                {subscricoes.data.map((sub) => (
                  <li key={sub.id}>
                    <LinhaDeSubscricao sub={sub} />
                  </li>
                ))}
              </ul>
              <Paginacao offset={offset} quantos={subscricoes.data.length} aoMudar={setOffset} />
            </>
          )}
        </>
      ) : (
        <>
          <select
            aria-label="Estado do pagamento"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as PaymentTransactionStatus | 'ALL')
              setOffset(0)
            }}
            className="self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">Todos os estados</option>
            {Object.entries(ESTADOS_PAGAMENTO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <Estados isLoading={pagamentos.isLoading} isError={pagamentos.isError} vazio={pagamentos.data?.length === 0} mensagemVazio="Nenhum pagamento encontrado." />
          {pagamentos.data && pagamentos.data.length > 0 && (
            <>
              <ul className="flex flex-col gap-3">
                {pagamentos.data.map((p) => (
                  <li key={p.id}>
                    <LinhaDePagamento pagamento={p} />
                  </li>
                ))}
              </ul>
              <Paginacao offset={offset} quantos={pagamentos.data.length} aoMudar={setOffset} />
            </>
          )}
        </>
      )}
    </main>
  )
}
