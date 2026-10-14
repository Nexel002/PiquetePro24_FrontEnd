import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarUltimaLocalizacao, lerUltimaLocalizacao } from '../lib/ultimaLocalizacao'
import { useGeolocation } from './useGeolocation'

const MAPUTO = { latitude: -25.9692, longitude: 32.5732 }

type Sucesso = (posicao: GeolocationPosition) => void
type Falha = (erro: GeolocationPositionError) => void

function simularGps(resposta: { ok: GeolocationCoordinates } | { erro: number }) {
  const getCurrentPosition = vi.fn((sucesso: Sucesso, falha: Falha) => {
    if ('ok' in resposta) sucesso({ coords: resposta.ok } as GeolocationPosition)
    else falha({ code: resposta.erro, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
  })
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
}

beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation')
})

describe('useGeolocation — última localização conhecida', () => {
  it('guarda a posição quando o GPS responde', () => {
    simularGps({ ok: MAPUTO as GeolocationCoordinates })
    const { result } = renderHook(() => useGeolocation())

    act(() => result.current.locate())

    expect(result.current.state.status).toBe('success')
    expect(result.current.coordinates).toEqual(MAPUTO)
    expect(lerUltimaLocalizacao()).toMatchObject(MAPUTO)
  })

  it('quando o GPS falha, usa a última posição conhecida para pesquisar e diz que é antiga', () => {
    guardarUltimaLocalizacao(MAPUTO)
    simularGps({ erro: 3 }) // TIMEOUT
    const { result } = renderHook(() => useGeolocation())

    act(() => result.current.locate())

    expect(result.current.coordinates).toEqual(MAPUTO)
    expect(result.current.ultimaConhecidaEmUso).toMatchObject(MAPUTO)
  })

  it('NÃO trata a posição antiga como «success»: quem grava no perfil não a deve receber como actual', () => {
    guardarUltimaLocalizacao(MAPUTO)
    simularGps({ erro: 2 })
    const { result } = renderHook(() => useGeolocation())

    act(() => result.current.locate())

    expect(result.current.state.status).toBe('error')
  })

  it('sem nada guardado, a falha do GPS fica sem coordenadas (cai na selecção manual)', () => {
    simularGps({ erro: 1 }) // PERMISSION_DENIED
    const { result } = renderHook(() => useGeolocation())

    act(() => result.current.locate())

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

function simularSequencia(respostas: Array<{ ok: GeolocationCoordinates } | { erro: number }>) {
  const getCurrentPosition = vi.fn((...args: [Sucesso, Falha, PositionOptions?]) => {
    const [sucesso, falha] = args
    const resposta = respostas.shift()!
    if ('ok' in resposta) sucesso({ coords: resposta.ok } as GeolocationPosition)
    else falha({ code: resposta.erro, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
  })
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
  return getCurrentPosition
}

describe('useGeolocation — captar a localização', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'isSecureContext')
  })

  it('se o GPS dá timeout, tenta a localização aproximada (rede/Wi-Fi) e consegue', () => {
    const gps = simularSequencia([{ erro: 3 }, { ok: MAPUTO as GeolocationCoordinates }])
    const { result } = renderHook(() => useGeolocation())

    act(() => result.current.locate())

    expect(gps).toHaveBeenCalledTimes(2)
    expect(gps.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true })
    expect(gps.mock.calls[1][2]).toMatchObject({ enableHighAccuracy: false })
    expect(result.current.state).toMatchObject({ status: 'success', coordinates: MAPUTO })
  })

  it('sem permissão não repete o pedido e explica como a ativar', () => {
    const gps = simularSequencia([{ erro: 1 }])
    const { result } = renderHook(() => useGeolocation())

    act(() => result.current.locate())

    expect(gps).toHaveBeenCalledTimes(1)
    expect(result.current.state).toMatchObject({ status: 'error', message: expect.stringMatching(/definições do browser/i) })
  })

  it('uma posição fora de Moçambique não é «success»: o backend recusava-a, e o utilizador fica a saber porquê', () => {
    simularSequencia([{ ok: { latitude: 38.7, longitude: -9.1 } as GeolocationCoordinates }])
    const { result } = renderHook(() => useGeolocation())

    act(() => result.current.locate())

    expect(result.current.state).toMatchObject({ status: 'error', message: expect.stringMatching(/fora de Moçambique/i) })
  })

  it('numa página não segura (http por IP) diz isso, em vez de «permissão negada»', () => {
    const gps = simularSequencia([{ ok: MAPUTO as GeolocationCoordinates }])
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true })
    const { result } = renderHook(() => useGeolocation())

    act(() => result.current.locate())

    expect(gps).not.toHaveBeenCalled()
    expect(result.current.state).toMatchObject({ status: 'error', message: expect.stringMatching(/HTTPS/) })
  })
})
