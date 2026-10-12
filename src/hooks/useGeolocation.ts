import { useCallback, useState } from 'react'
import { guardarUltimaLocalizacao, lerUltimaLocalizacao, type UltimaLocalizacao } from '../lib/ultimaLocalizacao'

interface Coordinates {
  latitude: number
  longitude: number
}

type GeolocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'success'; coordinates: Coordinates }
  // `ultimaConhecida`: a posição do último GPS que respondeu, se existir e ainda for recente.
  // Fica FORA de 'success' de propósito: quem grava a localização no perfil (LocationForm)
  // reage a 'success', e gravar uma posição antiga como se fosse a actual seria um dado errado.
  | { status: 'error'; message: string; ultimaConhecida: UltimaLocalizacao | null }

// Traduz os três casos de GeolocationPositionError em mensagens que a UI pode mostrar
// diretamente — nenhum deles deve chegar ao utilizador como "GeolocationPositionError".
function describeError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Permissão de localização negada. Usa a seleção manual abaixo.'
    case error.POSITION_UNAVAILABLE:
      return 'Não foi possível determinar a tua localização. Usa a seleção manual abaixo.'
    case error.TIMEOUT:
      return 'A localização demorou demasiado a responder. Usa a seleção manual abaixo.'
    default:
      return 'Não foi possível obter a localização. Usa a seleção manual abaixo.'
  }
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: 'idle' })

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', message: 'Este dispositivo não suporta geolocalização.', ultimaConhecida: lerUltimaLocalizacao() })
      return
    }

    setState({ status: 'locating' })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude }
        guardarUltimaLocalizacao(coordinates)
        setState({ status: 'success', coordinates })
      },
      (error) => {
        setState({ status: 'error', message: describeError(error), ultimaConhecida: lerUltimaLocalizacao() })
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }, [])

  // Para os ecrãs que só PESQUISAM (não gravam): GPS se respondeu, senão a última posição
  // conhecida. `ultimaConhecidaEmUso` diz à UI que tem de avisar — nunca usar uma posição antiga em silêncio.
  const coordinates: Coordinates | null =
    state.status === 'success'
      ? state.coordinates
      : state.status === 'error' && state.ultimaConhecida
        ? { latitude: state.ultimaConhecida.latitude, longitude: state.ultimaConhecida.longitude }
        : null
  const ultimaConhecidaEmUso = state.status === 'error' ? state.ultimaConhecida : null

  return { state, locate, coordinates, ultimaConhecidaEmUso }
}
