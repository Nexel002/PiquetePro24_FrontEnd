import { api } from '../lib/api'

// Espelha FeaturedWork de PiquePro24_Backend/src/services/featuredWorksService.ts.
export interface FeaturedWork {
  // Id do trabalho do portfólio (não o do profissional: a resposta é pública e não o inclui).
  id: string
  title: string
  // Abreviado pelo backend: «Carlos M.».
  professional_name: string
  service_slug: string
  service_name: string
  // «Província · Distrito» — o backend nunca devolve o bairro nem coordenadas.
  location: string
  rating_avg: number | null
  rating_count: number
  completed_jobs_count: number
  // Só há profissionais com KYC aprovado, por isso há sempre um selo verdadeiro.
  badge: 'Top Avaliado' | 'Verificado'
  image_url: string
}

// Tecto do backend (featuredWorksQuerySchema). A Home reparte esta lista por temas, por isso
// pede-se uma vez só e filtra-se no cliente.
export const FEATURED_WORKS_LIMIT = 40

// GET /portfolio/featured — PÚBLICO: é a montra da Home, vista também por visitantes sem sessão.
export async function fetchFeaturedWorks(): Promise<FeaturedWork[]> {
  const response = await api.get<FeaturedWork[]>('/portfolio/featured', { params: { limit: FEATURED_WORKS_LIMIT } })
  return response.data
}
