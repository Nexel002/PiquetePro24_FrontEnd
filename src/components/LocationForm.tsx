import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useUpdateLocation } from '../hooks/useProfile'
import { useGeolocation } from '../hooks/useGeolocation'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
import { MOZAMBIQUE_PROVINCES } from '../lib/provinces'
import { descreverPrecisao } from '../lib/ultimaLocalizacao'
import type { UserProfile } from '../services/profile'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

// Formulário de localização (GPS + fallback hierárquico) partilhado entre a tela de
// perfil (onde é opcional editar de novo) e o onboarding obrigatório
// (pages/onboarding/CompleteLocation.tsx, sem opção de saltar). onSaved é chamado só
// depois de o backend confirmar a gravação — o onboarding usa isso para avançar.
export function LocationForm({
  profile,
  onSaved,
  allowManual = true,
}: {
  profile: UserProfile
  onSaved?: () => void
  allowManual?: boolean
}) {
  const updateLocation = useUpdateLocation()
  const geolocation = useGeolocation()


  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  // useId e não um id fixo: o componente é partilhado (perfil e onboarding)
  const provinciaId = useId()

  // Traduz as coordenadas do GPS recém-obtido (antes de gravar) para um nome de lugar — também
  // quando é aproximada: é pelo nome que o utilizador decide se a posição serve.
  const pendingCoordinates =
    geolocation.state.status === 'success' || geolocation.state.status === 'aproximada' ? geolocation.state.coordinates : null
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

  // Gravação automática assim que o GPS responde (pedido do utilizador — sem passo
  // de "confirmar", um só toque no ícone basta). Espera a geocodificação reversa
  // terminar (sucesso ou erro) antes de gravar, para não perder province/district/
  // neighborhood quando a resposta chega a tempo — mas não bloqueia para sempre se
  // ela falhar (pendingPlace.isLoading passa a false também no erro).
  // autoConfirmedRef evita gravar duas vezes para a mesma coordenada (o efeito
  // corre de novo quando pendingPlace deixa de estar a carregar).
  const autoConfirmedRef = useRef<string | null>(null)
  // A posição aproximada que o utilizador já aceitou: o aviso some depois de gravada.
  const [aproximadaGravada, setAproximadaGravada] = useState<{ latitude: number; longitude: number } | null>(null)

  function gravarCoordenadas({ latitude, longitude }: { latitude: number; longitude: number }, onSuccess?: () => void) {
    updateLocation.mutate(
      {
        latitude,
        longitude,
        province: pendingPlace.data?.province ?? undefined,
        district: pendingPlace.data?.district ?? undefined,
        neighborhood: pendingPlace.data?.neighborhood ?? undefined,
      },
      {
        onSuccess: () => {
          onSuccess?.()
          onSaved?.()
        },
      },
    )
  }

  useEffect(() => {
    if (geolocation.state.status !== 'success' || pendingPlace.isLoading) return
    const { latitude, longitude } = geolocation.state.coordinates
    const key = `${latitude},${longitude}`
    if (autoConfirmedRef.current === key) return
    autoConfirmedRef.current = key
    gravarCoordenadas(geolocation.state.coordinates)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geolocation.state, pendingPlace.isLoading])

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

  const isBusy =
    geolocation.state.status === 'locating' ||
    updateLocation.isPending ||
    (geolocation.state.status === 'success' && pendingPlace.isLoading)
  const aproximada =
    geolocation.state.status === 'aproximada' && geolocation.state.coordinates !== aproximadaGravada ? geolocation.state : null

  return (
    <div className="flex flex-col gap-4">
      {/* Um só toque no ícone obtém o GPS e grava de imediato — sem passo de
          confirmação à parte (pedido do utilizador). */}
      <div className="relative bg-piquete-blue/5 border border-piquete-blue/10 rounded-2xl p-4 flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-piquete-blue/10 text-piquete-blue">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21c-4.418-4.03-7-7.86-7-11a7 7 0 1114 0c0 3.14-2.582 6.97-7 11z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11.5a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">Localização Atual</p>
            <p className="text-sm font-bold text-piquete-blue truncate">
              {geolocation.state.status === 'locating'
                ? geolocation.state.precisaoM !== null
                  ? `A melhorar a precisão (${descreverPrecisao(geolocation.state.precisaoM)})...`
                  : 'A localizar...'
                : geolocation.state.status === 'success' && pendingPlace.isLoading
                  ? 'A identificar o lugar...'
                  : currentLocationLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUseGps}
          disabled={isBusy}
          aria-label="Atualizar localização por GPS"
          title="Atualizar localização por GPS"
          className="shrink-0 p-2.5 rounded-xl bg-white border border-piquete-blue/20 text-piquete-blue hover:bg-piquete-blue hover:text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
        >
          {isBusy ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
      </div>

      {/* Posição aproximada (zona com pouco Wi-Fi conhecido, GPS sem sinal): não se grava sozinha,
          mas também não é um erro — o utilizador vê onde ficou e decide. Antes era recusada, e no
          Perfil, sem selecção manual, deixava a pessoa sem forma nenhuma de se localizar. */}
      {aproximada && (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            Localização aproximada ({descreverPrecisao(aproximada.precisaoM)})
            {pendingPlace.data?.placeName ? (
              <>
                : <strong>{pendingPlace.data.placeName}</strong>
              </>
            ) : null}
            . Se estiver certa, usa-a; para mais precisão, liga a «localização precisa» do telemóvel e tenta num sítio aberto.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => gravarCoordenadas(aproximada.coordinates, () => setAproximadaGravada(aproximada.coordinates))}
              disabled={pendingPlace.isLoading || updateLocation.isPending}
              isLoading={updateLocation.isPending}
            >
              Usar esta localização
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleUseGps} disabled={updateLocation.isPending}>
              Tentar de novo
            </Button>
          </div>
        </div>
      )}

      {geolocation.state.status === 'error' && (
        <p className="text-sm font-medium text-red-600 text-center">{geolocation.state.message}</p>
      )}

      {allowManual && (
        <>
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
        </>
      )}

      {updateLocation.isError && (
        <p className="text-sm font-medium text-red-600 text-center bg-red-50 p-2 rounded-lg mt-2">
          {updateLocation.error?.message || 'Não foi possível guardar a localização. Tenta novamente.'}
        </p>
      )}
    </div>
  )
}
