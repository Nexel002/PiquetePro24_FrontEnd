import type { PaymentTransactionStatus } from '../../../services/subscriptions'

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeZone: 'Africa/Maputo' })

// Uma subscrição sem pagamento não tem data de expiração: mostra-se «—», não «Invalid Date».
export const formatarData = (iso: string | null) => (iso ? dataFormatter.format(new Date(iso)) : '—')

// Partilhado pelo badge de cada pagamento e pelas opções do filtro de estado.
export const ESTADOS_DE_PAGAMENTO: Record<PaymentTransactionStatus, { rotulo: string; variante: 'approved' | 'rejected' | 'pending' }> = {
  PENDING: { rotulo: 'Pendente', variante: 'pending' },
  CONFIRMED: { rotulo: 'Confirmado', variante: 'approved' },
  FAILED: { rotulo: 'Falhado', variante: 'rejected' },
}
