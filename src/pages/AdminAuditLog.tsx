import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuditLog } from '../hooks/useAuditLog'
import { useAdminSecurityAlerts } from '../hooks/useAdminSecurityAlerts'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'

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

// TRD Adendo v1.9, item E: secção de alertas (não uma tela à parte — o próprio TRD
// dava a escolha) embutida no topo do audit log, de onde os dados vêm. Sem alertas,
// não mostra nada — uma secção "sem alertas" permanente seria ruído, não é o tipo de
// coisa que vale confirmar ativamente que "está tudo bem".
function SecurityAlertsPanel({ onFilterByUser }: { onFilterByUser: (userId: string) => void }) {
  const { data: alerts } = useAdminSecurityAlerts({ windowHours: 24, minAttempts: 5 })

  if (!alerts || alerts.length === 0) {
    return null
  }

  return (
    <Card variant="solid" className="border-amber-200 bg-amber-50 p-4 flex flex-col gap-2">
      <h2 className="text-sm font-bold text-amber-800">Alertas de segurança (últimas 24h)</h2>
      <ul className="flex flex-col gap-1 text-sm text-amber-800">
        {alerts.map((alert) => (
          <li key={`${alert.groupType}-${alert.groupKey}`} className="flex items-center justify-between gap-2">
            <span>
              {alert.attempts} tentativas negadas · {alert.groupType === 'user_id' ? 'utilizador' : 'IP'}{' '}
              <span className="font-semibold">{alert.groupKey}</span>
            </span>
            {alert.groupType === 'user_id' && (
              <button type="button" onClick={() => onFilterByUser(alert.groupKey)} className="font-semibold underline">
                Ver histórico
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
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

  // Clicar num alerta por utilizador reaproveita o mesmo ?user_id= que
  // AdminUserDetail.tsx já escreve (item B) — limpa o filtro de entidade (item C)
  // porque os dois nunca fazem sentido juntos.
  function handleFilterByUser(userId: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('user_id', userId)
      next.delete('entity_type')
      next.delete('entity_id')
      return next
    })
    setOffset(0)
  }

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

  function handleFilterChange(update: () => void) {
    // Qualquer mudança de filtro volta à primeira página — continuar num offset
    // antigo depois de mudar o filtro mostraria uma página "no meio do nada" do
    // novo resultado, ou uma lista vazia sem ser óbvio porquê.
    setOffset(0)
    update()
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
          Histórico de ações
        </h1>
      </header>

      <SecurityAlertsPanel onFilterByUser={handleFilterByUser} />

      {userIdFilter && (
        <div className="flex items-center justify-between rounded-xl bg-piquete-blue/5 border border-piquete-blue/10 px-3 py-2 text-sm text-piquete-blue">
          <span>
            A mostrar só o histórico do utilizador <span className="font-semibold">{userIdFilter}</span>
          </span>
          <button type="button" onClick={() => handleClearDeepLinkFilter(['user_id'])} className="font-semibold underline">
            Limpar
          </button>
        </div>
      )}

      {entityTypeFilter && entityIdFilter && (
        <div className="flex items-center justify-between rounded-xl bg-piquete-blue/5 border border-piquete-blue/10 px-3 py-2 text-sm text-piquete-blue">
          <span>
            A mostrar só a linha do tempo de <span className="font-semibold">{entityTypeFilter}</span> /{' '}
            <span className="font-semibold">{entityIdFilter}</span>
          </span>
          <button
            type="button"
            onClick={() => handleClearDeepLinkFilter(['entity_type', 'entity_id'])}
            className="font-semibold underline"
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
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue"
        />
        <select
          value={successFilter}
          onChange={(event) => handleFilterChange(() => setSuccessFilter(event.target.value as SuccessFilter))}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue"
        >
          <option value="ALL">Todos</option>
          <option value="true">Sucesso</option>
          <option value="false">Falha</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-16 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-16 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-16 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">Não foi possível carregar o histórico. Verifica a tua ligação e tenta novamente.</p>
      )}

      {entries && entries.length === 0 && <p className="text-sm text-gray-600">Nenhum registo encontrado.</p>}

      {entries && entries.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card variant="solid" className="flex flex-col gap-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-piquete-blue">{entry.action}</span>
                  <Badge variant={entry.success ? 'approved' : 'rejected'}>{entry.status_code}</Badge>
                </div>
                {entry.description && <p className="text-sm text-gray-600">{entry.description}</p>}
                <p className="text-xs text-gray-500">
                  {formatMaputoDateTime(entry.created_at)} · {entry.method} {entry.path}
                  {entry.user_id && ` · utilizador ${entry.user_id}`}
                  {entry.ip_address && ` · ${entry.ip_address}`}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {entries && (offset > 0 || entries.length === PAGE_SIZE) && (
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
            disabled={entries.length < PAGE_SIZE}
          >
            Seguinte
          </Button>
        </div>
      )}
    </main>
  )
}
