import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { caminhoDoLogin } from '../lib/postLoginRedirect'
import { useAuth } from '../store/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-pulse rounded-full bg-gray-300" />
      </main>
    )
  }

  if (!session) {
    // Leva o destino: quem toca num cartão da Home sem sessão entra e chega ao que queria,
    // em vez de cair na Home outra vez.
    return <Navigate to={caminhoDoLogin(location.pathname + location.search)} replace />
  }

  return <>{children}</>
}
