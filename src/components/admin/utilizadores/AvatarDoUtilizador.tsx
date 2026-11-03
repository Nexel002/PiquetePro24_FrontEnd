import type { AdminUserSummary } from '../../../services/adminUsers'

const TAMANHOS = {
  // Sugestões da pesquisa.
  pequeno: 'w-9 h-9 text-xs',
  // Linhas da tabela (44×44 px).
  medio: 'w-11 h-11 text-sm',
}

// Neutro e sem cores artificiais quando não há foto: a inicial do nome sobre cinzento.
export function AvatarDoUtilizador({ utilizador, tamanho = 'medio' }: { utilizador: AdminUserSummary; tamanho?: keyof typeof TAMANHOS }) {
  if (utilizador.avatar_url) {
    return (
      <img
        src={utilizador.avatar_url}
        alt={utilizador.full_name}
        className={`${TAMANHOS[tamanho]} rounded-full object-cover shrink-0 border border-slate-200`}
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      className={`${TAMANHOS[tamanho]} rounded-full flex items-center justify-center font-semibold shrink-0 bg-slate-100 text-slate-700 border border-slate-200/80`}
    >
      {(utilizador.full_name || 'U').trim().charAt(0).toUpperCase()}
    </div>
  )
}
