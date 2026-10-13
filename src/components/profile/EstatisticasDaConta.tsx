import { useMyServiceRequests } from '../../hooks/useServiceRequests'
import type { UserProfile } from '../../services/profile'
import { Mosaico } from '../ui/Mosaico'

// Os pedidos vêm da mesma consulta do histórico (mesma chave no TanStack Query), por isso não
// há um segundo pedido à API. O papel não é uma estatística — já está escrito por baixo do
// nome, e este mosaico mostrava «Cliente» a um administrador.
export function EstatisticasDaConta({ profile }: { profile: UserProfile }) {
  const { data: requests } = useMyServiceRequests()
  const totalDePedidos = requests?.length ?? 0
  const concluidos = requests?.filter((pedido) => pedido.status === 'COMPLETED').length ?? 0

  return (
    <div className="flex gap-2.5 pt-1">
      <Mosaico value={totalDePedidos} label={totalDePedidos === 1 ? 'Pedido' : 'Pedidos'} />
      <Mosaico value={concluidos} label="Concluídos" />
      <Mosaico value={new Date(profile.created_at).getFullYear()} label="Ativo desde" />
    </div>
  )
}
