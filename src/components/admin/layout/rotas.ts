// Endereços das secções e dos seus separadores. Os atalhos entre ecrãs (cartões da Visão Geral,
// «Ver histórico» de um pedido, pendentes do Sistema) constroem-se daqui, para não haver um
// `?tab=` escrito à mão que deixe de bater certo quando um separador mudar de nome.

export const SECCAO_KYC = '/admin/kyc'
export const SECCAO_UTILIZADORES = '/admin/utilizadores'
export const SECCAO_PEDIDOS = '/admin/pedidos-servico'
export const SECCAO_VISAO_GERAL = '/admin/visao-geral'
export const SECCAO_MAIS = '/admin/mais'

export const SEPARADORES_DA_VISAO_GERAL = ['painel', 'metricas', 'relatorios', 'auditoria', 'sistema'] as const
export const SEPARADORES_DE_MAIS = ['subscricoes', 'moderacao', 'servicos', 'comunicados', 'administradores', 'seguranca'] as const

export type SeparadorDaVisaoGeral = (typeof SEPARADORES_DA_VISAO_GERAL)[number]
export type SeparadorDeMais = (typeof SEPARADORES_DE_MAIS)[number]

export function noSeparador(seccao: string, separador: string, filtros: Record<string, string> = {}): string {
  return `${seccao}?${new URLSearchParams({ tab: separador, ...filtros }).toString()}`
}

export const ROTA_DE_SEGURANCA = noSeparador(SECCAO_MAIS, 'seguranca')

export function rotaDaAuditoria(filtros: Record<string, string> = {}): string {
  return noSeparador(SECCAO_VISAO_GERAL, 'auditoria', filtros)
}

// Endereços de antes das secções (cada ferramenta tinha rota própria). Continuam a abrir o
// ecrã certo — há links guardados, e o aviso do segundo factor já foi para `/admin/seguranca`.
export const ROTAS_ANTIGAS: Array<{ caminho: string; seccao: string; separador: string }> = [
  { caminho: 'subscricoes', seccao: SECCAO_MAIS, separador: 'subscricoes' },
  { caminho: 'moderacao', seccao: SECCAO_MAIS, separador: 'moderacao' },
  { caminho: 'servicos', seccao: SECCAO_MAIS, separador: 'servicos' },
  { caminho: 'comunicados', seccao: SECCAO_MAIS, separador: 'comunicados' },
  { caminho: 'administradores', seccao: SECCAO_MAIS, separador: 'administradores' },
  { caminho: 'seguranca', seccao: SECCAO_MAIS, separador: 'seguranca' },
  { caminho: 'metricas', seccao: SECCAO_VISAO_GERAL, separador: 'metricas' },
  { caminho: 'relatorios', seccao: SECCAO_VISAO_GERAL, separador: 'relatorios' },
  { caminho: 'audit-log', seccao: SECCAO_VISAO_GERAL, separador: 'auditoria' },
  { caminho: 'sistema', seccao: SECCAO_VISAO_GERAL, separador: 'sistema' },
]
