import { api } from '../lib/api'

// Espelha o enum request_status do backend
// (supabase/migrations/20260915135236_schema_inicial.sql).
export type RequestStatus = 'OPEN' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED'

export interface ServiceRequest {
  id: string
  client_id: string
  professional_id: string | null
  title: string
  description: string | null
  status: RequestStatus
  province: string
  district: string | null
  neighborhood: string | null
  created_at: string
  assigned_at: string | null
  completed_at: string | null
}

export interface NearbyServiceRequest {
  id: string
  client_id: string
  title: string
  description: string | null
  province: string
  district: string | null
  neighborhood: string | null
  created_at: string
  distance_m: number
}

export type ServiceRequestLocationInput =
  | { latitude: number; longitude: number; province: string; district?: string; neighborhood?: string }
  | { province: string; district?: string; neighborhood?: string }

export interface CreateServiceRequestPayload {
  title: string
  description?: string
  location: ServiceRequestLocationInput
}

export interface NearbyServiceRequestsParams {
  latitude: number
  longitude: number
  radiusKm?: number
  limit?: number
  offset?: number
}

// POST /service_requests (Backend Fase 3) — cliente cria um pedido, status inicial OPEN.
export async function createServiceRequest(payload: CreateServiceRequestPayload): Promise<ServiceRequest> {
  const response = await api.post<ServiceRequest>('/service_requests', payload)
  return response.data
}

// GET /service_requests (Backend TRD Adendo v1.5, item A) — os próprios pedidos do
// cliente autenticado, qualquer estado, sem paginação.
export async function fetchMyServiceRequests(): Promise<ServiceRequest[]> {
  const response = await api.get<ServiceRequest[]>('/service_requests')
  return response.data
}

// GET /service_requests/nearby (Backend Fase 3) — pedidos OPEN próximos, para
// profissionais escolherem qual atribuir a si próprios.
export async function fetchNearbyServiceRequests(
  params: NearbyServiceRequestsParams,
): Promise<NearbyServiceRequest[]> {
  const response = await api.get<NearbyServiceRequest[]>('/service_requests/nearby', {
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

// POST /service_requests/:id/assign — o profissional autenticado atribui-se a si
// próprio; o backend garante atomicidade (só um profissional ganha, ver
// serviceRequestService.ts no backend).
export async function assignServiceRequest(requestId: string): Promise<ServiceRequest> {
  const response = await api.post<ServiceRequest>(`/service_requests/${requestId}/assign`)
  return response.data
}

// POST /service_requests/:id/complete — só o client_id do pedido pode concluir
// (backend valida ownership; 403 para qualquer outro utilizador).
export async function completeServiceRequest(requestId: string): Promise<ServiceRequest> {
  const response = await api.post<ServiceRequest>(`/service_requests/${requestId}/complete`)
  return response.data
}

// POST /service_requests/:id/cancel — só o client_id do pedido pode cancelar, em
// qualquer estado não terminal (OPEN ou ASSIGNED).
export async function cancelServiceRequest(requestId: string): Promise<ServiceRequest> {
  const response = await api.post<ServiceRequest>(`/service_requests/${requestId}/cancel`)
  return response.data
}
