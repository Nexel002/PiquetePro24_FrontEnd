import { NavLink } from 'react-router-dom'
import { DESTINOS_DE_ADMIN } from './destinos'

const BASE = 'shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors'

function classes({ isActive }: { isActive: boolean }) {
  return `${BASE} ${isActive ? 'bg-piquete-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
}

// Barra única para saltar entre ecrãs de admin sem passar pela Home. Desliza na horizontal
// em telemóvel em vez de quebrar linha. O estado activo vai em `aria-current` (NavLink) e
// em cor, para não depender só da cor.
export function NavegacaoAdmin() {
  return (
    <nav aria-label="Administração" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <NavLink to="/admin" end className={classes}>
        Visão geral
      </NavLink>
      {DESTINOS_DE_ADMIN.map((destino) => (
        <NavLink key={destino.to} to={destino.to} className={classes}>
          {destino.rotulo}
        </NavLink>
      ))}
    </nav>
  )
}
