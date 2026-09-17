import { useState, type FormEvent } from 'react'
import { useUpdateLocation } from '../hooks/useProfile'
import { useGeolocation } from '../hooks/useGeolocation'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
import { MOZAMBIQUE_PROVINCES } from '../lib/provinces'
import type { UserProfile } from '../services/profile'

// Formulário de localização (GPS + fallback hierárquico) partilhado entre a tela de
// perfil (onde é opcional editar de novo) e o onboarding obrigatório
// (pages/onboarding/CompleteLocation.tsx, sem opção de saltar). onSaved é chamado só
// depois de o backend confirmar a gravação — o onboarding usa isso para avançar.
export function LocationForm({ profile, onSaved }: { profile: UserProfile; onSaved?: () => void }) {
  const updateLocation = useUpdateLocation()
  const geolocation = useGeolocation()

  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [neighborhood, setNeighborhood] = useState('')

  // Traduz as coordenadas do GPS recém-obtido (antes de confirmar) para um nome de
  // lugar — só ativa quando o GPS já respondeu com sucesso.
  const pendingCoordinates = geolocation.state.status === 'success' ? geolocation.state.coordinates : null
  const pendingPlace = useReverseGeocode(pendingCoordinates)

  // Traduz as coordenadas já gravadas no perfil (quando a localização foi definida
  // por GPS) para o mesmo nome de lugar em vez de "GPS registado".
  const savedCoordinates =
    profile.latitude != null && profile.longitude != null
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
  //
  // province/district/neighborhood vão junto das coordenadas quando a geocodificação
  // reversa já respondeu (pendingPlace.data) — cache legível da hierarquia ao lado do
  // GPS, para não deixar esses campos sempre em branco quando a localização vem por
  // GPS. Se a geocodificação ainda não respondeu ou falhou, seguem undefined e o
  // backend grava null nesses campos (não bloqueia a confirmação por isso).
  function handleConfirmGps() {
    if (geolocation.state.status !== 'success') return
    updateLocation.mutate(
      {
        ...geolocation.state.coordinates,
        province: pendingPlace.data?.province ?? undefined,
        district: pendingPlace.data?.district ?? undefined,
        neighborhood: pendingPlace.data?.neighborhood ?? undefined,
      },
      { onSuccess: onSaved },
    )
  }

  function handleSubmitHierarchy(event: FormEvent) {
    event.preventDefault()
    if (!province) return
    updateLocation.mutate(
      { province, district: district || undefined, neighborhood: neighborhood || undefined },
      { onSuccess: onSaved },
    )
  }

  const currentLocationLabel = savedCoordinates
    ? (savedPlace.data?.placeName ?? (savedPlace.isError ? 'GPS registado' : 'A identificar o lugar...'))
    : profile.province
      ? [profile.province, profile.district, profile.neighborhood].filter(Boolean).join(' — ')
      : 'Ainda não definida'

  return (
    <div className="flex flex-col gap-3">
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
            {pendingPlace.data?.placeName ??
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
        <p className="text-sm text-red-600">Não foi possível guardar a localização. Tenta novamente.</p>
      )}
      {updateLocation.isSuccess && <p className="text-sm text-green-700">Localização atualizada.</p>}
    </div>
  )
}
