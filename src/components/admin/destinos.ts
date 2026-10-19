import { noSeparador, rotaDaAuditoria, SECCAO_KYC, SECCAO_MAIS, SECCAO_PEDIDOS, SECCAO_UTILIZADORES, SECCAO_VISAO_GERAL } from './layout/rotas'

export interface DestinoDeAdmin {
  to: string
  rotulo: string
  descricao: string
}

// A grelha de atalhos do Painel: cada ferramenta do painel, a apontar para a secção e o
// separador onde vive. O menu lateral (layout/seccoes.ts) só tem as cinco secções; aqui está
// cada ferramenta pelo nome, para quem procura «Comunicados» não ter de saber que está em «Mais».
export const DESTINOS_DE_ADMIN: DestinoDeAdmin[] = [
  { to: SECCAO_KYC, rotulo: 'Verificações', descricao: 'Identidades por rever' },
  { to: SECCAO_UTILIZADORES, rotulo: 'Utilizadores', descricao: 'Contas, estados e moderação' },
  { to: SECCAO_PEDIDOS, rotulo: 'Pedidos', descricao: 'Todos os pedidos de serviço' },
  { to: noSeparador(SECCAO_MAIS, 'subscricoes'), rotulo: 'Subscrições', descricao: 'Quem expira, pagamentos e suspensões' },
  { to: noSeparador(SECCAO_MAIS, 'moderacao'), rotulo: 'Moderação', descricao: 'Denúncias e conteúdo ocultado' },
  { to: noSeparador(SECCAO_MAIS, 'servicos'), rotulo: 'Serviços', descricao: 'Categorias e palavras de pesquisa' },
  { to: noSeparador(SECCAO_MAIS, 'comunicados'), rotulo: 'Comunicados', descricao: 'Avisos por email a grupos de utilizadores' },
  { to: noSeparador(SECCAO_VISAO_GERAL, 'relatorios'), rotulo: 'Relatórios', descricao: 'Funil de profissionais e exportações CSV' },
  { to: noSeparador(SECCAO_MAIS, 'seguranca'), rotulo: 'Segurança', descricao: 'Verificação em dois passos da tua conta' },
  { to: noSeparador(SECCAO_VISAO_GERAL, 'sistema'), rotulo: 'Sistema', descricao: 'Estado da base de dados, cache e email' },
  { to: noSeparador(SECCAO_MAIS, 'administradores'), rotulo: 'Administradores', descricao: 'Quem tem acesso ao painel' },
  { to: noSeparador(SECCAO_VISAO_GERAL, 'metricas'), rotulo: 'Métricas', descricao: 'Números da plataforma' },
  { to: rotaDaAuditoria(), rotulo: 'Auditoria', descricao: 'Registo de acções e alertas' },
]
