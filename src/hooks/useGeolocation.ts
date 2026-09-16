import { useCallback, useState } from 'react'

interface Coordinates {
  latitude: number
  longitude: number
}

type GeolocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'success'; coordinates: Coordinates }
  | { status: 'error'; message: string }

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
      setState({ status: 'error', message: 'Este dispositivo não suporta geolocalização.' })
      return
    }

    setState({ status: 'locating' })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: 'success',
          coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude },
        })
      },
      (error) => {
        setState({ status: 'error', message: describeError(error) })
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }, [])

  return { state, locate }
}
