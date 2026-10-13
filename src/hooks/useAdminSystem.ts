import { useQuery } from '@tanstack/react-query'
import { fetchEstadoDeSistema } from '../services/adminSystem'

// 30 s: o ecrã serve para ver se algo caiu agora. Mais depressa só carregava a base de dados
// de quem o deixa aberto num separador.
export function useEstadoDeSistema() {
  return useQuery({ queryKey: ['admin-system-status'], queryFn: fetchEstadoDeSistema, refetchInterval: 30_000 })
}
