import type { UserRole } from '../../services/profile'

export const ROTULO_PAPEL: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Administrador',
}

// A ligação que cada papel mais usa. Aparece em texto na barra (ecrã largo) e dentro do
// menu do avatar (onde a barra já não tem espaço para ela).
export const LIGACAO_DO_PAPEL: Record<UserRole, { to: string; rotulo: string }> = {
  CLIENT: { to: '/os-meus-pedidos', rotulo: 'Os meus pedidos' },
  PROFESSIONAL: { to: '/pedidos-recebidos', rotulo: 'Pedidos recebidos' },
  ADMIN: { to: '/admin/kyc', rotulo: 'Painel admin' },
}
