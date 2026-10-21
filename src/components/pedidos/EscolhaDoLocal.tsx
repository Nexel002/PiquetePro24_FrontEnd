import { LOCAL_DO_PERFIL } from '../../lib/localDoPedido'
import type { ClientLocation } from '../../services/clientLocations'

interface EscolhaDoLocalProps {
  locais: ClientLocation[]
  textoDoPerfil: string | null
  valor: string
  aoMudar: (valor: string) => void
}

// Fase 40 (TRD Adendo v1.66, N6): o cliente com locais guardados escolhe onde é o serviço — a
// localização do perfil (como sempre) ou um dos seus locais. Sem locais guardados, não aparece.
export function EscolhaDoLocal({ locais, textoDoPerfil, valor, aoMudar }: EscolhaDoLocalProps) {
  if (locais.length === 0) return null

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-piquete-blue-dark">Onde é o serviço?</span>
      <select
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none focus:ring-2 focus:ring-piquete-blue/20"
      >
        <option value={LOCAL_DO_PERFIL}>{textoDoPerfil ? `A minha localização (${textoDoPerfil})` : 'A minha localização do perfil'}</option>
        {locais.map((local) => (
          <option key={local.id} value={local.id}>
            {local.label} — {[local.neighborhood, local.district, local.province].filter(Boolean).join(', ')}
          </option>
        ))}
      </select>
    </label>
  )
}
