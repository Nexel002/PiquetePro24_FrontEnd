import { useAdminMetrics } from '../hooks/useAdminMetrics'
import { Card } from '../components/ui/Card'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { ACarregar, ErroAoCarregar } from '../components/admin/estrutura/EstadosDaLista'
import { CartaoDeMetrica, SeccaoDeMetricas, SemDados } from '../components/admin/metricas/SeccaoDeMetricas'

const ROLE_LABELS: Record<string, string> = {
  CLIENT: 'Clientes',
  PROFESSIONAL: 'Profissionais',
  ADMIN: 'Administradores',
  TECHNICIAN: 'Técnicos',
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

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return 'sem dados'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  return `${hours}h ${remainingMinutes}min`
}

export function AdminMetrics() {
  const { data: metrics, isLoading, isError } = useAdminMetrics()

  const signupsTotal = metrics?.signupsLast30Days.reduce((sum, day) => sum + day.count, 0) ?? 0

  return (
    <ConteudoDoSeparador
      icone="barras"
      titulo="Métricas Globais"
      subtitulo="Consolidado de adesão, estado de pedidos e tempos médios de resposta"
      selo="Últimos 30 dias"
      iconeDoSelo="relogio"
    >
      <div className="border-t border-slate-100 p-4 sm:p-6 space-y-8">
        {isLoading && <ACarregar blocos={4} bloco="h-24" className="grid grid-cols-2 md:grid-cols-4 gap-4" />}

        {isError && <ErroAoCarregar>Não foi possível carregar as métricas. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>}

        {metrics && (
          <>
            <SeccaoDeMetricas titulo="Utilizadores na Plataforma">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {Object.entries(metrics.usersByRole).map(([role, count]) => (
                  <CartaoDeMetrica key={role} rotulo={ROLE_LABELS[role] ?? role} valor={count} />
                ))}
                <CartaoDeMetrica rotulo="Novos registos" valor={signupsTotal} nota="30 dias" />
              </div>
            </SeccaoDeMetricas>

            <SeccaoDeMetricas titulo="Pedidos de Serviço">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {Object.entries(metrics.serviceRequestsByStatus).map(([status, count]) => (
                  <CartaoDeMetrica key={status} rotulo={REQUEST_STATUS_LABELS[status] ?? status} valor={count} />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <CartaoDeMetrica
                  rotulo="Tempo médio até atribuição"
                  valor={formatMinutes(metrics.avgTimeToAssignmentMinutes)}
                  nota="Abertura até técnico"
                />
                <CartaoDeMetrica
                  rotulo="Tempo médio até conclusão"
                  valor={formatMinutes(metrics.avgTimeToCompletionMinutes)}
                  nota="Início até fecho"
                />
              </div>
            </SeccaoDeMetricas>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              <SeccaoDeMetricas titulo="Verificação de Identidade (KYC)">
                {Object.keys(metrics.kycByStatus).length === 0 ? (
                  <SemDados>Ainda não há submissões de KYC.</SemDados>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(metrics.kycByStatus).map(([status, count]) => (
                      <CartaoDeMetrica key={status} rotulo={KYC_STATUS_LABELS[status] ?? status} valor={count} />
                    ))}
                  </div>
                )}
              </SeccaoDeMetricas>

              <SeccaoDeMetricas titulo="Profissionais Ativos por Província">
                {metrics.activeProfessionalsByProvince.length === 0 ? (
                  <SemDados>Ainda não há profissionais com província definida.</SemDados>
                ) : (
                  <Card variant="solid" className="p-0 border border-slate-100 overflow-hidden shadow-none">
                    <ul className="divide-y divide-slate-100 text-sm max-h-56 overflow-y-auto">
                      {metrics.activeProfessionalsByProvince.map((row) => (
                        <li key={row.province} className="flex justify-between items-center px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
                          <span className="text-slate-700 font-medium">{row.province}</span>
                          <span className="font-bold text-piquete-blue bg-piquete-blue/5 px-2.5 py-0.5 rounded-full text-xs">{row.count}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </SeccaoDeMetricas>
            </div>
          </>
        )}
      </div>
    </ConteudoDoSeparador>
  )
}
