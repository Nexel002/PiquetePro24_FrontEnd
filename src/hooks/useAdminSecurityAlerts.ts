import { useQuery } from '@tanstack/react-query'
import { fetchSecurityAlerts, type SecurityAlertFilters } from '../services/adminSecurityAlerts'

export function useAdminSecurityAlerts(filters: SecurityAlertFilters) {
  return useQuery({
    queryKey: ['admin-security-alerts', filters],
    queryFn: () => fetchSecurityAlerts(filters),
  })
}
