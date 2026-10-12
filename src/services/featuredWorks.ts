import { api } from '../lib/api'

// Espelha FeaturedWork de PiquePro24_Backend/src/services/featuredWorksService.ts.
export interface FeaturedWork {
  // Id do trabalho do portfólio.
  id: string
  title: string
  professional_id: string
  professional_name: string
  professional_avatar: string | null
  service_slug: string
  service_name: string
  // «Província · Distrito» — o backend nunca devolve o bairro nem coordenadas.
  location: string
  rating_avg: number | null
  rating_count: number
  completed_jobs_count: number
  // null quando não há nada verdadeiro a dizer: o cartão fica sem selo.
  badge: 'Top Avaliado' | 'Verificado' | null
  image_url: string
}

// Tecto do backend (featuredWorksQuerySchema). A Home reparte esta lista por temas, por isso
// pede-se uma vez só e filtra-se no cliente.
export const FEATURED_WORKS_LIMIT = 40

// GET /portfolio/featured — autenticado (a Home sem sessão não o chama).
export async function fetchFeaturedWorks(): Promise<FeaturedWork[]> {
  const response = await api.get<FeaturedWork[]>('/portfolio/featured', { params: { limit: FEATURED_WORKS_LIMIT } })
  return response.data
}
