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

// A barra de subsecções de uma secção do painel («Tab Anatomy»), no padrão do `Tabs` do
// ControlCore: `role="tablist"` com `aria-selected`, setas para andar entre separadores e
// Home/End para os extremos. Só o activo entra na ordem do Tab — com cinco separadores, quem
// navega por teclado passaria cinco vezes por eles para chegar ao conteúdo.
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
      // `overflow-x-auto` porque seis separadores não cabem num telemóvel de 360 px; sem isto, os
      // últimos ficavam inalcançáveis.
      className="relative flex gap-1 overflow-x-auto no-scrollbar border-b border-slate-100 px-2 sm:px-4"
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
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 sm:px-4 py-3.5 -mb-px text-sm font-semibold transition-colors duration-150 rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-piquete-blue-bright focus-visible:ring-offset-2 ${
              estaActivo
                ? 'border-piquete-blue-bright text-piquete-blue-bright'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            {separador.icone && <IconeDeAdmin nome={separador.icone} />}
            {separador.rotulo}
            {separador.selo !== undefined && separador.selo !== '' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  estaActivo ? 'bg-piquete-blue-bright/10 text-piquete-blue-bright' : 'bg-slate-100 text-slate-600'
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

// O cartão de uma secção: separadores em cima, o conteúdo do activo em baixo. O conteúdo é
// montado condicionalmente por quem chama (e não escondido com `hidden`): cada separador busca
// os seus dados ao montar, e mantê-los todos montados faria um pedido por separador.
export function SeccaoComSeparadores<T extends string>({ children, ...separadores }: SeccaoComSeparadoresProps<T>) {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      <Separadores {...separadores} />
      {children}
    </div>
  )
}
