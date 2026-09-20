import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuditLog } from '../hooks/useAuditLog'
import { BackButton } from '../components/BackButton'

const PAGE_SIZE = 25

type SuccessFilter = 'ALL' | 'true' | 'false'

// created_at vem em UTC do backend (timestamptz) — TRD Adendo v1.8 do backend deixa
// explícito que converter para a hora de Moçambique é responsabilidade de quem exibe.
// Sem fuso fixo, o browser do admin mostraria a hora local dele, não a de Maputo.
function formatMaputoDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', {
    timeZone: 'Africa/Maputo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// TRD Adendo v1.8: superfície mínima para o ADMIN consultar o audit log — mesma
// decisão de AdminKyc.tsx (guard de role dentro do próprio componente, sem
// convenção de RequireRole dedicada no projeto ainda).
export function AdminAuditLog() {
  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const [actionFilter, setActionFilter] = useState('')
  const [successFilter, setSuccessFilter] = useState<SuccessFilter>('ALL')
  const [offset, setOffset] = useState(0)
  // Adendo v1.9, item B: ?user_id= na URL, escrito pelo link "Ver histórico" de
  // AdminUserDetail.tsx — permanece na barra de endereço (não é limpo ao trocar os
  // outros filtros), para a página poder ser recarregada ou partilhada já filtrada.
  const [searchParams, setSearchParams] = useSearchParams()
  const userIdFilter = searchParams.get('user_id') ?? undefined
  // Adendo v1.9, item C: ?entity_type=&entity_id= na URL, escrito pelo link
  // "Ver histórico" de AdminServiceRequests.tsx — vêm sempre os dois juntos.
  const entityTypeFilter = searchParams.get('entity_type') ?? undefined
  const entityIdFilter = searchParams.get('entity_id') ?? undefined

  const { data: entries, isLoading, isError } = useAuditLog({
    action: actionFilter.trim(),
    success: successFilter === 'ALL' ? undefined : successFilter === 'true',
    userId: userIdFilter,
    entityType: entityTypeFilter,
    entityId: entityIdFilter,
    limit: PAGE_SIZE,
    offset,
  })

  function handleClearDeepLinkFilter(keys: string[]) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      keys.forEach((key) => next.delete(key))
      return next
    })
    setOffset(0)
  }

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

  function handleFilterChange(update: () => void) {
    // Qualquer mudança de filtro volta à primeira página — continuar num offset
    // antigo depois de mudar o filtro mostraria uma página "no meio do nada" do
    // novo resultado, ou uma lista vazia sem ser óbvio porquê.
    setOffset(0)
    update()
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Histórico de ações</h1>
      </header>

      {userIdFilter && (
        <div className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
          <span>
            A mostrar só o histórico do utilizador <span className="font-medium">{userIdFilter}</span>
          </span>
          <button type="button" onClick={() => handleClearDeepLinkFilter(['user_id'])} className="text-gray-600 underline">
            Limpar
          </button>
        </div>
      )}

      {entityTypeFilter && entityIdFilter && (
        <div className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
          <span>
            A mostrar só a linha do tempo de <span className="font-medium">{entityTypeFilter}</span> /{' '}
            <span className="font-medium">{entityIdFilter}</span>
          </span>
          <button
            type="button"
            onClick={() => handleClearDeepLinkFilter(['entity_type', 'entity_id'])}
            className="text-gray-600 underline"
          >
            Limpar
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        <input
          type="text"
          value={actionFilter}
          onChange={(event) => handleFilterChange(() => setActionFilter(event.target.value))}
          placeholder="Filtrar por ação (ex. KYC_REVIEW_APPROVED)"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5"
        />
        <select
          value={successFilter}
          onChange={(event) => handleFilterChange(() => setSuccessFilter(event.target.value as SuccessFilter))}
          className="rounded-lg border border-gray-300 px-3 py-1.5"
        >
          <option value="ALL">Todos</option>
          <option value="true">Sucesso</option>
          <option value="false">Falha</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-16 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-16 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-16 animate-pulse rounded-lg bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">Não foi possível carregar o histórico. Verifica a tua ligação e tenta novamente.</p>
      )}

      {entries && entries.length === 0 && <p className="text-sm text-gray-600">Nenhum registo encontrado.</p>}

      {entries && entries.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{entry.action}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    entry.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {entry.status_code}
                </span>
              </div>
              {entry.description && <p className="text-sm text-gray-600">{entry.description}</p>}
              <p className="text-xs text-gray-500">
                {formatMaputoDateTime(entry.created_at)} · {entry.method} {entry.path}
                {entry.user_id && ` · utilizador ${entry.user_id}`}
                {entry.ip_address && ` · ${entry.ip_address}`}
              </p>
            </li>
          ))}
        </ul>
      )}

      {entries && (offset > 0 || entries.length === PAGE_SIZE) && (
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
            disabled={entries.length < PAGE_SIZE}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 disabled:opacity-50"
          >
            Seguinte
          </button>
        </div>
      )}
    </main>
  )
}
