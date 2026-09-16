import { useState, type FormEvent } from 'react'
import { useProfile, useUpdateLocation, useUpdateProfileDetails } from '../hooks/useProfile'
import { useGeolocation } from '../hooks/useGeolocation'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
import { MOZAMBIQUE_PROVINCES } from '../lib/provinces'
import type { UserRole } from '../services/profile'

// Espelha o enum user_role do backend — nunca mostrar o valor cru ('CLIENT') ao
// utilizador.
const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Administrador',
}

const memberSinceFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' })

// Todos os telefones deste projeto seguem a convenção +258 (Moçambique — ver
// Login.tsx). No formulário de edição, o prefixo fica visível mas fixo: o
// utilizador só edita os dígitos locais, nunca reescreve o indicativo do país.
const PHONE_PREFIX = '+258'

function stripPhonePrefix(phone: string): string {
  return phone.startsWith(PHONE_PREFIX) ? phone.slice(PHONE_PREFIX.length) : phone
}

export function Profile() {
  const { data: profile, isLoading, isError } = useProfile()
  const updateLocation = useUpdateLocation()
  const updateDetails = useUpdateProfileDetails()
  const geolocation = useGeolocation()

  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [neighborhood, setNeighborhood] = useState('')

  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [fullNameDraft, setFullNameDraft] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')

  function handleStartEditingDetails() {
    if (!profile) return
    setFullNameDraft(profile.full_name)
    setPhoneDraft(stripPhonePrefix(profile.phone))
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

  // Traduz as coordenadas do GPS recém-obtido (antes de confirmar) para um nome de
  // lugar — só ativa quando o GPS já respondeu com sucesso.
  const pendingCoordinates = geolocation.state.status === 'success' ? geolocation.state.coordinates : null
  const pendingPlace = useReverseGeocode(pendingCoordinates)

  // Traduz as coordenadas já gravadas no perfil (quando a localização foi definida
  // por GPS) para o mesmo nome de lugar em vez de "GPS registado".
  const savedCoordinates =
    profile?.latitude != null && profile.longitude != null
      ? { latitude: profile.latitude, longitude: profile.longitude }
      : null
  const savedPlace = useReverseGeocode(savedCoordinates)

  function handleUseGps() {
    geolocation.locate()
  }

  // O efeito de gravar assim que o GPS responde fica no handler do botão "Confirmar",
  // não automático ao obter coordenadas — o utilizador vê o resultado antes de o
  // backend gravar, consistente com o fluxo do fallback manual (que também só grava
  // ao submeter o formulário).
  function handleConfirmGps() {
    if (geolocation.state.status !== 'success') return
    updateLocation.mutate(geolocation.state.coordinates)
  }

  function handleSubmitHierarchy(event: FormEvent) {
    event.preventDefault()
    if (!province) return
    updateLocation.mutate({
      province,
      district: district || undefined,
      neighborhood: neighborhood || undefined,
    })
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

  const currentLocationLabel = savedCoordinates
    ? (savedPlace.data ?? (savedPlace.isError ? 'GPS registado' : 'A identificar o lugar...'))
    : profile.province
      ? [profile.province, profile.district, profile.neighborhood].filter(Boolean).join(' — ')
      : 'Ainda não definida'

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
        <p className="text-sm text-gray-600">Localização atual: {currentLocationLabel}</p>

        <button
          type="button"
          onClick={handleUseGps}
          disabled={geolocation.state.status === 'locating'}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {geolocation.state.status === 'locating' ? 'A localizar...' : 'Usar minha localização'}
        </button>

        {geolocation.state.status === 'error' && (
          <p className="text-sm text-red-600">{geolocation.state.message}</p>
        )}

        {geolocation.state.status === 'success' && (
          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
            <p className="text-sm text-gray-700">
              Localização encontrada:{' '}
              {pendingPlace.data ??
                (pendingPlace.isError
                  ? `${geolocation.state.coordinates.latitude.toFixed(4)}, ${geolocation.state.coordinates.longitude.toFixed(4)}`
                  : 'a identificar o lugar...')}
            </p>
            <button
              type="button"
              onClick={handleConfirmGps}
              disabled={updateLocation.isPending}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Confirmar esta localização
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          ou escolhe manualmente
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSubmitHierarchy} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Província
            <select
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              required
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="" disabled>
                Seleciona a província
              </option>
              {MOZAMBIQUE_PROVINCES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Distrito (opcional)
            <input
              type="text"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Bairro (opcional)
            <input
              type="text"
              value={neighborhood}
              onChange={(event) => setNeighborhood(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={!province || updateLocation.isPending}
            className="rounded-lg border border-gray-900 px-4 py-2 text-sm font-medium text-gray-900 disabled:opacity-50"
          >
            Guardar localização manual
          </button>
        </form>

        {updateLocation.isError && (
          <p className="text-sm text-red-600">
            Não foi possível guardar a localização. Tenta novamente.
          </p>
        )}
        {updateLocation.isSuccess && (
          <p className="text-sm text-green-700">Localização atualizada.</p>
        )}
      </section>
    </main>
  )
}
