import { useState, type FormEvent } from 'react'
import { useProfile, useUpdateLocation } from '../hooks/useProfile'
import { useGeolocation } from '../hooks/useGeolocation'
import { MOZAMBIQUE_PROVINCES } from '../lib/provinces'

export function Profile() {
  const { data: profile, isLoading, isError } = useProfile()
  const updateLocation = useUpdateLocation()
  const geolocation = useGeolocation()

  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [neighborhood, setNeighborhood] = useState('')

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

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">O meu perfil</h1>
        <p className="text-sm text-gray-600">{profile.full_name}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-gray-900">Localização</h2>
        <p className="text-sm text-gray-600">
          Localização atual:{' '}
          {profile.location
            ? 'GPS registado'
            : profile.province
              ? [profile.province, profile.district, profile.neighborhood].filter(Boolean).join(' — ')
              : 'Ainda não definida'}
        </p>

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
              Localização encontrada ({geolocation.state.coordinates.latitude.toFixed(4)},{' '}
              {geolocation.state.coordinates.longitude.toFixed(4)}).
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
