import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile, useUpdateProfileDetails } from '../../hooks/useProfile'
import { getOnboardingStep } from '../../services/profile'
import { PHONE_PREFIX } from '../../lib/phone'

// Passo 1 do onboarding obrigatório (ver OnboardingGate) — só chega aqui quem tem
// phone null, o que hoje só acontece a quem se regista via Google. Sem opção de
// "saltar": o botão só existe para submeter, sem link de "mais tarde".
export function CompletePhone() {
  const { data: profile, isLoading, isError } = useProfile()
  const updateDetails = useUpdateProfileDetails()
  const [phoneDraft, setPhoneDraft] = useState('')

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

  // Já tem telefone: nada a fazer aqui — segue para o próximo passo em falta, ou para
  // o perfil se o onboarding já estiver completo. Evita ficar preso nesta tela depois
  // de já ter sido concluída (ex. utilizador volta atrás no browser).
  if (getOnboardingStep(profile) !== 'phone') {
    return <Navigate to="/perfil" replace />
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    updateDetails.mutate({ phone: `${PHONE_PREFIX}${phoneDraft}` })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Qual é o teu telefone?</h1>
        <p className="text-sm text-gray-600">
          Precisamos do teu contacto para que clientes e profissionais te consigam encontrar.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Telefone
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            <span className="flex items-center bg-gray-100 px-3 text-gray-500">{PHONE_PREFIX}</span>
            <input
              type="tel"
              value={phoneDraft}
              onChange={(event) => setPhoneDraft(event.target.value)}
              autoFocus
              required
              className="flex-1 px-3 py-2 outline-none"
            />
          </div>
        </label>

        {updateDetails.isError && (
          <p role="alert" className="text-sm text-red-600">
            {updateDetails.error instanceof Error
              ? updateDetails.error.message
              : 'Não foi possível guardar o telefone. Tenta novamente.'}
          </p>
        )}

        <button
          type="submit"
          disabled={!phoneDraft || updateDetails.isPending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updateDetails.isPending ? 'A guardar...' : 'Continuar'}
        </button>
      </form>
    </main>
  )
}
