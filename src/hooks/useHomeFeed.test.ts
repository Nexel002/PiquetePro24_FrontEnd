import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeaturedWork } from '../services/featuredWorks'
import { useHomeFeed } from './useHomeFeed'

// A lista de categorias e a de trabalhos vêm da API; aqui interessa só como a Home as combina
// com as de reserva, como filtra e em que estado fica a montra, não o pedido de rede.
const mocks = vi.hoisted(() => ({
  categorias: { data: undefined as { slug: string; name: string }[] | undefined },
  sessao: { valor: {} as object | null },
  trabalhos: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() },
}))

vi.mock('./useServiceCategories', () => ({
  useServiceCategories: () => ({ data: mocks.categorias.data }),
}))
vi.mock('./useFeaturedWorks', () => ({
  useFeaturedWorks: () => mocks.trabalhos,
}))
vi.mock('../store/AuthContext', () => ({
  useAuth: () => ({ session: mocks.sessao.valor }),
}))

function trabalho(id: string, service_slug: string, extra: Partial<FeaturedWork> = {}): FeaturedWork {
  return {
    id,
    title: `Trabalho ${id}`,
    professional_id: `pro-${id}`,
    professional_name: `Profissional ${id}`,
    professional_avatar: null,
    service_slug,
    service_name: service_slug,
    location: 'Maputo Cidade · KaMpfumo',
    rating_avg: null,
    rating_count: 0,
    completed_jobs_count: 0,
    badge: null,
    image_url: `https://x/${id}.webp`,
    ...extra,
  }
}

const TRABALHOS = [
  trabalho('1', 'canalizacao', { professional_name: 'Carlos Macamo' }),
  trabalho('2', 'canalizacao'),
  trabalho('3', 'eletricidade'),
  trabalho('4', 'pintura'),
  trabalho('5', 'jardinagem'),
  trabalho('6', 'serralharia'),
]

beforeEach(() => {
  mocks.categorias.data = undefined
  mocks.sessao.valor = {}
  mocks.trabalhos.data = TRABALHOS
  mocks.trabalhos.isLoading = false
  mocks.trabalhos.isError = false
  mocks.trabalhos.refetch = vi.fn()
})

describe('useHomeFeed — filtros', () => {
  it('começa sem filtro e com todos os trabalhos', () => {
    const { result } = renderHook(() => useHomeFeed())

    expect(result.current.filtroActivo).toBe(false)
    expect(result.current.trabalhosFiltrados).toHaveLength(TRABALHOS.length)
  })

  it('filtra por categoria', () => {
    const { result } = renderHook(() => useHomeFeed())

    act(() => result.current.setCategoria('canalizacao'))

    expect(result.current.filtroActivo).toBe(true)
    expect(result.current.trabalhosFiltrados.map((w) => w.id)).toEqual(['1', '2'])
  })

  it('pesquisa sem maiúsculas obrigatórias, por título, serviço, profissional ou local', () => {
    const { result } = renderHook(() => useHomeFeed())

    act(() => result.current.setPesquisa('  CARLOS MACAMO  '))

    expect(result.current.trabalhosFiltrados.map((w) => w.id)).toEqual(['1'])

    act(() => result.current.setPesquisa('kampfumo'))
    expect(result.current.trabalhosFiltrados).toHaveLength(TRABALHOS.length)
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

    mocks.categorias.data = [{ slug: 'mudancas', name: 'Mudanças' }]
    rerender()

    expect(result.current.categorias).toEqual([{ slug: 'mudancas', name: 'Mudanças' }])
  })
})

describe('useHomeFeed — sliders', () => {
  it('reparte os trabalhos pelos temas e nenhum slider repete um trabalho', () => {
    const { result } = renderHook(() => useHomeFeed())

    expect(result.current.canalizacao.map((w) => w.id)).toEqual(['1', '2'])
    expect(result.current.eletricidade.map((w) => w.id)).toEqual(['3'])
    expect(result.current.exteriores.map((w) => w.id)).toEqual(['4', '5'])
    // Serralharia não tem tema próprio: só aparece nos destaques.
    expect(result.current.destaques.map((w) => w.id)).toContain('6')

    for (const grupo of [result.current.destaques, result.current.canalizacao, result.current.eletricidade, result.current.exteriores]) {
      const ids = grupo.map((w) => w.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('useHomeFeed — estado da montra', () => {
  it('com trabalhos: pronto', () => {
    const { result } = renderHook(() => useHomeFeed())

    expect(result.current.estado).toBe('pronto')
  })

  it('sem sessão: «sem-sessao», mesmo que haja dados em cache', () => {
    mocks.sessao.valor = null
    const { result } = renderHook(() => useHomeFeed())

    expect(result.current.estado).toBe('sem-sessao')
  })

  it('a carregar', () => {
    mocks.trabalhos.data = undefined
    mocks.trabalhos.isLoading = true
    const { result } = renderHook(() => useHomeFeed())

    expect(result.current.estado).toBe('a-carregar')
    expect(result.current.trabalhosFiltrados).toEqual([])
  })

  it('erro de rede não se confunde com «vazio»', () => {
    mocks.trabalhos.data = undefined
    mocks.trabalhos.isError = true
    const { result } = renderHook(() => useHomeFeed())

    expect(result.current.estado).toBe('erro')
  })

  it('lista vazia da API: «vazio»', () => {
    mocks.trabalhos.data = []
    const { result } = renderHook(() => useHomeFeed())

    expect(result.current.estado).toBe('vazio')
  })

  it('aoTentarDeNovo repete o pedido', () => {
    const { result } = renderHook(() => useHomeFeed())

    result.current.aoTentarDeNovo()

    expect(mocks.trabalhos.refetch).toHaveBeenCalledTimes(1)
  })
})
