import type { KeyboardEvent, ReactNode } from 'react'
import { IconeDeAdmin } from './IconeDeAdmin'
import type { NomeDoIconeDeAdmin } from './icones'

export interface DefinicaoDeSeparador<T extends string> {
  id: T
  rotulo: string
  icone?: NomeDoIconeDeAdmin
  // Contagem ou aviso à direita do rótulo.
  selo?: string | number
}

interface SeparadoresProps<T extends string> {
  separadores: DefinicaoDeSeparador<T>[]
  activo: T
  aoMudar: (id: T) => void
  // Rótulo do grupo, para leitores de ecrã.
  rotulo: string
}

export function Separadores<T extends string>({ separadores, activo, aoMudar, rotulo }: SeparadoresProps<T>) {
  function aoTeclado(evento: KeyboardEvent, indice: number) {
    const ultimo = separadores.length - 1
    const destino =
      evento.key === 'ArrowRight' || evento.key === 'ArrowDown'
        ? indice === ultimo
          ? 0
          : indice + 1
        : evento.key === 'ArrowLeft' || evento.key === 'ArrowUp'
          ? indice === 0
            ? ultimo
            : indice - 1
          : evento.key === 'Home'
            ? 0
            : evento.key === 'End'
              ? ultimo
              : null

    if (destino === null) return
    evento.preventDefault()
    aoMudar(separadores[destino].id)
  }

  return (
    <div
      role="tablist"
      aria-label={rotulo}
      // A linha de base é uma sombra interior e não um border-b: com `overflow-x-auto` o sublinhado
      // do separador activo, que sobrepunha essa borda com margem negativa, ficava cortado a 1 px.
      className="relative flex gap-1 overflow-x-auto no-scrollbar px-4 sm:px-8 bg-white shadow-[inset_0_-1px_0_0_#f1f5f9]"
    >
      {separadores.map((separador, indice) => {
        const estaActivo = separador.id === activo
        return (
          <button
            key={separador.id}
            type="button"
            role="tab"
            aria-selected={estaActivo}
            tabIndex={estaActivo ? 0 : -1}
            onClick={() => aoMudar(separador.id)}
            onKeyDown={(evento) => aoTeclado(evento, indice)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-[3px] px-3 sm:px-4 py-3.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5BD8] ${
              estaActivo
                ? 'border-[#1D5BD8] text-[#1D5BD8]'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            {separador.icone && <IconeDeAdmin nome={separador.icone} />}
            {separador.rotulo}
            {separador.selo !== undefined && separador.selo !== '' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  estaActivo ? 'bg-[#1D5BD8]/10 text-[#1D5BD8]' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {separador.selo}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface SeccaoComSeparadoresProps<T extends string> extends SeparadoresProps<T> {
  children: ReactNode
}

// Ocupa 100% da largura do painel central sem cartões estreitos nem margens laterais supérfluas.
export function SeccaoComSeparadores<T extends string>({ children, ...separadores }: SeccaoComSeparadoresProps<T>) {
  return (
    <div className="w-full bg-white flex flex-col">
      <Separadores {...separadores} />
      {children}
    </div>
  )
}
