import type { ProfessionalCatalog } from '../../services/catalog'
import { ROTULOS_DO_TIPO } from './rotulos'

// Sem selo de «verificado»: o catálogo não traz nenhum dado de verificação (KYC), e o selo
// que aqui havia aparecia em todos os profissionais — uma garantia sem base.
export function IdentidadeDoProfissional({ catalog }: { catalog: ProfessionalCatalog }) {
  return (
    <div className="flex flex-col gap-2 lg:gap-3">
      <h1 className="font-heading text-2xl font-extrabold tracking-tight text-piquete-blue sm:text-3xl lg:text-white lg:drop-shadow xl:text-4xl">
        {catalog.full_name}
      </h1>
      {catalog.professional_type && (
        <p className="text-sm font-medium text-piquete-gray lg:text-base lg:text-white/90">{ROTULOS_DO_TIPO[catalog.professional_type]}</p>
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
