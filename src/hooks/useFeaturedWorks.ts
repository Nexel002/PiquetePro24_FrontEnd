import { useQuery } from '@tanstack/react-query'
import { fetchFeaturedWorks } from '../services/featuredWorks'

export function useFeaturedWorks() {
  return useQuery({
    queryKey: ['portfolio', 'featured'],
    queryFn: fetchFeaturedWorks,
    // Sem `enabled`: a rota é pública e a Home mostra a montra também a visitantes.
    // A montra muda devagar (um trabalho novo, uma avaliação) e é a primeira coisa que se abre:
    // 5 minutos evitam repetir o pedido a cada regresso à Home.
    staleTime: 5 * 60 * 1000,
  })
}
