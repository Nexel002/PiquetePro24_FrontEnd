import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFavorites } from './useFavorites'

const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

beforeEach(() => {
  localStorage.clear()
  toast.success.mockClear()
  toast.info.mockClear()
})

// StrictMode corre os updaters de estado duas vezes: é onde o toast dentro do `setFavorites`
// aparecia em duplicado.
const comStrictMode = { wrapper: StrictMode }

describe('useFavorites', () => {
  it('adiciona aos favoritos com um único toast', () => {
    const { result } = renderHook(() => useFavorites(), comStrictMode)

    act(() => result.current.toggleFavorite('w1', 'Carlos'))

    expect(result.current.isFavorite('w1')).toBe(true)
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.info).not.toHaveBeenCalled()
  })

  it('remove dos favoritos com um único toast', () => {
    const { result } = renderHook(() => useFavorites(), comStrictMode)
    act(() => result.current.toggleFavorite('w1', 'Carlos'))
    toast.success.mockClear()

    act(() => result.current.toggleFavorite('w1', 'Carlos'))

    expect(result.current.isFavorite('w1')).toBe(false)
    expect(toast.info).toHaveBeenCalledTimes(1)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('guarda e relê os favoritos do localStorage', () => {
    const primeiro = renderHook(() => useFavorites())
    act(() => primeiro.result.current.toggleFavorite('w1'))
    primeiro.unmount()

    const segundo = renderHook(() => useFavorites())

    expect(segundo.result.current.favorites).toEqual(['w1'])
  })

  it('ignora um localStorage corrompido em vez de rebentar', () => {
    localStorage.setItem('piquetepro_favorites', '{não é json')

    const { result } = renderHook(() => useFavorites())

    expect(result.current.favorites).toEqual([])
  })
})
