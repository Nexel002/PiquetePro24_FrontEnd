import { useMutation, useQuery } from '@tanstack/react-query'
import { exportar, fetchFunil, type FiltroDeDatas, type TipoDeExportacao } from '../services/adminReports'

export function useFunil(filtros: FiltroDeDatas) {
  return useQuery({ queryKey: ['admin-funnel', filtros], queryFn: () => fetchFunil(filtros) })
}

export function useExportar() {
  return useMutation({
    mutationFn: (input: { tipo: TipoDeExportacao; filtros: FiltroDeDatas & { role?: string; status?: string } }) =>
      exportar(input.tipo, input.filtros),
  })
}
