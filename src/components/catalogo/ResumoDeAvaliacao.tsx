import type { Review } from '../../services/catalog'
import { Stars } from './Estrelas'

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

// Distribuição de 5 a 1 estrelas calculada no cliente a partir da lista já devolvida
// por GET /professionals/:id/catalog — mesma decisão do backend para a média (sem
// agregação SQL nesta fase, volume baixo).
export function ResumoDeAvaliacao({ average, reviews }: { average: number; reviews: Review[] }) {
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
