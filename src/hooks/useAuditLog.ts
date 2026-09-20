import { useQuery } from '@tanstack/react-query'
import { fetchAuditLog, type AuditLogFilters } from '../services/auditLog'

// Sem `enabled: session !== null` extra, mesma decisão de useKycSubmissions: a rota
// só é montada dentro de uma tela já protegida por role (ver AdminAuditLog.tsx).
export function useAuditLog(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-log', filters],
    queryFn: () => fetchAuditLog(filters),
  })
}
