import { useState } from 'react'
import { toast } from 'sonner'
import { useExportar } from '../../../hooks/useAdminReports'
import { guardarFicheiro, type FiltroDeDatas, type TipoDeExportacao } from '../../../services/adminReports'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'

const EXPORTACOES: Array<{ tipo: TipoDeExportacao; titulo: string; descricao: string }> = [
  { tipo: 'users', titulo: 'Utilizadores', descricao: 'Sem telefone nem email, só nome, papel e zona.' },
  { tipo: 'service-requests', titulo: 'Pedidos de serviço', descricao: 'Estado, zona e datas de cada pedido.' },
  { tipo: 'payments', titulo: 'Pagamentos', descricao: 'Transacções de subscrição e o seu estado.' },
]

export function ExportacoesCsv({ filtros }: { filtros: FiltroDeDatas }) {
  const exportar = useExportar()
  // Qual está a descarregar: só esse mostra o spinner, mas todos ficam bloqueados até acabar.
  const [aExportar, setAExportar] = useState<TipoDeExportacao | null>(null)

  function descarregar(tipo: TipoDeExportacao) {
    setAExportar(tipo)
    exportar.mutate(
      { tipo, filtros },
      {
        onSuccess: (ficheiro) => {
          if (ficheiro.linhas === 0) {
            toast.error('Não há dados neste período.')
            return
          }
          guardarFicheiro(ficheiro)
          if (ficheiro.truncada) {
            toast.error(`O ficheiro foi cortado nas primeiras ${ficheiro.linhas} linhas. Reduz o período para exportar o resto.`)
          } else {
            toast.success(`${ficheiro.linhas} linhas exportadas.`)
          }
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível exportar.'),
        onSettled: () => setAExportar(null),
      },
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Exportar (CSV)</h3>
      <ul className="flex flex-col gap-3">
        {EXPORTACOES.map(({ tipo, titulo, descricao }) => (
          <li key={tipo}>
            <Card variant="solid" className="flex items-center justify-between gap-3 p-4 border border-slate-200">
              <div>
                <p className="text-sm font-bold text-slate-900">{titulo}</p>
                <p className="text-xs text-slate-500">{descricao}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Exportar ${titulo}`}
                onClick={() => descarregar(tipo)}
                isLoading={aExportar === tipo}
                disabled={aExportar !== null}
              >
                Exportar
              </Button>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">Máximo de 5000 linhas por ficheiro. Cada exportação fica registada na auditoria.</p>
    </section>
  )
}
