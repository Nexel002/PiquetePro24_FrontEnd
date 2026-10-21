import { api } from '../lib/api'

// Fase 39 (TRD Adendo v1.66, N4): «Avisa-me quando houver». Espelha searchDemandService.ts do
// backend (Fase 32): um aviso pendente por serviço e província; depois de enviado (`notified_at`),
// o cliente pode pedir outro.
export interface SearchAlert {
  id: string
  category: { id: string; slug: string; name: string }
  province: string
  created_at: string
  notified_at: string | null
}

export async function fetchSearchAlerts(): Promise<SearchAlert[]> {
  const response = await api.get<SearchAlert[]>('/search-alerts')
  return response.data
}

export async function createSearchAlert(input: { category_id: string; province: string }): Promise<SearchAlert> {
  const response = await api.post<SearchAlert>('/search-alerts', input)
  return response.data
}

export async function deleteSearchAlert(id: string): Promise<void> {
  await api.delete(`/search-alerts/${id}`)
}
