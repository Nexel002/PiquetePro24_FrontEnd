import { api } from '../lib/api'

export interface ServiceCategory {
  id: string
  slug: string
  name: string
}

// Máximo de serviços por profissional (Backend Fase 11, TRD Adendo v1.18, item B) — o
// backend rejeita mais; aqui serve para o ecrã de edição não deixar escolher a sexta.
export const MAX_SERVICES_PER_PROFESSIONAL = 5

// GET /service-categories — lista fixa e curada (seed da migration, não editável pela app).
export async function fetchServiceCategories(): Promise<ServiceCategory[]> {
  const response = await api.get<ServiceCategory[]>('/service-categories')
  return response.data
}

// PUT /professionals/me/services — substitui o conjunto completo e devolve o conjunto final.
export async function replaceMyServices(categoryIds: string[]): Promise<ServiceCategory[]> {
  const response = await api.put<ServiceCategory[]>('/professionals/me/services', { category_ids: categoryIds })
  return response.data
}
