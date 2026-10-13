import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFiltrosDaBusca } from './useFiltrosDaBusca'

function usar(url = '/profissionais') {
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  return renderHook(() => useFiltrosDaBusca(), { wrapper })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useFiltrosDaBusca', () => {
  it('lê os filtros do URL', () => {
    const { result } = usar('/profissionais?q=cano&category=canalizacao')

    expect(result.current.q).toBe('cano')
    expect(result.current.category).toBe('canalizacao')
    expect(result.current.text).toBe('cano')
  })

  it('o texto só passa para o URL depois da pausa do debounce', () => {
    const { result } = usar()

    act(() => result.current.setText('eletr'))
    expect(result.current.q).toBe('')

    act(() => void vi.advanceTimersByTime(400))
    expect(result.current.q).toBe('eletr')
  })

  it('«pesquisar» aplica o texto já, sem esperar pela pausa', () => {
    const { result } = usar()

    act(() => result.current.setText('  pintor  '))
    act(() => result.current.search())

    expect(result.current.q).toBe('pintor')
  })

  it('texto vazio retira o filtro do URL', () => {
    const { result } = usar('/profissionais?q=cano')

    act(() => result.current.setText(''))
    act(() => result.current.search())

    expect(result.current.q).toBe('')
  })

  it('tocar na categoria já escolhida desliga-a; noutra, troca', () => {
    const { result } = usar('/profissionais?category=pintura')

    act(() => result.current.selectCategory('pintura'))
    expect(result.current.category).toBe('')

    act(() => result.current.selectCategory('canalizacao'))
    expect(result.current.category).toBe('canalizacao')
  })
})
