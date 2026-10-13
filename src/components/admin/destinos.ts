export interface DestinoDeAdmin {
  to: string
  rotulo: string
  descricao: string
}

// Uma só lista para a navegação entre ecrãs e para a grelha de atalhos do dashboard: um
// ecrã novo de admin entra aqui e aparece nos dois sítios. `/admin` (a visão geral) não
// está na lista porque é de onde se parte, não um destino.
export const DESTINOS_DE_ADMIN: DestinoDeAdmin[] = [
  { to: '/admin/kyc', rotulo: 'Verificações', descricao: 'Identidades por rever' },
  { to: '/admin/utilizadores', rotulo: 'Utilizadores', descricao: 'Contas, estados e moderação' },
  { to: '/admin/pedidos-servico', rotulo: 'Pedidos', descricao: 'Todos os pedidos de serviço' },
  { to: '/admin/subscricoes', rotulo: 'Subscrições', descricao: 'Quem expira, pagamentos e suspensões' },
  { to: '/admin/moderacao', rotulo: 'Moderação', descricao: 'Denúncias e conteúdo ocultado' },
  { to: '/admin/servicos', rotulo: 'Serviços', descricao: 'Categorias e palavras de pesquisa' },
  { to: '/admin/metricas', rotulo: 'Métricas', descricao: 'Números da plataforma' },
  { to: '/admin/audit-log', rotulo: 'Auditoria', descricao: 'Registo de acções e alertas' },
]
