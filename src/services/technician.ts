import { api } from '../lib/api'
import type { ServiceRequest } from './serviceRequests'

// Espelha technicianService.ts do backend (Fase 26).
export interface TechnicianContext {
  member_id: string
  title: string
  status: 'ACTIVE' | 'INACTIVE'
  company_name: string
  // O técnico só trabalha se ele próprio e a empresa estiverem em ordem: o ecrã explica o que falta.
  own_kyc_approved: boolean
  company_eligible: boolean
}

export async function fetchTechnicianContext(): Promise<TechnicianContext> {
  const response = await api.get<TechnicianContext>('/technician/me')
  return response.data
}

export async function fetchTechnicianJobs(): Promise<ServiceRequest[]> {
  const response = await api.get<ServiceRequest[]>('/technician/jobs')
  return response.data
}
