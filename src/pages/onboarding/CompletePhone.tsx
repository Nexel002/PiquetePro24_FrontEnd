import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile, useUpdateProfileDetails } from '../../hooks/useProfile'
import { ErroAoCarregarPerfil } from '../../components/ErroAoCarregarPerfil'
import { LocationForm } from '../../components/LocationForm'
import { getOnboardingStep } from '../../services/profile'
import { PHONE_PREFIX } from '../../lib/phone'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

// Onboarding obrigatório (ver OnboardingGate) — se faltar o telefone (registo via Google), pede-o;
// assim que fica guardado, se ainda faltar a localização, passa no mesmo ecrã ao passo de localização
// sem um redirect intermédio para outra página.
export function CompletePhone() {
  const { data: profile, isLoading, isError, refetch } = useProfile()
  const updateDetails = useUpdateProfileDetails()
  const [phoneDraft, setPhoneDraft] = useState('')

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-piquete-gray border-t-piquete-blue" />
      </main>
    )
  }

  if (isError || !profile) {
    return <ErroAoCarregarPerfil aoTentarDeNovo={() => void refetch()} />
  }

  const step = getOnboardingStep(profile)

  // Onboarding completo: segue para o perfil. Evita ficar preso nesta tela depois
  // de já ter sido concluída (ex. utilizador volta atrás no browser).
  if (step === 'complete') {
    return <Navigate to="/perfil" replace />
  }

  if (step === 'location') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
        <Card className="p-6 md:p-8">
          <header className="mb-6 text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-piquete-gray">Passo 2 de 2</p>
            <h1 className="text-2xl font-bold text-piquete-blue mb-2">Onde estás?</h1>
            <p className="text-sm text-gray-500">
              Precisamos da tua localização para te mostrar profissionais e pedidos perto de ti.
            </p>
          </header>

          <LocationForm profile={profile} />
        </Card>
      </main>
    )
  }

  const faltaLocalizacao = !profile.province && profile.latitude == null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    updateDetails.mutate({ phone: `${PHONE_PREFIX}${phoneDraft}` })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
      <Card className="p-6 md:p-8">
        <header className="mb-6 text-center">
          {faltaLocalizacao && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-piquete-gray">Passo 1 de 2</p>}
          <h1 className="text-2xl font-bold text-piquete-blue mb-2">Qual é o teu telefone?</h1>
          <p className="text-sm text-gray-500">
            Precisamos do teu contacto para que clientes e profissionais te consigam encontrar.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col w-full">
            <label htmlFor="onboarding-telefone" className="mb-1.5 text-sm font-semibold text-piquete-blue-dark">
              Telefone
            </label>
            <div className="flex overflow-hidden rounded-xl border border-gray-200 focus-within:border-piquete-blue focus-within:ring-2 focus-within:ring-piquete-blue/20 transition-all shadow-sm bg-white">
              <span className="flex items-center bg-gray-50 px-4 text-piquete-gray font-semibold border-r border-gray-100">
                {PHONE_PREFIX}
              </span>
              <input
                id="onboarding-telefone"
                type="tel"
                value={phoneDraft}
                onChange={(event) => setPhoneDraft(event.target.value)}
                autoFocus
                required
                className="flex-1 px-4 py-3 outline-none bg-transparent text-gray-900"
                placeholder="84 000 0000"
              />
            </div>
          </div>

          {updateDetails.isError && (
            <p role="alert" className="text-sm font-medium text-red-600 text-center bg-red-50 p-2 rounded-lg">
              {updateDetails.error instanceof Error
                ? updateDetails.error.message
                : 'Não foi possível guardar o telefone. Tenta novamente.'}
            </p>
          )}

          <Button
            type="submit"
            disabled={!phoneDraft || updateDetails.isPending}
            isLoading={updateDetails.isPending}
            className="w-full mt-2"
          >
            {updateDetails.isPending ? 'A guardar...' : 'Continuar'}
          </Button>
        </form>
      </Card>
    </main>
  )
}
