import { Link } from 'react-router-dom'
import type { ProfessionalCatalog } from '../../services/catalog'
import { BackButton } from '../BackButton'
import { IconeDeVisto } from '../ui/IconeDeVisto'
import { Estrela } from './Estrelas'
import { ROTULOS_DO_TIPO } from './rotulos'

interface FotoDoCatalogoProps {
  catalog: ProfessionalCatalog
  // Sem foto de perfil, a primeira foto do trabalho mais recente serve de capa; sem nenhuma
  // das duas, cai para um fundo da marca com a inicial.
  capa: string | null
  ehDono: boolean
}

// Coluna da foto: topo do ecrã a toda a largura em telemóvel; metade esquerda inteira, fixa,
// com o nome e os serviços sobrepostos em desktop.
export function FotoDoCatalogo({ catalog, capa, ehDono }: FotoDoCatalogoProps) {
  return (
    <aside className="relative w-full lg:sticky lg:top-0 lg:h-dvh lg:overflow-hidden">
      <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-auto lg:h-full w-full overflow-hidden rounded-b-[2.5rem] lg:rounded-none bg-gradient-to-br from-piquete-blue via-piquete-blue-light to-piquete-blue-bright shadow-card-hover lg:shadow-none">
        {capa ? (
          <img src={capa} alt={catalog.full_name} className="h-full w-full object-cover object-top" />
        ) : (
          <div aria-hidden className="flex h-full w-full items-center justify-center font-heading text-8xl font-extrabold text-white/80">
            {catalog.full_name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Gradientes decorativos para leitura e contraste */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-piquete-blue-deep/60 via-piquete-blue-deep/20 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-piquete-blue-deep via-piquete-blue-deep/50 to-transparent lg:h-2/5" />

        {/* Botão voltar no topo esquerdo com glassmorphism */}
        <div className="absolute left-4 top-4 lg:left-8 lg:top-8 z-10">
          <BackButton className="rounded-2xl border border-white/20 bg-white/85 p-2.5 text-piquete-blue shadow-lg backdrop-blur-md transition-all hover:bg-white active:scale-95" />
        </div>

        {/* Canto superior direito: badge de nota ou atalho */}
        <div className="absolute right-4 top-4 lg:right-8 lg:top-8 z-10 flex items-center gap-2">
          {catalog.rating_count > 0 && catalog.rating_avg !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-piquete-blue shadow-lg backdrop-blur-md">
              <Estrela filled className="h-3.5 w-3.5" />
              {catalog.rating_avg.toFixed(1)}
            </span>
          )}
          {ehDono && (
            <Link
              to="/catalogo"
              aria-label="Definições do catálogo"
              className="rounded-2xl border border-white/20 bg-white/85 p-2.5 text-piquete-blue shadow-lg backdrop-blur-md transition-all hover:bg-white active:scale-95"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          )}
        </div>

        {/* Informações sobrepostas na foto (visíveis em Desktop, como na Imagem 2) */}
        <div className="hidden lg:absolute lg:inset-x-0 lg:bottom-0 lg:flex lg:flex-col lg:gap-3 lg:p-8 xl:p-12">
          <div className="flex items-center gap-2.5">
            <p className="font-heading text-3xl font-extrabold tracking-tight text-white xl:text-4xl drop-shadow">
              {catalog.full_name}
            </p>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-piquete-yellow text-piquete-blue shadow-sm" title="Profissional Verificado">
<IconeDeVisto className="h-3.5 w-3.5" />
</span>
          </div>
          {catalog.professional_type && (
            <p className="text-base font-medium text-white/90">{ROTULOS_DO_TIPO[catalog.professional_type]}</p>
          )}
          {catalog.services.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1" aria-label="Serviços principais">
              {catalog.services.slice(0, 4).map((service) => (
                <li
                  key={service.id}
                  className="rounded-full border border-white/20 bg-white/15 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur-md"
                >
                  {service.name}
                </li>
              ))}
              {catalog.services.length > 4 && (
                <li className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-md">
                  +{catalog.services.length - 4}
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </aside>
  )
}
