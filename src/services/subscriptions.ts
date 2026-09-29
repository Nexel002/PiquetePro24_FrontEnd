import { api } from '../lib/api'

// Espelha os tipos de src/services/subscriptionService.ts e
// src/services/payments/paymentProvider.ts do backend (Fase 5, TRD Adendo v1.12).
export type SubscriptionStatus = 'INACTIVE' | 'ACTIVE' | 'EXPIRED'
export type PaymentGateway = 'MPESA_MOCK' | 'EMOLA_MOCK' | 'MANUAL'
export type PaymentTransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED'

export interface Subscription {
  id: string
  professional_id: string
  amount: number
  status: SubscriptionStatus
  gateway: PaymentGateway | null
  starts_at: string | null
  expires_at: string | null
  created_at: string
}

export interface PaymentTransaction {
  id: string
  subscription_id: string
  professional_id: string
  gateway: PaymentGateway
  payer_phone: string | null
  amount: number
  status: PaymentTransactionStatus
  provider_reference: string | null
  created_at: string
  confirmed_at: string | null
}

export interface SubscriptionSummary {
  // Estado efetivo, calculado pelo backend a partir das datas — não é a coluna crua.
  status: SubscriptionStatus
  valid_until: string | null
  latest_transaction: PaymentTransaction | null
  plan: { amount: number; currency: 'MZN'; duration_days: number }
  // false em produção enquanto não há integração M-Pesa/e-Mola real: a ativação é
  // feita pela equipa (ativação manual pelo ADMIN).
  payments_available: boolean
  gateways: PaymentGateway[]
  // Sem KYC aprovado não se pode pagar (Adendo v1.12, item F).
  kyc_approved: boolean
}

export interface InitiateSubscriptionPayload {
  gateway: Exclude<PaymentGateway, 'MANUAL'>
  // Só os 9 dígitos locais (ex. 841234567) — o backend aceita com ou sem 258 e
  // normaliza.
  phone: string
}

export interface InitiatedSubscription {
  subscription: Subscription
  transaction: PaymentTransaction
}

// GET /subscriptions — só PROFESSIONAL.
export async function fetchMySubscription(): Promise<SubscriptionSummary> {
  const response = await api.get<SubscriptionSummary>('/subscriptions')
  return response.data
}

// POST /subscriptions — responde 202: o pagamento foi PEDIDO (o telemóvel do pagador
// recebe o pedido de PIN), não concluído. A confirmação chega por webhook ao backend;
// o frontend acompanha por polling a GET /subscriptions (ver useMySubscription).
export async function initiateSubscription(payload: InitiateSubscriptionPayload): Promise<InitiatedSubscription> {
  const response = await api.post<InitiatedSubscription>('/subscriptions', payload)
  return response.data
}

// GET /admin/users/:id/subscription — mesmo resumo, para a ficha de utilizador do admin.
export async function fetchUserSubscription(userId: string): Promise<SubscriptionSummary> {
  const response = await api.get<SubscriptionSummary>(`/admin/users/${userId}/subscription`)
  return response.data
}

// POST /admin/users/:id/subscription — ativação manual (pagamento recebido por fora);
// a nota é obrigatória e fica no audit log como prova.
export async function activateSubscriptionManually(userId: string, note: string): Promise<Subscription> {
  const response = await api.post<Subscription>(`/admin/users/${userId}/subscription`, { note })
  return response.data
}
