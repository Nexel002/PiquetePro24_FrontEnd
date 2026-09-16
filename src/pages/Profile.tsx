import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeleteAccount, useProfile, useUpdateProfileDetails, useUploadAvatar } from '../hooks/useProfile'
import { LocationForm } from '../components/LocationForm'
import { PHONE_PREFIX, stripPhonePrefix } from '../lib/phone'
import { AvatarUploadError } from '../services/avatar'
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
  const navigate = useNavigate()
  const { data: profile, isLoading, isError } = useProfile()
  const updateDetails = useUpdateProfileDetails()
  const uploadAvatar = useUploadAvatar()
  const deleteAccount = useDeleteAccount()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [fullNameDraft, setFullNameDraft] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  function handleConfirmDeleteAccount() {
    deleteAccount.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })
  }

  function handleAvatarSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite escolher o mesmo ficheiro outra vez a seguir
    if (file) uploadAvatar.mutate(file)
  }

  function handleRemoveAvatar() {
    updateDetails.mutate({ avatar_url: null })
  }

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

  const avatarErrorMessage =
    uploadAvatar.error instanceof AvatarUploadError
      ? uploadAvatar.error.message
      : 'Não foi possível enviar a foto. Tenta novamente.'

  const deleteAccountErrorMessage =
    deleteAccount.error instanceof Error
      ? deleteAccount.error.message
      : 'Não foi possível apagar a conta. Tenta novamente.'

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-xl font-medium text-gray-500"
          >
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">O meu perfil</h1>
          <p className="text-sm text-gray-600">{profile.full_name}</p>
        </div>
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
            {/* Foto de perfil: opcional, upload de ficheiro ou câmara (capture="user"
                abre a câmara frontal em dispositivos móveis que a suportam; em
                desktop cai para a seleção de ficheiro normal). Conversão para WebP
                acontece em services/avatar.ts antes do upload. */}
            <div className="flex items-center gap-3">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div
                  aria-hidden
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-lg font-medium text-gray-500"
                >
                  {fullNameDraft.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadAvatar.isPending}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
                  >
                    {uploadAvatar.isPending ? 'A enviar...' : 'Alterar foto'}
                  </button>
                  {profile.avatar_url && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={updateDetails.isPending || uploadAvatar.isPending}
                      className="text-sm text-gray-600 underline disabled:opacity-50"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {uploadAvatar.isError && <p className="text-sm text-red-600">{avatarErrorMessage}</p>}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleAvatarSelected}
                hidden
              />
            </div>

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

      <section className="flex flex-col gap-2 rounded-lg border border-red-200 p-4">
        <h2 className="text-lg font-medium text-red-700">Zona de perigo</h2>

        {isConfirmingDelete ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-700">
              Isto apaga a tua conta e todos os dados associados (perfil, localização, foto,
              pedidos, KYC, subscrição) de forma <strong>irreversível</strong>. Não há como
              recuperar depois.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={deleteAccount.isPending}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {deleteAccount.isPending ? 'A apagar...' : 'Sim, apagar a minha conta'}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={deleteAccount.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
            {deleteAccount.isError && <p className="text-sm text-red-600">{deleteAccountErrorMessage}</p>}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="self-start rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700"
          >
            Apagar conta
          </button>
        )}
      </section>
    </main>
  )
}
