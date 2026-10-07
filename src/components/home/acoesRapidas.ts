import type { UserRole } from '../../services/profile'

export interface AccaoRapida {
  to: string
  rotulo: string
  descricao: string
}

// Dados e não JSX: acrescentar ou reordenar um atalho é mexer numa linha, e a
// apresentação (HomeShortcuts) deixa de ter um ramo por papel.
export const ACCOES_RAPIDAS: Record<UserRole, AccaoRapida[]> = {
  ADMIN: [
    { to: '/admin/kyc', rotulo: 'Painel Admin', descricao: 'Verificações de identidade pendentes' },
    { to: '/admin/utilizadores', rotulo: 'Utilizadores', descricao: 'Contas, estados e moderação' },
    { to: '/admin/pedidos-servico', rotulo: 'Pedidos', descricao: 'Todos os pedidos de serviço' },
  ],
  PROFESSIONAL: [
    { to: '/pedidos-recebidos', rotulo: 'Pedidos Recebidos', descricao: 'Convites à espera da tua proposta' },
    { to: '/catalogo', rotulo: 'O Meu Catálogo', descricao: 'Fotos, serviços e avaliações' },
    { to: '/subscricao', rotulo: 'Subscrição', descricao: 'Estado e renovação do plano' },
  ],
  CLIENT: [
    { to: '/profissionais', rotulo: 'Novo Pedido', descricao: 'Pede a 3 profissionais de uma vez' },
    { to: '/os-meus-pedidos', rotulo: 'Os Meus Pedidos', descricao: 'Acompanha propostas e estados' },
    { to: '/os-meus-profissionais', rotulo: 'Os Meus Profissionais', descricao: 'Quem já trabalhou contigo' },
  ],
}
