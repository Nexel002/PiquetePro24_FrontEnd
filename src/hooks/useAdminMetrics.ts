import { useQuery } from '@tanstack/react-query'
import { fetchAdminMetrics } from '../services/adminMetrics'

export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin-metrics'],
    queryFn: fetchAdminMetrics,
  })
}
