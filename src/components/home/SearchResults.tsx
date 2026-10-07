import type { FeaturedWork } from '../../data/featuredWorks'
import { WorkCard } from './WorkCard'

interface SearchResultsProps {
  works: FeaturedWork[]
  isFavorite: (id: string) => boolean
  onToggleFavorite: (id: string, name?: string) => void
  aoLimpar: () => void
}

export function SearchResults({ works, isFavorite, onToggleFavorite, aoLimpar }: SearchResultsProps) {
  return (
    <section aria-labelledby="resultados">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <h2 id="resultados" className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
            Resultados
          </h2>
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900" aria-live="polite">
            {works.length} {works.length === 1 ? 'trabalho' : 'trabalhos'}
          </span>
        </div>
        <button type="button" onClick={aoLimpar} className="min-h-11 text-sm font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
          Limpar filtros
        </button>
      </div>

      {works.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} isFavorite={isFavorite(work.id)} onToggleFavorite={onToggleFavorite} />
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-lg rounded-xl border border-slate-300 p-8 text-center sm:p-12">
          <p className="text-base font-bold text-slate-900">Nenhum trabalho encontrado para este filtro.</p>
          <p className="mt-1 text-sm text-slate-600">Experimenta escolher &quot;Todos&quot; ou pesquisar outro termo.</p>
          <button
            type="button"
            onClick={aoLimpar}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            Ver todos os trabalhos
          </button>
        </div>
      )}
    </section>
  )
}
