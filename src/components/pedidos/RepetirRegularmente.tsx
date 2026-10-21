import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useCreateRecurringRequest } from '../../hooks/useRecurringRequests'
import { amanhaEmMaputo, dataLegivel, proximasDatas, ROTULO_DA_FREQUENCIA, type Frequencia } from '../../services/recurringRequests'

const CLASSE_DO_CAMPO =
  'min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none'

// Fase 42 (TRD Adendo v1.66, N3): num pedido concluído, o cliente marca o mesmo serviço para se
// repetir com o mesmo profissional. Mostra as próximas três datas antes de confirmar.
export function RepetirRegularmente({ requestId }: { requestId: string }) {
  const criar = useCreateRecurringRequest()
  const [aberto, setAberto] = useState(false)
  const [frequencia, setFrequencia] = useState<Frequencia>('WEEKLY')
  const minima = amanhaEmMaputo()
  const [primeira, setPrimeira] = useState(minima)
  const [marcado, setMarcado] = useState(false)

  if (marcado) {
    return (
      <p role="status" className="rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800">
        Marcado. Vês e geres os teus serviços recorrentes em{' '}
        <Link to="/servicos-recorrentes" className="font-semibold underline">
          Serviços recorrentes
        </Link>
        .
      </p>
    )
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="min-h-[40px] self-start text-xs font-semibold text-piquete-blue underline">
        Repetir regularmente
      </button>
    )
  }

  const datas = primeira >= minima ? proximasDatas(frequencia, primeira) : []

  function aoMarcar() {
    criar.mutate(
      { source_request_id: requestId, frequency: frequencia, next_date: primeira },
      {
        onSuccess: () => setMarcado(true),
        // 409: este pedido já se repete; a mensagem do servidor diz onde o mudar.
        onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível marcar. Tenta novamente.'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-piquete-blue/5 p-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
        Com que frequência
        <select value={frequencia} onChange={(e) => setFrequencia(e.target.value as Frequencia)} className={CLASSE_DO_CAMPO}>
          {(Object.keys(ROTULO_DA_FREQUENCIA) as Frequencia[]).map((f) => (
            <option key={f} value={f}>
              {ROTULO_DA_FREQUENCIA[f]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
        Próxima vez
        <input type="date" value={primeira} min={minima} onChange={(e) => setPrimeira(e.target.value)} className={CLASSE_DO_CAMPO} />
      </label>
      {datas.length > 0 && <p className="text-xs text-gray-600">Próximas datas: {datas.map(dataLegivel).join(', ')}…</p>}
      <p className="text-xs text-gray-500">O pedido de cada vez é enviado ao profissional 2 dias antes. Conclui cada um quando o trabalho estiver feito.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setAberto(false)} className="min-h-[40px] rounded-full px-3 text-xs font-semibold text-gray-600">
          Cancelar
        </button>
        <button
          type="button"
          onClick={aoMarcar}
          disabled={criar.isPending || datas.length === 0}
          className="min-h-[40px] rounded-full bg-piquete-blue px-4 text-xs font-bold text-white disabled:opacity-50"
        >
          Marcar
        </button>
      </div>
    </div>
  )
}
