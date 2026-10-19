import type { NomeDoIconeDeAdmin } from '../estrutura/icones'

export interface SeccaoDoPainel {
  to: string
  rotulo: string
  icone: NomeDoIconeDeAdmin
}

export interface GrupoDoPainel {
  rotulo: string
  seccoes: SeccaoDoPainel[]
}

// O menu lateral do painel. Cinco secções; o que cada uma tem dentro são separadores
// (`?tab=`), não entradas de menu — como no ControlCore, onde o menu tem uma entrada por
// matéria e as subsecções vivem na própria página. As rotas antigas de cada ferramenta
// redireccionam para o separador respectivo (ver App.tsx).
export const GRUPOS_DO_PAINEL: GrupoDoPainel[] = [
  {
    rotulo: 'Operação',
    seccoes: [
      { to: '/admin/kyc', rotulo: 'Revisão de KYC', icone: 'escudo' },
      { to: '/admin/utilizadores', rotulo: 'Utilizadores', icone: 'grupo' },
      { to: '/admin/pedidos-servico', rotulo: 'Pedidos', icone: 'prancheta' },
    ],
  },
  {
    rotulo: 'Gestão',
    seccoes: [
      { to: '/admin/visao-geral', rotulo: 'Visão Geral', icone: 'grelha' },
      { to: '/admin/mais', rotulo: 'Mais', icone: 'pontos' },
    ],
  },
]

export const SECCOES_DO_PAINEL = GRUPOS_DO_PAINEL.flatMap((grupo) => grupo.seccoes)
