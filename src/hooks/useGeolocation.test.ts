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
