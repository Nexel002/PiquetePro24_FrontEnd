import { api } from '../lib/api'
import type { RequestStatus, ServiceRequest } from './serviceRequests'

// Espelha o enum invitation_status do backend (migration 20261006090000_convites_e_propostas).
export type InvitationStatus = 'INVITED' | 'PROPOSED' | 'DECLINED' | 'CHOSEN' | 'NOT_CHOSEN'

// Quantos profissionais recebem cada pedido (Backend Fase 11, TRD Adendo v1.18, item C):
// exatamente 3, ou todos os que existirem se o serviço tiver menos. O backend impõe-no;
// aqui serve para o ecrã de pesquisa saber quando deixa enviar.
export const INVITATIONS_PER_REQUEST = 3

export interface Eligibility {
  kyc_approved: boolean
  subscription_active: boolean
  eligible: boolean
}

export interface Invitation {
  service_request_id: string
  status: InvitationStatus
  proposal_price: number | null
  proposal_message: string | null
  responded_at: string | null
  created_at: string
  request: {
    title: string
    description: string | null
    status: RequestStatus
    province: string
    district: string | null
    neighborhood: string | null
    created_at: string
  }
}

export interface MyInvitations {
  eligibility: Eligibility
  invitations: Invitation[]
}

export interface SubmitProposalPayload {
  price: number
  message?: string
}

export interface Proposal {
  professional_id: string
  full_name: string
  avatar_url: string | null
  rating_avg: number | null
  rating_count: number
  status: InvitationStatus
  proposal_price: number
  proposal_message: string | null
  responded_at: string | null
}

export interface RequestProposals {
  request_status: RequestStatus
  invited_count: number
  proposals: Proposal[]
}

export interface ChosenProfessional {
  professional_id: string
  full_name: string
  // null quando o profissional ainda não completou o onboarding do telefone.
  phone: string | null
}

// GET /service_requests/invitations — convites do profissional + se já pode responder.
export async function fetchMyInvitations(): Promise<MyInvitations> {
  const response = await api.get<MyInvitations>('/service_requests/invitations')
  return response.data
}

// POST /service_requests/:id/proposal — exige KYC aprovado e subscrição ativa (403 com
// a mensagem do que falta, que o interceptor entrega em Error.message).
export async function submitProposal(requestId: string, payload: SubmitProposalPayload): Promise<void> {
  await api.post(`/service_requests/${requestId}/proposal`, payload)
}

export async function declineInvitation(requestId: string): Promise<void> {
  await api.post(`/service_requests/${requestId}/decline`)
}

// GET /service_requests/:id/proposals — só o dono do pedido; já vem ordenado por preço.
export async function fetchRequestProposals(requestId: string): Promise<RequestProposals> {
  const response = await api.get<RequestProposals>(`/service_requests/${requestId}/proposals`)
  return response.data
}

// POST /service_requests/:id/choose — atómico no backend: duas escolhas ao mesmo tempo
// não atribuem duas vezes (a segunda recebe 409).
export async function chooseProposal(requestId: string, professionalId: string): Promise<ServiceRequest> {
  const response = await api.post<ServiceRequest>(`/service_requests/${requestId}/choose`, {
    professional_id: professionalId,
  })
  return response.data
}

// GET /service_requests/:id/professional — o telefone só é revelado depois de escolher
// (409 antes disso) — extensão da Secção 5 do TRD, Adendo v1.18, item D.
export async function fetchChosenProfessional(requestId: string): Promise<ChosenProfessional> {
  const response = await api.get<ChosenProfessional>(`/service_requests/${requestId}/professional`)
  return response.data
}
