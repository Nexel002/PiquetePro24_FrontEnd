import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../ui/Logo'
import { AuthHeroPanel } from './AuthHeroPanel'

// Estrutura da página de autenticação: painel de imagem + coluna do formulário. Duas colunas
// só a partir de `lg`; abaixo, uma coluna — o painel é decorativo e custava largura e dados
// num ecrã onde não cabe.
export function AuthLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  function voltar() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)]">
      <aside className="sticky top-0 hidden h-dvh lg:block" aria-hidden="true">
        <AuthHeroPanel />
      </aside>

      <div className="flex min-h-dvh flex-col">
        {/* Barra de topo em fluxo normal (e não `absolute`): num ecrã estreito o botão "Voltar"
            sobrepunha o logótipo. `safe-area-inset-top` afasta-os do recorte dos telemóveis. */}
        <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
          <button
            type="button"
            onClick={voltar}
            className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-piquete-blue/40"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </button>
          <div className="lg:hidden">
            <Logo variant="full" size="sm" theme="light" />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
      </div>
    </main>
  )
}
