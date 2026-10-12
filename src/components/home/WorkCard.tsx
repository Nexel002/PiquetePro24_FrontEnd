import { Link } from 'react-router-dom'
import type { FeaturedWork } from '../../services/featuredWorks'

interface WorkCardProps {
  work: FeaturedWork
  isFavorite: boolean
  onToggleFavorite: (id: string, name?: string) => void
}

// Cartão plano (borda fina, sem sombra): o cartão inteiro é clicável através da ligação do
// título esticada (`after:absolute after:inset-0`). O botão de favorito fica por cima
// (`z-10`) e não pode ser filho de uma <a>, por isso a ligação não envolve o cartão.
export function WorkCard({ work, isFavorite, onToggleFavorite }: WorkCardProps) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white transition-colors hover:bg-slate-50">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        <img
          src={work.image_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <span className="absolute left-2 top-2 rounded bg-white/95 px-2 py-0.5 text-[11px] font-bold text-slate-900 shadow-sm">
          {work.badge}
        </span>
        <button
          type="button"
          onClick={() => onToggleFavorite(work.id, work.professional_name)}
          title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={isFavorite}
          className={`absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-sm transition-colors ${
            isFavorite ? 'text-rose-500' : 'text-slate-700 hover:text-rose-500'
          }`}
        >
          <svg className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-heading text-base font-bold leading-snug text-slate-900 line-clamp-2">
          {/* Pesquisa por serviço, como antes: a resposta pública não traz o id do profissional, e a pesquisa
              já exige sessão (leva ao login a quem não a tem, e regressa depois). */}
          <Link to={`/profissionais?category=${encodeURIComponent(work.service_slug)}`} className="after:absolute after:inset-0">
            {work.title}
          </Link>
        </h3>
        <p className="truncate text-xs text-slate-600">{work.professional_name}</p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-600">
          {work.rating_avg !== null ? (
            <>
              <span className="font-bold text-amber-700">★ {work.rating_avg.toLocaleString('pt-PT', { minimumFractionDigits: 1 })}</span>
              <span>({work.rating_count})</span>
            </>
          ) : (
            <span>Sem avaliações</span>
          )}
          <span aria-hidden="true">·</span>
          <span>
            {work.completed_jobs_count} {work.completed_jobs_count === 1 ? 'trabalho' : 'trabalhos'}
          </span>
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-900">{work.service_name}</span>
          <span className="truncate rounded border border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-600">{work.location}</span>
        </div>
      </div>
    </article>
  )
}
