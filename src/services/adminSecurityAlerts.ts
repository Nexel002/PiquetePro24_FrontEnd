import { api } from '../lib/api'

// Espelha SecurityAlert do backend (src/services/adminSecurityAlertService.ts).
export interface SecurityAlert {
  groupKey: string
  groupType: 'user_id' | 'ip_address'
  attempts: number
  lastAttemptAt: string
}

export interface SecurityAlertFilters {
  windowHours: number
  minAttempts: number
}

export async function fetchSecurityAlerts(filters: SecurityAlertFilters): Promise<SecurityAlert[]> {
  const response = await api.get<SecurityAlert[]>('/admin/security-alerts', {
    params: { window_hours: filters.windowHours, min_attempts: filters.minAttempts },
  })
  return response.data
}
