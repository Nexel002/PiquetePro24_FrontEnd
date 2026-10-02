import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useProfile } from '../hooks/useProfile'
import { useAdminCancelServiceRequest, useAdminServiceRequests } from '../hooks/useAdminServiceRequests'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import type { RequestStatus } from '../services/serviceRequests'

const PAGE_SIZE = 25

type StatusFilter = 'ALL' | RequestStatus

const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: 'Aberto',
  ASSIGNED: 'Atribuído',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const STATUS_BADGE_VARIANT: Record<RequestStatus, 'info' | 'pending' | 'approved' | 'rejected'> = {
  OPEN: 'info',
  ASSIGNED: 'pending',
  COMPLETED: 'approved',
  CANCELLED: 'rejected',
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-piquete-yellow border-t-piquete-blue" />
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
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
          Pedidos de serviço
        </h1>
      </header>

      <div className="flex gap-2 text-sm">
        <select
          value={statusFilter}
          onChange={(event) => handleStatusChange(event.target.value as StatusFilter)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue"
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
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">Não foi possível carregar os pedidos. Verifica a tua ligação e tenta novamente.</p>
      )}

      {requests && requests.length === 0 && <p className="text-sm text-gray-600">Nenhum pedido encontrado.</p>}

      {requests && requests.length > 0 && (
        <ul className="flex flex-col gap-3">
          {requests.map((serviceRequest) => (
            <li key={serviceRequest.id}>
              <Card variant="solid" className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-piquete-blue">{serviceRequest.title}</p>
                  <Badge variant={STATUS_BADGE_VARIANT[serviceRequest.status]}>{STATUS_LABELS[serviceRequest.status]}</Badge>
                </div>

                <p className="text-xs text-gray-500">
                  {[serviceRequest.province, serviceRequest.district, serviceRequest.neighborhood].filter(Boolean).join(', ')}
                  {' · '}
                  {createdAtFormatter.format(new Date(serviceRequest.created_at))}
                </p>

                <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                  {/* Adendo v1.9, item C: timeline deste pedido — reaproveita o ecrã de
                      audit log já existente, filtrado por entity_type/entity_id. */}
                  <Link
                    to={`/admin/audit-log?entity_type=service_requests&entity_id=${serviceRequest.id}`}
                    className="text-sm font-semibold text-piquete-blue underline pt-1"
                  >
                    Ver histórico
                  </Link>

                  {serviceRequest.status !== 'COMPLETED' && serviceRequest.status !== 'CANCELLED' && (
                    <>
                      {cancellingId === serviceRequest.id ? (
                        <div className="flex items-center gap-2 text-sm pt-1">
                          <span className="text-gray-700">Cancelar este pedido?</span>
                          <button
                            type="button"
                            onClick={() => handleConfirmCancel(serviceRequest.id, serviceRequest.title)}
                            disabled={cancelMutation.isPending}
                            className="font-bold text-rose-600 disabled:opacity-50"
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
                          className="text-sm font-semibold text-rose-600 underline pt-1"
                        >
                          Cancelar (admin)
                        </button>
                      )}
                    </>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {requests && (offset > 0 || requests.length === PAGE_SIZE) && (
        <div className="flex justify-between text-sm">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            disabled={offset === 0}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOffset((current) => current + PAGE_SIZE)}
            disabled={requests.length < PAGE_SIZE}
          >
            Seguinte
          </Button>
        </div>
      )}
    </main>
  )
}
