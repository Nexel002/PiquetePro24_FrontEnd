import { Link } from 'react-router-dom'
import type { UserRole } from '../../services/profile'
import { caminhoDoLogin } from '../../lib/postLoginRedirect'
import { ROTULO_PAPEL } from './papeis'
import { UserAvatar } from './UserAvatar'

interface HomeHeroProps {
  temSessao: boolean
  primeiroNome: string
  nomeCompleto?: string
  avatarUrl?: string | null
  papel?: UserRole
  localizacao: string
}

// Linha de boas-vindas. Com sessão mostra os dados de quem entrou (avatar, nome, papel,
// localização); sem sessão, um convite a entrar.
export function HomeHero({ temSessao, primeiroNome, nomeCompleto, avatarUrl, papel, localizacao }: HomeHeroProps) {
  if (!temSessao) {
    return (
      <section className="py-6 sm:py-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 text-balance">Bem-vindo ao PiquetePro24</h1>
        <p className="mt-1 text-sm sm:text-base text-slate-600 max-w-xl">
          Encontra canalizadores, eletricistas e outros profissionais qualificados em Moçambique.{' '}
          <Link to={caminhoDoLogin(undefined, 'criar-conta')} className="font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
            Criar conta
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section className="flex items-center gap-4 sm:gap-5 py-6 sm:py-8">
      <UserAvatar nome={nomeCompleto || primeiroNome} avatarUrl={avatarUrl} className="w-16 h-16 sm:w-20 sm:h-20 text-2xl" />
      <div className="min-w-0">
        <h1 className="font-heading font-bold text-xl sm:text-2xl text-slate-900 text-balance">Bem-vindo de volta, {primeiroNome}</h1>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-slate-600">
          <span>
            {papel ? ROTULO_PAPEL[papel] : 'Cliente'} · {localizacao}
          </span>
          <Link to="/perfil" className="font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
            Editar perfil
          </Link>
        </p>
      </div>
    </section>
  )
}
