import { api } from '../lib/api'

// Espelha systemStatusService.ts do backend (Fase 23).
export type EstadoDoComponente = 'OK' | 'FALHA' | 'DESLIGADO'

export interface EstadoDeSistema {
  base_de_dados: { estado: EstadoDoComponente; latencia_ms: number | null; detalhe?: string }
  redis: { estado: EstadoDoComponente; detalhe?: string }
  email: { estado: EstadoDoComponente }
  pagamentos: { modo: 'SIMULADO' | 'MANUAL' }
  seguranca: { verificacao_dois_passos_obrigatoria: boolean }
  pendentes: { comunicados_presos: number; denuncias_abertas: number; kyc_em_analise: number }
  verificado_em: string
}

export async function fetchEstadoDeSistema(): Promise<EstadoDeSistema> {
  const response = await api.get<EstadoDeSistema>('/admin/system-status')
  return response.data
}
