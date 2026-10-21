import { api } from '../lib/api'

// Fase 40 (TRD Adendo v1.66, N6): locais guardados do cliente («Sede», «Loja da Baixa», «Casa»).
// Espelha clientLocationService.ts do backend (Fase 33).
export const MAX_LOCAIS_POR_CLIENTE = 20

export interface ClientLocation {
  id: string
  label: string
  province: string
  district: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
}

export interface ClientLocationInput {
  label: string
  province: string
  district?: string
  neighborhood?: string
  latitude?: number
  longitude?: number
}

export async function fetchClientLocations(): Promise<ClientLocation[]> {
  const response = await api.get<ClientLocation[]>('/clients/me/locations')
  return response.data
}

export async function createClientLocation(input: ClientLocationInput): Promise<ClientLocation> {
  const response = await api.post<ClientLocation>('/clients/me/locations', input)
  return response.data
}

export async function deleteClientLocation(id: string): Promise<void> {
  await api.delete(`/clients/me/locations/${id}`)
}

// GET /service_requests/export — os pedidos do próprio cliente em CSV (contabilidade de uma empresa).
export async function exportMyRequests(filtros: { from?: string; to?: string }): Promise<{ conteudo: Blob; nome: string; linhas: number }> {
  const resposta = await api.get<Blob>('/service_requests/export', { params: filtros, responseType: 'blob' })
  const cabecalhos = resposta.headers as Record<string, string | undefined>
  return {
    conteudo: resposta.data,
    nome: /filename="([^"]+)"/.exec(cabecalhos['content-disposition'] ?? '')?.[1] ?? 'os-meus-pedidos.csv',
    linhas: Number(cabecalhos['x-linhas'] ?? 0),
  }
}
