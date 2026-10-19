import { SeccaoComSeparadores, type DefinicaoDeSeparador } from '../components/admin/estrutura/Separadores'
import { useSeparadorDoEndereco } from '../components/admin/estrutura/useSeparadorDoEndereco'
import { SEPARADORES_DE_MAIS, type SeparadorDeMais } from '../components/admin/layout/rotas'
import { AdminAdmins } from './AdminAdmins'
import { AdminBroadcasts } from './AdminBroadcasts'
import { AdminModeration } from './AdminModeration'
import { AdminSecurity } from './AdminSecurity'
import { AdminServices } from './AdminServices'
import { AdminSubscriptions } from './AdminSubscriptions'

// As ferramentas de operação que não são do dia-a-dia da fila (KYC, contas, pedidos):
// subscrições, denúncias, catálogo de serviços, comunicados, quem administra e a segurança da
// própria conta. Era o menu «Mais» das abas antigas; passa a secção com separadores.
const SEPARADORES: DefinicaoDeSeparador<SeparadorDeMais>[] = [
  { id: 'subscricoes', rotulo: 'Subscrições', icone: 'cartao' },
  { id: 'moderacao', rotulo: 'Moderação', icone: 'alerta' },
  { id: 'servicos', rotulo: 'Serviços', icone: 'caixas' },
  { id: 'comunicados', rotulo: 'Comunicados', icone: 'envelope' },
  { id: 'administradores', rotulo: 'Administradores', icone: 'grupo' },
  { id: 'seguranca', rotulo: 'Segurança', icone: 'cadeado' },
]

export function AdminMais() {
  const [separador, mudarSeparador] = useSeparadorDoEndereco(SEPARADORES_DE_MAIS)

  return (
    <SeccaoComSeparadores rotulo="Outras ferramentas" separadores={SEPARADORES} activo={separador} aoMudar={mudarSeparador}>
      {separador === 'subscricoes' && <AdminSubscriptions />}
      {separador === 'moderacao' && <AdminModeration />}
      {separador === 'servicos' && <AdminServices />}
      {separador === 'comunicados' && <AdminBroadcasts />}
      {separador === 'administradores' && <AdminAdmins />}
      {separador === 'seguranca' && <AdminSecurity />}
    </SeccaoComSeparadores>
  )
}
