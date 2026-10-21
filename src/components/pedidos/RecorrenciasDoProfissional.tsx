import { useState } from 'react'
import { toast } from 'sonner'
import { useAssignedRecurringRequests, useDeclineRecurringRequest } from '../../hooks/useRecurringRequests'
import { dataLegivel, ROTULO_DA_FREQUENCIA, type RecurringRequest } from '../../services/recurringRequests'

// Fase 42 (TRD Adendo v1.66, N3): os serviços que os clientes marcaram para se repetirem com este
// profissional. Ele pode deixar de aceitar um, com motivo (o cliente é avisado). Sem nenhum, a
// secção não aparece.
function Recorrencia({ recorrencia }: { recorrencia: RecurringRequest }) {
  const recusar = useDeclineRecurringRequest()
  const [aRecusar, setARecusar] = useState(false)
  const [motivo, setMotivo] = useState('')

  return (
    <li className="flex flex-col gap-1.5 rounded-xl bg-white p-3 text-sm">
      <p className="font-semibold text-piquete-blue">{recorrencia.title}</p>
      <p className="text-xs text-gray-600">
        {recorrencia.counterpart_name} · {ROTULO_DA_FREQUENCIA[recorrencia.frequency]} · próxima a {dataLegivel(recorrencia.next_date)}
        {recorrencia.status === 'PAUSED' ? ' · pausado pelo cliente' : ''}
      </p>
      {aRecusar ? (
        <div className="flex flex-col gap-2">
          <input
            aria-label="Motivo"
            placeholder="Porque deixas de aceitar (o cliente vê)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            className="min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setARecusar(false)} className="min-h-[40px] px-3 text-xs font-semibold text-gray-600">
              Voltar
            </button>
            <button
              type="button"
              disabled={motivo.trim().length < 3 || recusar.isPending}
              onClick={() =>
                recusar.mutate(
                  { id: recorrencia.id, reason: motivo.trim() },
                  {
                    onSuccess: () => toast.success('O cliente foi avisado.'),
                    onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível cancelar.'),
                  },
                )
              }
              className="min-h-[40px] rounded-full border border-rose-300 px-3 text-xs font-bold text-rose-700 disabled:opacity-50"
            >
              Deixar de aceitar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setARecusar(true)} className="min-h-[40px] self-end text-xs font-semibold text-rose-600">
          Deixar de aceitar
        </button>
      )}
    </li>
  )
}

export function RecorrenciasDoProfissional() {
  const recorrencias = useAssignedRecurringRequests()
  if (recorrencias.isError) return <p className="text-sm text-gray-600">Não foi possível carregar os serviços recorrentes.</p>
  if (!recorrencias.data || recorrencias.data.length === 0) return null

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Serviços recorrentes</h2>
      <ul className="flex flex-col gap-2">
        {recorrencias.data.map((r) => (
          <Recorrencia key={r.id} recorrencia={r} />
        ))}
      </ul>
    </section>
  )
}
