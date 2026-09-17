import { Link } from 'react-router-dom'
import { useCancelServiceRequest, useCompleteServiceRequest, useMyServiceRequests } from '../hooks/useServiceRequests'
import type { RequestStatus } from '../services/serviceRequests'

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
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Os meus pedidos</h1>
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
