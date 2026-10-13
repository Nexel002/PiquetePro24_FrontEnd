import type { ProfessionalCatalog } from '../../services/catalog'
import { ROTULOS_DO_TIPO } from './rotulos'

// O selo «Identidade verificada» vem de `identity_verified` (KYC aprovado, decidido pelo
// backend) e só aparece quando é true — antes aparecia a todos, uma garantia sem base.
export function IdentidadeDoProfissional({ catalog }: { catalog: ProfessionalCatalog }) {
  return (
    <div className="flex flex-col gap-2 lg:gap-3">
      <h1 className="font-heading text-2xl font-extrabold tracking-tight text-piquete-blue sm:text-3xl lg:text-white lg:drop-shadow xl:text-4xl">
        {catalog.full_name}
      </h1>
      {catalog.professional_type && (
        <p className="text-sm font-medium text-piquete-gray lg:text-base lg:text-white/90">{ROTULOS_DO_TIPO[catalog.professional_type]}</p>
      )}
      {catalog.identity_verified && (
        <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 lg:bg-white/90">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Identidade verificada
        </p>
      )}
      {catalog.services.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-1 lg:gap-2" aria-label="Serviços">
          {catalog.services.map((service) => (
            <li
              key={service.id}
              className="rounded-full bg-piquete-blue/10 px-3 py-1 text-xs font-semibold text-piquete-blue lg:border lg:border-white/20 lg:bg-white/15 lg:px-3.5 lg:text-white lg:backdrop-blur-md"
            >
              {service.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
