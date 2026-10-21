import { useInfiniteQuery } from '@tanstack/react-query'
import { SEARCH_MAX_OFFSET, SEARCH_PAGE_SIZE, searchProfessionals } from '../services/professionalSearch'
import { useAuth } from '../store/AuthContext'
import { MOZAMBIQUE_PROVINCES } from '../lib/provinces'

interface SearchFilters {
  q: string
  category: string
  coordinates: { latitude: number; longitude: number } | null
  // Fase 38 (N1): província do perfil, usada só quando não há coordenadas.
  province?: string | null
}

// Paginação por offset (o backend não devolve total): uma página com menos de
// SEARCH_PAGE_SIZE linhas é a última, e o offset nunca passa do tecto do backend.
export function useProfessionalSearch(filters: SearchFilters) {
  const { session } = useAuth()
  // Com GPS, a origem chega; sem ele, a província do perfil diz ao backend que profissionais
  // atendem a zona do cliente. Só uma das 11: o backend recusa outro texto (400).
  const provinciaSemGps =
    filters.coordinates === null && filters.province && (MOZAMBIQUE_PROVINCES as readonly string[]).includes(filters.province)
      ? filters.province
      : undefined

  return useInfiniteQuery({
    queryKey: ['professionals', 'search', filters.q, filters.category, filters.coordinates, provinciaSemGps],
    queryFn: ({ pageParam }) =>
      searchProfessionals({
        q: filters.q,
        category: filters.category,
        latitude: filters.coordinates?.latitude,
        longitude: filters.coordinates?.longitude,
        province: provinciaSemGps,
        limit: SEARCH_PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastOffset) => {
      const next = lastOffset + SEARCH_PAGE_SIZE
      return lastPage.length < SEARCH_PAGE_SIZE || next > SEARCH_MAX_OFFSET ? undefined : next
    },
    enabled: session !== null,
  })
}
