import type { ReactNode } from 'react'
import { BackButton } from '../BackButton'

const BASE_DO_BOTAO = 'rounded-2xl border p-2.5 shadow-lg backdrop-blur-md transition-all active:scale-95'

// Botões que ficam sobre a foto (glassmorphism sobre um fundo variável); partilhados para o
// Perfil e o Catálogo não divergirem.
export const CLASSE_BOTAO_SOBRE_FOTO = `${BASE_DO_BOTAO} border-white/20 bg-white/85 text-piquete-blue hover:bg-white`
export const CLASSE_BOTAO_SOBRE_FOTO_ACTIVO = `${BASE_DO_BOTAO} border-piquete-blue bg-piquete-blue text-white`

// Casca dos ecrãs de perfil. Em telemóvel e tablet: foto a toda a largura no topo, o resto em
// coluna. Em desktop (lg): duas metades — foto inteira à esquerda, fixa; conteúdo à direita.
// A página inteira é que rola (a foto fica presa com `sticky`): uma coluna com scroll próprio
// faria a roda do rato não fazer nada sobre a foto e estragava o Ctrl+F e o regresso à
// posição de scroll.
export function LayoutDividido({ foto, children }: { foto: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col lg:grid lg:min-h-dvh lg:grid-cols-2 lg:items-start">
      {foto}
      <div className="flex min-w-0 flex-col gap-6 px-4 pt-4 md:px-8 lg:min-h-dvh lg:gap-8 lg:bg-gray-50/50 lg:p-10 xl:p-14">{children}</div>
    </div>
  )
}

interface ColunaDaFotoProps {
  // A imagem (ou o substituto sem foto) que enche o enquadramento.
  imagem: ReactNode
  // Botões do canto superior direito.
  acoes?: ReactNode
  // Nome e dados: por baixo da foto em telemóvel, sobrepostos a ela em desktop. É o único
  // sítio do ecrã com o <h1>, e por isso muda de lugar por CSS em vez de existir duas vezes
  // (um <h1> escondido com `lg:hidden` deixava o desktop sem título para leitores de ecrã).
  identidade: ReactNode
}

export function ColunaDaFoto({ imagem, acoes, identidade }: ColunaDaFotoProps) {
  return (
    <aside className="relative w-full lg:sticky lg:top-0 lg:h-dvh lg:self-start lg:overflow-hidden">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-piquete-blue via-piquete-blue-light to-piquete-blue-bright shadow-card-hover sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:rounded-none lg:shadow-none">
        {imagem}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-piquete-blue-deep/60 via-piquete-blue-deep/20 to-transparent" />
        {/* Só em desktop: é onde o nome fica sobre a foto e precisa de contraste. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-2/5 bg-gradient-to-t from-piquete-blue-deep via-piquete-blue-deep/50 to-transparent lg:block" />

        <div className="absolute left-4 top-4 z-20 lg:left-8 lg:top-8">
          <BackButton className={CLASSE_BOTAO_SOBRE_FOTO} />
        </div>

        {acoes && <div className="absolute right-4 top-4 z-20 flex items-center gap-2 lg:right-8 lg:top-8">{acoes}</div>}
      </div>

      <div className="px-4 pt-5 md:px-8 lg:absolute lg:inset-x-0 lg:bottom-0 lg:p-8 xl:p-12">{identidade}</div>
    </aside>
  )
}
