import { dentroDeMocambique, guardarUltimaLocalizacao, lerUltimaLocalizacao, type UltimaLocalizacao } from './ultimaLocalizacao'

export interface Coordinates {
  latitude: number
  longitude: number
}

export type GeolocationState =
  | { status: 'idle' }
  // `precisaoM`: raio da melhor leitura até agora — a UI mostra-o para a espera não parecer bloqueio.
  | { status: 'locating'; precisaoM: number | null }
  // `obtidaEm`: quando a captação terminou — define a validade (ver VALIDADE_MS).
  | { status: 'success'; coordinates: Coordinates; obtidaEm: number }
  // Leitura real e actual, mas com erro grande (antena, Wi-Fi escasso, «localização precisa»
  // desligada no Android). Fica FORA de 'success' de propósito: quem grava no perfil (LocationForm)
  // reage a 'success', e uma posição a ±1 km só se grava com o utilizador a confirmar.
  // Quem só pesquisa usa-a, com aviso.
  | { status: 'aproximada'; coordinates: Coordinates; precisaoM: number; obtidaEm: number }
  // `ultimaConhecida`: a posição do último GPS que respondeu, se existir e ainda for recente.
  // Mesmo motivo: gravar uma posição antiga como se fosse a actual seria um dado errado.
  | { status: 'error'; message: string; ultimaConhecida: UltimaLocalizacao | null }

// Um serviço único da app, e não estado de cada ecrã (Fase 36): a captação demora até 30 s, e
// começa em segundo plano depois do login (AquecerLocalizacao). Com estado por ecrã, a posição
// captada no arranque não chegava ao Perfil nem à pesquisa — cada um voltava a esperar do zero.
//
// Histórico deste algoritmo (Adendos v1.54, v1.58 e v1.60 do TRD): aceitar a primeira leitura gravava
// pontos a >1 km; recusar tudo acima de 500 m em 15 s deixava sem localização quem está numa zona com
// pouco Wi-Fi conhecido (ex. Av. das Indústrias) ou num telemóvel cujo GPS demora a fixar. O browser
// não expõe Wi-Fi nem antenas — não há biblioteca que localize melhor do que o próprio telemóvel —, por
// isso a resposta é esperar o tempo certo e, no fim, devolver o que houver com a precisão à vista.
//
// `watchPosition` sem cache: a primeira leitura costuma ser grosseira e o GPS converge segundos depois.
const OPCOES_GPS: PositionOptions = { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 }
// Pedido paralelo de baixa precisão (rede). Alguns Android/WebView com GPS sem sinal não entregam nada
// ao pedido de alta precisão até ao timeout; este garante pelo menos uma leitura aproximada.
const OPCOES_REDE: PositionOptions = { enableHighAccuracy: false, timeout: 30_000, maximumAge: 60_000 }
// Precisão (raio, em metros) que dispensa esperar mais.
const PRECISAO_SUFICIENTE_M = 50
// A meio da janela, uma leitura já boa chega — não vale 30 s de espera por ganhos de dezenas de metros.
const PRECISAO_BOA_M = 100
const ESPERA_BOA_MS = 10_000
// Janela máxima: um GPS a frio num telemóvel de gama baixa leva 20–40 s a fixar.
const JANELA_MS = 30_000
// Até aqui grava-se sem perguntar (o limiar da Fase 33).
const PRECISAO_FIAVEL_M = 500
// Acima disto já é o nível de cidade/IP: não serve nem para pesquisar por distância.
const PRECISAO_INUTIL_M = 10_000
// Quanto tempo uma posição captada serve sem captar de novo. Mais do que isto e a pessoa pode já
// estar noutro sítio; a captação seguinte é rápida porque o GPS ainda está quente.
export const VALIDADE_MS = 3 * 60_000

const MENSAGEM_DEMOROU = 'A localização demorou demasiado a responder. Tenta de novo num sítio aberto, ou usa a seleção manual abaixo.'

// Traduz os três casos de GeolocationPositionError em mensagens que a UI pode mostrar
// diretamente — nenhum deles deve chegar ao utilizador como "GeolocationPositionError".
function describeError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Permissão de localização negada. Ativa-a nas definições do browser (ícone do cadeado junto ao endereço) ou usa a seleção manual abaixo.'
    case error.POSITION_UNAVAILABLE:
      return 'Não foi possível determinar a tua localização. Confirma que a localização do telemóvel está ligada, ou usa a seleção manual abaixo.'
    case error.TIMEOUT:
      return MENSAGEM_DEMOROU
    default:
      return 'Não foi possível obter a localização. Usa a seleção manual abaixo.'
  }
}

let estado: GeolocationState = { status: 'idle' }
let pararCaptacao: (() => void) | null = null
const ouvintes = new Set<() => void>()

function definir(novo: GeolocationState) {
  estado = novo
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function subscrever(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export function estadoActual(): GeolocationState {
  return estado
}

/** Uma posição captada há menos de VALIDADE_MS — a que o botão usa sem esperar. */
export function temPosicaoRecente(agora = Date.now()): boolean {
  return (estado.status === 'success' || estado.status === 'aproximada') && agora - estado.obtidaEm < VALIDADE_MS
}

/** Volta ao início, parando uma captação em curso. Ao terminar sessão: a posição é do utilizador anterior. */
export function repor() {
  pararCaptacao?.()
  definir({ status: 'idle' })
}

/**
 * Capta a localização. Sem `forcar`, não faz nada se já houver uma captação em curso (junta-se a
 * ela) ou uma posição recente (reutiliza-a): é isto que torna o botão imediato depois do arranque em
 * segundo plano. `forcar` («Tentar de novo») recomeça sempre.
 */
export function localizar({ forcar = false }: { forcar?: boolean } = {}) {
  if (!forcar && (estado.status === 'locating' || temPosicaoRecente())) return
  pararCaptacao?.()

  if (!('geolocation' in navigator)) {
    definir({ status: 'error', message: 'Este dispositivo não suporta geolocalização.', ultimaConhecida: lerUltimaLocalizacao() })
    return
  }

  // O browser só dá localização em contexto seguro (HTTPS ou localhost). Numa página http:// aberta
  // por IP, no telemóvel, a chamada falha com «permissão negada» e a causa real fica escondida.
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    definir({
      status: 'error',
      message: 'A localização só funciona numa ligação segura (HTTPS). Abre a app pelo endereço https ou usa a seleção manual abaixo.',
      ultimaConhecida: lerUltimaLocalizacao(),
    })
    return
  }

  definir({ status: 'locating', precisaoM: null })

  let melhor: GeolocationCoordinates | null = null
  let ultimoErro: GeolocationPositionError | null = null
  let terminado = false
  let watchId: number | null = null
  const temporizadores: ReturnType<typeof setTimeout>[] = []

  const parar = () => {
    terminado = true
    if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    temporizadores.forEach(clearTimeout)
    if (pararCaptacao === parar) pararCaptacao = null
  }
  pararCaptacao = parar

  const falhar = (message: string) => {
    parar()
    definir({ status: 'error', message, ultimaConhecida: lerUltimaLocalizacao() })
  }

  // `accuracy` ausente é tratado como «sem informação»: não bloqueia.
  const precisao = (c: GeolocationCoordinates) => (Number.isFinite(c.accuracy) ? c.accuracy : 0)

  const concluir = () => {
    if (terminado) return
    if (!melhor) {
      falhar(ultimoErro ? describeError(ultimoErro) : MENSAGEM_DEMOROU)
      return
    }
    const coordinates = { latitude: melhor.latitude, longitude: melhor.longitude }
    // O backend recusa coordenadas fora de Moçambique (400); dizê-lo aqui evita um «não foi possível guardar» sem causa.
    if (!dentroDeMocambique(coordinates)) {
      falhar('A localização detetada está fora de Moçambique. Usa a seleção manual abaixo.')
      return
    }
    const precisaoM = Math.round(precisao(melhor))
    if (precisaoM > PRECISAO_INUTIL_M) {
      falhar('O telemóvel só conseguiu uma localização muito vaga. Liga a «localização precisa» nas definições e tenta num sítio aberto, ou usa a seleção manual abaixo.')
      return
    }
    parar()
    if (precisaoM > PRECISAO_FIAVEL_M) {
      // Não vai para a «última conhecida»: essa substitui o GPS em silêncio (com aviso de idade, não de precisão).
      definir({ status: 'aproximada', coordinates, precisaoM, obtidaEm: Date.now() })
      return
    }
    guardarUltimaLocalizacao(coordinates)
    definir({ status: 'success', coordinates, obtidaEm: Date.now() })
  }

  const aoLer = (position: GeolocationPosition) => {
    if (terminado) return
    if (!melhor || precisao(position.coords) <= precisao(melhor)) melhor = position.coords
    if (precisao(melhor) <= PRECISAO_SUFICIENTE_M) concluir()
    else definir({ status: 'locating', precisaoM: Math.round(precisao(melhor)) })
  }

  const aoFalhar = (error: GeolocationPositionError) => {
    if (terminado) return
    // Sem permissão esperar não adianta; os outros erros podem passar quando o GPS apanhar sinal.
    if (error.code === error.PERMISSION_DENIED) falhar(describeError(error))
    else ultimoErro = error
  }

  watchId = navigator.geolocation.watchPosition(aoLer, aoFalhar, OPCOES_GPS)
  // Um mock (ou o browser) pode responder de forma síncrona: o id só existe depois, não o deixar órfão.
  if (terminado) {
    navigator.geolocation.clearWatch(watchId)
    return
  }
  // Erros deste pedido são ignorados: o de alta precisão é o que manda.
  navigator.geolocation.getCurrentPosition?.(aoLer, () => undefined, OPCOES_REDE)
  if (terminado) return
  temporizadores.push(
    setTimeout(() => {
      if (melhor && precisao(melhor) <= PRECISAO_BOA_M) concluir()
    }, ESPERA_BOA_MS),
    setTimeout(concluir, JANELA_MS),
  )
}

/**
 * Se o utilizador já deu permissão de localização noutra visita. Sem a Permissions API (Safari
 * antigo) responde `false`: na dúvida não se pede — pedir a permissão sem um gesto do utilizador
 * é o que os browsers penalizam, e uma recusa só se desfaz nas definições.
 */
export async function permissaoConcedida(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' })
    return status?.state === 'granted'
  } catch {
    return false
  }
}
