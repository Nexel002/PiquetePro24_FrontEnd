import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { ErroAoCarregarPerfil } from './ErroAoCarregarPerfil'
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
  const { data: profile, isLoading, isError, refetch } = useProfile()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-pulse rounded-full bg-gray-300" />
      </main>
    )
  }

  if (isError || !profile) {
    return <ErroAoCarregarPerfil aoTentarDeNovo={() => void refetch()} />
  }

  // O técnico entra com o email que a empresa lhe deu e não tem telefone nem morada a completar: a
  // localização serve para ser encontrado na pesquisa (que ele nunca integra) e o telefone é do
  // cliente. O que lhe falta é o KYC, e esse tem o seu próprio ecrã.
  if (profile.role === 'TECHNICIAN') {
    return <>{children}</>
  }

  const step = getOnboardingStep(profile)
  const requiredPath = step === 'complete' ? null : ONBOARDING_PATHS[step]
  const emOnboarding = location.pathname === ONBOARDING_PATHS.phone || location.pathname === ONBOARDING_PATHS.location

  // Já num ecrã de onboarding: deixa passar (CompletePhone transita do telefone para a localização
  // sem mudar de endereço, evitando um redirect em cascata).
  if (requiredPath && !emOnboarding) {
    return <Navigate to={requiredPath} replace />
  }

  return <>{children}</>
}
