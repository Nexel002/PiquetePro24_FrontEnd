import { useState, useMemo } from 'react'
import { NavegacaoAdmin } from '../components/admin/NavegacaoAdmin'
import { NotasInternas } from '../components/admin/NotasInternas'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAdminCancelServiceRequest, useAdminServiceRequests } from '../hooks/useAdminServiceRequests'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import type { RequestStatus } from '../services/serviceRequests'

const PAGE_SIZE = 25

type StatusFilter = 'ALL' | RequestStatus

const STATUS_CONFIG: Record<RequestStatus, { label: string; badge: string; dot: string }> = {
  OPEN: {
    label: 'Aberto',
    badge: 'bg-blue-50 text-blue-700 border-blue-200/90',
    dot: 'bg-blue-500 animate-pulse',
  },
  ASSIGNED: {
    label: 'Atribuído',
    badge: 'bg-amber-50 text-amber-800 border-amber-200/90',
    dot: 'bg-amber-500',
  },
  COMPLETED: {
    label: 'Concluído',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
    dot: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Cancelado',
    badge: 'bg-rose-50 text-rose-700 border-rose-200/90',
    dot: 'bg-rose-500',
  },
}

const FILTER_PILLS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'OPEN', label: 'Abertos' },
  { id: 'ASSIGNED', label: 'Atribuídos' },
  { id: 'COMPLETED', label: 'Concluídos' },
  { id: 'CANCELLED', label: 'Cancelados' },
]

const createdAtFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })

export function AdminServiceRequests() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [notasAbertasId, setNotasAbertasId] = useState<string | null>(null)

  const { data: requests, isLoading, isError } = useAdminServiceRequests({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset,
  })
  const cancelMutation = useAdminCancelServiceRequest()

  function handleStatusChange(value: StatusFilter) {
    setOffset(0)
    setStatusFilter(value)
  }

  function handleConfirmCancel(requestId: string, title: string) {
    cancelMutation.mutate(requestId, {
      onSuccess: () => {
        toast.success(`Pedido "${title}" cancelado.`)
        setCancellingId(null)
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível cancelar este pedido.'),
    })
  }

  // Filtragem local rápida por termo de pesquisa
  const filteredRequests = useMemo(() => {
    if (!requests) return []
    if (!searchTerm.trim()) return requests
    const termo = searchTerm.toLowerCase().trim()
    return requests.filter((r) => {
      const matchTitulo = r.title.toLowerCase().includes(termo)
      const matchLocal = [r.province, r.district, r.neighborhood].filter(Boolean).join(' ').toLowerCase().includes(termo)
      return matchTitulo || matchLocal
    })
  }, [requests, searchTerm])

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
            Pedidos de serviço
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">Acompanhamento e moderação de pedidos na plataforma</p>
        </div>
      </header>

      <NavegacaoAdmin />

      {/* Barra de Filtros e Pesquisa */}
      <div className="flex flex-col gap-3">
        {/* Pílulas de filtro de estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-0.5">
          {FILTER_PILLS.map((pill) => {
            const isSelected = statusFilter === pill.id
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => handleStatusChange(pill.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 ${
                  isSelected
                    ? 'bg-piquete-blue text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {pill.label}
              </button>
            )
          })}
        </div>

        {/* Campo de pesquisa rápida */}
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por título do pedido ou localização..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              aria-label="Limpar pesquisa"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col gap-2 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-5 w-52 bg-gray-200 rounded" />
                <div className="h-6 w-20 bg-gray-100 rounded-full" />
              </div>
              <div className="h-3.5 w-64 bg-gray-100 rounded mt-1" />
              <div className="h-8 w-44 bg-gray-100 rounded-xl mt-3" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
          <p className="text-sm font-medium text-rose-700">Não foi possível carregar os pedidos. Verifica a tua ligação e tenta novamente.</p>
        </div>
      )}

      {requests && filteredRequests.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">Nenhum pedido encontrado</p>
          <p className="text-xs text-slate-500">
            {searchTerm ? 'Nenhum resultado corresponde à tua pesquisa.' : 'Não há pedidos neste estado no momento.'}
          </p>
        </div>
      )}

      {filteredRequests.length > 0 && (
        <ul className="flex flex-col gap-3">
          {filteredRequests.map((serviceRequest) => {
            const config = STATUS_CONFIG[serviceRequest.status]
            const localidade = [serviceRequest.province, serviceRequest.district, serviceRequest.neighborhood]
              .filter(Boolean)
              .join(', ')

            return (
              <li key={serviceRequest.id}>
                <Card variant="solid" className="p-4 sm:p-5 hover:border-gray-300 transition-all duration-200">
                  <div className="flex flex-col gap-2.5">
                    {/* Topo do cartão: Título e Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-bold text-slate-900 font-heading leading-snug">
                        {serviceRequest.title}
                      </h2>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm shrink-0 ${config.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        <span>{config.label}</span>
                      </span>
                    </div>

                    {/* Metadados: Localização e Data */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {localidade && (
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{localidade}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-gray-400">
                        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{createdAtFormatter.format(new Date(serviceRequest.created_at))}</span>
                      </span>
                    </div>

                    {/* Barra de Ações */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 mt-1 border-t border-gray-100">
                      <Link
                        to={`/admin/audit-log?entity_type=service_requests&entity_id=${serviceRequest.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-piquete-blue/5 hover:bg-piquete-blue/10 px-3 py-1.5 text-xs font-bold text-piquete-blue transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Ver histórico</span>
                      </Link>

                      <button
                        type="button"
                        aria-expanded={notasAbertasId === serviceRequest.id}
                        onClick={() => setNotasAbertasId((atual) => (atual === serviceRequest.id ? null : serviceRequest.id))}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                          notasAbertasId === serviceRequest.id
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Notas</span>
                      </button>

                      {serviceRequest.status !== 'COMPLETED' && serviceRequest.status !== 'CANCELLED' && (
                        <>
                          {cancellingId === serviceRequest.id ? (
                            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1 text-xs">
                              <span className="font-medium text-rose-800">Cancelar este pedido?</span>
                              <button
                                type="button"
                                onClick={() => handleConfirmCancel(serviceRequest.id, serviceRequest.title)}
                                disabled={cancelMutation.isPending}
                                className="font-bold text-rose-700 hover:underline disabled:opacity-50"
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancellingId(null)}
                                disabled={cancelMutation.isPending}
                                className="text-gray-500 hover:underline disabled:opacity-50"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCancellingId(serviceRequest.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Cancelar pedido</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {notasAbertasId === serviceRequest.id && (
                      <div className="pt-2">
                        <NotasInternas targetType="SERVICE_REQUEST" targetId={serviceRequest.id} />
                      </div>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {requests && (offset > 0 || requests.length === PAGE_SIZE) && (
        <div className="flex justify-between items-center text-sm pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            disabled={offset === 0}
          >
            ← Anterior
          </Button>
          <span className="text-xs text-gray-500 font-medium">
            A mostrar {offset + 1}–{offset + requests.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOffset((current) => current + PAGE_SIZE)}
            disabled={requests.length < PAGE_SIZE}
          >
            Seguinte →
          </Button>
        </div>
      )}
    </main>
  )
}
