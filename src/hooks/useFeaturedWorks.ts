import { useQuery } from '@tanstack/react-query'
import { fetchFeaturedWorks } from '../services/featuredWorks'
import { useAuth } from '../store/AuthContext'

export function useFeaturedWorks() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['portfolio', 'featured'],
    queryFn: fetchFeaturedWorks,
    // Sem sessão o backend responde 401: nem se pede (a Home explica que é preciso entrar).
    enabled: session !== null,
    // A montra muda devagar (um trabalho novo, uma avaliação) e é a primeira coisa que se abre:
    // 5 minutos evitam repetir o pedido a cada regresso à Home.
    staleTime: 5 * 60 * 1000,
  })
}
