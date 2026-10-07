import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { FeaturedWork } from '../../data/featuredWorks'
import { WorkCard } from './WorkCard'

interface WorkSliderProps {
  id: string
  titulo: string
  ligacao: { to: string; texto: string }
  works: FeaturedWork[]
  isFavorite: (id: string) => boolean
  onToggleFavorite: (id: string, name?: string) => void
}

const SETA =
  'absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-900 shadow-md transition-colors hover:bg-slate-100 sm:flex'

// Carrossel horizontal com snap. Em ecrã tátil o dedo basta; as setas só existem a partir de
// `sm` e só aparecem do lado para onde ainda há conteúdo, como no resto do ecrã.
// A largura dos cartões é uma fracção da fila (1 + um pedaço, 2, 3, 4) e não um valor em px:
// ocupa o espaço que houver em vez de deixar vazios à direita em ecrãs largos.
export function WorkSlider({ id, titulo, ligacao, works, isFavorite, onToggleFavorite }: WorkSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [podeAnterior, setPodeAnterior] = useState(false)
  const [podeSeguinte, setPodeSeguinte] = useState(false)

  const actualizarSetas = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setPodeAnterior(el.scrollLeft > 8)
    setPodeSeguinte(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  useEffect(() => {
    actualizarSetas()
    const el = trackRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(actualizarSetas)
    observador.observe(el)
    return () => observador.disconnect()
  }, [actualizarSetas, works.length])

  // Sem trabalhos não há secção: um título sobre uma fila vazia é pior do que nada.
  if (works.length === 0) return null

  function deslocar(direccao: 'anterior' | 'seguinte') {
    const el = trackRef.current
    if (!el) return
    // Um cartão de cada vez, lido do próprio elemento: o passo acompanha o breakpoint.
    const passo = (el.firstElementChild?.getBoundingClientRect().width ?? 320) + 20
    el.scrollBy({ left: direccao === 'anterior' ? -passo : passo, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby={`secao-${id}`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 id={`secao-${id}`} className="font-heading text-2xl font-bold text-slate-900 text-balance sm:text-3xl">
          {titulo}
        </h2>
        <Link
          to={ligacao.to}
          className="shrink-0 py-2 text-sm font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
        >
          {ligacao.texto}
        </Link>
      </div>

      <div className="relative">
        <div
          ref={trackRef}
          onScroll={actualizarSetas}
          className="flex gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4 py-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 motion-safe:scroll-smooth"
        >
          {works.map((work) => (
            <div
              key={work.id}
              className="w-[78%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)] xl:w-[calc((100%-3.75rem)/4)] 2xl:w-[calc((100%-5rem)/5)]"
            >
              <WorkCard work={work} isFavorite={isFavorite(work.id)} onToggleFavorite={onToggleFavorite} />
            </div>
          ))}
        </div>

        {podeAnterior && (
          <button type="button" onClick={() => deslocar('anterior')} aria-label="Ver trabalhos anteriores" className={`${SETA} left-2`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {podeSeguinte && (
          <button type="button" onClick={() => deslocar('seguinte')} aria-label="Ver próximos trabalhos" className={`${SETA} right-2`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </section>
  )
}
