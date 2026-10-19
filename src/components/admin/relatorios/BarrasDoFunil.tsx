import type { Funil } from '../../../services/adminReports'

const ETAPAS: Array<{ chave: keyof Funil; rotulo: string }> = [
  { chave: 'profissionais_registados', rotulo: 'Profissionais registados' },
  { chave: 'kyc_submetido', rotulo: 'Enviaram o KYC' },
  { chave: 'kyc_aprovado', rotulo: 'KYC aprovado' },
  { chave: 'com_pagamento_confirmado', rotulo: 'Com pagamento confirmado' },
  { chave: 'com_trabalho_concluido', rotulo: 'Com um trabalho concluído' },
]

export function BarrasDoFunil({ funil }: { funil: Funil }) {
  const base = funil.profissionais_registados
  return (
    <ol className="flex flex-col gap-3">
      {ETAPAS.map(({ chave, rotulo }) => {
        const valor = funil[chave]
        // Percentagem do total de registados. Sem registados no período não há percentagem a mostrar.
        const percentagem = base > 0 ? Math.round((valor / base) * 100) : null
        return (
          <li key={chave} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-slate-700">{rotulo}</span>
              <span className="font-bold text-piquete-blue">
                {valor}
                {percentagem !== null && <span className="ml-1 text-xs font-normal text-slate-500">({percentagem}%)</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100" aria-hidden>
              <div className="h-2 rounded-full bg-piquete-blue" style={{ width: `${Math.min(100, percentagem ?? 0)}%` }} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
