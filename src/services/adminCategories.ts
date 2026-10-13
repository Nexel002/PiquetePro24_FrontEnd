import { api } from '../lib/api'

// Espelha adminCategoryService.ts do backend (Fase 19).
export interface AdminCategory {
  id: string
  slug: string
  name: string
  keywords: string[]
  professional_count: number
}

export interface CategoryInput {
  name: string
  keywords: string[]
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const response = await api.get<AdminCategory[]>('/admin/service-categories')
  return response.data
}

export async function createAdminCategory(input: CategoryInput): Promise<AdminCategory> {
  const response = await api.post<AdminCategory>('/admin/service-categories', input)
  return response.data
}

export async function updateAdminCategory(id: string, input: Partial<CategoryInput>): Promise<AdminCategory> {
  const response = await api.patch<AdminCategory>(`/admin/service-categories/${id}`, input)
  return response.data
}

export async function deleteAdminCategory(id: string): Promise<void> {
  await api.delete(`/admin/service-categories/${id}`)
}

// «canalizador, encanador» → ['canalizador', 'encanador']. O backend normaliza (minúsculas, sem
// acentos); aqui só se separa e limpa.
export function palavrasChaveDe(texto: string): string[] {
  return texto
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
}
