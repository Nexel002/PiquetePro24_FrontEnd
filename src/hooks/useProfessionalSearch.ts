import { useInfiniteQuery } from '@tanstack/react-query'
import { SEARCH_MAX_OFFSET, SEARCH_PAGE_SIZE, searchProfessionals } from '../services/professionalSearch'
import { useAuth } from '../store/AuthContext'

interface SearchFilters {
  q: string
  category: string
  coordinates: { latitude: number; longitude: number } | null
}

// Paginação por offset (o backend não devolve total): uma página com menos de
// SEARCH_PAGE_SIZE linhas é a última, e o offset nunca passa do tecto do backend.
export function useProfessionalSearch(filters: SearchFilters) {
  const { session } = useAuth()

  return useInfiniteQuery({
    queryKey: ['professionals', 'search', filters.q, filters.category, filters.coordinates],
    queryFn: ({ pageParam }) =>
      searchProfessionals({
        q: filters.q,
        category: filters.category,
        latitude: filters.coordinates?.latitude,
        longitude: filters.coordinates?.longitude,
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
