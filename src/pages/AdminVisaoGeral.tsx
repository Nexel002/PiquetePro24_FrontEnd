import { SeccaoComSeparadores, type DefinicaoDeSeparador } from '../components/admin/estrutura/Separadores'
import { useSeparadorDoEndereco } from '../components/admin/estrutura/useSeparadorDoEndereco'
import { SEPARADORES_DA_VISAO_GERAL, type SeparadorDaVisaoGeral } from '../components/admin/layout/rotas'
import { AdminAuditLog } from './AdminAuditLog'
import { AdminDashboard } from './AdminDashboard'
import { AdminMetrics } from './AdminMetrics'
import { AdminReports } from './AdminReports'
import { AdminSystem } from './AdminSystem'

// O que serve para olhar para a plataforma: o painel de entrada, os números, os relatórios, o
// registo de auditoria e a saúde do sistema. Cada um era um ecrã com rota própria; as rotas
// antigas redireccionam para aqui (ver ROTAS_ANTIGAS).
const SEPARADORES: DefinicaoDeSeparador<SeparadorDaVisaoGeral>[] = [
  { id: 'painel', rotulo: 'Painel', icone: 'grelha' },
  { id: 'metricas', rotulo: 'Métricas', icone: 'barras' },
  { id: 'relatorios', rotulo: 'Relatórios', icone: 'documento' },
  { id: 'auditoria', rotulo: 'Auditoria', icone: 'relogio' },
  { id: 'sistema', rotulo: 'Sistema', icone: 'servidor' },
]

export function AdminVisaoGeral() {
  const [separador, mudarSeparador] = useSeparadorDoEndereco(SEPARADORES_DA_VISAO_GERAL)

  return (
    <SeccaoComSeparadores rotulo="Subsecções da Visão Geral" separadores={SEPARADORES} activo={separador} aoMudar={mudarSeparador}>
      {separador === 'painel' && <AdminDashboard />}
      {separador === 'metricas' && <AdminMetrics />}
      {separador === 'relatorios' && <AdminReports />}
      {separador === 'auditoria' && <AdminAuditLog />}
      {separador === 'sistema' && <AdminSystem />}
    </SeccaoComSeparadores>
  )
}
