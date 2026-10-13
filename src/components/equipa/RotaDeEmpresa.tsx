import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'

// Só a conta de uma empresa (PROFESSIONAL do tipo COMPANY) vê a equipa. Um singular, um cliente ou
// um técnico voltam à Home. A UI só esconde: quem autoriza é o backend (requireCompany).
export function RotaDeEmpresa({ children }: { children: ReactNode }) {
  const { data: profile, isLoading } = useProfile()

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-piquete-yellow border-t-piquete-blue" />
      </main>
    )
  }

  if (profile?.role !== 'PROFESSIONAL' || profile.professional_type !== 'COMPANY') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Só a conta de um técnico. Mesma ideia: esconder; o backend autoriza.
export function RotaDeTecnico({ children }: { children: ReactNode }) {
  const { data: profile, isLoading } = useProfile()

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-piquete-yellow border-t-piquete-blue" />
      </main>
    )
  }

  if (profile?.role !== 'TECHNICIAN') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
