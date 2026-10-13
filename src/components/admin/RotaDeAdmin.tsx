import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'

// Fronteira de acesso dos ecrãs de administração, aplicada na rota e não dentro de cada
// página: assim uma página de admin nem chega a montar (nem a pedir dados que dariam 403)
// para quem não é ADMIN. A UI só esconde — quem autoriza é o backend (`requireRole('ADMIN')`).
export function RotaDeAdmin({ children }: { children: ReactNode }) {
  const { data: profile, isLoading } = useProfile()

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-piquete-yellow border-t-piquete-blue" />
      </main>
    )
  }

  if (profile?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
