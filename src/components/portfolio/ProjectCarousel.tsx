import { useRef, useState } from 'react'
import type { ProjectPhoto } from '../../services/portfolio'

interface ProjectCarouselProps {
  photos: ProjectPhoto[]
  /** Quando dado, tocar numa foto chama-o com o índice (abre o ecrã inteiro). */
  onOpenPhoto?: (index: number) => void
  className?: string
}

// Carrossel de um trabalho, como um post com várias imagens. scroll-snap nativo e não uma
// biblioteca: o público usa telemóveis de gama baixa em 3G (CLAUDE.md, Secção 0) e o
// deslizar com o dedo, a inércia e o encaixe já vêm do browser sem um byte de JavaScript
// a mais. O JS só lê a posição para o contador e os pontos.
export function ProjectCarousel({ photos, onOpenPhoto, className = '' }: ProjectCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)
  const multiple = photos.length > 1

  function handleScroll() {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setIndex(Math.min(photos.length - 1, Math.round(track.scrollLeft / track.clientWidth)))
  }

  function goTo(target: number) {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(photos.length - 1, target))
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' })
  }

  return (
    <div
      role="group"
      aria-roledescription="carrossel"
      aria-label={multiple ? `Fotos do trabalho, ${photos.length} no total` : 'Foto do trabalho'}
      className={`relative overflow-hidden bg-gray-100 ${className}`}
    >
      <ul
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
      >
        {photos.map((photo, position) => (
          <li
            key={photo.id}
            aria-label={`Foto ${position + 1} de ${photos.length}`}
            className="h-full w-full shrink-0 snap-center"
          >
            {onOpenPhoto ? (
              <button
                type="button"
                onClick={() => onOpenPhoto(position)}
                aria-label="Ver foto em ecrã inteiro"
                className="block h-full w-full"
              >
                <img src={photo.photo_url} alt="" loading={position === 0 ? 'eager' : 'lazy'} draggable={false} className="h-full w-full object-cover" />
              </button>
            ) : (
              <img src={photo.photo_url} alt="" loading={position === 0 ? 'eager' : 'lazy'} draggable={false} className="h-full w-full object-cover" />
            )}
          </li>
        ))}
      </ul>

      {multiple && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-3 rounded-full bg-piquete-blue-deep/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur"
          >
            {index + 1}/{photos.length}
          </span>

          {/* Setas só onde há rato: no telemóvel o gesto basta e as setas tapavam a foto. */}
          {index > 0 && (
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-piquete-blue shadow-sm transition-colors hover:bg-white [@media(hover:hover)]:flex"
            >
              ‹
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="Foto seguinte"
              className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-piquete-blue shadow-sm transition-colors hover:bg-white [@media(hover:hover)]:flex"
            >
              ›
            </button>
          )}

          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
            {photos.map((photo, position) => (
              <span
                key={photo.id}
                className={`h-1.5 rounded-full transition-all ${position === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
