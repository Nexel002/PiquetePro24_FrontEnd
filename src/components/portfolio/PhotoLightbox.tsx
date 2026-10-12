import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProjectPhoto } from '../../services/portfolio'

interface PhotoLightboxProps {
  photos: ProjectPhoto[]
  startIndex: number
  onClose: () => void
}

// Deslize horizontal mínimo (px) para contar como "passar à foto seguinte" e não como um
// toque trémulo.
const SWIPE_THRESHOLD_PX = 50

// Ecrã inteiro de UM trabalho: navega só pelas fotos desse trabalho (não pelo portfólio
// todo), com setas do teclado, botões e deslize.
export function PhotoLightbox({ photos, startIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), photos.length - 1))
  const touchStartX = useRef<number | null>(null)
  const multiple = photos.length > 1

  const move = useCallback(
    (delta: number) => setIndex((current) => Math.max(0, Math.min(photos.length - 1, current + delta))),
    [photos.length],
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') move(-1)
      if (event.key === 'ArrowRight') move(1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, move])

  function handleTouchEnd(clientX: number) {
    if (touchStartX.current === null) return
    const delta = clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) move(delta < 0 ? 1 : -1)
  }

  const photo = photos[index]
  if (!photo) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fotos do trabalho"
      onClick={onClose}
      onTouchStart={(event) => (touchStartX.current = event.touches[0].clientX)}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0].clientX)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-piquete-blue-deep/95 p-4 animate-fade-in"
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
        aria-label="Fechar"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20"
      >
        ×
      </button>

      <img src={photo.photo_url} alt="" className="max-h-full max-w-full rounded-2xl object-contain" onClick={(event) => event.stopPropagation()} />

      {multiple && (
        <>
          <span aria-live="polite" className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
            {index + 1}/{photos.length}
          </span>
          {index > 0 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                move(-1)
              }}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20"
            >
              ‹
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                move(1)
              }}
              aria-label="Foto seguinte"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20"
            >
              ›
            </button>
          )}
        </>
      )}
    </div>
  )
}
