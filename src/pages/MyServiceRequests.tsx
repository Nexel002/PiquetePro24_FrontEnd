import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useCancelServiceRequest, useCompleteServiceRequest, useMyServiceRequests } from '../hooks/useServiceRequests'
import { useSubmitReview } from '../hooks/useCatalog'
import type { RequestStatus } from '../services/serviceRequests'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'

// Formulário de avaliação (Fase 9, TRD Adendo v1.17): só para pedidos COMPLETED sem
// avaliação ainda (has_review, calculado pelo backend). Sem edição posterior — uma
// vez submetida, desaparece (decisão do Adendo v1.17, item E).
function ReviewForm({ requestId, professionalId }: { requestId: string; professionalId: string }) {
  const submitReview = useSubmitReview(professionalId)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    submitReview.mutate(
      { requestId, payload: { rating, comment: comment.trim() || undefined } },
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

const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: 'Aberto',
  ASSIGNED: 'Atribuído',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  ASSIGNED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const createdAtFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })

// Espelha as mesmas transições que o backend já valida (serviceRequestService.ts):
// só ASSIGNED pode ser concluído; OPEN ou ASSIGNED podem ser cancelados — nunca
// mostra um botão que o backend rejeitaria.
export function MyServiceRequests() {
  const { data: requests, isLoading, isError } = useMyServiceRequests()
  const completeRequest = useCompleteServiceRequest()
  const cancelRequest = useCancelServiceRequest()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Os meus pedidos</h1>
        <Link to="/perfil" className="text-sm text-gray-600 underline">
          Perfil
        </Link>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">
          Não foi possível carregar os teus pedidos. Verifica a tua ligação e tenta novamente.
        </p>
      )}

      {requests && requests.length === 0 && (
        <p className="text-sm text-gray-600">
          Ainda não criaste nenhum pedido.{' '}
          <Link to="/profissionais" className="underline">
            Procura um profissional
          </Link>{' '}
          para começar.
        </p>
      )}

      {requests && requests.length > 0 && (
        <ul className="flex flex-col gap-3">
          {requests.map((serviceRequest) => (
            <li key={serviceRequest.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{serviceRequest.title}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[serviceRequest.status]}`}
                >
                  {STATUS_LABELS[serviceRequest.status]}
                </span>
              </div>

              {serviceRequest.description && <p className="text-sm text-gray-600">{serviceRequest.description}</p>}

              <p className="text-xs text-gray-500">
                {[serviceRequest.province, serviceRequest.district, serviceRequest.neighborhood]
                  .filter(Boolean)
                  .join(' — ')}
                {' · '}
                {createdAtFormatter.format(new Date(serviceRequest.created_at))}
              </p>

              {serviceRequest.status === 'COMPLETED' && serviceRequest.professional_id && serviceRequest.has_review === false && (
                <ReviewForm requestId={serviceRequest.id} professionalId={serviceRequest.professional_id} />
              )}

              {(serviceRequest.status === 'OPEN' || serviceRequest.status === 'ASSIGNED') && (
                <div className="flex gap-2">
                  {serviceRequest.status === 'ASSIGNED' && (
                    <button
                      type="button"
                      onClick={() => completeRequest.mutate(serviceRequest.id)}
                      disabled={completeRequest.isPending}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Concluir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => cancelRequest.mutate(serviceRequest.id)}
                    disabled={cancelRequest.isPending}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
