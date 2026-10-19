import { useCallback, useEffect, useRef, useState } from 'react'
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

// A primeira leitura que o browser devolve costuma ser grosseira (antena ou Wi-Fi) e pode estar a
// vários km do sítio real; o GPS só converge segundos depois. `getCurrentPosition` entregava essa
// primeira leitura — e, com `maximumAge`, até uma posição em cache (60 s no GPS, 10 min na rede).
// Por isso observa-se com `watchPosition`, sem cache, e fica-se com a leitura mais precisa dentro
// de uma janela curta. O fallback «aproximado» foi retirado: dava precisamente os pontos a >1 km.
const OPCOES_GPS: PositionOptions = { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
// Precisão (raio, em metros) que dispensa esperar mais: já serve para pesquisar e gravar.
const PRECISAO_SUFICIENTE_M = 50
// Janela máxima à espera de melhor precisão.
const JANELA_MS = 15_000
// Acima disto a posição não é fiável e não se grava no perfil; cai na selecção manual.
const PRECISAO_MAXIMA_M = 500

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
  const pararRef = useRef<(() => void) | null>(null)

  // Sem isto, um watch esquecido continuava a gastar bateria depois de sair do ecrã.
  useEffect(() => () => pararRef.current?.(), [])

  const locate = useCallback(() => {
    pararRef.current?.()

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

    let melhor: GeolocationCoordinates | null = null
    let terminado = false
    let watchId: number | null = null
    let temporizador: ReturnType<typeof setTimeout> | null = null

    const parar = () => {
      terminado = true
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      if (temporizador) clearTimeout(temporizador)
      pararRef.current = null
    }
    pararRef.current = parar

    const falhar = (message: string) => {
      parar()
      setState({ status: 'error', message, ultimaConhecida: lerUltimaLocalizacao() })
    }

    // `accuracy` ausente é tratado como «sem informação»: não bloqueia.
    const precisao = (c: GeolocationCoordinates) => (Number.isFinite(c.accuracy) ? c.accuracy : 0)

    const concluir = () => {
      if (terminado) return
      if (!melhor) {
        falhar('A localização demorou demasiado a responder. Usa a seleção manual abaixo.')
        return
      }
      if (precisao(melhor) > PRECISAO_MAXIMA_M) {
        falhar(
          `A localização está pouco precisa (cerca de ${Math.round(precisao(melhor))} m). Vai para um sítio aberto e tenta de novo, ou usa a seleção manual abaixo.`,
        )
        return
      }
      const coordinates = { latitude: melhor.latitude, longitude: melhor.longitude }
      // O backend recusa coordenadas fora de Moçambique (400); dizê-lo aqui evita um «não foi possível guardar» sem causa.
      if (!dentroDeMocambique(coordinates)) {
        falhar('A localização detetada está fora de Moçambique. Usa a seleção manual abaixo.')
        return
      }
      parar()
      guardarUltimaLocalizacao(coordinates)
      setState({ status: 'success', coordinates })
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (terminado) return
        if (!melhor || precisao(position.coords) <= precisao(melhor)) melhor = position.coords
        if (precisao(melhor) <= PRECISAO_SUFICIENTE_M) concluir()
      },
      (error) => {
        // Sem permissão esperar não adianta; os outros erros podem passar quando o GPS apanhar sinal.
        if (!terminado && error.code === error.PERMISSION_DENIED) falhar(describeError(error))
      },
      OPCOES_GPS,
    )
    // Um mock (ou o browser) pode responder de forma síncrona: o id só existe depois, não o deixar órfão.
    if (terminado) navigator.geolocation.clearWatch(watchId)
    else temporizador = setTimeout(concluir, JANELA_MS)
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
