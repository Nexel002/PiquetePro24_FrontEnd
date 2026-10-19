import type { ReactNode } from 'react'
import { IconeDeAdmin } from './IconeDeAdmin'

// Campos da barra de filtros de uma lista: sem rótulo visível (o placeholder e o contexto bastam
// a quem vê), mas sempre com nome acessível.

const CLASSE_DO_CAMPO =
  'rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-piquete-blue-bright/20 focus:border-piquete-blue-bright transition-all'

interface CampoDePesquisaProps {
  valor: string
  aoMudar: (valor: string) => void
  placeholder: string
  rotulo: string
  // Com `aoLimpar`, aparece o ✕ quando há texto escrito.
  aoLimpar?: () => void
}

export function CampoDePesquisa({ valor, aoMudar, placeholder, rotulo, aoLimpar }: CampoDePesquisaProps) {
  return (
    <div className="relative flex-1">
      <IconeDeAdmin nome="pesquisa" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        value={valor}
        onChange={(event) => aoMudar(event.target.value)}
        placeholder={placeholder}
        aria-label={rotulo}
        className={`w-full pl-10 pr-9 placeholder:text-slate-400 ${CLASSE_DO_CAMPO}`}
      />
      {aoLimpar && valor && (
        <button
          type="button"
          onClick={aoLimpar}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
          aria-label="Limpar pesquisa"
        >
          ✕
        </button>
      )}
    </div>
  )
}

interface SelectDeFiltroProps<T extends string> {
  valor: T
  aoMudar: (valor: T) => void
  rotulo: string
  children: ReactNode
}

// O valor chega como `string` do DOM; quem chama garante, pelas `<option>`, que é sempre um `T`.
export function SelectDeFiltro<T extends string>({ valor, aoMudar, rotulo, children }: SelectDeFiltroProps<T>) {
  return (
    <select
      value={valor}
      onChange={(event) => aoMudar(event.target.value as T)}
      aria-label={rotulo}
      className={`px-3.5 font-medium text-slate-700 cursor-pointer shrink-0 ${CLASSE_DO_CAMPO}`}
    >
      {children}
    </select>
  )
}
