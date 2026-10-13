import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createReport,
  fetchAdminReports,
  resolveReport,
  unhideTarget,
  type AdminReportFilters,
  type ResolveReportPayload,
} from '../services/moderation'

export function useCreateReport() {
  return useMutation({ mutationFn: createReport })
}

export function useAdminReports(filters: AdminReportFilters) {
  return useQuery({
    queryKey: ['admin-reports', filters],
    queryFn: () => fetchAdminReports(filters),
  })
}

export function useResolveReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { reportId: string; payload: ResolveReportPayload }) => resolveReport(input.reportId, input.payload),
    onSuccess: () => {
      // A denúncia muda de lista (sai de «Abertas») e o catálogo pode ter perdido conteúdo.
      void queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog'] })
    },
  })
}

export function useUnhideTarget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { targetType: 'PORTFOLIO_PROJECT' | 'REVIEW'; targetId: string }) =>
      unhideTarget(input.targetType, input.targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog'] })
    },
  })
}
