import type { ReactNode } from 'react'
import { IconeDeAdmin } from './IconeDeAdmin'
import type { NomeDoIconeDeAdmin } from './icones'

// Os três estados que toda a chamada à API trata (CLAUDE.md §3), com o mesmo aspecto em todos os
// ecrãs do painel. Vazio, erro e a carregar são coisas diferentes e não se confundem.

interface ACarregarProps {
  blocos?: number
  // Classes de cada bloco do esqueleto (altura, sobretudo), para imitar o conteúdo que vem.
  bloco?: string
  className?: string
}

// `role="status"` com nome acessível: é por aqui que os testes, e um leitor de ecrã, sabem que
// a lista está a carregar e não vazia.
export function ACarregar({ blocos = 2, bloco = 'h-20', className = 'flex flex-col gap-3' }: ACarregarProps) {
  return (
    <div role="status" aria-label="A carregar" className={className}>
      {Array.from({ length: blocos }, (_, i) => (
        <div key={i} className={`animate-pulse rounded-2xl bg-slate-100 border border-slate-200/60 ${bloco}`} />
      ))}
    </div>
  )
}

export function ErroAoCarregar({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-6 text-center">
      <p className="text-sm font-semibold text-rose-700">{children}</p>
    </div>
  )
}

interface ListaVaziaProps {
  icone: NomeDoIconeDeAdmin
  titulo: string
  descricao?: string
}

export function ListaVazia({ icone, titulo, descricao }: ListaVaziaProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shadow-xs text-slate-400">
        <IconeDeAdmin nome={icone} className="w-6 h-6" strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{titulo}</p>
        {descricao && <p className="text-xs text-slate-500 mt-0.5">{descricao}</p>}
      </div>
    </div>
  )
}
