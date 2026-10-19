import { Link } from 'react-router-dom'
import { CartaoDeAtencao } from '../components/admin/CartaoDeAtencao'
import { DESTINOS_DE_ADMIN } from '../components/admin/destinos'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { noSeparador, rotaDaAuditoria, ROTA_DE_SEGURANCA, SECCAO_KYC, SECCAO_MAIS, SECCAO_PEDIDOS } from '../components/admin/layout/rotas'
import { Card } from '../components/ui/Card'
import { useAdminMetrics } from '../hooks/useAdminMetrics'
import { useAdminSecurityAlerts } from '../hooks/useAdminSecurityAlerts'
import { useAdminSubscriptions } from '../hooks/useAdminSubscriptions'
import { useEstadoDoMfa } from '../hooks/useMfa'
import { useAdminReports } from '../hooks/useModeration'

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

// TRD Adendo v1.39 / Fase 12: entrada única do admin. Não mede nada de novo — os contadores
// vêm de GET /admin/metrics e GET /admin/security-alerts, os mesmos que alimentam Métricas e
// Auditoria. O guard de role está na rota (RotaDeAdmin).
export function AdminDashboard() {
  const metricas = useAdminMetrics()
  // Mesmos parâmetros do painel de alertas do Registo de auditoria, para o número bater.
  const alertas = useAdminSecurityAlerts({ windowHours: 24, minAttempts: 5 })
  // Máximo de uma página de 100: acima disso o cartão mostra 100, que já diz «muitas».
  const aExpirar = useAdminSubscriptions({ filtro: 'EXPIRING', limit: 100, offset: 0 })
  const denuncias = useAdminReports({ status: 'OPEN', limit: 100, offset: 0 })
  const mfa = useEstadoDoMfa()

  return (
    <ConteudoDoSeparador
      icone="grelha"
      titulo="Painel Geral"
      subtitulo="Métricas em tempo real e monitorização de serviços"
      selo="Área de gestão restrita com auditoria ativa"
    >
      <div className="border-t border-slate-100 p-4 sm:p-6 flex flex-col gap-6">
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

        <section className="flex flex-col gap-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ecrãs e Ferramentas</h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DESTINOS_DE_ADMIN.map((destino) => (
              <li key={destino.to}>
                <Link to={destino.to} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-piquete-blue">
                  <Card variant="interactive" className="flex flex-col gap-1 p-4 border border-slate-200/70 hover:border-piquete-blue-bright/40 transition-all">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">{destino.rotulo}</span>
                    <span className="text-xs sm:text-sm text-slate-500 line-clamp-2">{destino.descricao}</span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ConteudoDoSeparador>
  )
}
