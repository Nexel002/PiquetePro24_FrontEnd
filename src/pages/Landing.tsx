import { useEffect } from 'react'
import { CabecalhoLanding } from '../components/landing/CabecalhoLanding'
import { ComoFunciona } from '../components/landing/ComoFunciona'
import { DestaquesDaLanding } from '../components/landing/DestaquesDaLanding'
import { FaixaDeCategorias } from '../components/landing/FaixaDeCategorias'
import { HeroLanding } from '../components/landing/HeroLanding'
import { ParaQuem } from '../components/landing/ParaQuem'
import { PerguntasFrequentes } from '../components/landing/PerguntasFrequentes'
import { RodapeLanding } from '../components/landing/RodapeLanding'
import { Vantagens } from '../components/landing/Vantagens'

// Página inicial de quem não tem sessão (Fase 47). Só compõe as secções; o texto vive em
// components/landing/dados.ts. Quem tem sessão vê a Home (ver PaginaInicial.tsx).
export function Landing() {
  // O `body` é cinzento para os restantes ecrãs; aqui as curvas entre secções e o «rubber-band»
  // do telemóvel mostrariam essa faixa. O deslocamento suave das âncoras (#faq…) só liga sem
  // «reduzir movimento».
  useEffect(() => {
    const body = document.body.style.backgroundColor
    const raiz = document.documentElement.style.scrollBehavior
    document.body.style.backgroundColor = '#ffffff'
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.body.style.backgroundColor = body
      document.documentElement.style.scrollBehavior = raiz
    }
  }, [])

  return (
    <div className="min-h-dvh overflow-x-clip bg-white text-slate-900 antialiased">
      <CabecalhoLanding />
      <main>
        <HeroLanding />
        <FaixaDeCategorias />
        <Vantagens />
        <ComoFunciona />
        <DestaquesDaLanding />
        <ParaQuem />
        <PerguntasFrequentes />
      </main>
      <RodapeLanding />
    </div>
  )
}
