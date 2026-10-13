import { Link } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
import { CartaoDeAtencao } from '../components/admin/CartaoDeAtencao'
import { DESTINOS_DE_ADMIN } from '../components/admin/destinos'
import { NavegacaoAdmin } from '../components/admin/NavegacaoAdmin'
import { Card } from '../components/ui/Card'
import { useAdminMetrics } from '../hooks/useAdminMetrics'
import { useAdminSecurityAlerts } from '../hooks/useAdminSecurityAlerts'
import { useAdminSubscriptions } from '../hooks/useAdminSubscriptions'

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

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
          Administração
        </h1>
      </header>

      <NavegacaoAdmin />

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Precisa de atenção</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CartaoDeAtencao
            rotulo="Verificações em análise"
            to="/admin/kyc"
            valor={valorDe(metricas, (m) => m.kycByStatus.PENDING ?? 0)}
            vazio="Tudo em dia"
            destaque
          />
          <CartaoDeAtencao
            rotulo="Pedidos abertos"
            to="/admin/pedidos-servico"
            valor={valorDe(metricas, (m) => m.serviceRequestsByStatus.OPEN ?? 0)}
            vazio="Nenhum aberto"
          />
          <CartaoDeAtencao
            rotulo="Subscrições a expirar (7 dias)"
            to="/admin/subscricoes"
            valor={valorDe(aExpirar, (lista) => lista.length)}
            vazio="Nenhuma a expirar"
          />
          <CartaoDeAtencao
            rotulo="Alertas de segurança (24h)"
            to="/admin/audit-log"
            valor={valorDe(alertas, (lista) => lista.length)}
            vazio="Sem alertas"
            destaque
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Ecrãs</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DESTINOS_DE_ADMIN.map((destino) => (
            <li key={destino.to}>
              <Link to={destino.to} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-piquete-blue">
                <Card variant="interactive" className="flex flex-col gap-0.5 p-4">
                  <span className="font-bold text-piquete-blue">{destino.rotulo}</span>
                  <span className="text-sm text-gray-600">{destino.descricao}</span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
