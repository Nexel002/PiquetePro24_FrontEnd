import { Link } from 'react-router-dom'
import type { SearchedProfessional } from '../../services/professionalSearch'
import { Card } from '../ui/Card'

const PROFESSIONAL_TYPE_LABELS = { SINGULAR: 'Singular', COMPANY: 'Empresa' } as const

function formatDistance(meters: number) {
  return `${(meters / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} km`
}

export function EsqueletoDeResultado() {
  return (
    <Card className="flex items-center gap-4 rounded-3xl border border-gray-100 p-5 shadow-card">
      <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-gray-200" />
      <div className="flex flex-1 flex-col gap-2.5">
        <div className="h-4 w-1/2 animate-pulse rounded-md bg-gray-200" />
        <div className="h-3 w-1/3 animate-pulse rounded-md bg-gray-200" />
        <div className="h-3 w-2/3 animate-pulse rounded-md bg-gray-200" />
      </div>
    </Card>
  )
}

interface CartaoDeProfissionalProps {
  professional: SearchedProfessional
  selectable: boolean
  selected: boolean
  blocked: boolean
  onToggle: () => void
}

export function CartaoDeProfissional({ professional, selectable, selected, blocked, onToggle }: CartaoDeProfissionalProps) {
  const visibleServices = professional.services.slice(0, 2)
  const hiddenServices = professional.services.length - visibleServices.length

  return (
    <Card
      className={`group relative rounded-3xl p-5 transition-all duration-300 hover:shadow-card-hover ${
        selected ? 'border-piquete-blue ring-2 ring-piquete-blue bg-blue-50/20' : 'border-gray-100 bg-white hover:border-piquete-blue/25'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <Link to={`/profissionais/${professional.id}`} className="flex min-w-0 flex-1 items-start gap-4">
          <div className="relative shrink-0">
            {professional.avatar_url ? (
              <img
                src={professional.avatar_url}
                alt=""
                className="h-16 w-16 rounded-2xl border-2 border-white object-cover shadow-sm ring-1 ring-gray-200 group-hover:ring-piquete-blue/40 transition-all"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-piquete-blue via-piquete-blue-light to-piquete-blue-bright text-xl font-extrabold text-white shadow-sm ring-1 ring-gray-200"
              >
                {professional.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            {professional.is_nearby && (
              <span
                className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white"
                title="Perto de ti"
              />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="truncate text-base font-bold text-gray-900 group-hover:text-piquete-blue transition-colors">
                {professional.full_name}
              </p>
              {professional.professional_type && (
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                  {PROFESSIONAL_TYPE_LABELS[professional.professional_type]}
                </span>
              )}
              {/* Fase 38 (N1): texto, não só cor — o estado tem de se ler sem distinguir verdes. */}
              {professional.serves_area && (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Atende a tua zona
                </span>
              )}
            </div>

            {professional.services.length > 0 && (
              <p className="flex flex-wrap gap-1.5">
                {visibleServices.map((service) => (
                  <span
                    key={service.id}
                    className="rounded-lg bg-piquete-blue/5 border border-piquete-blue/10 px-2.5 py-0.5 text-[11px] font-semibold text-piquete-blue"
                  >
                    {service.name}
                  </span>
                ))}
                {hiddenServices > 0 && (
                  <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-piquete-gray">
                    +{hiddenServices}
                  </span>
                )}
              </p>
            )}

            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-piquete-gray pt-1">
              {professional.rating_avg !== null ? (
                <span className="inline-flex items-center gap-1 font-bold text-piquete-blue">
                  <span className="text-piquete-yellow text-sm">★</span>{' '}
                  {professional.rating_avg.toLocaleString('pt-PT', { minimumFractionDigits: 1 })}{' '}
                  <span className="font-normal text-piquete-gray">({professional.rating_count})</span>
                </span>
              ) : (
                <span className="text-gray-400">Sem avaliações</span>
              )}

              {professional.distance_m !== null && (
                <span className="inline-flex items-center gap-1 font-bold text-piquete-blue">
                  <svg className="h-3.5 w-3.5 text-piquete-blue/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4.418-4.03-7-7.86-7-11a7 7 0 1114 0c0 3.14-2.582 6.97-7 11z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.5a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                  {formatDistance(professional.distance_m)}
                </span>
              )}
            </p>
          </div>
        </Link>

        {selectable && (
          <div className="shrink-0 pt-1">
            <input
              type="checkbox"
              checked={selected}
              disabled={blocked && !selected}
              onChange={onToggle}
              aria-label={`Escolher ${professional.full_name}`}
              className="h-6 w-6 cursor-pointer rounded-lg border-gray-300 accent-piquete-blue transition-all disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>
        )}
      </div>
    </Card>
  )
}
