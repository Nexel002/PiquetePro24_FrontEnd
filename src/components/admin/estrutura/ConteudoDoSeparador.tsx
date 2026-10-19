import type { ReactNode } from 'react'
import { IconeDeAdmin } from './IconeDeAdmin'
import type { NomeDoIconeDeAdmin } from './icones'

interface ConteudoDoSeparadorProps {
  icone: NomeDoIconeDeAdmin
  titulo: string
  subtitulo: ReactNode
  // Frase curta sobre o que fica auditado ou protegido neste ecrã.
  selo: string
  iconeDoSelo?: NomeDoIconeDeAdmin
  // Acção principal do ecrã (ex. «Novo serviço»), ao lado do selo.
  acoes?: ReactNode
  children: ReactNode
}

// O que cada separador mostra por baixo da barra de separadores: o cabeçalho do conteúdo e o
// conteúdo. Não tem `<main>`, título da página nem navegação — isso é do layout do painel
// (LayoutDeAdmin), para que o nome da secção não apareça duas vezes a poucos pixels de distância.
export function ConteudoDoSeparador({ icone, titulo, subtitulo, selo, iconeDoSelo = 'escudo', acoes, children }: ConteudoDoSeparadorProps) {
  return (
    <>
      <div className="p-4 sm:p-6 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-piquete-blue-bright flex items-center justify-center text-white shadow-sm shrink-0">
            <IconeDeAdmin nome={icone} className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">{titulo}</h2>
            <p className="text-xs sm:text-sm text-slate-500">{subtitulo}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200/80">
            <IconeDeAdmin nome={iconeDoSelo} className="w-3.5 h-3.5 text-slate-400" />
            <span>{selo}</span>
          </div>
          {acoes}
        </div>
      </div>

      {children}
    </>
  )
}
