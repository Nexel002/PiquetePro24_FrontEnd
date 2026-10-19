import { useState } from 'react'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { ACarregar, ErroAoCarregar, ListaVazia } from '../components/admin/estrutura/EstadosDaLista'
import { FiltroEmPilulas } from '../components/admin/estrutura/FiltroEmPilulas'
import { Paginacao } from '../components/admin/estrutura/Paginacao'
import { CartaoDeDenuncia } from '../components/admin/moderacao/CartaoDeDenuncia'
import { useAdminReports } from '../hooks/useModeration'
import type { ReportStatus } from '../services/moderation'

const PAGE_SIZE = 25

type Filtro = ReportStatus | 'ALL'

const FILTROS: Array<{ valor: Filtro; rotulo: string }> = [
  { valor: 'OPEN', rotulo: 'Abertas' },
  { valor: 'RESOLVED', rotulo: 'Resolvidas' },
  { valor: 'DISMISSED', rotulo: 'Rejeitadas' },
  { valor: 'ALL', rotulo: 'Todas' },
]

// Fase 15: fila de denúncias. Contas moderam-se na ficha do utilizador (banir) e pedidos no
// ecrã de pedidos; aqui decide-se e oculta-se conteúdo. O guard de role está na rota.
export function AdminModeration() {
  const [filtro, setFiltro] = useState<Filtro>('OPEN')
  const [offset, setOffset] = useState(0)
  const { data: reports, isLoading, isError } = useAdminReports({ status: filtro, limit: PAGE_SIZE, offset })

  function mudarFiltro(novo: Filtro) {
    setFiltro(novo)
    setOffset(0)
  }

  return (
    <ConteudoDoSeparador
      icone="alerta"
      titulo="Fila de Moderação"
      subtitulo={reports ? `${reports.length} denúncias nesta listagem` : 'Carregando denúncias...'}
      selo="Decisões e ocultações auditadas e reversíveis"
    >
      <div className="px-4 sm:px-6 pb-4 border-b border-slate-100">
        <FiltroEmPilulas rotulo="Filtrar por estado" opcoes={FILTROS} valor={filtro} aoMudar={mudarFiltro} />
      </div>

      <div className="p-4 sm:p-6 flex flex-col gap-4">
        {isLoading && <ACarregar bloco="h-24" />}

        {isError && <ErroAoCarregar>Não foi possível carregar as denúncias. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>}

        {reports && reports.length === 0 && (
          <ListaVazia
            icone="circuloVerificado"
            titulo={filtro === 'OPEN' ? 'Nenhuma denúncia por tratar.' : 'Nenhuma denúncia neste estado.'}
            descricao="Tudo em dia nesta fila."
          />
        )}

        {reports && reports.length > 0 && (
          <ul className="flex flex-col gap-3">
            {reports.map((report) => (
              <li key={report.id}>
                <CartaoDeDenuncia report={report} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {reports && <Paginacao offset={offset} quantos={reports.length} tamanho={PAGE_SIZE} aoMudar={setOffset} />}
    </ConteudoDoSeparador>
  )
}
