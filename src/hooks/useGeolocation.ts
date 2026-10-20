import { useCallback, useSyncExternalStore } from 'react'
import { estadoActual, localizar, subscrever, type Coordinates } from '../lib/servicoDeLocalizacao'

// A captação vive em lib/servicoDeLocalizacao.ts, partilhada por todos os ecrãs e começada em
// segundo plano depois do login (Fase 36). O hook só a lê e traduz para o que os ecrãs consomem.
// Sem paragem ao desmontar, de propósito: a captação é da app, não do ecrã, e termina sozinha
// ao fim de 30 s no máximo.
export function useGeolocation() {
  const state = useSyncExternalStore(subscrever, estadoActual)

  // Sem argumentos de propósito: `locate` é passado directamente a `onClick`, e o evento não pode
  // ser lido como opção. `tentarDeNovo` recomeça mesmo com uma posição recente ou uma captação em curso.
  const locate = useCallback(() => localizar(), [])
  const tentarDeNovo = useCallback(() => localizar({ forcar: true }), [])

  // Para os ecrãs que só PESQUISAM (não gravam): o GPS se respondeu (mesmo aproximado), senão a última
  // posição conhecida. `ultimaConhecidaEmUso` e `precisaoAproximadaM` dizem à UI que tem de avisar —
  // nunca usar uma posição antiga ou vaga em silêncio.
  const coordinates: Coordinates | null =
    state.status === 'success' || state.status === 'aproximada'
      ? state.coordinates
      : state.status === 'error' && state.ultimaConhecida
        ? { latitude: state.ultimaConhecida.latitude, longitude: state.ultimaConhecida.longitude }
        : null
  const ultimaConhecidaEmUso = state.status === 'error' ? state.ultimaConhecida : null
  const precisaoAproximadaM = state.status === 'aproximada' ? state.precisaoM : null

  return { state, locate, tentarDeNovo, coordinates, ultimaConhecidaEmUso, precisaoAproximadaM }
}
