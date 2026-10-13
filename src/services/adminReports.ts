import { api } from '../lib/api'

// Espelha reportService.ts do backend (Fase 21).
export type TipoDeExportacao = 'users' | 'service-requests' | 'payments'

export interface FiltroDeDatas {
  from?: string
  to?: string
}

export interface Funil {
  profissionais_registados: number
  kyc_submetido: number
  kyc_aprovado: number
  com_pagamento_confirmado: number
  com_trabalho_concluido: number
}

export interface FicheiroExportado {
  conteudo: Blob
  nome: string
  linhas: number
  // O backend corta no tecto de linhas; o ecrã avisa para o admin não julgar que tem tudo.
  truncada: boolean
}

// «2026-10-01» (campo de data) → início/fim desse dia na hora de Maputo (UTC+2, sem hora de
// verão). Sem isto o filtro usaria UTC e deixava de fora, ou incluía a mais, as primeiras duas
// horas do dia local.
export function inicioDoDia(data: string): string | undefined {
  return data ? `${data}T00:00:00+02:00` : undefined
}
export function fimDoDia(data: string): string | undefined {
  return data ? `${data}T23:59:59+02:00` : undefined
}

function nomeDoFicheiro(contentDisposition: string | undefined, porOmissao: string): string {
  return /filename="([^"]+)"/.exec(contentDisposition ?? '')?.[1] ?? porOmissao
}

export async function exportar(
  tipo: TipoDeExportacao,
  filtros: FiltroDeDatas & { role?: string; status?: string },
): Promise<FicheiroExportado> {
  const resposta = await api.get<Blob>(`/admin/exports/${tipo}`, { params: filtros, responseType: 'blob' })
  const cabecalhos = resposta.headers as Record<string, string | undefined>
  return {
    conteudo: resposta.data,
    nome: nomeDoFicheiro(cabecalhos['content-disposition'], `${tipo}.csv`),
    linhas: Number(cabecalhos['x-linhas'] ?? 0),
    truncada: cabecalhos['x-truncada'] === 'true',
  }
}

export async function fetchFunil(filtros: FiltroDeDatas): Promise<Funil> {
  const response = await api.get<Funil>('/admin/funnel', { params: filtros })
  return response.data
}

// Entrega o ficheiro ao browser. O URL de objeto é libertado logo a seguir: deixá-lo vivo
// guardava o ficheiro inteiro em memória até fechar o separador.
export function guardarFicheiro(ficheiro: FicheiroExportado): void {
  const url = URL.createObjectURL(ficheiro.conteudo)
  const ligacao = document.createElement('a')
  ligacao.href = url
  ligacao.download = ficheiro.nome
  document.body.appendChild(ligacao)
  ligacao.click()
  ligacao.remove()
  URL.revokeObjectURL(url)
}
