import { useState } from 'react'
import { toast } from 'sonner'
import { useSubmitReview } from '../../hooks/useCatalog'
import { Button } from '../ui/Button'

// Formulário de avaliação (Fase 9, TRD Adendo v1.17): só para pedidos COMPLETED sem
// avaliação ainda (has_review, calculado pelo backend). Sem edição posterior — uma
// vez submetida, desaparece (decisão do Adendo v1.17, item E).
export function ReviewForm({ requestId, professionalId, technicianName }: { requestId: string; professionalId: string; technicianName?: string }) {
  const submitReview = useSubmitReview(professionalId)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  // Nota do técnico: opcional, só existe se o pedido teve técnico. null = não avaliar o técnico.
  const [memberRating, setMemberRating] = useState<number | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    submitReview.mutate(
      { requestId, payload: { rating, comment: comment.trim() || undefined, member_rating: technicianName && memberRating !== null ? memberRating : undefined } },
      {
        onSuccess: () => toast.success('Avaliação enviada. Obrigado!'),
        onError: () => toast.error('Não foi possível enviar a tua avaliação. Tenta novamente.'),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-gray-100 pt-2 mt-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} estrela${value === 1 ? '' : 's'}`}
            className={`text-xl ${value <= rating ? 'text-piquete-yellow' : 'text-gray-300'}`}
          >
            ★
          </button>
        ))}
      </div>
      {technicianName && (
        <div className="flex flex-col gap-1 rounded-xl bg-gray-50 p-2">
          <p className="text-xs font-semibold text-gray-600">
            Avaliar também o {technicianName} <span className="font-normal">(opcional)</span>
          </p>
          <div className="flex items-center gap-1" role="group" aria-label={`Nota do ${technicianName}`}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                // Voltar a tocar na nota escolhida tira-a: o técnico deixa de ser avaliado.
                onClick={() => setMemberRating(memberRating === value ? null : value)}
                aria-label={`${value} estrela${value === 1 ? '' : 's'} para ${technicianName}`}
                aria-pressed={memberRating !== null && value <= memberRating}
                className={`text-xl ${memberRating !== null && value <= memberRating ? 'text-piquete-yellow' : 'text-gray-300'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      )}
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={1000}
        rows={2}
        placeholder="Comentário (opcional)"
        className="w-full rounded-xl border border-gray-200 p-2 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none"
      />
      <Button type="submit" size="sm" disabled={submitReview.isPending} isLoading={submitReview.isPending} className="self-start">
        Avaliar profissional
      </Button>
    </form>
  )
}
