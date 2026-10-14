import { useCallback, useState } from 'react'
import { dentroDeMocambique, guardarUltimaLocalizacao, lerUltimaLocalizacao, type UltimaLocalizacao } from '../lib/ultimaLocalizacao'

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

// Primeiro tenta o GPS; se não responde, a localização aproximada (rede/Wi-Fi). Só com
// `enableHighAccuracy: true` e 10 s, um portátil ou um telemóvel dentro de casa — sem sinal de GPS —
// dava TIMEOUT ou POSITION_UNAVAILABLE e a captura «não funcionava», embora o browser soubesse
// a zona por Wi-Fi. `maximumAge` aceita uma posição de há instantes em vez de esperar por outra.
const OPCOES_GPS: PositionOptions = { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 }
const OPCOES_APROXIMADAS: PositionOptions = { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 }

// Traduz os três casos de GeolocationPositionError em mensagens que a UI pode mostrar
// diretamente — nenhum deles deve chegar ao utilizador como "GeolocationPositionError".
function describeError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Permissão de localização negada. Ativa-a nas definições do browser (ícone do cadeado junto ao endereço) ou usa a seleção manual abaixo.'
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

    // O browser só dá localização em contexto seguro (HTTPS ou localhost). Numa página http:// aberta
    // por IP, no telemóvel, a chamada falha com «permissão negada» e a causa real fica escondida.
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setState({
        status: 'error',
        message: 'A localização só funciona numa ligação segura (HTTPS). Abre a app pelo endereço https ou usa a seleção manual abaixo.',
        ultimaConhecida: lerUltimaLocalizacao(),
      })
      return
    }

    setState({ status: 'locating' })

    const aceitar = (position: GeolocationPosition) => {
      const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      // O backend recusa coordenadas fora de Moçambique (400); dizê-lo aqui evita um «não foi possível guardar» sem causa.
      if (!dentroDeMocambique(coordinates)) {
        setState({
          status: 'error',
          message: 'A localização detetada está fora de Moçambique. Usa a seleção manual abaixo.',
          ultimaConhecida: lerUltimaLocalizacao(),
        })
        return
      }
      guardarUltimaLocalizacao(coordinates)
      setState({ status: 'success', coordinates })
    }
    const falhar = (error: GeolocationPositionError) => {
      setState({ status: 'error', message: describeError(error), ultimaConhecida: lerUltimaLocalizacao() })
    }

    navigator.geolocation.getCurrentPosition(
      aceitar,
      (error) => {
        // Sem permissão repetir não adianta; nos outros casos tenta-se a localização aproximada.
        if (error.code === error.PERMISSION_DENIED) {
          falhar(error)
          return
        }
        navigator.geolocation.getCurrentPosition(aceitar, falhar, OPCOES_APROXIMADAS)
      },
      OPCOES_GPS,
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
