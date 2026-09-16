import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { getOnboardingStep } from '../services/profile'

const ONBOARDING_PATHS = {
  phone: '/completar-perfil/telefone',
  location: '/completar-perfil/localizacao',
} as const

// Corre dentro de ProtectedRoute (sessão já garantida) em qualquer rota que exija
// onboarding completo. Redireciona para o passo em falta (telefone antes de
// localização — pedido explícito: quem se regista via Google não tem telefone) e
// nunca deixa "saltar": as duas telas de onboarding não têm link de "mais tarde".
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { data: profile, isLoading, isError } = useProfile()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-pulse rounded-full bg-gray-300" />
      </main>
    )
  }

  if (isError || !profile) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm text-gray-600">
          Não foi possível carregar o teu perfil. Verifica a tua ligação e tenta novamente.
        </p>
      </main>
    )
  }

  const step = getOnboardingStep(profile)
  const requiredPath = step === 'complete' ? null : ONBOARDING_PATHS[step]

  // Já no caminho de onboarding certo: deixa passar, mesmo que ainda falte o passo
  // seguinte (evita loop de redirect dentro da própria tela de onboarding).
  if (requiredPath && location.pathname !== requiredPath) {
    return <Navigate to={requiredPath} replace />
  }

  return <>{children}</>
}
