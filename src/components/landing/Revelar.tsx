import { useEffect, useRef, useState, type ReactNode } from 'react'

interface RevelarProps {
  children: ReactNode
  // Escalona elementos irmãos (ms) para entrarem em cascata e não todos de uma vez.
  atraso?: number
  className?: string
}

// Faz o conteúdo subir e aparecer quando entra no ecrã. Sem biblioteca: um IntersectionObserver
// e duas classes de transição (CLAUDE.md, secção 0 — o bundle é uma decisão de produto).
// Mostra logo, sem animação, quando não há IntersectionObserver ou o utilizador pediu menos
// movimento: esconder conteúdo à espera de um observador que nunca dispara deixava a página vazia.
export function Revelar({ children, atraso = 0, className = '' }: RevelarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const semAnimacao =
    typeof IntersectionObserver === 'undefined' ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [visivel, setVisivel] = useState(semAnimacao)

  useEffect(() => {
    const el = ref.current
    if (visivel || !el) return
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return
        setVisivel(true)
        observador.disconnect()
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [visivel])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visivel && atraso ? `${atraso}ms` : undefined }}
      className={`transition-all duration-700 ease-out ${visivel ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}
    >
      {children}
    </div>
  )
}
