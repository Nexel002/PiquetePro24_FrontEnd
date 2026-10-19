import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuditLog } from '../hooks/useAuditLog'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { CampoDePesquisa, SelectDeFiltro } from '../components/admin/estrutura/CamposDeFiltro'
import { ACarregar, ErroAoCarregar, ListaVazia } from '../components/admin/estrutura/EstadosDaLista'
import { Paginacao } from '../components/admin/estrutura/Paginacao'
import { EntradaDeAuditoria } from '../components/admin/auditoria/EntradaDeAuditoria'
import { FiltroDoEndereco } from '../components/admin/auditoria/FiltroDoEndereco'
import { PainelDeAlertas } from '../components/admin/auditoria/PainelDeAlertas'

const PAGE_SIZE = 25

type SuccessFilter = 'ALL' | 'true' | 'false'

export function AdminAuditLog() {
  const [actionFilter, setActionFilter] = useState('')
  const [successFilter, setSuccessFilter] = useState<SuccessFilter>('ALL')
  const [offset, setOffset] = useState(0)
  // Utilizador e entidade vêm no endereço para outros ecrãs poderem ligar directamente a um
  // histórico filtrado (ex. «Ver histórico» de um pedido).
  const [searchParams, setSearchParams] = useSearchParams()
  const userIdFilter = searchParams.get('user_id') ?? undefined
  const entityTypeFilter = searchParams.get('entity_type') ?? undefined
  const entityIdFilter = searchParams.get('entity_id') ?? undefined

  const { data: entries, isLoading, isError } = useAuditLog({
    action: actionFilter.trim(),
    success: successFilter === 'ALL' ? undefined : successFilter === 'true',
    userId: userIdFilter,
    entityType: entityTypeFilter,
    entityId: entityIdFilter,
    limit: PAGE_SIZE,
    offset,
  })

  function handleClearDeepLinkFilter(keys: string[]) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      keys.forEach((key) => next.delete(key))
      return next
    })
    setOffset(0)
  }

  function handleFilterByUser(userId: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('user_id', userId)
      next.delete('entity_type')
      next.delete('entity_id')
      return next
    })
    setOffset(0)
  }

  function handleFilterChange(update: () => void) {
    setOffset(0)
    update()
  }

  return (
    <ConteudoDoSeparador
      icone="documento"
      titulo="Histórico de Ações"
      subtitulo="Registo de acessos, mutações de dados e operações sensíveis"
      selo="Registo imutável"
    >
      <div className="px-4 sm:px-6 pb-4 flex flex-col sm:flex-row gap-3">
        <CampoDePesquisa
          valor={actionFilter}
          aoMudar={(valor) => handleFilterChange(() => setActionFilter(valor))}
          placeholder="Filtrar por ação (ex. KYC_REVIEW_APPROVED)..."
          rotulo="Filtrar por ação"
        />
        <SelectDeFiltro
          valor={successFilter}
          aoMudar={(valor) => handleFilterChange(() => setSuccessFilter(valor))}
          rotulo="Filtrar por resultado"
        >
          <option value="ALL">Todos os resultados</option>
          <option value="true">Apenas Sucesso</option>
          <option value="false">Apenas Falha</option>
        </SelectDeFiltro>
      </div>

      <div className="border-t border-slate-100 p-4 sm:p-6 flex flex-col gap-4">
        <PainelDeAlertas aoFiltrarPorUtilizador={handleFilterByUser} />

        {userIdFilter && (
          <FiltroDoEndereco aoLimpar={() => handleClearDeepLinkFilter(['user_id'])}>
            A mostrar só o histórico do utilizador <span className="font-semibold">{userIdFilter}</span>
          </FiltroDoEndereco>
        )}

        {entityTypeFilter && entityIdFilter && (
          <FiltroDoEndereco aoLimpar={() => handleClearDeepLinkFilter(['entity_type', 'entity_id'])}>
            A mostrar só a linha do tempo de <span className="font-semibold">{entityTypeFilter}</span> /{' '}
            <span className="font-semibold">{entityIdFilter}</span>
          </FiltroDoEndereco>
        )}

        {isLoading && <ACarregar blocos={3} bloco="h-16" />}

        {isError && <ErroAoCarregar>Não foi possível carregar o histórico. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>}

        {entries && entries.length === 0 && (
          <ListaVazia icone="documento" titulo="Nenhum registo encontrado." descricao="Tenta ajustar os filtros de ação ou resultado." />
        )}

        {entries && entries.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {entries.map((entry) => (
              <li key={entry.id}>
                <EntradaDeAuditoria entrada={entry} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {entries && <Paginacao offset={offset} quantos={entries.length} tamanho={PAGE_SIZE} aoMudar={setOffset} />}
    </ConteudoDoSeparador>
  )
}
