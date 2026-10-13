import type { Review } from '../../services/catalog'
import { BotaoDenunciar } from '../moderacao/BotaoDenunciar'
import { Stars } from './Estrelas'
import { ResumoDeAvaliacao } from './ResumoDeAvaliacao'

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' })

export function AvaliacoesDoProfissional({ reviews, media, podeDenunciar = false }: { reviews: Review[]; media: number | null; podeDenunciar?: boolean }) {

  return (
      <section className="flex flex-col gap-5 rounded-[2.5rem] bg-white p-6 shadow-card border border-gray-100 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-piquete-blue sm:text-xl">Avaliações</h2>
            <p className="text-xs text-piquete-gray">Opiniões de clientes atendidos</p>
          </div>
        </div>

        {reviews.length === 0 || media === null ? (
          <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-piquete-gray">
            Ainda sem avaliações nesta plataforma.
          </p>
        ) : (
          <>
            <ResumoDeAvaliacao average={media} reviews={reviews} />

            <ul className="flex flex-col gap-3 pt-2">
              {reviews.map((review) => (
                <li key={review.id} className="flex flex-col gap-2 rounded-2xl bg-gray-50 border border-gray-100 p-4 transition-all hover:bg-gray-50/80">
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
                  {review.technician && (
                    <p className="flex items-center gap-1.5 text-xs text-piquete-gray">
                      <span>
                        Feito por <span className="font-semibold text-gray-800">{review.technician.first_name}</span> · {review.technician.title}
                      </span>
                      {review.member_rating !== null && <Stars rating={review.member_rating} className="h-3 w-3" />}
                    </p>
                  )}
                  {review.comment && <p className="text-sm leading-relaxed text-piquete-gray-dark">{review.comment}</p>}
                  {review.comment_hidden && (
                    <p className="text-xs italic text-piquete-gray">Comentário removido pela moderação.</p>
                  )}
                  {podeDenunciar && review.comment && (
                    <BotaoDenunciar targetType="REVIEW" targetId={review.id} descricao={`a avaliação de ${review.client_full_name}`} />
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
  )
}
