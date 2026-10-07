import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { UserRole } from '../../services/profile'
import { Logo } from '../ui/Logo'
import { caminhoDoLogin } from '../../lib/postLoginRedirect'
import { COLUNA } from './layout'
import { NotificationButton } from './NotificationButton'
import { LIGACAO_DO_PAPEL } from './papeis'
import { SearchForm } from './SearchForm'
import { UserMenu } from './UserMenu'

const LIGACAO_TEXTO =
  'hidden shrink-0 items-center whitespace-nowrap rounded px-2 py-2 text-sm text-slate-700 transition-colors hover:text-emerald-700'

interface HomeHeaderProps {
  temSessao: boolean
  primeiroNome: string
  nomeCompleto?: string
  avatarUrl?: string | null
  papel?: UserRole
  pesquisa: string
  aoMudarPesquisa: (valor: string) => void
  aoPesquisar: (event: FormEvent) => void
  aoClicarNotificacoes: () => void
  aoTerminarSessao: () => void
}

// Barra de largura total com o conteúdo centrado na mesma coluna do resto da página.
//
// Uma única árvore DOM para todos os tamanhos (antes havia um bloco para telemóvel e outro
// para desktop, a divergir): o CSS Grid põe a pesquisa por baixo em ecrã estreito e entre o
// logótipo e as acções a partir de `md`. A localização saiu daqui — já aparece na linha de
// boas-vindas — para a pesquisa ganhar o espaço, como nas barras de plataformas de catálogo.
export function HomeHeader({
  temSessao,
  primeiroNome,
  nomeCompleto,
  avatarUrl,
  papel,
  pesquisa,
  aoMudarPesquisa,
  aoPesquisar,
  aoClicarNotificacoes,
  aoTerminarSessao,
}: HomeHeaderProps) {
  const ligacaoDoPapel = temSessao && papel ? LIGACAO_DO_PAPEL[papel] : null

  return (
    <header className="bg-white border-b border-slate-200">
      <div
        className={`${COLUNA} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-6`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <Link to="/" aria-label="PiquetePro24 — página inicial" className="mr-3 flex shrink-0 items-center">
            <span className="sm:hidden">
              <Logo variant="icon" size="md" theme="light" />
            </span>
            <span className="hidden sm:block">
              <Logo variant="full" size="sm" theme="light" />
            </span>
          </Link>
          <Link to="/profissionais" className={`${LIGACAO_TEXTO} lg:inline-flex`}>
            Explorar
          </Link>
        </div>

        <div className="flex items-center justify-end gap-1 sm:gap-2 md:col-start-3 md:row-start-1">
          {ligacaoDoPapel ? (
            <Link to={ligacaoDoPapel.to} className={`${LIGACAO_TEXTO} xl:inline-flex`}>
              {ligacaoDoPapel.rotulo}
            </Link>
          ) : null}

          <NotificationButton onClick={aoClicarNotificacoes} />

          {temSessao ? (
            <UserMenu
              nome={nomeCompleto || primeiroNome}
              primeiroNome={primeiroNome}
              avatarUrl={avatarUrl}
              papel={papel}
              aoTerminarSessao={aoTerminarSessao}
            />
          ) : (
            <>
              <Link
                to="/entrar"
                className="inline-flex min-h-11 items-center border border-slate-900 px-4 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
              >
                Entrar
              </Link>
              <Link
                to={caminhoDoLogin(undefined, 'criar-conta')}
                className="hidden min-h-11 items-center border border-slate-900 bg-slate-900 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-800 md:inline-flex"
              >
                Criar conta
              </Link>
            </>
          )}
        </div>

        <div className="col-span-2 w-full md:col-span-1 md:col-start-2 md:row-start-1">
          <SearchForm value={pesquisa} onChange={aoMudarPesquisa} onSubmit={aoPesquisar} />
        </div>
      </div>
    </header>
  )
}
