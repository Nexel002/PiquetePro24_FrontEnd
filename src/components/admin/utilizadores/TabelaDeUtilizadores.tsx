import { Link } from 'react-router-dom'
import type { AdminUserSummary } from '../../../services/adminUsers'
import type { UserRole } from '../../../services/profile'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'

const PAPEIS: Record<UserRole, { rotulo: string; badge: string }> = {
  CLIENT: { rotulo: 'Cliente', badge: 'bg-blue-50 text-blue-700 border-blue-200/80' },
  PROFESSIONAL: { rotulo: 'Profissional', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
  ADMIN: { rotulo: 'Administrador', badge: 'bg-rose-50 text-rose-600 border-rose-200/80' },
  TECHNICIAN: { rotulo: 'Técnico', badge: 'bg-amber-50 text-amber-800 border-amber-200/80' },
}

const CORES_DO_AVATAR = [
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-teal-100 text-teal-700',
]

// A cor sai da inicial, para a mesma pessoa ter sempre a mesma cor entre páginas.
function corDoAvatar(nome: string) {
  return CORES_DO_AVATAR[(nome || 'U').charCodeAt(0) % CORES_DO_AVATAR.length]
}

function Avatar({ utilizador }: { utilizador: AdminUserSummary }) {
  if (utilizador.avatar_url) {
    return (
      <img
        src={utilizador.avatar_url}
        alt={utilizador.full_name}
        className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200/80 shadow-xs"
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${corDoAvatar(utilizador.full_name)}`}
    >
      {(utilizador.full_name || 'U').trim().charAt(0).toUpperCase()}
    </div>
  )
}

const CLASSE_DA_CELULA = 'py-3.5 px-4 sm:px-6'

function LinhaDeUtilizador({ utilizador }: { utilizador: AdminUserSummary }) {
  const papel = PAPEIS[utilizador.role] ?? PAPEIS.CLIENT
  const localidade = [utilizador.neighborhood, utilizador.district, utilizador.province].filter(Boolean).join(', ')
  const ficha = `/admin/utilizadores/${utilizador.id}`

  return (
    <tr className="group hover:bg-slate-50/80 transition-colors">
      <td className={CLASSE_DA_CELULA}>
        <div className="flex items-center gap-3">
          <Avatar utilizador={utilizador} />
          <Link
            to={ficha}
            className="font-semibold text-sm text-slate-900 group-hover:text-piquete-blue-bright transition-colors truncate max-w-[200px]"
          >
            {utilizador.full_name}
          </Link>
        </div>
      </td>

      <td className={CLASSE_DA_CELULA}>
        <div className="min-w-0">
          <span className="text-sm text-slate-700 font-mono block">{utilizador.phone ?? 'Sem telefone'}</span>
          {localidade && <span className="text-xs text-slate-400 truncate block mt-0.5">{localidade}</span>}
        </div>
      </td>

      <td className={CLASSE_DA_CELULA}>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${papel.badge}`}>
          {papel.rotulo}
        </span>
      </td>

      <td className={CLASSE_DA_CELULA}>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <IconeDeAdmin nome="pessoa" className="w-3.5 h-3.5 text-emerald-500" />
          Activo
        </span>
      </td>

      <td className={`${CLASSE_DA_CELULA} text-right`}>
        <Link
          to={ficha}
          aria-label="Ver ficha"
          title={`Ver detalhes de ${utilizador.full_name}`}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-piquete-blue-bright hover:bg-slate-100 transition-colors"
        >
          <IconeDeAdmin nome="olho" strokeWidth={1.8} />
        </Link>
      </td>
    </tr>
  )
}

export function TabelaDeUtilizadores({ utilizadores }: { utilizadores: AdminUserSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[620px]">
        <thead>
          <tr className="border-y border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
            <th scope="col" className="py-3 px-4 sm:px-6">Nome</th>
            <th scope="col" className="py-3 px-4 sm:px-6">Contacto</th>
            <th scope="col" className="py-3 px-4 sm:px-6">Cargo</th>
            <th scope="col" className="py-3 px-4 sm:px-6">Estado</th>
            <th scope="col" className="py-3 px-4 sm:px-6 text-right">Acções</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {utilizadores.map((utilizador) => (
            <LinhaDeUtilizador key={utilizador.id} utilizador={utilizador} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
