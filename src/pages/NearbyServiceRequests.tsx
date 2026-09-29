import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAssignServiceRequest, useNearbyServiceRequests } from '../hooks/useServiceRequests'
import { BackButton } from '../components/BackButton'
import { EligibilityNotice } from '../components/EligibilityNotice'
import { useProfessionalEligibility } from '../hooks/useProfessionalEligibility'

// Só faz sentido para profissionais (Home.tsx só mostra o link quando
// profile.role === 'PROFESSIONAL') — não há verificação de role aqui porque o
// backend já rejeitaria o assign de um CLIENT com o próprio fluxo de negócio (o
// endpoint aceita qualquer autenticado, mas nada na app dá acesso à rota a um
// CLIENT, ver Home.tsx).
export function NearbyServiceRequests() {
  const geolocation = useGeolocation()
  const [radiusKm, setRadiusKm] = useState(15)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const coordinates = geolocation.state.status === 'success' ? geolocation.state.coordinates : null
  const nearby = useNearbyServiceRequests(coordinates, { radiusKm })
  const assignRequest = useAssignServiceRequest()
  const eligibility = useProfessionalEligibility()
  // Só bloqueia quando se SABE que falta algo: a carregar ou com erro na leitura, o
  // botão fica ativo e o backend decide (devolve 403 com a explicação, se for o caso).
  const aceitarBloqueado = !eligibility.isLoading && !eligibility.isError && !eligibility.eligible
  const navigate = useNavigate()

  // Depois de aceitar, o passo seguinte é contactar o cliente — é em "Trabalhos
  // aceites" que o contacto está (Backend TRD Adendo v1.12, item B).
  function handleAssign(requestId: string) {
    setAssigningId(requestId)
    assignRequest.mutate(requestId, {
      onSuccess: () => navigate('/trabalhos-aceites'),
      onSettled: () => setAssigningId(null),
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Pedidos perto de ti</h1>
        <Link to="/perfil" className="text-sm text-gray-600 underline">
          Perfil
        </Link>
      </header>

      {/* Os pedidos continuam visíveis sem KYC/subscrição — o profissional vê o que
          há na zona antes de pagar. Só o botão "Aceitar" fica bloqueado, e o aviso
          diz o que falta. O backend aplica a mesma regra (403) de qualquer forma. */}
      <EligibilityNotice eligibility={eligibility} />

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => geolocation.locate()}
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
          Não foi possível procurar pedidos agora. Verifica a tua ligação e tenta novamente.
        </p>
      )}

      {coordinates && nearby.data && nearby.data.length === 0 && (
        <p className="text-sm text-gray-600">Nenhum pedido disponível neste raio. Tenta aumentar o raio.</p>
      )}

      {coordinates && nearby.data && nearby.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {nearby.data.map((request) => (
            <li key={request.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-medium text-gray-900">{request.title}</p>
              {request.description && <p className="text-sm text-gray-600">{request.description}</p>}
              <p className="text-xs text-gray-500">
                {[request.province, request.district, request.neighborhood].filter(Boolean).join(' — ')}
                {' · '}
                {(request.distance_m / 1000).toFixed(1)} km
              </p>
              <button
                type="button"
                onClick={() => handleAssign(request.id)}
                disabled={assigningId === request.id || aceitarBloqueado}
                aria-describedby={aceitarBloqueado ? 'aviso-elegibilidade' : undefined}
                className="self-start rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {assigningId === request.id ? 'A aceitar...' : 'Aceitar pedido'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
