import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarUltimaLocalizacao, lerUltimaLocalizacao } from '../lib/ultimaLocalizacao'
import { useGeolocation } from './useGeolocation'

const MAPUTO = { latitude: -25.9692, longitude: 32.5732 }

type Sucesso = (posicao: GeolocationPosition) => void
type Falha = (erro: GeolocationPositionError) => void

const erro = (code: number) =>
  ({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }) as GeolocationPositionError
const leitura = (accuracy: number, extra: Partial<GeolocationCoordinates> = {}) =>
  ({ coords: { ...MAPUTO, accuracy, ...extra } }) as GeolocationPosition

// Simula o `watchPosition` do browser: o teste empurra leituras e erros quando quiser.
function simularWatch() {
  let sucesso: Sucesso = () => {}
  let falha: Falha = () => {}
  // O terceiro argumento vai no tipo e não na assinatura: o teste lê-o em `mock.calls[0][2]`, mas
  // a simulação não precisa dele.
  const watchPosition = vi.fn<(s: Sucesso, f: Falha, opcoes?: PositionOptions) => number>((s, f) => {
    sucesso = s
    falha = f
    return 7
  })
  const clearWatch = vi.fn()
  Object.defineProperty(navigator, 'geolocation', { value: { watchPosition, clearWatch }, configurable: true })
  return {
    watchPosition,
    clearWatch,
    leitura: (p: GeolocationPosition) => act(() => sucesso(p)),
    erro: (code: number) => act(() => falha(erro(code))),
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'geolocation')
  Reflect.deleteProperty(window, 'isSecureContext')
})

describe('useGeolocation — precisão', () => {
  it('pede GPS sem cache: uma posição em cache é a causa de pontos a km do sítio real', () => {
    const gps = simularWatch()
    const { result } = renderHook(() => useGeolocation())

    act(() => result.current.locate())

    expect(gps.watchPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 })
  })

  it('não aceita a primeira leitura grosseira: espera por uma melhor', () => {
    const gps = simularWatch()
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    gps.leitura(leitura(3_000, { latitude: -25.95 }))
    expect(result.current.state.status).toBe('locating')

    gps.leitura(leitura(20))
    expect(result.current.state).toMatchObject({ status: 'success', coordinates: MAPUTO })
    expect(gps.clearWatch).toHaveBeenCalledWith(7)
  })

  it('ao fim da janela fica com a leitura mais precisa, se for fiável', () => {
    const gps = simularWatch()
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    gps.leitura(leitura(400, { latitude: -25.9 }))
    gps.leitura(leitura(120))
    gps.leitura(leitura(300, { latitude: -25.8 }))
    act(() => void vi.advanceTimersByTime(15_000))

    expect(result.current.state).toMatchObject({ status: 'success', coordinates: MAPUTO })
  })

  it('se a melhor leitura continua imprecisa (>500 m), não é «success» e explica porquê', () => {
    const gps = simularWatch()
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    gps.leitura(leitura(2_500))
    act(() => void vi.advanceTimersByTime(15_000))

    expect(result.current.state).toMatchObject({ status: 'error', message: expect.stringMatching(/pouco precisa/i) })
    expect(lerUltimaLocalizacao()).toBeNull()
  })

  it('sem nenhuma leitura até ao fim da janela, diz que demorou demasiado', () => {
    simularWatch()
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    act(() => void vi.advanceTimersByTime(15_000))

    expect(result.current.state).toMatchObject({ status: 'error', message: expect.stringMatching(/demorou demasiado/i) })
  })

  it('pára o watch ao sair do ecrã', () => {
    const gps = simularWatch()
    const { result, unmount } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    unmount()

    expect(gps.clearWatch).toHaveBeenCalledWith(7)
  })
})

describe('useGeolocation — última localização conhecida', () => {
  it('guarda a posição quando o GPS responde', () => {
    const gps = simularWatch()
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    gps.leitura(leitura(10))

    expect(result.current.state.status).toBe('success')
    expect(result.current.coordinates).toEqual(MAPUTO)
    expect(lerUltimaLocalizacao()).toMatchObject(MAPUTO)
  })

  it('quando o GPS não responde, usa a última posição conhecida para pesquisar e diz que é antiga', () => {
    guardarUltimaLocalizacao(MAPUTO)
    simularWatch()
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    act(() => void vi.advanceTimersByTime(15_000))

    expect(result.current.coordinates).toEqual(MAPUTO)
    expect(result.current.ultimaConhecidaEmUso).toMatchObject(MAPUTO)
  })

  it('NÃO trata a posição antiga como «success»: quem grava no perfil não a deve receber como actual', () => {
    guardarUltimaLocalizacao(MAPUTO)
    simularWatch()
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    act(() => void vi.advanceTimersByTime(15_000))

    expect(result.current.state.status).toBe('error')
  })

  it('sem nada guardado, a falha do GPS fica sem coordenadas (cai na selecção manual)', () => {
    const gps = simularWatch()
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    gps.erro(1) // PERMISSION_DENIED

    expect(result.current.coordinates).toBeNull()
    expect(result.current.ultimaConhecidaEmUso).toBeNull()
  })

  it('dispositivo sem geolocalização também recorre à última conhecida', () => {
    guardarUltimaLocalizacao(MAPUTO)
    const { result } = renderHook(() => useGeolocation())

    act(() => result.current.locate())

    expect(result.current.state.status).toBe('error')
    expect(result.current.coordinates).toEqual(MAPUTO)
  })
})

describe('useGeolocation — captar a localização', () => {
  it('sem permissão pára de imediato e explica como a ativar', () => {
    const gps = simularWatch()
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    gps.erro(1)

    expect(gps.clearWatch).toHaveBeenCalledWith(7)
    expect(result.current.state).toMatchObject({ status: 'error', message: expect.stringMatching(/definições do browser/i) })
  })

  it('um erro passageiro (sem sinal ainda) não aborta: a leitura seguinte ainda conta', () => {
    const gps = simularWatch()
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    gps.erro(2) // POSITION_UNAVAILABLE
    gps.leitura(leitura(15))

    expect(result.current.state.status).toBe('success')
  })

  it('uma posição fora de Moçambique não é «success»: o backend recusava-a, e o utilizador fica a saber porquê', () => {
    const gps = simularWatch()
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.locate())

    gps.leitura(leitura(10, { latitude: 38.7, longitude: -9.1 }))

    expect(result.current.state).toMatchObject({ status: 'error', message: expect.stringMatching(/fora de Moçambique/i) })
  })

  it('numa página não segura (http por IP) diz isso, em vez de «permissão negada»', () => {
    const gps = simularWatch()
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true })
    const { result } = renderHook(() => useGeolocation())

    act(() => result.current.locate())

    expect(gps.watchPosition).not.toHaveBeenCalled()
    expect(result.current.state).toMatchObject({ status: 'error', message: expect.stringMatching(/HTTPS/) })
  })
})
