import { useEffect, useMemo, useState } from 'react'
import { useAdminUserCounts, useAdminUsers } from '../hooks/useAdminUsers'
import { ACarregar, ErroAoCarregar, ListaVazia } from '../components/admin/estrutura/EstadosDaLista'
import { Paginacao } from '../components/admin/estrutura/Paginacao'
import { SeccaoComSeparadores, type DefinicaoDeSeparador } from '../components/admin/estrutura/Separadores'
import { useSeparadorDoEndereco } from '../components/admin/estrutura/useSeparadorDoEndereco'
import { PesquisaDeUtilizadores } from '../components/admin/utilizadores/PesquisaDeUtilizadores'
import { TabelaDeUtilizadores } from '../components/admin/utilizadores/TabelaDeUtilizadores'
import { filtrarUtilizadores } from '../components/admin/utilizadores/utilizadores'
import type { AdminUserCounts, AdminUserGroup } from '../services/adminUsers'
import { AdminAdmins } from './AdminAdmins'

const PAGE_SIZE = 25

type Separador = 'todos' | 'clientes' | 'tecnicos' | 'empresas' | 'administradores'

const IDS: Separador[] = ['todos', 'clientes', 'tecnicos', 'empresas', 'administradores']

const ROTULO_DO_SEPARADOR: Record<Separador, string> = {
  todos: 'Todos',
  clientes: 'Clientes',
  tecnicos: 'Técnicos',
  empresas: 'Empresas',
  administradores: 'Administradores',
}

// «Técnicos» junta os técnicos das empresas e os profissionais singulares (quem faz o trabalho
// no terreno); «Empresas» são as contas PROFESSIONAL do tipo COMPANY. O agrupamento é do
// backend (GET /admin/users?group=), para a paginação e as contagens baterem com a lista.
const GRUPO_DO_SEPARADOR: Record<Separador, AdminUserGroup | undefined> = {
  todos: undefined,
  clientes: 'CLIENTS',
  tecnicos: 'TECHNICIANS',
  empresas: 'COMPANIES',
  administradores: 'ADMINS',
}

const CONTAGEM_DO_SEPARADOR: Record<Separador, keyof AdminUserCounts> = {
  todos: 'all',
  clientes: 'clients',
  tecnicos: 'technicians',
  empresas: 'companies',
  administradores: 'admins',
}

export function AdminUsers() {
  const [separador, mudarSeparador] = useSeparadorDoEndereco(IDS)
  const { data: contagens } = useAdminUserCounts()

  // Sem contagens (a carregar ou falhou), o separador mostra só o rótulo: um «0» enganaria.
  const separadores: DefinicaoDeSeparador<Separador>[] = IDS.map((id) => ({
    id,
    rotulo: ROTULO_DO_SEPARADOR[id],
    selo: contagens?.[CONTAGEM_DO_SEPARADOR[id]],
  }))
  const [termoPesquisa, setTermoPesquisa] = useState('')
  const [pesquisaServidor, setPesquisaServidor] = useState('')
  const [offset, setOffset] = useState(0)

  // Pesquisa em tempo real no servidor a cada letra escrita (debounce curto de 150 ms para não
  // cancelar pedidos a meio enquanto a pessoa escreve rápido), combinada com filtragem instantânea
  // no cliente letra a letra.
  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setPesquisaServidor(termoPesquisa.trim())
    }, 150)
    return () => window.clearTimeout(temporizador)
  }, [termoPesquisa])

  const { data: users, isLoading, isError } = useAdminUsers({
    group: GRUPO_DO_SEPARADOR[separador],
    search: pesquisaServidor,
    limit: PAGE_SIZE,
    offset,
  })

  // Filtragem instantânea a cada letra escrita (nome, telefone ou localidade), sem esperar por Enter.
  const utilizadoresFiltrados = useMemo(() => (users ? filtrarUtilizadores(users, termoPesquisa) : undefined), [users, termoPesquisa])

  const sugestoesInstantaneas = useMemo(() => {
    if (!termoPesquisa.trim() || !utilizadoresFiltrados) return []
    return utilizadoresFiltrados.slice(0, 6)
  }, [termoPesquisa, utilizadoresFiltrados])

  function handleSeparadorChange(novo: Separador) {
    setOffset(0)
    mudarSeparador(novo)
  }

  if (separador === 'administradores') {
    return (
      <SeccaoComSeparadores rotulo="Tipos de utilizador" separadores={separadores} activo={separador} aoMudar={handleSeparadorChange}>
        <div className="px-4 sm:px-8 py-6">
          <AdminAdmins />
        </div>
      </SeccaoComSeparadores>
    )
  }

  return (
    <SeccaoComSeparadores rotulo="Tipos de utilizador" separadores={separadores} activo={separador} aoMudar={handleSeparadorChange}>
      <div className="px-4 sm:px-8 py-5 flex items-center justify-center bg-white">
        <PesquisaDeUtilizadores
          termo={termoPesquisa}
          aoMudar={(termo) => {
            setTermoPesquisa(termo)
            setOffset(0)
          }}
          aoLimpar={() => {
            setTermoPesquisa('')
            setPesquisaServidor('')
            setOffset(0)
          }}
          sugestoes={sugestoesInstantaneas}
        />
      </div>

      {isLoading && (
        <div className="px-4 sm:px-8 py-6">
          <ACarregar blocos={5} bloco="h-14" />
        </div>
      )}

      {isError && (
        <div className="px-4 sm:px-8 py-6">
          <ErroAoCarregar>Não foi possível carregar os utilizadores. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>
        </div>
      )}

      {utilizadoresFiltrados && utilizadoresFiltrados.length === 0 && (
        <ListaVazia
          icone="semUtilizadores"
          titulo="Nenhum utilizador encontrado"
          descricao="Tenta ajustar os termos de pesquisa ou escolher outro separador."
        />
      )}

      {utilizadoresFiltrados && utilizadoresFiltrados.length > 0 && (
        <TabelaDeUtilizadores utilizadores={utilizadoresFiltrados} />
      )}

      {users && <Paginacao offset={offset} quantos={users.length} tamanho={PAGE_SIZE} aoMudar={setOffset} />}
    </SeccaoComSeparadores>
  )
}
