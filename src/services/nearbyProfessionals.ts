import { api } from '../lib/api'
import type { ProfessionalType } from './profile'

export interface NearbyProfessional {
  id: string
  full_name: string
  professional_type: ProfessionalType | null
  avatar_url: string | null
  distance_m: number
}

export interface NearbyProfessionalsParams {
  latitude: number
  longitude: number
  radiusKm?: number
  limit?: number
  offset?: number
}

// GET /professionals/nearby (Backend Fase 3) — busca por raio via PostGIS, cache Redis
// no backend, transparente para o frontend (mesma resposta com ou sem cache hit).
export async function fetchNearbyProfessionals(params: NearbyProfessionalsParams): Promise<NearbyProfessional[]> {
  const response = await api.get<NearbyProfessional[]>('/professionals/nearby', {
    params: {
      latitude: params.latitude,
      longitude: params.longitude,
      radius_km: params.radiusKm,
      limit: params.limit,
      offset: params.offset,
    },
  })
  return response.data
}
