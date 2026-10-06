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
  // Serviço pedido (Fase 10, Bloco B) — null nos pedidos abertos antigos.
  category_id: string | null
  // Só vêm preenchidos em fetchMyServiceRequests, para pedidos dirigidos: a quantos
  // profissionais foi enviado e quantas propostas já chegaram (0 num pedido aberto).
  invited_count?: number
  proposal_count?: number
  // Só vem preenchido em fetchMyServiceRequests (Fase 9) — indica se o pedido já tem
  // avaliação do cliente, para decidir se mostra o formulário. undefined nos outros
  // endpoints (ex. fetchAssignedServiceRequests, do lado do profissional).
  has_review?: boolean
}

// Sem client_id desde a Fase 6 do backend (TRD Adendo v1.15, item C): não é preciso para
// aceitar o pedido e permitia correlacionar os pedidos de um mesmo cliente. distance_m
// vem arredondada para cima a múltiplos de 500 m.
export interface NearbyServiceRequest {
  id: string
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
  // Pedido dirigido (Backend Fase 11, Adendo v1.18): vêm juntos ou não vêm. Sem eles é o
  // pedido aberto de sempre.
  category_id?: string
  professional_ids?: string[]
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

// GET /service_requests/assigned (Backend TRD Adendo v1.12, item G) — os pedidos que o
// profissional autenticado aceitou, qualquer estado. É o caminho de volta a um pedido
// aceite e ao contacto do cliente.
export async function fetchAssignedServiceRequests(): Promise<ServiceRequest[]> {
  const response = await api.get<ServiceRequest[]>('/service_requests/assigned')
  return response.data
}

export interface ReviewPayload {
  rating: number
  comment?: string
}

export interface CreatedReview {
  id: string
  service_request_id: string
  professional_id: string
  client_id: string
  rating: number
  comment: string | null
  created_at: string
}

// POST /service_requests/:id/review (Fase 9, TRD Adendo v1.17) — só o client_id do
// pedido pode avaliar, e só depois de COMPLETED (backend valida; 400/403/409 chegam
// como Error com a mensagem do backend).
export async function submitServiceRequestReview(requestId: string, payload: ReviewPayload): Promise<CreatedReview> {
  const response = await api.post<CreatedReview>(`/service_requests/${requestId}/review`, payload)
  return response.data
}

export interface ServiceRequestContact {
  request_id: string
  client_name: string
  // null quando o cliente se registou via Google e ainda não completou o telefone.
  client_phone: string | null
  province: string
  district: string | null
  neighborhood: string | null
  // null quando o pedido foi criado com a hierarquia manual (sem GPS).
  latitude: number | null
  longitude: number | null
}

// GET /service_requests/:id/contact (Backend TRD Adendo v1.12, item B) — só para o
// profissional atribuído, com o pedido ASSIGNED, KYC APPROVED e subscrição em vigor.
// Qualquer falha dessas condições chega como Error com a mensagem do backend (403/409).
export async function fetchServiceRequestContact(requestId: string): Promise<ServiceRequestContact> {
  const response = await api.get<ServiceRequestContact>(`/service_requests/${requestId}/contact`)
  return response.data
}
