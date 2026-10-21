import { toast } from 'sonner'
import { useExportMyRequests } from '../../hooks/useClientLocations'
import { guardarFicheiro } from '../../services/adminReports'

// Fase 40 (TRD Adendo v1.66, N6): o cliente descarrega os seus pedidos em CSV (para a contabilidade
// de uma empresa ou instituição). Reutiliza a entrega do ficheiro das exportações do admin.
export function ExportarOsMeusPedidos() {
  const exportar = useExportMyRequests()

  function descarregar() {
    exportar.mutate(
      {},
      {
        onSuccess: (ficheiro) => {
          if (ficheiro.linhas === 0) {
            toast.error('Ainda não tens pedidos para exportar.')
            return
          }
          guardarFicheiro({ ...ficheiro, truncada: false })
          toast.success(`${ficheiro.linhas} pedidos exportados.`)
        },
        onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível exportar. Tenta novamente.'),
      },
    )
  }

  return (
    <button
      type="button"
      onClick={descarregar}
      disabled={exportar.isPending}
      className="min-h-[40px] self-end rounded-full border border-gray-200 px-3 text-xs font-semibold text-piquete-blue hover:border-piquete-blue disabled:opacity-50"
    >
      {exportar.isPending ? 'A exportar…' : 'Exportar (CSV)'}
    </button>
  )
}
