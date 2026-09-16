import { useState, type FormEvent } from 'react'
import { useProfile, useUpdateProfileDetails } from '../hooks/useProfile'
import { LocationForm } from '../components/LocationForm'
import { PHONE_PREFIX, stripPhonePrefix } from '../lib/phone'
import type { UserRole } from '../services/profile'

// Espelha o enum user_role do backend — nunca mostrar o valor cru ('CLIENT') ao
// utilizador.
const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Administrador',
}

const memberSinceFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' })

export function Profile() {
  const { data: profile, isLoading, isError } = useProfile()
  const updateDetails = useUpdateProfileDetails()

  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [fullNameDraft, setFullNameDraft] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')

  function handleStartEditingDetails() {
    if (!profile) return
    setFullNameDraft(profile.full_name)
    // profile.phone só é null antes do onboarding obrigatório (ver OnboardingGate),
    // que corre sempre antes de qualquer rota chegar a esta tela — em runtime nunca é
    // null aqui, mas o tipo é string | null porque a mesma UserProfile serve o estado
    // pré-onboarding.
    setPhoneDraft(stripPhonePrefix(profile.phone ?? ''))
    setIsEditingDetails(true)
  }

  function handleCancelEditingDetails() {
    setIsEditingDetails(false)
    updateDetails.reset()
  }

  function handleSubmitDetails(event: FormEvent) {
    event.preventDefault()
    updateDetails.mutate(
      { full_name: fullNameDraft, phone: `${PHONE_PREFIX}${phoneDraft}` },
      { onSuccess: () => setIsEditingDetails(false) },
    )
  }

  if (isLoading) {
    return (
      <main className="flex min-h-dvh flex-col gap-4 p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded bg-gray-200" />
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

  // O interceptor de api.ts (src/lib/api.ts) já desempacota error.response.data.error
  // num Error simples — a mensagem do backend (ex. "Este telefone já está associado a
  // outra conta.", 409) chega diretamente em .message, sem erro técnico cru.
  const detailsErrorMessage =
    updateDetails.error instanceof Error
      ? updateDetails.error.message
      : 'Não foi possível guardar os dados. Tenta novamente.'

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">O meu perfil</h1>
        <p className="text-sm text-gray-600">{profile.full_name}</p>
      </header>

      <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Os meus dados</h2>
          {!isEditingDetails && (
            <button
              type="button"
              onClick={handleStartEditingDetails}
              className="text-sm text-gray-600 underline"
            >
              Editar
            </button>
          )}
        </div>

        {isEditingDetails ? (
          <form onSubmit={handleSubmitDetails} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Nome
              <input
                type="text"
                value={fullNameDraft}
                onChange={(event) => setFullNameDraft(event.target.value)}
                required
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Telefone
              <div className="flex overflow-hidden rounded-lg border border-gray-300">
                {/* Indicativo fixo, não editável: todos os telefones do projeto são
                    +258 (Moçambique) — o utilizador só edita os dígitos locais, nunca
                    reescreve o indicativo do país. */}
                <span className="flex items-center bg-gray-100 px-3 text-gray-500">{PHONE_PREFIX}</span>
                <input
                  type="tel"
                  value={phoneDraft}
                  onChange={(event) => setPhoneDraft(event.target.value)}
                  required
                  className="flex-1 px-3 py-2 outline-none"
                />
              </div>
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updateDetails.isPending}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {updateDetails.isPending ? 'A guardar...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={handleCancelEditingDetails}
                disabled={updateDetails.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>

            {updateDetails.isError && <p className="text-sm text-red-600">{detailsErrorMessage}</p>}
          </form>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-gray-500">Nome</dt>
            <dd className="text-gray-900">{profile.full_name}</dd>

            <dt className="text-gray-500">Telefone</dt>
            <dd className="text-gray-900">{profile.phone}</dd>

            <dt className="text-gray-500">Tipo de conta</dt>
            <dd className="text-gray-900">{ROLE_LABELS[profile.role]}</dd>

            <dt className="text-gray-500">Membro desde</dt>
            <dd className="text-gray-900">{memberSinceFormatter.format(new Date(profile.created_at))}</dd>
          </dl>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-gray-900">Localização</h2>
        <LocationForm profile={profile} />
      </section>
    </main>
  )
}
