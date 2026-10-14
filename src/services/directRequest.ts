import { api } from '../lib/api'
import type { ServiceRequest, ServiceRequestLocationInput } from './serviceRequests'

// Espelha directRequestService.ts do backend (Fase 29).
export interface DirectRequestPayload {
  professional_id: string
  category_id: string
  title: string
  description?: string
  location: ServiceRequestLocationInput
}

// O contacto de quem o cliente escolheu: é o da empresa, se for uma empresa. `phone` é null se a
// conta não completou o telefone.
export interface DirectRequestProfessional {
  id: string
  full_name: string
  phone: string | null
}

export interface DirectRequestResult {
  request: ServiceRequest
  professional: DirectRequestProfessional
}

// POST /service_requests/direct. O número do profissional só sai daqui (ou de
// GET /service_requests/:id/professional, para o dono do pedido): clicar em «Solicitar serviço» é
// o que regista o pedido. A chave de idempotência evita um segundo pedido se a resposta se perder
// e o cliente voltar a carregar. Sem fila offline: o número exige o servidor.
export async function createDirectRequest(payload: DirectRequestPayload, idempotencyKey: string): Promise<DirectRequestResult> {
  const response = await api.post<DirectRequestResult>('/service_requests/direct', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
    timeout: 20_000,
  })
  return response.data
}
