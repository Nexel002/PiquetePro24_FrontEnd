import { useAdminSecurityAlerts } from '../../../hooks/useAdminSecurityAlerts'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'

// Sem alertas não ocupa espaço: o histórico é o conteúdo principal do ecrã. Os parâmetros são os
// mesmos do cartão da Visão Geral, para os dois números baterem.
export function PainelDeAlertas({ aoFiltrarPorUtilizador }: { aoFiltrarPorUtilizador: (userId: string) => void }) {
  const { data: alertas } = useAdminSecurityAlerts({ windowHours: 24, minAttempts: 5 })

  if (!alertas || alertas.length === 0) return null

  return (
    <div className="border border-amber-200 bg-amber-50/80 p-4 sm:p-5 flex flex-col gap-2 rounded-2xl">
      <div className="flex items-center gap-2">
        <IconeDeAdmin nome="alerta" className="w-4 h-4 text-amber-700" />
        <h3 className="text-sm font-bold text-amber-800">Alertas de segurança (últimas 24h)</h3>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm text-amber-900 mt-1">
        {alertas.map((alerta) => (
          <li
            key={`${alerta.groupType}-${alerta.groupKey}`}
            className="flex items-center justify-between gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-amber-100"
          >
            <span>
              {alerta.attempts} tentativas negadas · {alerta.groupType === 'user_id' ? 'utilizador' : 'IP'}{' '}
              <span className="font-semibold">{alerta.groupKey}</span>
            </span>
            {alerta.groupType === 'user_id' && (
              <button
                type="button"
                onClick={() => aoFiltrarPorUtilizador(alerta.groupKey)}
                className="text-xs font-bold text-amber-800 underline hover:text-amber-900"
              >
                Ver histórico
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
