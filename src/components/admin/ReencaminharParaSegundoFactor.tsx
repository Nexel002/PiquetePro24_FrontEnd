import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { aoFaltarSegundoFactor } from '../../lib/segundoFactorExigido'

export const ROTA_DE_SEGURANCA = '/admin/seguranca'

// Sem interface: só reage ao aviso do interceptor da API e leva o admin ao ecrã onde se ativa o
// segundo factor. Vive dentro do router (precisa de `useNavigate`), mas fora das rotas, porque o
// 403 pode chegar de qualquer ecrã de admin.
export function ReencaminharParaSegundoFactor() {
  const navegar = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    return aoFaltarSegundoFactor(() => {
      // Já lá estando, o ecrã explica-se a si próprio; navegar outra vez só pisca a página.
      if (pathname === ROTA_DE_SEGURANCA) return
      // `replace`: o ecrã anterior só dava 403, voltar atrás para ele não ajuda ninguém.
      navegar(ROTA_DE_SEGURANCA, { replace: true, state: { segundoFactorExigido: true } })
    })
  }, [navegar, pathname])

  return null
}
