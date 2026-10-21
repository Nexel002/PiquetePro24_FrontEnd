import { api } from '../lib/api'

// Fase 42 (TRD Adendo v1.66, N3): serviços recorrentes. Espelha recurringRequestService.ts do
// backend (Fase 35): cada vez é um pedido directo criado 2 dias antes da data.
export type Frequencia = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
export type EstadoDaRecorrencia = 'ACTIVE' | 'PAUSED' | 'CANCELLED'

export const ROTULO_DA_FREQUENCIA: Record<Frequencia, string> = {
  WEEKLY: 'Todas as semanas',
  BIWEEKLY: 'De 15 em 15 dias',
  MONTHLY: 'Todos os meses',
}

export interface RecurringRequest {
  id: string
  title: string
  frequency: Frequencia
  next_date: string
  status: EstadoDaRecorrencia
  consecutive_failures: number
  cancel_reason: string | null
  source_request_id: string | null
  last_request_id: string | null
  category: { id: string; name: string } | null
  // Para o cliente: o profissional; para o profissional: o primeiro nome do cliente.
  counterpart_name: string
  created_at: string
}

export async function fetchMyRecurringRequests(): Promise<RecurringRequest[]> {
  const response = await api.get<RecurringRequest[]>('/recurring-requests')
  return response.data
}

export async function fetchAssignedRecurringRequests(): Promise<RecurringRequest[]> {
  const response = await api.get<RecurringRequest[]>('/recurring-requests/assigned')
  return response.data
}

export async function createRecurringRequest(input: { source_request_id: string; frequency: Frequencia; next_date: string }): Promise<RecurringRequest> {
  const response = await api.post<RecurringRequest>('/recurring-requests', input)
  return response.data
}

export async function updateRecurringRequest(
  id: string,
  input: { frequency?: Frequencia; next_date?: string; status?: EstadoDaRecorrencia },
): Promise<RecurringRequest> {
  const response = await api.patch<RecurringRequest>(`/recurring-requests/${id}`, input)
  return response.data
}

export async function declineRecurringRequest(id: string, reason: string): Promise<void> {
  await api.post(`/recurring-requests/${id}/decline`, { reason })
}

function somarDias(aaaaMmDd: string, dias: number): string {
  const [ano, mes, dia] = aaaaMmDd.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10)
}

// As próximas datas, com a MESMA regra do backend (proximaData): mensal mantém o dia escolhido e
// encosta ao último dia dos meses curtos. Serve para o cliente confirmar antes de marcar.
export function proximasDatas(frequencia: Frequencia, primeira: string, quantas = 3): string[] {
  const diaDeReferencia = Number(primeira.slice(8, 10))
  const datas = [primeira]
  while (datas.length < quantas) {
    const atual = datas[datas.length - 1] as string
    if (frequencia === 'WEEKLY') datas.push(somarDias(atual, 7))
    else if (frequencia === 'BIWEEKLY') datas.push(somarDias(atual, 14))
    else {
      const [ano, mes] = atual.split('-').map(Number) as [number, number]
      const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
      datas.push(new Date(Date.UTC(ano, mes, Math.min(diaDeReferencia, ultimoDia))).toISOString().slice(0, 10))
    }
  }
  return datas
}

// «2026-10-28» → «28/10/2026».
export function dataLegivel(aaaaMmDd: string): string {
  const [ano, mes, dia] = aaaaMmDd.split('-')
  return `${dia}/${mes}/${ano}`
}

// Amanhã em Moçambique (UTC+2): a primeira data mínima que o backend aceita.
export function amanhaEmMaputo(agora: Date = new Date()): string {
  return new Date(agora.getTime() + 2 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
