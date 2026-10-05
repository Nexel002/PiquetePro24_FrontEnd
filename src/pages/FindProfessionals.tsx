import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useNearbyProfessionals } from '../hooks/useNearbyProfessionals'
import { useCreateServiceRequest } from '../hooks/useServiceRequests'
import { useProfile } from '../hooks/useProfile'
import { BackButton } from '../components/BackButton'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

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
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl font-bold text-piquete-blue">Profissionais perto de ti</h1>
        <Link to="/perfil" className="text-sm font-medium text-piquete-blue hover:underline">
          Perfil
        </Link>
      </header>

      <Card className="p-5 flex flex-col gap-4">
        <Button
          type="button"
          onClick={handleLocate}
          disabled={geolocation.state.status === 'locating'}
          isLoading={geolocation.state.status === 'locating'}
          className="w-full"
        >
          {geolocation.state.status === 'locating' ? 'A localizar...' : 'Usar minha localização'}
        </Button>

        {geolocation.state.status === 'error' && (
          <p className="text-sm font-medium text-red-600 text-center">{geolocation.state.message}</p>
        )}

        {coordinates && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-piquete-blue-dark">Raio de busca</span>
              <span className="text-sm font-bold text-piquete-blue">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(event) => setRadiusKm(Number(event.target.value))}
              className="w-full accent-piquete-blue"
            />
          </div>
        )}
      </Card>

      {coordinates && nearby.isLoading && (
        <div className="flex flex-col gap-3">
          <Card className="p-4 flex gap-4 items-center">
            <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
            </div>
          </Card>
          <Card className="p-4 flex gap-4 items-center">
            <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
            </div>
          </Card>
        </div>
      )}

      {coordinates && nearby.isError && (
        <Card className="p-4 text-center border-red-100 bg-red-50">
          <p className="text-sm font-medium text-red-600">
            Não foi possível procurar profissionais agora. Verifica a tua ligação e tenta novamente.
          </p>
        </Card>
      )}

      {coordinates && nearby.data && nearby.data.length === 0 && (
        <Card className="p-8 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">Nenhum profissional encontrado neste raio. Tenta aumentar a distância.</p>
        </Card>
      )}

      {coordinates && nearby.data && nearby.data.length > 0 && (
        <ul className="flex flex-col gap-4">
          {nearby.data.map((professional) => (
            <li key={professional.id}>
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  {professional.avatar_url ? (
                    <img src={professional.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover shadow-sm border border-gray-100" />
                  ) : (
                    <div
                      aria-hidden
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-piquete-blue/10 text-lg font-bold text-piquete-blue"
                    >
                      {professional.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <Link to={`/profissionais/${professional.id}`} className="flex-1">
                    <p className="text-base font-bold text-gray-900 hover:underline">{professional.full_name}</p>
                    <p className="text-xs font-medium text-piquete-gray">
                      {professional.professional_type ? PROFESSIONAL_TYPE_LABELS[professional.professional_type] : ''}
                      <span className="mx-1">•</span>
                      <span className="text-piquete-blue font-semibold">{(professional.distance_m / 1000).toFixed(1)} km</span>
                    </p>
                  </Link>
                  {creatingForId !== professional.id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreatingForId(professional.id)}
                    >
                      Pedir
                    </Button>
                  )}
                </div>

                {creatingForId === professional.id && (
                  <form onSubmit={handleSubmitRequest} className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100">
                    <Input
                      label="O que precisas?"
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                      placeholder="Ex: Reparar torneira"
                    />
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="submit"
                        disabled={createRequest.isPending}
                        isLoading={createRequest.isPending}
                        className="flex-1"
                      >
                        Enviar
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setCreatingForId(null)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
