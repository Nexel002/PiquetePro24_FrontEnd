import { Link } from 'react-router-dom'
import { CartaoDeAtencao } from '../components/admin/CartaoDeAtencao'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { CartaoDeMetrica, SeccaoDeMetricas, SemDados } from '../components/admin/metricas/SeccaoDeMetricas'
import { noSeparador, rotaDaAuditoria, ROTA_DE_SEGURANCA, SECCAO_KYC, SECCAO_MAIS, SECCAO_PEDIDOS } from '../components/admin/layout/rotas'
import { Card } from '../components/ui/Card'
import { useAdminMetrics } from '../hooks/useAdminMetrics'
import { useAdminSecurityAlerts } from '../hooks/useAdminSecurityAlerts'
import { useAdminSubscriptions } from '../hooks/useAdminSubscriptions'
import { useEstadoDoMfa } from '../hooks/useMfa'
import { useAdminReports } from '../hooks/useModeration'

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

// Valor de um cartão a partir de uma query: a carregar → `undefined`, falhou → `null`. Cada
// fonte tem o seu estado, para o erro de uma não esconder o que a outra já trouxe.
function valorDe<T>(
  query: { isLoading: boolean; isError: boolean; data: T | undefined },
  extrair: (dados: T) => number,
) {
  if (query.isLoading) return undefined
  if (query.isError || query.data === undefined) return null
  return extrair(query.data)
}

// Painel Geral + Métricas Globais unificados num único separador: alerta de 2FA, os 5 cartões
// operacionais «Precisa de atenção» e logo abaixo as secções de métricas de GET /admin/metrics
// (sem a grelha redundante de 13 cartões de navegação que repetia a barra lateral).
export function AdminDashboard() {
  const metricas = useAdminMetrics()
  // Mesmos parâmetros do painel de alertas do Registo de auditoria, para o número bater.
  const alertas = useAdminSecurityAlerts({ windowHours: 24, minAttempts: 5 })
  // Máximo de uma página de 100: acima disso o cartão mostra 100, que já diz «muitas».
  const aExpirar = useAdminSubscriptions({ filtro: 'EXPIRING', limit: 100, offset: 0 })
  const denuncias = useAdminReports({ status: 'OPEN', limit: 100, offset: 0 })
  const mfa = useEstadoDoMfa()

  const signupsTotal = metricas.data?.signupsLast30Days.reduce((sum, day) => sum + day.count, 0) ?? 0

  return (
    <ConteudoDoSeparador
      icone="grelha"
      titulo="Painel e Métricas"
      subtitulo="Operações que precisam de atenção e consolidado de métricas da plataforma"
      selo="Área de gestão restrita com auditoria ativa"
    >
      <div className="border-t border-slate-100 p-4 sm:p-6 flex flex-col gap-8">
        {mfa.data && !mfa.data.temFactor && (
          <Link
            to={ROTA_DE_SEGURANCA}
            className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 transition-colors hover:bg-amber-100/70"
          >
            <span className="font-bold">Protege a tua conta de administrador.</span> Ativa a verificação em dois passos.
          </Link>
        )}

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Precisa de atenção</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CartaoDeAtencao
              rotulo="Verificações em análise"
              to={SECCAO_KYC}
              valor={valorDe(metricas, (m) => m.kycByStatus.PENDING ?? 0)}
              vazio="Tudo em dia"
              destaque
            />
            <CartaoDeAtencao
              rotulo="Pedidos abertos"
              to={SECCAO_PEDIDOS}
              valor={valorDe(metricas, (m) => m.serviceRequestsByStatus.OPEN ?? 0)}
              vazio="Nenhum aberto"
            />
            <CartaoDeAtencao
              rotulo="Subscrições a expirar (7 dias)"
              to={noSeparador(SECCAO_MAIS, 'subscricoes')}
              valor={valorDe(aExpirar, (lista) => lista.length)}
              vazio="Nenhuma a expirar"
            />
            <CartaoDeAtencao
              rotulo="Denúncias por tratar"
              to={noSeparador(SECCAO_MAIS, 'moderacao')}
              valor={valorDe(denuncias, (lista) => lista.length)}
              vazio="Nenhuma por tratar"
              destaque
            />
            <CartaoDeAtencao
              rotulo="Alertas de segurança (24h)"
              to={rotaDaAuditoria()}
              valor={valorDe(alertas, (lista) => lista.length)}
              vazio="Sem alertas"
              destaque
            />
          </div>
        </section>

        {metricas.data && (
          <div className="space-y-8 border-t border-slate-100 pt-6">
            <SeccaoDeMetricas titulo="Utilizadores na Plataforma">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {Object.entries(metricas.data.usersByRole).map(([role, count]) => (
                  <CartaoDeMetrica key={role} rotulo={ROLE_LABELS[role] ?? role} valor={count} />
                ))}
                <CartaoDeMetrica rotulo="Novos registos" valor={signupsTotal} nota="30 dias" />
              </div>
            </SeccaoDeMetricas>

            <SeccaoDeMetricas titulo="Pedidos de Serviço">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {Object.entries(metricas.data.serviceRequestsByStatus).map(([status, count]) => (
                  <CartaoDeMetrica key={status} rotulo={REQUEST_STATUS_LABELS[status] ?? status} valor={count} />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <CartaoDeMetrica
                  rotulo="Tempo médio até atribuição"
                  valor={formatMinutes(metricas.data.avgTimeToAssignmentMinutes)}
                  nota="Abertura até técnico"
                />
                <CartaoDeMetrica
                  rotulo="Tempo médio até conclusão"
                  valor={formatMinutes(metricas.data.avgTimeToCompletionMinutes)}
                  nota="Início até fecho"
                />
              </div>
            </SeccaoDeMetricas>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              <SeccaoDeMetricas titulo="Verificação de Identidade (KYC)">
                {Object.keys(metricas.data.kycByStatus).length === 0 ? (
                  <SemDados>Ainda não há submissões de KYC.</SemDados>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(metricas.data.kycByStatus).map(([status, count]) => (
                      <CartaoDeMetrica key={status} rotulo={KYC_STATUS_LABELS[status] ?? status} valor={count} />
                    ))}
                  </div>
                )}
              </SeccaoDeMetricas>

              <SeccaoDeMetricas titulo="Profissionais Ativos por Província">
                {metricas.data.activeProfessionalsByProvince.length === 0 ? (
                  <SemDados>Ainda não há profissionais com província definida.</SemDados>
                ) : (
                  <Card variant="solid" className="p-0 border border-slate-100 overflow-hidden shadow-none">
                    <ul className="divide-y divide-slate-100 text-sm max-h-56 overflow-y-auto">
                      {metricas.data.activeProfessionalsByProvince.map((row) => (
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
          </div>
        )}
      </div>
    </ConteudoDoSeparador>
  )
}
