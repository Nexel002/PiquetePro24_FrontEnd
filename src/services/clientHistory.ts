import { api } from '../lib/api'

// Profissional com quem o cliente já fechou pelo menos um trabalho (Backend Fase 11,
// Bloco C, TRD Adendo v1.18). Só entram pedidos COMPLETED.
export interface WorkedWithProfessional {
  professional_id: string
  full_name: string
  avatar_url: string | null
  jobs_count: number
  last_job_at: string
  last_job_title: string
  // Avaliação mais recente que o próprio cliente deu a este profissional; null se nunca avaliou.
  my_rating: number | null
}

// GET /clients/me/professionals — sem paginação: o histórico de um cliente é pequeno.
export async function fetchWorkedWithProfessionals(): Promise<WorkedWithProfessional[]> {
  const response = await api.get<WorkedWithProfessional[]>('/clients/me/professionals')
  return response.data
}
