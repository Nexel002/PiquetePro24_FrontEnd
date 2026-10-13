import { Link } from 'react-router-dom'
import type { ProfessionalCatalog } from '../../services/catalog'
import { IconeDeVisto } from '../ui/IconeDeVisto'
import { Mosaico } from '../ui/Mosaico'
import { ROTULOS_DO_TIPO } from './rotulos'

interface ApresentacaoDoProfissionalProps {
  catalog: ProfessionalCatalog
  capa: string | null
  ehDono: boolean
}

// Cartão de apresentação: cabeçalho (avatar em desktop, nome e serviços em telemóvel — o
// único com <h1>), descrição, estatísticas e a ação principal.
export function ApresentacaoDoProfissional({ catalog, capa, ehDono }: ApresentacaoDoProfissionalProps) {
  return (
      <section className="flex flex-col gap-5 rounded-[2.5rem] bg-white p-6 shadow-card border border-gray-100 sm:p-7">
        {/* Cabeçalho Desktop (estilo Imagem 2): Avatar circular + Nome + Serviços */}
        <div className="hidden lg:flex lg:items-center lg:gap-4 lg:border-b lg:border-gray-100 lg:pb-6">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-piquete-blue/20 ring-4 ring-piquete-blue/5">
            {capa ? (
              <img src={capa} alt={catalog.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-piquete-blue font-heading text-xl font-bold text-white">
                {catalog.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2">
              <p className="truncate font-heading text-xl font-extrabold text-piquete-blue">
                {catalog.full_name}
              </p>
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-piquete-blue text-white" title="Verificado">
                <IconeDeVisto className="h-2.5 w-2.5" />
              </span>
            </div>
            {catalog.professional_type && (
              <p className="text-xs font-medium text-piquete-gray">{ROTULOS_DO_TIPO[catalog.professional_type]}</p>
            )}
          </div>
        </div>

        {/* Cabeçalho Mobile (estilo Imagem 1): Nome + Verificado + Serviços logo abaixo da foto */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-piquete-blue sm:text-3xl">
              {catalog.full_name}
            </h1>
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-piquete-blue text-white" title="Verificado">
              <IconeDeVisto className="h-3 w-3" />
            </span>
          </div>
          {catalog.professional_type && (
            <p className="text-xs font-semibold text-piquete-gray">{ROTULOS_DO_TIPO[catalog.professional_type]}</p>
          )}
          {catalog.services.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Serviços">
              {catalog.services.map((service) => (
                <li
                  key={service.id}
                  className="rounded-full bg-piquete-blue/10 px-3 py-1 text-xs font-semibold text-piquete-blue"
                >
                  {service.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bio / Descrição (Mobile & Desktop) */}
        {catalog.bio ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-piquete-gray-dark">
            {catalog.bio}
          </p>
        ) : (
          <p className="text-sm italic text-piquete-gray">
            Profissional qualificado disponível na plataforma PiquetePro24.
          </p>
        )}

        {/* Estatísticas em Linha (como nas referências) */}
        <div className="flex gap-2.5 pt-2">
          <Mosaico value={catalog.rating_avg !== null ? catalog.rating_avg.toFixed(1) : '—'} label="Classificação" />
          <Mosaico value={String(catalog.rating_count)} label={catalog.rating_count === 1 ? 'Avaliação' : 'Avaliações'} />
          <Mosaico value={String(catalog.projects.length)} label={catalog.projects.length === 1 ? 'Trabalho' : 'Trabalhos'} />
        </div>

        {/* Botão de Ação Principal (estilo botão FOLLOW / CONTACTAR das referências) */}
        <div className="pt-2">
          {ehDono ? (
            <Link
              to="/catalogo"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-piquete-blue to-piquete-blue-light py-3.5 px-6 text-sm font-bold text-white shadow-glow-blue transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Editar o meu catálogo
            </Link>
          ) : (
            <Link
              to="/profissionais"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-piquete-blue to-piquete-blue-light py-3.5 px-6 text-sm font-bold text-white shadow-glow-blue transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Pedir Serviço a este profissional
            </Link>
          )}
        </div>
      </section>
  )
}
