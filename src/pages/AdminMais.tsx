import { Navigate, useSearchParams } from 'react-router-dom'
import { SeccaoComSeparadores, type DefinicaoDeSeparador } from '../components/admin/estrutura/Separadores'
import { useSeparadorDoEndereco } from '../components/admin/estrutura/useSeparadorDoEndereco'
import { noSeparador, SECCAO_UTILIZADORES, SEPARADORES_DE_MAIS, type SeparadorDeMais } from '../components/admin/layout/rotas'
import { AdminBroadcasts } from './AdminBroadcasts'
import { AdminModeration } from './AdminModeration'
import { AdminSecurity } from './AdminSecurity'
import { AdminServices } from './AdminServices'
import { AdminSubscriptions } from './AdminSubscriptions'

// As ferramentas de plataforma e operação complementar: subscrições, denúncias, catálogo de
// serviços, comunicados e a segurança da própria conta. «Administradores» passou para a secção
// «Utilizadores» (e `?tab=administradores` aqui redirecciona para lá).
const SEPARADORES: DefinicaoDeSeparador<SeparadorDeMais>[] = [
  { id: 'subscricoes', rotulo: 'Subscrições', icone: 'cartao' },
  { id: 'moderacao', rotulo: 'Moderação', icone: 'alerta' },
  { id: 'servicos', rotulo: 'Serviços', icone: 'caixas' },
  { id: 'comunicados', rotulo: 'Comunicados', icone: 'envelope' },
  { id: 'seguranca', rotulo: 'Segurança', icone: 'cadeado' },
]

export function AdminMais() {
  const [searchParams] = useSearchParams()
  const tabBruto = searchParams.get('tab')
  const [separador, mudarSeparador] = useSeparadorDoEndereco(SEPARADORES_DE_MAIS)

  if (tabBruto === 'administradores') {
    return <Navigate to={noSeparador(SECCAO_UTILIZADORES, 'administradores')} replace />
  }

  return (
    <SeccaoComSeparadores rotulo="Outras ferramentas" separadores={SEPARADORES} activo={separador} aoMudar={mudarSeparador}>
      {separador === 'subscricoes' && <AdminSubscriptions />}
      {separador === 'moderacao' && <AdminModeration />}
      {separador === 'servicos' && <AdminServices />}
      {separador === 'comunicados' && <AdminBroadcasts />}
      {separador === 'seguranca' && <AdminSecurity />}
    </SeccaoComSeparadores>
  )
}
