import { Link } from 'react-router-dom'
import type { SeccaoLegal } from '../../data/termosDeUtilizacao'
import { Logo } from '../ui/Logo'

interface LegalDocumentProps {
  titulo: string
  actualizadoEm: string
  seccoes: SeccaoLegal[]
}

// Página de documento legal: cabeçalho, índice e secções. Serve os termos e serve a política
// de privacidade quando existir — o conteúdo é dados, a apresentação é esta.
export function LegalDocument({ titulo, actualizadoEm, seccoes }: LegalDocumentProps) {
  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" aria-label="PiquetePro24 — página inicial" className="flex shrink-0 items-center">
            <Logo variant="full" size="sm" theme="light" />
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Ir para o início
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-[max(4rem,env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:pt-12 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12 lg:px-8">
        {/* Índice: em ecrã largo fica ao lado e acompanha a leitura; em ecrã estreito é uma
            lista no topo (um menu fixo ocuparia o espaço que o texto precisa). */}
        <nav aria-label="Índice" className="mb-8 lg:sticky lg:top-8 lg:mb-0 lg:self-start">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Neste documento</p>
          <ol className="space-y-0.5 text-sm">
            {seccoes.map((seccao) => (
              <li key={seccao.id}>
                <a
                  href={`#${seccao.id}`}
                  className="block rounded-md px-2 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  {seccao.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main className="min-w-0 max-w-3xl">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 text-balance sm:text-4xl">{titulo}</h1>
          <p className="mt-2 text-sm text-slate-500">Última atualização: {actualizadoEm}</p>

          <div className="mt-8 space-y-10">
            {seccoes.map((seccao) => (
              // `scroll-mt` compensa o espaço no topo, para o título não ficar colado ao
              // limite do ecrã depois de saltar pelo índice.
              <section key={seccao.id} id={seccao.id} aria-labelledby={`${seccao.id}-titulo`} className="scroll-mt-6">
                <h2 id={`${seccao.id}-titulo`} className="font-heading text-xl font-bold text-slate-900">
                  {seccao.titulo}
                </h2>
                <div className="mt-3 space-y-3 text-base leading-relaxed text-slate-700">
                  {seccao.paragrafos?.map((paragrafo) => <p key={paragrafo}>{paragrafo}</p>)}
                  {seccao.lista && (
                    <ul className="list-disc space-y-2 pl-5 marker:text-slate-400">
                      {seccao.lista.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                  {seccao.nota && <p>{seccao.nota}</p>}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
