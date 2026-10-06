import { useQuery } from '@tanstack/react-query'
import { fetchWorkedWithProfessionals } from '../services/clientHistory'
import { useAuth } from '../store/AuthContext'

// Exportada para quem muda o que esta lista mostra (concluir um pedido, avaliar) a invalidar.
export const workedWithProfessionalsKey = ['clients', 'me', 'professionals'] as const

export function useWorkedWithProfessionals() {
  const { session } = useAuth()

  return useQuery({
    queryKey: workedWithProfessionalsKey,
    queryFn: fetchWorkedWithProfessionals,
    enabled: session !== null,
  })
}
