import { Navigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import { getOnboardingStep } from '../../services/profile'
import { LocationForm } from '../../components/LocationForm'

// Passo 2 (último) do onboarding obrigatório (ver OnboardingGate). Reaproveita
// LocationForm — o mesmo GPS + fallback hierárquico da tela de perfil — sem opção de
// saltar. onSaved não precisa de navegar explicitamente: assim que a localização é
// gravada, o React Query atualiza o profile em cache, getOnboardingStep passa a
// 'complete', e o OnboardingGate (que envolve esta rota) deixa de redirecionar para
// cá no próximo render.
export function CompleteLocation() {
  const { data: profile, isLoading, isError } = useProfile()

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
  if (step === 'phone') {
    return <Navigate to="/completar-perfil/telefone" replace />
  }
  if (step === 'complete') {
    return <Navigate to="/perfil" replace />
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Onde estás?</h1>
        <p className="text-sm text-gray-600">
          Precisamos da tua localização para te mostrar profissionais e pedidos perto de ti.
        </p>
      </header>

      <LocationForm profile={profile} />
    </main>
  )
}
