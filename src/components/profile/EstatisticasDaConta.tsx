import { useMyServiceRequests } from '../../hooks/useServiceRequests'
import type { UserProfile } from '../../services/profile'
import { Mosaico } from '../ui/Mosaico'

// A contagem de pedidos vem da mesma consulta do histórico (mesma chave no TanStack Query),
// por isso não há um segundo pedido à API.
export function EstatisticasDaConta({ profile }: { profile: UserProfile }) {
  const { data: requests } = useMyServiceRequests()
  const totalDePedidos = requests?.length ?? 0

  return (
    <div className="flex gap-2.5 pt-1">
      <Mosaico value={totalDePedidos} label={totalDePedidos === 1 ? 'Pedido' : 'Pedidos'} />
      <Mosaico value={profile.role === 'PROFESSIONAL' ? 'Pro' : 'Cliente'} label="Papel" />
      <Mosaico value={new Date(profile.created_at).getFullYear()} label="Ativo desde" />
    </div>
  )
}
