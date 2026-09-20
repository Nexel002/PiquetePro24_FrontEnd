import { Navigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAdminMetrics } from '../hooks/useAdminMetrics'
import { BackButton } from '../components/BackButton'

const ROLE_LABELS: Record<string, string> = {
  CLIENT: 'Clientes',
  PROFESSIONAL: 'Profissionais',
  ADMIN: 'Administradores',
}

const KYC_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Em análise',
  APPROVED: 'Aprovados',
  REJECTED: 'Rejeitados',
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abertos',
  ASSIGNED: 'Atribuídos',
  COMPLETED: 'Concluídos',
  CANCELLED: 'Cancelados',
}

// null vira "sem dados" (nenhum pedido chegou a esse estado ainda) — nunca "0 min",
// que pareceria "instantâneo" em vez de "não há ainda o que medir".
function formatMinutes(minutes: number | null): string {
  if (minutes === null) return 'sem dados'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  return `${hours}h ${remainingMinutes}min`
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-4">
      <span className="text-2xl font-semibold text-gray-900">{value}</span>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  )
}

// TRD Adendo v1.9, item D: tiles simples com números — sem gráficos nesta entrega
// (decisão registada no plano), sem componente financeiro (depende da Fase 5 do
// backend). Mesma convenção de guard de role dentro do próprio componente já usada
// nos outros ecrãs de admin.
export function AdminMetrics() {
  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const { data: metrics, isLoading, isError } = useAdminMetrics()

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

  const signupsTotal = metrics?.signupsLast30Days.reduce((sum, day) => sum + day.count, 0) ?? 0

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Métricas</h1>
      </header>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">Não foi possível carregar as métricas. Verifica a tua ligação e tenta novamente.</p>
      )}

      {metrics && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-500">Utilizadores</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(metrics.usersByRole).map(([role, count]) => (
                <Tile key={role} label={ROLE_LABELS[role] ?? role} value={count} />
              ))}
              <Tile label="Novos registos (30 dias)" value={signupsTotal} />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-500">Verificação de identidade (KYC)</h2>
            {Object.keys(metrics.kycByStatus).length === 0 ? (
              <p className="text-sm text-gray-600">Ainda não há submissões de KYC.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(metrics.kycByStatus).map(([status, count]) => (
                  <Tile key={status} label={KYC_STATUS_LABELS[status] ?? status} value={count} />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-500">Profissionais ativos por província</h2>
            {metrics.activeProfessionalsByProvince.length === 0 ? (
              <p className="text-sm text-gray-600">Ainda não há profissionais com província definida.</p>
            ) : (
              <ul className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3 text-sm">
                {metrics.activeProfessionalsByProvince.map((row) => (
                  <li key={row.province} className="flex justify-between">
                    <span className="text-gray-700">{row.province}</span>
                    <span className="font-medium text-gray-900">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-500">Pedidos de serviço</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(metrics.serviceRequestsByStatus).map(([status, count]) => (
                <Tile key={status} label={REQUEST_STATUS_LABELS[status] ?? status} value={count} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Tile label="Tempo médio até atribuição" value={formatMinutes(metrics.avgTimeToAssignmentMinutes)} />
              <Tile label="Tempo médio até conclusão" value={formatMinutes(metrics.avgTimeToCompletionMinutes)} />
            </div>
          </section>
        </>
      )}
    </main>
  )
}
