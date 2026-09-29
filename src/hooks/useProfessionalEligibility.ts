import { useOwnKyc } from './useKyc'
import { useMySubscription } from './useSubscription'

export interface ProfessionalEligibility {
  isLoading: boolean
  isError: boolean
  kycApproved: boolean
  subscriptionActive: boolean
  eligible: boolean
}

// Espelho, só para a UI, da regra que o backend aplica em
// POST /service_requests/:id/assign e GET /service_requests/:id/contact (TRD Secção 5,
// Adendo v1.12): KYC APPROVED **e** subscrição ativa. Serve para explicar o que falta
// ANTES de o profissional tocar em "Aceitar pedido" — a decisão continua a ser do
// backend, que devolve 403 com a mesma explicação se esta leitura estiver
// desatualizada (ex. a subscrição expirou há um minuto).
export function useProfessionalEligibility(): ProfessionalEligibility {
  const kyc = useOwnKyc()
  const subscription = useMySubscription()

  const kycApproved = kyc.data?.status === 'APPROVED'
  const subscriptionActive = subscription.data?.status === 'ACTIVE'

  return {
    isLoading: kyc.isLoading || subscription.isLoading,
    isError: kyc.isError || subscription.isError,
    kycApproved,
    subscriptionActive,
    eligible: kycApproved && subscriptionActive,
  }
}
