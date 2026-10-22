import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { aplicarMetadados } from '../lib/metadadosDaPagina'

// Não desenha nada: a cada mudança de ecrã, põe o título, a descrição, o `canonical` e o `robots`
// da página (lib/metadadosDaPagina.ts). Rotas que não são públicas ficam com `noindex`.
export function MetadadosDaPagina() {
  const { pathname } = useLocation()

  useEffect(() => {
    aplicarMetadados(pathname)
  }, [pathname])

  return null
}
