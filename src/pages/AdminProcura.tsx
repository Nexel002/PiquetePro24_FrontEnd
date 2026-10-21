import { useState } from 'react'
import { toast } from 'sonner'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { CampoDeTexto } from '../components/admin/estrutura/CamposDeFormulario'
import { ACarregar, ErroAoCarregar } from '../components/admin/estrutura/EstadosDaLista'
import { TabelaDaProcura } from '../components/admin/procura/TabelaDaProcura'
import { Button } from '../components/ui/Button'
import { useExportar, useProcura } from '../hooks/useAdminReports'
import { fimDoDia, guardarFicheiro, inicioDoDia } from '../services/adminReports'

// Fase 39 (TRD Adendo v1.66, N4): o separador «Procura» da Visão Geral — onde os clientes procuram e
// não encontram ninguém, para saber onde recrutar profissionais. Mesmo filtro de datas dos
// Relatórios; sem datas, o backend mostra os últimos 30 dias. O guard de role está na rota.
export function AdminProcura() {
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const filtros = { from: inicioDoDia(de), to: fimDoDia(ate) }
  const procura = useProcura(filtros)
  const exportar = useExportar()

  function descarregar() {
    exportar.mutate(
      { tipo: 'demand', filtros },
      {
        onSuccess: (ficheiro) => {
          if (ficheiro.linhas === 0) {
            toast.error('Não há procura sem oferta neste período.')
            return
          }
          guardarFicheiro(ficheiro)
          toast.success(`${ficheiro.linhas} linhas exportadas.`)
        },
        onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível exportar.'),
      },
    )
  }

  return (
    <ConteudoDoSeparador icone="pesquisa" titulo="Procura sem oferta" subtitulo="Onde os clientes procuram e não encontram ninguém perto" selo="Sem dados pessoais">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-4 pb-4 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoDeTexto rotulo="De" type="date" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)} />
          <CampoDeTexto rotulo="Até" type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} />
        </div>
        <p className="text-xs text-slate-500">Sem datas, mostra os últimos 30 dias. As datas são na hora de Maputo.</p>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {procura.isLoading && <ACarregar blocos={1} bloco="h-40" />}
        {procura.isError && <ErroAoCarregar>Não foi possível carregar a procura. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>}
        {procura.data && procura.data.rows.length === 0 && (
          <p className="text-sm text-slate-600">Nenhuma procura sem oferta neste período: os clientes encontraram profissionais perto.</p>
        )}
        {procura.data && procura.data.rows.length > 0 && (
          <>
            <TabelaDaProcura linhas={procura.data.rows} />
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={descarregar} disabled={exportar.isPending} isLoading={exportar.isPending}>
                Exportar CSV
              </Button>
            </div>
          </>
        )}
        <p className="text-xs text-slate-500">
          Conta-se uma procura por cliente, serviço e dia, quando não havia ninguém perto (ou ninguém de todo). «Profissionais elegíveis» são os
          que hoje podem atender nessa província (identidade verificada e subscrição activa).
        </p>
      </div>
    </ConteudoDoSeparador>
  )
}
