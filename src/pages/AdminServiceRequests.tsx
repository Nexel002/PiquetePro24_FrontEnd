import { useState, useMemo } from 'react'
import { useAdminServiceRequests } from '../hooks/useAdminServiceRequests'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { CampoDePesquisa } from '../components/admin/estrutura/CamposDeFiltro'
import { ACarregar, ErroAoCarregar, ListaVazia } from '../components/admin/estrutura/EstadosDaLista'
import { Paginacao } from '../components/admin/estrutura/Paginacao'
import { SeccaoComSeparadores, type DefinicaoDeSeparador } from '../components/admin/estrutura/Separadores'
import { useSeparadorDoEndereco } from '../components/admin/estrutura/useSeparadorDoEndereco'
import { CartaoDePedido } from '../components/admin/pedidos/CartaoDePedido'
import type { RequestStatus } from '../services/serviceRequests'

const PAGE_SIZE = 25

type Separador = 'todos' | 'abertos' | 'atribuidos' | 'concluidos' | 'cancelados'

const SEPARADORES: DefinicaoDeSeparador<Separador>[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'abertos', rotulo: 'Abertos' },
  { id: 'atribuidos', rotulo: 'Atribuídos' },
  { id: 'concluidos', rotulo: 'Concluídos' },
  { id: 'cancelados', rotulo: 'Cancelados' },
]
const IDS = SEPARADORES.map((s) => s.id)

const ESTADO_DO_SEPARADOR: Record<Separador, RequestStatus | undefined> = {
  todos: undefined,
  abertos: 'OPEN',
  atribuidos: 'ASSIGNED',
  concluidos: 'COMPLETED',
  cancelados: 'CANCELLED',
}

export function AdminServiceRequests() {
  const [separador, mudarSeparador] = useSeparadorDoEndereco(IDS)
  const [searchTerm, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)

  const { data: requests, isLoading, isError } = useAdminServiceRequests({
    status: ESTADO_DO_SEPARADOR[separador],
    limit: PAGE_SIZE,
    offset,
  })

  function handleSeparadorChange(novo: Separador) {
    setOffset(0)
    mudarSeparador(novo)
  }

  // A pesquisa filtra só a página já carregada; o endpoint não aceita texto.
  const filteredRequests = useMemo(() => {
    if (!requests) return []
    const termo = searchTerm.toLowerCase().trim()
    if (!termo) return requests
    return requests.filter((r) => {
      const local = [r.province, r.district, r.neighborhood].filter(Boolean).join(' ').toLowerCase()
      return r.title.toLowerCase().includes(termo) || local.includes(termo)
    })
  }, [requests, searchTerm])

  return (
    <SeccaoComSeparadores rotulo="Estados do pedido" separadores={SEPARADORES} activo={separador} aoMudar={handleSeparadorChange}>
      <ConteudoDoSeparador
        icone="prancheta"
        titulo="Diretório de Pedidos"
        subtitulo={requests ? `${requests.length} pedidos listados` : 'Carregando pedidos...'}
        selo="Pedidos e histórico de intervenções auditados"
      >
        <div className="px-4 sm:px-6 pb-4">
          <CampoDePesquisa
            valor={searchTerm}
            aoMudar={setSearchTerm}
            aoLimpar={() => setSearchTerm('')}
            placeholder="Filtrar por título do pedido ou localização..."
            rotulo="Filtrar pedidos"
          />
        </div>

        <div className="border-t border-slate-100 p-4 sm:p-6">
          {isLoading && <ACarregar blocos={3} bloco="h-32" />}

          {isError && <ErroAoCarregar>Não foi possível carregar os pedidos. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>}

          {requests && filteredRequests.length === 0 && (
            <ListaVazia
              icone="pranchetaVerificada"
              titulo="Nenhum pedido encontrado"
              descricao={searchTerm ? 'Nenhum resultado corresponde à tua pesquisa.' : 'Não há pedidos neste estado no momento.'}
            />
          )}

          {filteredRequests.length > 0 && (
            <ul className="flex flex-col gap-3">
              {filteredRequests.map((pedido) => (
                <li key={pedido.id}>
                  <CartaoDePedido pedido={pedido} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {requests && <Paginacao offset={offset} quantos={requests.length} tamanho={PAGE_SIZE} aoMudar={setOffset} />}
      </ConteudoDoSeparador>
    </SeccaoComSeparadores>
  )
}
