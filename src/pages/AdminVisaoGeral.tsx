import { Navigate, useSearchParams } from 'react-router-dom'
import { SeccaoComSeparadores, type DefinicaoDeSeparador } from '../components/admin/estrutura/Separadores'
import { useSeparadorDoEndereco } from '../components/admin/estrutura/useSeparadorDoEndereco'
import { noSeparador, SECCAO_VISAO_GERAL, SEPARADORES_DA_VISAO_GERAL, type SeparadorDaVisaoGeral } from '../components/admin/layout/rotas'
import { AdminAuditLog } from './AdminAuditLog'
import { AdminDashboard } from './AdminDashboard'
import { AdminReports } from './AdminReports'
import { AdminSystem } from './AdminSystem'

// O que serve para olhar para a plataforma: o painel e métricas, os relatórios (com procura), o
// registo de auditoria e a saúde do sistema. Os separadores antigos `metricas` e `procura`
// redireccionam para os separadores em que foram integrados.
const SEPARADORES: DefinicaoDeSeparador<SeparadorDaVisaoGeral>[] = [
  { id: 'painel', rotulo: 'Painel e Métricas', icone: 'grelha' },
  { id: 'relatorios', rotulo: 'Relatórios', icone: 'documento' },
  { id: 'auditoria', rotulo: 'Auditoria', icone: 'relogio' },
  { id: 'sistema', rotulo: 'Sistema', icone: 'servidor' },
]

export function AdminVisaoGeral() {
  const [searchParams] = useSearchParams()
  const tabBruto = searchParams.get('tab')
  const [separador, mudarSeparador] = useSeparadorDoEndereco(SEPARADORES_DA_VISAO_GERAL)

  if (tabBruto === 'metricas') {
    return <Navigate to={noSeparador(SECCAO_VISAO_GERAL, 'painel')} replace />
  }
  if (tabBruto === 'procura') {
    return <Navigate to={noSeparador(SECCAO_VISAO_GERAL, 'relatorios')} replace />
  }

  return (
    <SeccaoComSeparadores rotulo="Subsecções da Visão Geral" separadores={SEPARADORES} activo={separador} aoMudar={mudarSeparador}>
      {separador === 'painel' && <AdminDashboard />}
      {separador === 'relatorios' && <AdminReports />}
      {separador === 'auditoria' && <AdminAuditLog />}
      {separador === 'sistema' && <AdminSystem />}
    </SeccaoComSeparadores>
  )
}
