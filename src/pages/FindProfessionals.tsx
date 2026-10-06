import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useProfessionalSearch } from '../hooks/useProfessionalSearch'
import { useServiceCategories } from '../hooks/useServiceCategories'
import { INVITATIONS_PER_REQUEST } from '../services/invitations'
import type { SearchedProfessional } from '../services/professionalSearch'
import type { NewServiceRequestState } from './NewServiceRequest'
import { BackButton } from '../components/BackButton'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const PROFESSIONAL_TYPE_LABELS = { SINGULAR: 'Singular', COMPANY: 'Empresa' } as const
const SEARCH_DEBOUNCE_MS = 350

function formatDistance(meters: number) {
  return `${(meters / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} km`
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
    </svg>
  )
}

function ResultSkeleton() {
  return (
    <Card className="p-4 flex gap-4 items-center">
      <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
      </div>
    </Card>
  )
}

interface ProfessionalCardProps {
  professional: SearchedProfessional
  // Só há caixa de selecção quando já se sabe que serviço se está a pedir.
  selectable: boolean
  selected: boolean
  // Já escolhidos os que o pedido leva: as outras caixas ficam bloqueadas.
  blocked: boolean
  onToggle: () => void
}

function ProfessionalCard({ professional, selectable, selected, blocked, onToggle }: ProfessionalCardProps) {
  const visibleServices = professional.services.slice(0, 2)
  const hiddenServices = professional.services.length - visibleServices.length

  return (
    <Card className={`p-4 transition-shadow ${selected ? 'ring-2 ring-piquete-blue' : ''}`}>
      <div className="flex items-center gap-4">
        <Link to={`/profissionais/${professional.id}`} className="flex min-w-0 flex-1 items-center gap-4">
          {professional.avatar_url ? (
            <img src={professional.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full border border-gray-100 object-cover shadow-sm" />
          ) : (
            <div
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-piquete-blue/10 text-lg font-bold text-piquete-blue"
            >
              {professional.full_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-base font-bold text-gray-900">{professional.full_name}</p>

            {professional.services.length > 0 && (
              <p className="flex flex-wrap gap-1">
                {visibleServices.map((service) => (
                  <span key={service.id} className="rounded-full bg-piquete-blue/10 px-2 py-0.5 text-[11px] font-semibold text-piquete-blue">
                    {service.name}
                  </span>
                ))}
                {hiddenServices > 0 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-piquete-gray">+{hiddenServices}</span>
                )}
              </p>
            )}

            <p className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-piquete-gray">
              {professional.rating_avg !== null ? (
                <span className="font-semibold text-piquete-blue">
                  <span className="text-piquete-yellow">★</span> {professional.rating_avg.toLocaleString('pt-PT', { minimumFractionDigits: 1 })}{' '}
                  <span className="font-medium text-piquete-gray">({professional.rating_count})</span>
                </span>
              ) : (
                <span>Sem avaliações</span>
              )}
              {professional.professional_type && <span>{PROFESSIONAL_TYPE_LABELS[professional.professional_type]}</span>}
              {professional.distance_m !== null && (
                <span className="font-semibold text-piquete-blue">{formatDistance(professional.distance_m)}</span>
              )}
            </p>
          </div>
        </Link>

        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            disabled={blocked && !selected}
            onChange={onToggle}
            aria-label={`Escolher ${professional.full_name}`}
            className="h-6 w-6 shrink-0 cursor-pointer accent-piquete-blue disabled:cursor-not-allowed disabled:opacity-40"
          />
        )}
      </div>
    </Card>
  )
}

// Pesquisa de profissionais por serviço ou nome (Backend Fase 11, TRD Adendo v1.18):
// o cliente escreve "canalizador" e vê primeiro os mais próximos e depois os outros.
// Texto e categoria vivem no URL (?q=&category=) — é assim que o campo de pesquisa da
// Home chega aqui, e que um refresh ou o botão "voltar" não perdem a pesquisa.
//
// Bloco B: o cliente escolhe os profissionais que recebem o pedido (exatamente 3, ou
// todos se houver menos) e segue para /novo-pedido.
export function FindProfessionals() {
  const navigate = useNavigate()
  const geolocation = useGeolocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''

  const [text, setText] = useState(q)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const coordinates = geolocation.state.status === 'success' ? geolocation.state.coordinates : null
  const categories = useServiceCategories()
  const search = useProfessionalSearch({ q, category, coordinates })

  // Debounce: escrever "canalizador" não pode disparar uma pesquisa por letra (o backend
  // limita a 30 pesquisas/min por utilizador).
  useEffect(() => {
    if (text.trim() === q) return
    const handle = setTimeout(() => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (text.trim()) next.set('q', text.trim())
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [text, q, setSearchParams])

  // Pede o GPS sozinho só quando a permissão já foi dada antes — abrir o ecrã com um
  // pedido de permissão do browser em cima assusta; quem ainda não deu usa o botão.
  const locate = geolocation.locate
  useEffect(() => {
    let cancelled = false
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((status) => {
        if (!cancelled && status.state === 'granted') locate()
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [locate])

  function selectCategory(slug: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (slug && slug !== category) next.set('category', slug)
        else next.delete('category')
        return next
      },
      { replace: true },
    )
  }

  const professionals = useMemo(() => search.data?.pages.flat() ?? [], [search.data])
  const nearby = professionals.filter((professional) => professional.is_nearby)
  const others = professionals.filter((professional) => !professional.is_nearby)
  const hasLocation = coordinates !== null
  const hasFilters = q !== '' || category !== ''

  // Que serviço se está a pedir: o chip escolhido; sem chip, o único serviço comum a
  // todos os resultados (quem pesquisa "canalizador" só vê canalizadores). Com mais do
  // que um serviço em comum — ou resultados misturados — é preciso escolher o chip.
  const requestedService = useMemo(() => {
    if (category) return categories.data?.find((service) => service.slug === category) ?? null
    if (professionals.length === 0) return null
    const common = professionals[0].services.filter((service) =>
      professionals.every((professional) => professional.services.some((s) => s.id === service.id)),
    )
    return common.length === 1 ? common[0] : null
  }, [category, categories.data, professionals])

  // Exatamente 3, ou todos os que existirem. Com mais páginas por carregar não se sabe
  // ainda quantos há — pede-se 3 e o backend confirma.
  const required = search.hasNextPage ? INVITATIONS_PER_REQUEST : Math.min(INVITATIONS_PER_REQUEST, professionals.length)
  const chosen = professionals.filter((professional) => selectedIds.includes(professional.id))
  const canSend = requestedService !== null && required > 0 && chosen.length === required

  function toggle(professionalId: string) {
    setSelectedIds((current) =>
      current.includes(professionalId) ? current.filter((id) => id !== professionalId) : [...current, professionalId],
    )
  }

  function handleSend() {
    if (!requestedService || !canSend) return
    const state: NewServiceRequestState = {
      categoryId: requestedService.id,
      categoryName: requestedService.name,
      professionals: chosen.map((professional) => ({ id: professional.id, full_name: professional.full_name })),
    }
    navigate('/novo-pedido', { state })
  }

  function renderCard(professional: SearchedProfessional) {
    return (
      <li key={professional.id}>
        <ProfessionalCard
          professional={professional}
          selectable={requestedService !== null}
          selected={selectedIds.includes(professional.id)}
          blocked={chosen.length >= required}
          onToggle={() => toggle(professional.id)}
        />
      </li>
    )
  }

  return (
    <main className={`mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 sm:p-6 ${professionals.length > 0 ? 'pb-32' : 'pb-12'}`}>
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 font-heading text-xl font-bold text-piquete-blue">Procurar profissionais</h1>
        <Link to="/perfil" className="text-sm font-medium text-piquete-blue hover:underline">
          Perfil
        </Link>
      </header>

      <div className="flex flex-col gap-3">
        <Input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Que serviço procuras? Ex: canalizador"
          aria-label="Pesquisar serviço ou profissional"
          leftIcon={<SearchIcon />}
          autoFocus={!q && !category}
        />

        {categories.data && categories.data.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por serviço">
            {categories.data.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => selectCategory(service.slug)}
                aria-pressed={category === service.slug}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  category === service.slug
                    ? 'border-piquete-blue bg-piquete-blue text-white'
                    : 'border-gray-200 bg-white text-piquete-blue hover:border-piquete-blue/40'
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>
        )}

        {!hasLocation && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-card">
            <p className="text-xs text-piquete-gray-dark">
              {geolocation.state.status === 'error'
                ? 'Não foi possível obter a tua localização. A lista aparece sem distâncias.'
                : 'Ativa a localização para ver primeiro os profissionais mais próximos.'}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={geolocation.locate}
              disabled={geolocation.state.status === 'locating'}
              isLoading={geolocation.state.status === 'locating'}
              className="shrink-0"
            >
              Localizar
            </Button>
          </div>
        )}
      </div>

      {search.isLoading && (
        <div className="flex flex-col gap-3">
          <ResultSkeleton />
          <ResultSkeleton />
          <ResultSkeleton />
        </div>
      )}

      {search.isError && (
        <Card className="border-red-100 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-600">
            Não foi possível pesquisar agora. Verifica a tua ligação e tenta novamente.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void search.refetch()}>
            Tentar de novo
          </Button>
        </Card>
      )}

      {search.isSuccess && professionals.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-sm font-semibold text-gray-700">
            {hasFilters ? 'Nenhum profissional encontrado para esta pesquisa.' : 'Ainda não há profissionais registados.'}
          </p>
          {hasFilters && <p className="text-xs text-piquete-gray">Tenta outro serviço ou limpa os filtros.</p>}
        </Card>
      )}

      {search.isSuccess && professionals.length > 0 && (
        <>
          {requestedService === null && (
            <p className="rounded-2xl bg-piquete-blue/5 p-3 text-xs text-piquete-gray-dark">
              Para enviares um pedido, escolhe primeiro o serviço nos botões acima.
            </p>
          )}

          {hasLocation && nearby.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="px-1 font-heading text-sm font-bold uppercase tracking-wider text-piquete-blue">Perto de ti</h2>
              <ul className="flex flex-col gap-3">{nearby.map(renderCard)}</ul>
            </section>
          )}

          {others.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="px-1 font-heading text-sm font-bold uppercase tracking-wider text-piquete-blue">
                {hasLocation && nearby.length > 0 ? 'Outros profissionais' : 'Profissionais'}
              </h2>
              <ul className="flex flex-col gap-3">{others.map(renderCard)}</ul>
            </section>
          )}

          {search.hasNextPage && (
            <Button
              type="button"
              variant="glass"
              onClick={() => void search.fetchNextPage()}
              disabled={search.isFetchingNextPage}
              isLoading={search.isFetchingNextPage}
              className="self-center"
            >
              Ver mais
            </Button>
          )}
        </>
      )}

      {requestedService !== null && professionals.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <p className="flex-1 text-sm text-piquete-gray-dark" aria-live="polite">
              <span className="font-bold text-piquete-blue">
                {chosen.length}/{required}
              </span>{' '}
              {required === INVITATIONS_PER_REQUEST
                ? `profissionais escolhidos para ${requestedService.name}`
                : `escolhidos (só há ${required} para ${requestedService.name})`}
            </p>
            <Button type="button" onClick={handleSend} disabled={!canSend}>
              Pedir a {required}
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
