import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-pulse rounded-full bg-gray-300" />
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/entrar" replace />
  }

  return <>{children}</>
}
