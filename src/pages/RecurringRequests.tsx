import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BackButton } from '../components/BackButton'
import { useMyRecurringRequests, useUpdateRecurringRequest } from '../hooks/useRecurringRequests'
import { dataLegivel, ROTULO_DA_FREQUENCIA, type EstadoDaRecorrencia, type RecurringRequest } from '../services/recurringRequests'

const ESTADO: Record<EstadoDaRecorrencia, { rotulo: string; classe: string }> = {
  ACTIVE: { rotulo: 'Activo', classe: 'bg-emerald-50 text-emerald-700' },
  PAUSED: { rotulo: 'Pausado', classe: 'bg-amber-50 text-amber-700' },
  CANCELLED: { rotulo: 'Cancelado', classe: 'bg-gray-100 text-gray-600' },
}

// Fase 42 (TRD Adendo v1.66, N3): os serviços recorrentes do cliente — pausar, retomar e cancelar.
// Cada vez chega como um pedido em «Os meus pedidos», 2 dias antes da data.
function LinhaDaRecorrencia({ r }: { r: RecurringRequest }) {
  const mudar = useUpdateRecurringRequest()

  function alterar(status: EstadoDaRecorrencia, mensagem: string) {
    mudar.mutate(
      { id: r.id, status },
      {
        onSuccess: () => toast.success(mensagem),
        onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível alterar. Tenta novamente.'),
      },
    )
  }

  return (
    <li className="flex flex-col gap-1.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-piquete-blue">{r.title}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO[r.status].classe}`}>{ESTADO[r.status].rotulo}</span>
      </div>
      <p className="text-xs text-gray-600">
        {r.counterpart_name} · {ROTULO_DA_FREQUENCIA[r.frequency]}
        {r.status !== 'CANCELLED' ? ` · próxima a ${dataLegivel(r.next_date)}` : ''}
      </p>
      {r.status === 'PAUSED' && r.consecutive_failures >= 3 && (
        <p className="text-xs text-amber-800">Pausado porque não foi possível marcar três vezes seguidas. Vê os emails que te enviámos com o motivo.</p>
      )}
      {r.status === 'CANCELLED' && r.cancel_reason && <p className="text-xs text-gray-600">O profissional deixou de aceitar: {r.cancel_reason}</p>}
      {r.status !== 'CANCELLED' && (
        <div className="flex justify-end gap-2 pt-1">
          {r.status === 'ACTIVE' ? (
            <button type="button" disabled={mudar.isPending} onClick={() => alterar('PAUSED', 'Pausado.')} className="min-h-[40px] rounded-full border border-gray-200 px-3 text-xs font-semibold text-gray-700 disabled:opacity-50">
              Pausar
            </button>
          ) : (
            <button type="button" disabled={mudar.isPending} onClick={() => alterar('ACTIVE', 'Retomado.')} className="min-h-[40px] rounded-full border border-piquete-blue px-3 text-xs font-semibold text-piquete-blue disabled:opacity-50">
              Retomar
            </button>
          )}
          <button type="button" disabled={mudar.isPending} onClick={() => alterar('CANCELLED', 'Cancelado.')} className="min-h-[40px] rounded-full px-3 text-xs font-semibold text-rose-600 disabled:opacity-50">
            Cancelar
          </button>
        </div>
      )}
    </li>
  )
}

export function RecurringRequests() {
  const recorrencias = useMyRecurringRequests()

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 pb-12 sm:p-6 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 font-heading text-xl font-extrabold text-piquete-blue">Serviços recorrentes</h1>
      </header>

      {recorrencias.isLoading && <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />}
      {recorrencias.isError && <p className="text-sm text-gray-600">Não foi possível carregar os teus serviços recorrentes. Tenta novamente.</p>}
      {recorrencias.data && recorrencias.data.length === 0 && (
        <p className="text-sm text-gray-600">
          Ainda não tens serviços recorrentes. Num pedido concluído em{' '}
          <Link to="/os-meus-pedidos" className="font-semibold underline">
            Os meus pedidos
          </Link>
          , carrega em «Repetir regularmente».
        </p>
      )}
      {recorrencias.data && recorrencias.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {recorrencias.data.map((r) => (
            <LinhaDaRecorrencia key={r.id} r={r} />
          ))}
        </ul>
      )}
    </main>
  )
}
