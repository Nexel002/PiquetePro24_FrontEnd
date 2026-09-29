import { useId, useState, type FormEvent } from 'react'
import { useUpdateLocation } from '../hooks/useProfile'
import { useGeolocation } from '../hooks/useGeolocation'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
import { MOZAMBIQUE_PROVINCES } from '../lib/provinces'
import type { UserProfile } from '../services/profile'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

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
  // useId e não um id fixo: o componente é partilhado (perfil e onboarding)
  const provinciaId = useId()

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
    <div className="flex flex-col gap-4">
      <div className="bg-piquete-blue/5 border border-piquete-blue/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Localização Atual</p>
        <p className="text-sm font-bold text-piquete-blue">
          {currentLocationLabel}
        </p>
      </div>

      <Button
        type="button"
        onClick={handleUseGps}
        disabled={geolocation.state.status === 'locating'}
        isLoading={geolocation.state.status === 'locating'}
        className="w-full"
      >
        {geolocation.state.status === 'locating' ? 'A localizar...' : 'Usar a minha localização (GPS)'}
      </Button>

      {geolocation.state.status === 'error' && (
        <p className="text-sm font-medium text-red-600 text-center">{geolocation.state.message}</p>
      )}

      {geolocation.state.status === 'success' && (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-piquete-yellow bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 text-center">
            Localização encontrada:{' '}
            <span className="text-piquete-blue block mt-1 text-base">
              {pendingPlace.data?.placeName ??
                (pendingPlace.isError
                  ? `${geolocation.state.coordinates.latitude.toFixed(4)}, ${geolocation.state.coordinates.longitude.toFixed(4)}`
                  : 'A identificar o lugar...')}
            </span>
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={handleConfirmGps}
            disabled={updateLocation.isPending}
            isLoading={updateLocation.isPending}
            className="w-full"
          >
            Confirmar esta localização
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3 my-2">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ou manual</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmitHierarchy} className="flex flex-col gap-4">
        <div className="flex flex-col w-full">
          <label htmlFor={provinciaId} className="mb-1.5 text-sm font-semibold text-piquete-blue-dark">
            Província
          </label>
          <div className="relative">
            <select
              id={provinciaId}
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              required
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue shadow-sm appearance-none"
            >
              <option value="" disabled>Seleciona a província</option>
              {MOZAMBIQUE_PROVINCES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>

        <Input
          label="Distrito (opcional)"
          type="text"
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
        />

        <Input
          label="Bairro (opcional)"
          type="text"
          value={neighborhood}
          onChange={(event) => setNeighborhood(event.target.value)}
        />

        <Button
          type="submit"
          variant="outline"
          disabled={!province || updateLocation.isPending}
          isLoading={updateLocation.isPending}
          className="w-full mt-2"
        >
          Guardar localização manual
        </Button>
      </form>

      {updateLocation.isError && (
        <p className="text-sm font-medium text-red-600 text-center bg-red-50 p-2 rounded-lg mt-2">
          Não foi possível guardar a localização. Tenta novamente.
        </p>
      )}
      {updateLocation.isSuccess && (
        <p className="text-sm font-medium text-green-700 text-center bg-green-50 p-2 rounded-lg mt-2">
          Localização atualizada com sucesso!
        </p>
      )}
    </div>
  )
}
