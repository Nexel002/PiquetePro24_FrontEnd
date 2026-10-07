import { Link } from 'react-router-dom'
import type { UserRole } from '../../services/profile'
import { ACCOES_RAPIDAS } from './acoesRapidas'

interface HomeShortcutsProps {
  papel?: UserRole
}

export function HomeShortcuts({ papel }: HomeShortcutsProps) {
  // Sem perfil carregado, o cliente é o caso por omissão (é o papel de quem acabou de entrar).
  const accoes = ACCOES_RAPIDAS[papel ?? 'CLIENT']

  return (
    <section aria-labelledby="atalhos" className="mb-10 sm:mb-12">
      <h2 id="atalhos" className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 mb-4">
        Começa por aqui
      </h2>
      {/* Telemóvel: fila deslizante com snap, cada cartão a mostrar um pedaço do seguinte.
          A partir de `md`: grelha de três colunas, sem deslizar. */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible">
        {accoes.map((accao) => (
          <Link
            key={accao.to}
            to={accao.to}
            className="group flex w-[78%] shrink-0 snap-start items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white p-4 min-h-20 transition-colors hover:bg-slate-50 sm:w-72 md:w-auto"
          >
            <span className="min-w-0">
              <span className="block font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{accao.rotulo}</span>
              <span className="block mt-0.5 text-sm text-slate-600">{accao.descricao}</span>
            </span>
            <svg className="w-5 h-5 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  )
}
