import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ACarregar } from '../estrutura/EstadosDaLista'
import { BarraLateral } from './BarraLateral'
import { Cabecalho } from './Cabecalho'

// Moldura de todos os ecrãs `/admin/*`, no desenho do AppLayout do ControlCore: em desktop
// (`lg+`) a barra lateral fica fixa e o conteúdo desloca-se para lá dela; abaixo disso a barra é
// uma gaveta sobre um fundo escurecido.
//
// O estado (recolhida, gaveta aberta) é só deste layout e vive aqui: no ControlCore está num
// store global (zustand), mas aqui não há outro sítio que o leia, e o CLAUDE.md não quer uma
// dependência nova por isso.
export function LayoutDeAdmin() {
  const [recolhida, setRecolhida] = useState(false)
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const { pathname } = useLocation()

  // A gaveta fecha a cada mudança de secção: ficar aberta por cima do ecrã que se acabou de
  // escolher obrigava a fechá-la à mão.
  useEffect(() => {
    setGavetaAberta(false)
  }, [pathname])

  // Com a gaveta aberta, Escape fecha-a (o fundo escurecido também, ao toque).
  useEffect(() => {
    if (!gavetaAberta) return
    function aoTeclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setGavetaAberta(false)
    }
    document.addEventListener('keydown', aoTeclado)
    return () => document.removeEventListener('keydown', aoTeclado)
  }, [gavetaAberta])

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="hidden lg:block">
        <BarraLateral recolhida={recolhida} aoRecolher={() => setRecolhida((r) => !r)} />
      </div>

      {gavetaAberta && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setGavetaAberta(false)} aria-hidden="true" />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-fade-in">
            <BarraLateral recolhida={false} naGaveta aoFechar={() => setGavetaAberta(false)} />
          </div>
        </>
      )}

      <div className={`flex flex-col min-h-dvh transition-all duration-300 ${recolhida ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Cabecalho recolhida={recolhida} aoAbrirMenu={() => setGavetaAberta(true)} />

        {/* A largura máxima decide-se aqui e não em cada ecrã, para o conteúdo não mudar de
            largura ao passar de uma secção para outra. */}
        <main className="flex-1 pt-16">
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 pb-14 animate-fade-in">
            {/* Suspense próprio: os ecrãs carregam sob pedido, e sem ele a primeira visita a uma
                secção trocava o layout inteiro pelo esqueleto da app, com a barra a piscar. */}
            <Suspense fallback={<ACarregar blocos={3} bloco="h-28" />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
