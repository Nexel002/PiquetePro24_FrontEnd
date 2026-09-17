import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useNearbyProfessionals } from '../hooks/useNearbyProfessionals'
import { useCreateServiceRequest } from '../hooks/useServiceRequests'
import { useProfile } from '../hooks/useProfile'

const PROFESSIONAL_TYPE_LABELS = { SINGULAR: 'Singular', COMPANY: 'Empresa' } as const

// Cliente pede a própria localização (GPS) para procurar profissionais num raio à
// volta — mesmo padrão de useGeolocation já usado em LocationForm.tsx, mas aqui serve
// só para a busca, não para gravar no perfil.
export function FindProfessionals() {
  const { data: profile } = useProfile()
  const geolocation = useGeolocation()
  const [radiusKm, setRadiusKm] = useState(10)
  const [creatingForId, setCreatingForId] = useState<string | null>(null)
  const [title, setTitle] = useState('')

  const coordinates = geolocation.state.status === 'success' ? geolocation.state.coordinates : null
  const nearby = useNearbyProfessionals(coordinates, { radiusKm })
  const createRequest = useCreateServiceRequest()

  function handleLocate() {
    geolocation.locate()
  }

  function handleSubmitRequest(event: FormEvent) {
    event.preventDefault()
    if (!coordinates || !profile || !title.trim()) return

    createRequest.mutate(
      {
        title,
        location: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          province: profile.province ?? '',
        },
      },
      {
        onSuccess: () => {
          setCreatingForId(null)
          setTitle('')
        },
      },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Profissionais perto de ti</h1>
        <Link to="/perfil" className="text-sm text-gray-600 underline">
          Perfil
        </Link>
      </header>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleLocate}
          disabled={geolocation.state.status === 'locating'}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {geolocation.state.status === 'locating' ? 'A localizar...' : 'Usar minha localização'}
        </button>

        {geolocation.state.status === 'error' && (
          <p className="text-sm text-red-600">{geolocation.state.message}</p>
        )}

        {coordinates && (
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Raio de busca: {radiusKm} km
            <input
              type="range"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(event) => setRadiusKm(Number(event.target.value))}
            />
          </label>
        )}
      </div>

      {coordinates && nearby.isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-16 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-16 animate-pulse rounded-lg bg-gray-200" />
        </div>
      )}

      {coordinates && nearby.isError && (
        <p className="text-sm text-gray-600">
          Não foi possível procurar profissionais agora. Verifica a tua ligação e tenta novamente.
        </p>
      )}

      {coordinates && nearby.data && nearby.data.length === 0 && (
        <p className="text-sm text-gray-600">Nenhum profissional encontrado neste raio. Tenta aumentar o raio.</p>
      )}

      {coordinates && nearby.data && nearby.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {nearby.data.map((professional) => (
            <li key={professional.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-3">
                {professional.avatar_url ? (
                  <img src={professional.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div
                    aria-hidden
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-500"
                  >
                    {professional.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{professional.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {professional.professional_type ? PROFESSIONAL_TYPE_LABELS[professional.professional_type] : ''}
                    {' · '}
                    {(professional.distance_m / 1000).toFixed(1)} km
                  </p>
                </div>
                {creatingForId !== professional.id && (
                  <button
                    type="button"
                    onClick={() => setCreatingForId(professional.id)}
                    className="rounded-lg border border-gray-900 px-3 py-1.5 text-sm font-medium text-gray-900"
                  >
                    Pedir serviço
                  </button>
                )}
              </div>

              {creatingForId === professional.id && (
                <form onSubmit={handleSubmitRequest} className="flex flex-col gap-2 border-t border-gray-200 pt-2">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    O que precisas?
                    <input
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                      placeholder="Ex: Reparar torneira"
                      className="rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={createRequest.isPending}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {createRequest.isPending ? 'A enviar...' : 'Enviar pedido'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatingForId(null)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                  {createRequest.isError && (
                    <p className="text-sm text-red-600">Não foi possível criar o pedido. Tenta novamente.</p>
                  )}
                  {createRequest.isSuccess && <p className="text-sm text-green-700">Pedido criado com sucesso.</p>}
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
