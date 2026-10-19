import { useState, type FormEvent } from 'react'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { Button } from '../components/ui/Button'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { CampoDePesquisa } from '../components/admin/estrutura/CamposDeFiltro'
import { ACarregar, ErroAoCarregar, ListaVazia } from '../components/admin/estrutura/EstadosDaLista'
import { Paginacao } from '../components/admin/estrutura/Paginacao'
import { SeccaoComSeparadores, type DefinicaoDeSeparador } from '../components/admin/estrutura/Separadores'
import { useSeparadorDoEndereco } from '../components/admin/estrutura/useSeparadorDoEndereco'
import { TabelaDeUtilizadores } from '../components/admin/utilizadores/TabelaDeUtilizadores'
import type { UserRole } from '../services/profile'

const PAGE_SIZE = 25

type Separador = 'todos' | 'clientes' | 'profissionais' | 'tecnicos'

// Sem separador de administradores: gerir quem tem acesso ao painel é «Mais › Administradores».
// «Todos» continua a incluí-los, para a pesquisa encontrar qualquer conta.
const SEPARADORES: DefinicaoDeSeparador<Separador>[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'clientes', rotulo: 'Clientes' },
  { id: 'profissionais', rotulo: 'Profissionais' },
  { id: 'tecnicos', rotulo: 'Técnicos' },
]
const IDS = SEPARADORES.map((s) => s.id)

const PAPEL_DO_SEPARADOR: Record<Separador, UserRole | undefined> = {
  todos: undefined,
  clientes: 'CLIENT',
  profissionais: 'PROFESSIONAL',
  tecnicos: 'TECHNICIAN',
}

export function AdminUsers() {
  const [separador, mudarSeparador] = useSeparadorDoEndereco(IDS)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)

  const { data: users, isLoading, isError } = useAdminUsers({
    role: PAPEL_DO_SEPARADOR[separador],
    search,
    limit: PAGE_SIZE,
    offset,
  })

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault()
    setOffset(0)
    setSearch(searchDraft.trim())
  }

  function handleSeparadorChange(novo: Separador) {
    setOffset(0)
    mudarSeparador(novo)
  }

  return (
    <SeccaoComSeparadores rotulo="Tipos de utilizador" separadores={SEPARADORES} activo={separador} aoMudar={handleSeparadorChange}>
      <ConteudoDoSeparador
        icone="grupo"
        titulo="Utilizadores"
        subtitulo={users ? `${users.length} utilizadores listados` : 'Carregando diretório de contas...'}
        selo="Dados sensíveis (telefone, endereço) visíveis apenas a administradores"
      >
        <form onSubmit={handleSearchSubmit} className="px-4 sm:px-6 pb-4 flex gap-2">
          <CampoDePesquisa
            valor={searchDraft}
            aoMudar={setSearchDraft}
            placeholder="Pesquisar por nome, telefone ou email..."
            rotulo="Pesquisar utilizadores"
          />
          <Button type="submit" variant="primary" size="sm" className="shrink-0 px-4">
            Pesquisar
          </Button>
        </form>

        {isLoading && (
          <div className="p-4 sm:p-6">
            <ACarregar blocos={5} bloco="h-12" />
          </div>
        )}

        {isError && (
          <div className="m-4 sm:m-6">
            <ErroAoCarregar>Não foi possível carregar os utilizadores. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>
          </div>
        )}

        {users && users.length === 0 && (
          <ListaVazia
            icone="semUtilizadores"
            titulo="Nenhum utilizador encontrado"
            descricao="Tenta ajustar os termos de pesquisa ou escolher outro separador."
          />
        )}

        {users && users.length > 0 && <TabelaDeUtilizadores utilizadores={users} />}

        {users && <Paginacao offset={offset} quantos={users.length} tamanho={PAGE_SIZE} aoMudar={setOffset} />}
      </ConteudoDoSeparador>
    </SeccaoComSeparadores>
  )
}
