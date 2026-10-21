import type { LinhaDeProcura } from '../../../services/adminReports'

// Fase 39 (TRD Adendo v1.66, N4): onde falta oferta. Uma linha por serviço e província, por ordem de
// procura (o backend já ordena). «Falta oferta» quando há procura e nenhum profissional elegível —
// em texto, não só em cor.
export function TabelaDaProcura({ linhas }: { linhas: LinhaDeProcura[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <th className="py-2 pr-3 font-semibold">Serviço</th>
            <th className="py-2 pr-3 font-semibold">Província</th>
            <th className="py-2 pr-3 text-right font-semibold">Procuras</th>
            <th className="py-2 pr-3 text-right font-semibold">Clientes</th>
            <th className="py-2 pr-3 text-right font-semibold">Avisos pendentes</th>
            <th className="py-2 text-right font-semibold">Profissionais elegíveis</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => {
            const faltaOferta = linha.category_id !== null && linha.eligible_professionals === 0
            return (
              <tr key={`${linha.category_id ?? 'texto'}-${linha.province}`} className="border-b border-slate-100">
                <td className="py-2 pr-3 font-semibold text-slate-800">{linha.category_name ?? 'Pesquisa por texto'}</td>
                <td className="py-2 pr-3 text-slate-600">{linha.province}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{linha.searches}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{linha.clients}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{linha.pending_alerts}</td>
                <td className="py-2 text-right tabular-nums">
                  {linha.eligible_professionals ?? '—'}
                  {faltaOferta && (
                    <span className="ml-2 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">Falta oferta</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
