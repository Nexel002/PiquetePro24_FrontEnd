import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { CampoDeTexto } from '../components/admin/estrutura/CamposDeFormulario'
import { ACarregar, ErroAoCarregar } from '../components/admin/estrutura/EstadosDaLista'
import { BarrasDoFunil } from '../components/admin/relatorios/BarrasDoFunil'
import { ExportacoesCsv } from '../components/admin/relatorios/ExportacoesCsv'
import { useFunil } from '../hooks/useAdminReports'
import { fimDoDia, inicioDoDia } from '../services/adminReports'

// Fase 19: números para decidir (funil) e dados para levar (CSV). O período aplica-se às duas
// coisas. O guard de role está na rota.
export function AdminReports() {
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const filtros = { from: inicioDoDia(de), to: fimDoDia(ate) }

  const funil = useFunil(filtros)

  return (
    <ConteudoDoSeparador
      icone="barras"
      titulo="Relatórios Operacionais"
      subtitulo="Funil de profissionais e exportação em formato CSV"
      selo="Descarregamentos registados em auditoria"
    >
      <div className="px-4 sm:px-6 pb-4 border-b border-slate-100 flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoDeTexto rotulo="De" type="date" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)} />
          <CampoDeTexto rotulo="Até" type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} />
        </div>
        <p className="text-xs text-slate-500">Sem datas, mostra tudo. As datas são na hora de Maputo.</p>
      </div>

      <div className="p-4 sm:p-6 flex flex-col gap-6">
        <Card variant="solid" className="flex flex-col gap-4 p-5 border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Funil de profissionais</h3>
          {funil.isLoading && <ACarregar blocos={1} bloco="h-32" />}
          {funil.isError && <ErroAoCarregar>Não foi possível carregar o funil. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>}
          {funil.data && funil.data.profissionais_registados === 0 && (
            <p className="text-sm text-slate-600">Ainda não há profissionais registados neste período.</p>
          )}
          {funil.data && funil.data.profissionais_registados > 0 && <BarrasDoFunil funil={funil.data} />}
          <p className="text-xs text-slate-500">
            Cada linha conta pessoas, não eventos. As etapas a seguir ao registo contam o que aconteceu no período, por isso nem sempre
            diminuem.
          </p>
        </Card>

        <ExportacoesCsv filtros={filtros} />
      </div>
    </ConteudoDoSeparador>
  )
}
