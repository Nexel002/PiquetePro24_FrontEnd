import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ACarregar } from '../estrutura/EstadosDaLista'
import { BarraLateral } from './BarraLateral'
import { Cabecalho } from './Cabecalho'

// Moldura de todos os ecrãs `/admin/*`: barra lateral fixa em desktop (`lg+`) e painel central
// a ocupar 100% da largura disponível sem margens laterais supérfluas, seguindo o desenho de
// referência.
export function LayoutDeAdmin() {
  const [recolhida, setRecolhida] = useState(false)
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setGavetaAberta(false)
  }, [pathname])

  useEffect(() => {
    if (!gavetaAberta) return
    function aoTeclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setGavetaAberta(false)
    }
    document.addEventListener('keydown', aoTeclado)
    return () => document.removeEventListener('keydown', aoTeclado)
  }, [gavetaAberta])

  return (
    <div className="min-h-dvh bg-white">
      <div className="hidden lg:block">
        <BarraLateral recolhida={recolhida} aoRecolher={() => setRecolhida((r) => !r)} />
      </div>

      {gavetaAberta && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setGavetaAberta(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-fade-in">
            <BarraLateral recolhida={false} naGaveta aoFechar={() => setGavetaAberta(false)} />
          </div>
        </>
      )}

      <div className={`flex flex-col min-h-dvh transition-all duration-300 ${recolhida ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Cabecalho recolhida={recolhida} aoAbrirMenu={() => setGavetaAberta(true)} />

        {/* O painel central ocupa 100% da largura útil (sem max-w centralizado nem margens externas). */}
        <main className="flex-1 pt-20 bg-white">
          <div className="w-full pb-12 animate-fade-in">
            <Suspense fallback={<div className="p-6"><ACarregar blocos={3} bloco="h-28" /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
