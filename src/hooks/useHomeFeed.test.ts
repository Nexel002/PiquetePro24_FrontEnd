import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FEATURED_WORKS } from '../data/featuredWorks'
import { useHomeFeed } from './useHomeFeed'

// A lista de categorias vem da API; aqui interessa só como a Home a combina com as de
// reserva e como filtra, não o pedido de rede.
const categorias = vi.hoisted(() => ({ data: undefined as { slug: string; name: string }[] | undefined }))

vi.mock('./useServiceCategories', () => ({
  useServiceCategories: () => ({ data: categorias.data }),
}))

beforeEach(() => {
  categorias.data = undefined
})

describe('useHomeFeed', () => {
  it('começa sem filtro e com todos os trabalhos', () => {
    const { result } = renderHook(() => useHomeFeed())

    expect(result.current.filtroActivo).toBe(false)
    expect(result.current.trabalhosFiltrados).toHaveLength(FEATURED_WORKS.length)
  })

  it('filtra por categoria', () => {
    const { result } = renderHook(() => useHomeFeed())

    act(() => result.current.setCategoria('canalizacao'))

    expect(result.current.filtroActivo).toBe(true)
    expect(result.current.trabalhosFiltrados.length).toBeGreaterThan(0)
    expect(result.current.trabalhosFiltrados.every((w) => w.serviceSlug === 'canalizacao')).toBe(true)
  })

  it('pesquisa sem acentuação obrigatória nem maiúsculas, por título, serviço, profissional ou local', () => {
    const { result } = renderHook(() => useHomeFeed())
    const alvo = FEATURED_WORKS[0]

    act(() => result.current.setPesquisa(`  ${alvo.professionalName.toUpperCase()}  `))

    expect(result.current.trabalhosFiltrados.map((w) => w.id)).toContain(alvo.id)
    expect(result.current.trabalhosFiltrados.every((w) => w.professionalName === alvo.professionalName)).toBe(true)
  })

  it('combina categoria e pesquisa, e devolve vazio quando nada corresponde', () => {
    const { result } = renderHook(() => useHomeFeed())

    act(() => {
      result.current.setCategoria('canalizacao')
      result.current.setPesquisa('termo-que-nao-existe')
    })

    expect(result.current.trabalhosFiltrados).toEqual([])
  })

  it('só espaços na pesquisa não conta como filtro', () => {
    const { result } = renderHook(() => useHomeFeed())

    act(() => result.current.setPesquisa('   '))

    expect(result.current.filtroActivo).toBe(false)
  })

  it('limparFiltros repõe categoria e pesquisa', () => {
    const { result } = renderHook(() => useHomeFeed())

    act(() => {
      result.current.setCategoria('pintura')
      result.current.setPesquisa('algo')
    })
    act(() => result.current.limparFiltros())

    expect(result.current.categoria).toBe('all')
    expect(result.current.pesquisa).toBe('')
    expect(result.current.filtroActivo).toBe(false)
  })

  it('usa as categorias de reserva até a API responder e as da API depois', () => {
    const { result, rerender } = renderHook(() => useHomeFeed())
    expect(result.current.categorias.some((c) => c.slug === 'canalizacao')).toBe(true)

    categorias.data = [{ slug: 'mudancas', name: 'Mudanças' }]
    rerender()

    expect(result.current.categorias).toEqual([{ slug: 'mudancas', name: 'Mudanças' }])
  })

  it('não repete o mesmo trabalho dentro de nenhum slider', () => {
    const { result } = renderHook(() => useHomeFeed())

    for (const grupo of [result.current.destaques, result.current.canalizacao, result.current.eletricidade, result.current.exteriores]) {
      const ids = grupo.map((w) => w.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
