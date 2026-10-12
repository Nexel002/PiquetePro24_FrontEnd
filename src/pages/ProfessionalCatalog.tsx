import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProfessionalCatalog } from '../hooks/useCatalog'
import { useProfile } from '../hooks/useProfile'
import type { Review } from '../services/catalog'
import type { ProjectPhoto } from '../services/portfolio'
import { PhotoLightbox } from '../components/portfolio/PhotoLightbox'
import { ProjectCard } from '../components/portfolio/ProjectCard'
import { BackButton } from '../components/BackButton'

const PROFESSIONAL_TYPE_LABELS = { SINGULAR: 'Profissional singular', COMPANY: 'Empresa' } as const

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' })

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

function StarIcon({ filled, className = 'h-4 w-4' }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`${className} ${filled ? 'text-piquete-yellow' : 'text-gray-200'}`} fill="currentColor">
      <path d="M10 1.5l2.6 5.28 5.82.85-4.21 4.1.99 5.8L10 14.77 4.8 17.53l.99-5.8-4.21-4.1 5.82-.85L10 1.5z" />
    </svg>
  )
}

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <StarIcon key={value} filled={value <= Math.round(rating)} className={className} />
      ))}
    </span>
  )
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl border border-gray-100 bg-gray-50 px-2 py-3 text-center">
      <span className="font-heading text-lg font-extrabold leading-none text-piquete-blue">{value}</span>
      <span className="text-[11px] font-medium leading-tight text-piquete-gray">{label}</span>
    </div>
  )
}

// Distribuição de 5 a 1 estrelas calculada no cliente a partir da lista já devolvida
// por GET /professionals/:id/catalog — mesma decisão do backend para a média (sem
// agregação SQL nesta fase, volume baixo).
function RatingSummary({ average, reviews }: { average: number; reviews: Review[] }) {
  const total = reviews.length

  return (
    <div className="flex items-center gap-5">
      <div className="flex flex-col items-center gap-1">
        <span className="font-heading text-4xl font-extrabold leading-none text-piquete-blue">{average.toFixed(1)}</span>
        <Stars rating={average} />
        <span className="text-[11px] font-medium text-piquete-gray">{pluralize(total, 'avaliação', 'avaliações')}</span>
      </div>

      <ul className="flex flex-1 flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = reviews.filter((review) => review.rating === stars).length
          const percentage = total === 0 ? 0 : (count / total) * 100
          return (
            <li key={stars} className="flex items-center gap-2 text-[11px] font-semibold text-piquete-gray">
              <span className="w-2 text-right">{stars}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <span className="block h-full rounded-full bg-piquete-yellow" style={{ width: `${percentage}%` }} />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CatalogSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="aspect-[4/3] animate-pulse rounded-3xl bg-gray-200" />
      <div className="h-24 animate-pulse rounded-3xl bg-gray-200" />
      <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />
    </div>
  )
}

// Catálogo de um profissional (Fase 9, TRD Adendo v1.17): herói com foto, selo de
// avaliação, chips de resumo, portfólio e avaliações. Usado por um CLIENT a ver um
// profissional (link em FindProfessionals.tsx) e pelo próprio profissional a
// pré-visualizar o que editou em MyCatalog.tsx.
export function ProfessionalCatalog() {
  const { id } = useParams<{ id: string }>()
  const { data: catalog, isLoading, isError } = useProfessionalCatalog(id)
  const { data: profile } = useProfile()
  const [openPhotos, setOpenPhotos] = useState<{ photos: ProjectPhoto[]; index: number } | null>(null)
  const [serviceFilter, setServiceFilter] = useState<string | null>(null)

  const isOwner = Boolean(profile && catalog && profile.id === catalog.id)
  // Sem foto de perfil, a primeira foto do trabalho mais recente serve de capa; sem
  // nenhuma das duas, o herói cai para um fundo da marca com a inicial.
  const coverUrl = catalog?.avatar_url ?? catalog?.projects[0]?.photos[0]?.photo_url ?? null

  // Serviços com pelo menos um trabalho, para o filtro. Só aparece com 2 ou mais: com um
  // só, o filtro não separava nada. Trabalhos sem serviço (anteriores ao Adendo v1.23)
  // ficam fora dos chips mas continuam na lista "Todos".
  const projectServices = new Map<string, string>()
  for (const project of catalog?.projects ?? []) {
    if (project.category) projectServices.set(project.category.id, project.category.name)
  }
  const visibleProjects = (catalog?.projects ?? []).filter((project) => serviceFilter === null || project.category?.id === serviceFilter)

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 pb-28 sm:p-6 sm:pb-28 animate-fade-in">
      {isLoading && (
        <>
          <BackButton />
          <CatalogSkeleton />
        </>
      )}

      {isError && (
        <>
          <BackButton />
          <p className="rounded-3xl border border-rose-100 bg-rose-50 p-5 text-sm font-medium text-rose-600">
            Não foi possível carregar este catálogo. Verifica a tua ligação e tenta novamente.
          </p>
        </>
      )}

      {catalog && (
        <>
          <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-card">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-piquete-blue via-piquete-blue-light to-piquete-blue-bright">
              {coverUrl ? (
                <img src={coverUrl} alt={catalog.full_name} className="h-full w-full object-cover" />
              ) : (
                <div aria-hidden className="flex h-full w-full items-center justify-center font-heading text-7xl font-extrabold text-white/80">
                  {catalog.full_name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-piquete-blue-deep/40 to-transparent" />

              <div className="absolute left-3 top-3">
                <BackButton className="bg-white/90 text-piquete-blue shadow-sm backdrop-blur hover:bg-white" />
              </div>

              {catalog.rating_count > 0 && catalog.rating_avg !== null && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-piquete-blue shadow-sm backdrop-blur">
                  <StarIcon filled />
                  {catalog.rating_avg.toFixed(1)}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-1">
                <h1 className="font-heading text-2xl font-extrabold tracking-tight text-piquete-blue">{catalog.full_name}</h1>
                {catalog.professional_type && (
                  <p className="text-sm font-medium text-piquete-gray">{PROFESSIONAL_TYPE_LABELS[catalog.professional_type]}</p>
                )}
              </div>

              {catalog.services.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Serviços">
                  {catalog.services.map((service) => (
                    <li key={service.id} className="rounded-full bg-piquete-blue/10 px-3 py-1 text-xs font-semibold text-piquete-blue">
                      {service.name}
                    </li>
                  ))}
                </ul>
              )}

              {catalog.bio && <p className="whitespace-pre-wrap text-sm leading-relaxed text-piquete-gray-dark">{catalog.bio}</p>}

              <div className="flex gap-2">
                <StatTile value={catalog.rating_avg !== null ? catalog.rating_avg.toFixed(1) : '—'} label="Classificação" />
                <StatTile value={String(catalog.rating_count)} label={catalog.rating_count === 1 ? 'Avaliação' : 'Avaliações'} />
                <StatTile value={String(catalog.projects.length)} label={catalog.projects.length === 1 ? 'Trabalho' : 'Trabalhos'} />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-card">
            <h2 className="font-heading text-lg font-bold text-piquete-blue">Trabalhos realizados</h2>

            {catalog.projects.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-piquete-gray">
                {isOwner ? 'Ainda não adicionaste trabalhos.' : 'Este profissional ainda não adicionou trabalhos.'}
              </p>
            ) : (
              <>
                {projectServices.size > 1 && (
                  <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar trabalhos por serviço">
                    {[[null, 'Todos'] as const, ...projectServices.entries()].map(([id, name]) => (
                      <button
                        key={id ?? 'todos'}
                        type="button"
                        onClick={() => setServiceFilter(id)}
                        aria-pressed={serviceFilter === id}
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          serviceFilter === id
                            ? 'border-piquete-blue bg-piquete-blue text-white'
                            : 'border-gray-200 bg-white text-piquete-blue hover:border-piquete-blue/40'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  {visibleProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpenPhoto={(index) => setOpenPhotos({ photos: project.photos, index })}
                    />
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-card">
            <h2 className="font-heading text-lg font-bold text-piquete-blue">Avaliações</h2>

            {catalog.reviews.length === 0 || catalog.rating_avg === null ? (
              <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-piquete-gray">
                Ainda sem avaliações.
              </p>
            ) : (
              <>
                <RatingSummary average={catalog.rating_avg} reviews={catalog.reviews} />

                <ul className="flex flex-col gap-3">
                  {catalog.reviews.map((review) => (
                    <li key={review.id} className="flex flex-col gap-2 rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center gap-3">
                        <div
                          aria-hidden
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-piquete-blue/10 text-sm font-bold text-piquete-blue"
                        >
                          {review.client_full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="truncate text-sm font-semibold text-gray-900">{review.client_full_name}</p>
                          <p className="text-[11px] text-piquete-gray">{dateFormatter.format(new Date(review.created_at))}</p>
                        </div>
                        <Stars rating={review.rating} className="h-3.5 w-3.5" />
                      </div>
                      {review.comment && <p className="text-sm leading-relaxed text-piquete-gray-dark">{review.comment}</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {isOwner && (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/90 p-4 backdrop-blur">
              <Link
                to="/catalogo"
                className="mx-auto flex max-w-lg items-center justify-center gap-2 rounded-2xl bg-piquete-blue px-6 py-3.5 text-base font-bold text-white shadow-glow-blue transition-all hover:bg-piquete-blue-light active:scale-[0.98]"
              >
                Editar o meu catálogo
              </Link>
            </div>
          )}
        </>
      )}

      {openPhotos && <PhotoLightbox photos={openPhotos.photos} startIndex={openPhotos.index} onClose={() => setOpenPhotos(null)} />}
    </main>
  )
}
