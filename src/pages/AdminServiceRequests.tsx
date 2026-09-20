import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useProfile } from '../hooks/useProfile'
import { useAdminCancelServiceRequest, useAdminServiceRequests } from '../hooks/useAdminServiceRequests'
import { BackButton } from '../components/BackButton'
import type { RequestStatus } from '../services/serviceRequests'

const PAGE_SIZE = 25

type StatusFilter = 'ALL' | RequestStatus

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

// TRD Adendo v1.9, item C: visão de admin sobre todos os pedidos da plataforma —
// mesma convenção de guard de role dentro do próprio componente já usada nos outros
// ecrãs de admin.
export function AdminServiceRequests() {
  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [offset, setOffset] = useState(0)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const { data: requests, isLoading, isError } = useAdminServiceRequests({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset,
  })
  const cancelMutation = useAdminCancelServiceRequest()

  if (isProfileLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-pulse rounded-full bg-gray-300" />
      </main>
    )
  }

  if (profile?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  function handleStatusChange(value: StatusFilter) {
    setOffset(0)
    setStatusFilter(value)
  }

  // Confirmação em duas etapas antes de executar, mesma convenção de "Apagar conta"
  // em Profile.tsx — é uma ação destrutiva feita em nome de outra pessoa, não a
  // própria conta de quem clica.
  function handleConfirmCancel(requestId: string, title: string) {
    cancelMutation.mutate(requestId, {
      onSuccess: () => {
        toast.success(`Pedido "${title}" cancelado.`)
        setCancellingId(null)
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível cancelar este pedido.'),
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Pedidos de serviço</h1>
      </header>

      <div className="flex gap-2 text-sm">
        <select
          value={statusFilter}
          onChange={(event) => handleStatusChange(event.target.value as StatusFilter)}
          className="rounded-lg border border-gray-300 px-3 py-1.5"
        >
          <option value="ALL">Todos os estados</option>
          <option value="OPEN">Abertos</option>
          <option value="ASSIGNED">Atribuídos</option>
          <option value="COMPLETED">Concluídos</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">Não foi possível carregar os pedidos. Verifica a tua ligação e tenta novamente.</p>
      )}

      {requests && requests.length === 0 && <p className="text-sm text-gray-600">Nenhum pedido encontrado.</p>}

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

              <p className="text-xs text-gray-500">
                {[serviceRequest.province, serviceRequest.district, serviceRequest.neighborhood].filter(Boolean).join(', ')}
                {' · '}
                {createdAtFormatter.format(new Date(serviceRequest.created_at))}
              </p>

              <div className="flex items-center gap-3">
                {/* Adendo v1.9, item C: timeline deste pedido — reaproveita o ecrã de
                    audit log já existente, filtrado por entity_type/entity_id. */}
                <Link
                  to={`/admin/audit-log?entity_type=service_requests&entity_id=${serviceRequest.id}`}
                  className="text-sm text-gray-600 underline"
                >
                  Ver histórico
                </Link>

                {serviceRequest.status !== 'COMPLETED' && serviceRequest.status !== 'CANCELLED' && (
                  <>
                    {cancellingId === serviceRequest.id ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-700">Cancelar este pedido?</span>
                        <button
                          type="button"
                          onClick={() => handleConfirmCancel(serviceRequest.id, serviceRequest.title)}
                          disabled={cancelMutation.isPending}
                          className="font-medium text-red-700 disabled:opacity-50"
                        >
                          Sim, cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancellingId(null)}
                          disabled={cancelMutation.isPending}
                          className="text-gray-600 underline disabled:opacity-50"
                        >
                          Voltar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCancellingId(serviceRequest.id)}
                        className="text-sm text-red-700 underline"
                      >
                        Cancelar (admin)
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {requests && (offset > 0 || requests.length === PAGE_SIZE) && (
        <div className="flex justify-between text-sm">
          <button
            type="button"
            onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            disabled={offset === 0}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setOffset((current) => current + PAGE_SIZE)}
            disabled={requests.length < PAGE_SIZE}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 disabled:opacity-50"
          >
            Seguinte
          </button>
        </div>
      )}
    </main>
  )
}
