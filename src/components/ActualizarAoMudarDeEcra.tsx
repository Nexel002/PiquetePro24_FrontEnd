import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { aplicarSePendente } from '../lib/novaVersao'

// Não desenha nada: se há uma versão nova já activa à espera de recarregar (lib/novaVersao.ts), a
// mudança de ecrã é o momento seguro — quem muda de ecrã já saiu do formulário onde estava. Recarrega
// no endereço novo, que abre já na versão nova.
export function ActualizarAoMudarDeEcra() {
  const { pathname } = useLocation()
  const anteriorRef = useRef(pathname)

  useEffect(() => {
    if (anteriorRef.current === pathname) return
    anteriorRef.current = pathname
    aplicarSePendente()
  }, [pathname])

  return null
}
