import { api } from '../lib/api'
import type { ProfessionalType } from './profile'
import type { ServiceCategory } from './serviceCategories'

export interface SearchedProfessional {
  id: string
  full_name: string
  professional_type: ProfessionalType | null
  avatar_url: string | null
  services: ServiceCategory[]
  rating_avg: number | null
  rating_count: number
  // null quando não há localização do cliente (recusou o GPS) ou do profissional —
  // o cartão aparece na mesma, só sem distância. Vem arredondada pelo backend (500 m
  // perto, km inteiro longe — Adendo v1.15, item C): nunca é a distância exata.
  distance_m: number | null
  is_nearby: boolean
}

export interface SearchProfessionalsParams {
  q?: string
  category?: string
  latitude?: number
  longitude?: number
  limit: number
  offset: number
}

// Mesmos tectos do backend (searchQuerySchema): o ecrã não oferece mais do que isto.
export const SEARCH_PAGE_SIZE = 20
export const SEARCH_MAX_OFFSET = 500

// GET /professionals/search (Backend Fase 11, TRD Adendo v1.18) — sem raio: lista
// também os que não estão perto, os mais próximos primeiro.
export async function searchProfessionals(params: SearchProfessionalsParams): Promise<SearchedProfessional[]> {
  const response = await api.get<SearchedProfessional[]>('/professionals/search', {
    params: {
      q: params.q || undefined,
      category: params.category || undefined,
      latitude: params.latitude,
      longitude: params.longitude,
      limit: params.limit,
      offset: params.offset,
    },
  })
  return response.data
}
