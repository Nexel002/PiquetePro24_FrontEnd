import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchedProfessional } from '../services/professionalSearch'
import { useSelecaoParaPedido } from './useSelecaoParaPedido'

const navegar = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', () => ({ useNavigate: () => navegar }))

const CANALIZACAO = { id: 's1', slug: 'canalizacao', name: 'Canalização' }
const PINTURA = { id: 's2', slug: 'pintura', name: 'Pintura' }

function profissional(id: string, services = [CANALIZACAO]): SearchedProfessional {
  return { id, full_name: `Pro ${id}`, services } as unknown as SearchedProfessional
}

function usar(opcoes: Partial<Parameters<typeof useSelecaoParaPedido>[0]> = {}) {
  const profissionais = opcoes.profissionais ?? [profissional('a'), profissional('b'), profissional('c'), profissional('d')]
  return renderHook(() =>
    useSelecaoParaPedido({
      categoria: '',
      categorias: [CANALIZACAO, PINTURA],
      profissionais,
      temMaisPaginas: false,
      ...opcoes,
    }),
  )
}

beforeEach(() => navegar.mockClear())

describe('useSelecaoParaPedido', () => {
  it('sem categoria, o serviço pedido é o único que todos os resultados têm em comum', () => {
    expect(usar().result.current.servicoPedido?.id).toBe('s1')

    const misturados = [profissional('a', [CANALIZACAO, PINTURA]), profissional('b', [CANALIZACAO, PINTURA])]
    expect(usar({ profissionais: misturados }).result.current.servicoPedido).toBeNull()
  })

  it('com categoria filtrada, o serviço é o dessa categoria', () => {
    expect(usar({ categoria: 'pintura' }).result.current.servicoPedido?.id).toBe('s2')
  })

  it('sem resultados não há serviço nem pedido possível', () => {
    const { result } = usar({ profissionais: [] })

    expect(result.current.servicoPedido).toBeNull()
    expect(result.current.necessarios).toBe(0)
    expect(result.current.podeEnviar).toBe(false)
  })

  it('escolhe-se um número fixo; sem mais páginas e com menos resultados, são todos os que há', () => {
    expect(usar().result.current.necessarios).toBe(3)
    expect(usar({ profissionais: [profissional('a'), profissional('b')] }).result.current.necessarios).toBe(2)
    expect(usar({ profissionais: [profissional('a'), profissional('b')], temMaisPaginas: true }).result.current.necessarios).toBe(3)
  })

  it('só pode enviar com o número exacto de escolhidos, e alternar desfaz a escolha', () => {
    const { result } = usar()

    act(() => result.current.alternar('a'))
    act(() => result.current.alternar('b'))
    expect(result.current.podeEnviar).toBe(false)

    act(() => result.current.alternar('c'))
    expect(result.current.podeEnviar).toBe(true)

    act(() => result.current.alternar('c'))
    expect(result.current.podeEnviar).toBe(false)
    expect(result.current.idsEscolhidos).toEqual(['a', 'b'])
  })

  it('enviar leva ao novo pedido com o serviço e os profissionais escolhidos', () => {
    const { result } = usar()
    act(() => result.current.alternar('a'))
    act(() => result.current.alternar('b'))
    act(() => result.current.alternar('c'))

    act(() => result.current.enviar())

    expect(navegar).toHaveBeenCalledWith('/novo-pedido', {
      state: {
        categoryId: 's1',
        categoryName: 'Canalização',
        professionals: [
          { id: 'a', full_name: 'Pro a' },
          { id: 'b', full_name: 'Pro b' },
          { id: 'c', full_name: 'Pro c' },
        ],
      },
    })
  })

  it('enviar sem a escolha completa não navega', () => {
    const { result } = usar()
    act(() => result.current.alternar('a'))

    act(() => result.current.enviar())

    expect(navegar).not.toHaveBeenCalled()
  })
})
