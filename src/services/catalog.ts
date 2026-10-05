import { api } from '../lib/api'
import type { PortfolioPhoto } from './portfolio'
import type { ProfessionalType } from './profile'
import type { ServiceCategory } from './serviceCategories'

export interface Review {
  id: string
  service_request_id: string
  professional_id: string
  client_id: string
  client_full_name: string
  rating: number
  comment: string | null
  created_at: string
}

export interface ProfessionalCatalog {
  id: string
  full_name: string
  avatar_url: string | null
  professional_type: ProfessionalType | null
  bio: string | null
  services: ServiceCategory[]
  portfolio: PortfolioPhoto[]
  rating_avg: number | null
  rating_count: number
  reviews: Review[]
}

// GET /professionals/:id/catalog (Fase 9, TRD Adendo v1.17) — só para utilizadores
// autenticados (sem link público, decisão do utilizador); qualquer role, tanto um
// CLIENT a ver um profissional como o próprio PROFESSIONAL a pré-visualizar o que
// editou (MyCatalog.tsx chama isto com o próprio id).
export async function fetchProfessionalCatalog(professionalId: string): Promise<ProfessionalCatalog> {
  const response = await api.get<ProfessionalCatalog>(`/professionals/${professionalId}/catalog`)
  return response.data
}
