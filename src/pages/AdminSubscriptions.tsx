import { useState } from 'react'
import { useAdminPayments, useAdminSubscriptions } from '../hooks/useAdminSubscriptions'
import type { FiltroSubscricao } from '../services/adminSubscriptions'
import type { PaymentTransactionStatus } from '../services/subscriptions'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { SelectDeFiltro } from '../components/admin/estrutura/CamposDeFiltro'
import { ACarregar, ErroAoCarregar, ListaVazia } from '../components/admin/estrutura/EstadosDaLista'
import { FiltroEmPilulas } from '../components/admin/estrutura/FiltroEmPilulas'
import { Paginacao } from '../components/admin/estrutura/Paginacao'
import { LinhaDePagamento } from '../components/admin/subscricoes/LinhaDePagamento'
import { ESTADOS_DE_PAGAMENTO } from '../components/admin/subscricoes/formatos'
import { LinhaDeSubscricao } from '../components/admin/subscricoes/LinhaDeSubscricao'

const PAGE_SIZE = 25

type Separador = 'SUBSCRICOES' | 'PAGAMENTOS'

const SEPARADORES: Array<{ valor: Separador; rotulo: string }> = [
  { valor: 'SUBSCRICOES', rotulo: 'Subscrições' },
  { valor: 'PAGAMENTOS', rotulo: 'Pagamentos' },
]

const FILTROS: Record<FiltroSubscricao, string> = {
  ALL: 'Todas',
  ACTIVE: 'Activas',
  EXPIRING: 'A expirar (7 dias)',
  EXPIRED: 'Expiradas',
  INACTIVE: 'Sem pagamento',
}

// Fase 13: visão global de subscrições e pagamentos. A activação manual continua na ficha
// do utilizador; aqui vê-se quem expira e suspende-se. O guard de role está na rota.
export function AdminSubscriptions() {
  const [separador, setSeparador] = useState<Separador>('SUBSCRICOES')
  const [filtro, setFiltro] = useState<FiltroSubscricao>('EXPIRING')
  const [estado, setEstado] = useState<PaymentTransactionStatus | 'ALL'>('ALL')
  const [offset, setOffset] = useState(0)

  const subscricoes = useAdminSubscriptions({ filtro, limit: PAGE_SIZE, offset })
  const pagamentos = useAdminPayments(
    { status: estado === 'ALL' ? undefined : estado, limit: PAGE_SIZE, offset },
    { enabled: separador === 'PAGAMENTOS' },
  )

  // O offset é partilhado pelos dois separadores e por cada filtro: muda um, volta ao início.
  function mudarSeparador(novo: Separador) {
    setSeparador(novo)
    setOffset(0)
  }

  const naSubscricao = separador === 'SUBSCRICOES'
  const query = naSubscricao ? subscricoes : pagamentos

  return (
    <ConteudoDoSeparador
      icone="cartao"
      titulo={naSubscricao ? 'Subscrições de Profissionais' : 'Histórico de Pagamentos'}
      subtitulo="Acompanhamento e controlo de renovações da plataforma"
      selo="Transações e pagamentos processados com auditoria"
    >
      <div className="px-4 sm:px-6 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100">
        <FiltroEmPilulas rotulo="Separadores" opcoes={SEPARADORES} valor={separador} aoMudar={mudarSeparador} separadores />

        {naSubscricao ? (
          <SelectDeFiltro
            rotulo="Filtro de subscrições"
            valor={filtro}
            aoMudar={(valor) => {
              setFiltro(valor)
              setOffset(0)
            }}
          >
            {Object.entries(FILTROS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </SelectDeFiltro>
        ) : (
          <SelectDeFiltro
            rotulo="Estado do pagamento"
            valor={estado}
            aoMudar={(valor) => {
              setEstado(valor)
              setOffset(0)
            }}
          >
            <option value="ALL">Todos os estados</option>
            {Object.entries(ESTADOS_DE_PAGAMENTO).map(([valor, { rotulo }]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </SelectDeFiltro>
        )}
      </div>

      <div className="p-4 sm:p-6 flex flex-col gap-4">
        {query.isLoading && <ACarregar />}
        {query.isError && <ErroAoCarregar>Não foi possível carregar. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>}

        {naSubscricao && subscricoes.data?.length === 0 && <ListaVazia icone="cartao" titulo="Nenhuma subscrição neste filtro." />}
        {naSubscricao && subscricoes.data && subscricoes.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {subscricoes.data.map((sub) => (
              <li key={sub.id}>
                <LinhaDeSubscricao sub={sub} />
              </li>
            ))}
          </ul>
        )}

        {!naSubscricao && pagamentos.data?.length === 0 && <ListaVazia icone="cartao" titulo="Nenhum pagamento encontrado." />}
        {!naSubscricao && pagamentos.data && pagamentos.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {pagamentos.data.map((p) => (
              <li key={p.id}>
                <LinhaDePagamento pagamento={p} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {query.data && <Paginacao offset={offset} quantos={query.data.length} tamanho={PAGE_SIZE} aoMudar={setOffset} />}
    </ConteudoDoSeparador>
  )
}
