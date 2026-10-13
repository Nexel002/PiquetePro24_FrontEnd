import { useQuery } from '@tanstack/react-query'
import { fetchTechnicianContext, fetchTechnicianJobs } from '../services/technician'

// Sem retry: os erros daqui são regras de negócio (conta desativada pela empresa: 403), não falhas
// transitórias.
export function useTechnicianContext() {
  return useQuery({ queryKey: ['technician', 'me'], queryFn: fetchTechnicianContext, retry: false })
}

export function useTechnicianJobs() {
  return useQuery({ queryKey: ['technician', 'jobs'], queryFn: fetchTechnicianJobs, retry: false })
}
