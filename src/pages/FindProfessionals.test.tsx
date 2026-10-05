import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SearchedProfessional } from '../services/professionalSearch'
import { FindProfessionals } from './FindProfessionals'

// Os hooks são simulados: o que se testa é o que o ecrã mostra em cada estado da
// pesquisa (agrupamento perto/outros, vazio, erro, sem localização), não o pedido de rede.
const estado = vi.hoisted(() => ({
  pesquisa: {} as Record<string, unknown>,
  geolocalizacao: { status: 'idle' } as Record<string, unknown>,
  categorias: [
    { id: 'c1', slug: 'canalizacao', name: 'Canalização' },
    { id: 'c2', slug: 'pintura', name: 'Pintura' },
  ],
}))

vi.mock('../hooks/useProfessionalSearch', () => ({ useProfessionalSearch: () => estado.pesquisa }))
vi.mock('../hooks/useServiceCategories', () => ({ useServiceCategories: () => ({ data: estado.categorias }) }))
vi.mock('../hooks/useGeolocation', () => ({ useGeolocation: () => ({ state: estado.geolocalizacao, locate: vi.fn() }) }))
vi.mock('../hooks/useServiceRequests', () => ({ useCreateServiceRequest: () => ({ mutate: vi.fn(), isPending: false }) }))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => ({ data: { province: 'Maputo' } }) }))

function profissional(extra: Partial<SearchedProfessional> & { id: string; full_name: string }): SearchedProfessional {
  return {
    professional_type: 'SINGULAR',
    avatar_url: null,
    services: [{ id: 'c1', slug: 'canalizacao', name: 'Canalização' }],
    rating_avg: null,
    rating_count: 0,
    distance_m: null,
    is_nearby: false,
    ...extra,
  }
}

function mostrar(
  paginas: SearchedProfessional[][] | undefined,
  opcoes: {
    url?: string
    comLocalizacao?: boolean
    isLoading?: boolean
    isError?: boolean
    hasNextPage?: boolean
  } = {},
) {
  estado.geolocalizacao = opcoes.comLocalizacao
    ? { status: 'success', coordinates: { latitude: -25.97, longitude: 32.57 } }
    : { status: 'idle' }
  estado.pesquisa = {
    data: paginas ? { pages: paginas } : undefined,
    isLoading: opcoes.isLoading ?? false,
    isError: opcoes.isError ?? false,
    isSuccess: paginas !== undefined && !opcoes.isError,
    hasNextPage: opcoes.hasNextPage ?? false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }
  render(
    <MemoryRouter initialEntries={[opcoes.url ?? '/profissionais']}>
      <FindProfessionals />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('FindProfessionals — resultados', () => {
  it('com localização: "Perto de ti" e "Outros profissionais" em secções separadas, com serviço, avaliação e distância', () => {
    mostrar(
      [
        [
          profissional({ id: 'p1', full_name: 'Carlos Macamo', is_nearby: true, distance_m: 500, rating_avg: 4.5, rating_count: 2 }),
          profissional({ id: 'p2', full_name: 'Bento Cossa', is_nearby: false, distance_m: 149000 }),
        ],
      ],
      { comLocalizacao: true },
    )

    expect(screen.getByRole('heading', { name: 'Perto de ti' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Outros profissionais' })).toBeTruthy()
    expect(screen.getByText('0,5 km')).toBeTruthy()
    expect(screen.getByText('149 km')).toBeTruthy()
    expect(screen.getByText('(2)')).toBeTruthy()
    expect(screen.getByText('Sem avaliações')).toBeTruthy()
  })

  it('o cartão abre o catálogo do profissional', () => {
    mostrar([[profissional({ id: 'p1', full_name: 'Carlos Macamo' })]])

    expect(screen.getByRole('link', { name: /Carlos Macamo/ }).getAttribute('href')).toBe('/profissionais/p1')
  })

  it('sem localização: lista única "Profissionais", sem distâncias, e convite para ativar a localização', () => {
    mostrar([[profissional({ id: 'p1', full_name: 'Carlos Macamo' })]])

    expect(screen.getByRole('heading', { name: 'Profissionais' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Perto de ti' })).toBeNull()
    expect(screen.queryByText(/ km$/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Localizar' })).toBeTruthy()
  })

  it('só profissionais distantes: a secção chama-se "Profissionais", não "Outros"', () => {
    mostrar([[profissional({ id: 'p2', full_name: 'Bento Cossa', distance_m: 149000 })]], { comLocalizacao: true })

    expect(screen.getByRole('heading', { name: 'Profissionais' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Outros profissionais' })).toBeNull()
  })

  it('mostra no máximo 2 serviços por cartão e conta os restantes', () => {
    mostrar([
      [
        profissional({
          id: 'p1',
          full_name: 'Bento Cossa',
          services: [
            { id: 'c1', slug: 'a', name: 'Pintura' },
            { id: 'c2', slug: 'b', name: 'Jardinagem' },
            { id: 'c3', slug: 'c', name: 'Carpintaria' },
          ],
        }),
      ],
    ])

    // Dentro do cartão: "Pintura" também existe como chip de filtro no topo do ecrã.
    const cartao = within(screen.getByRole('listitem'))
    expect(cartao.getByText('Pintura')).toBeTruthy()
    expect(cartao.getByText('Jardinagem')).toBeTruthy()
    expect(cartao.queryByText('Carpintaria')).toBeNull()
    expect(cartao.getByText('+1')).toBeTruthy()
  })

  it('"Ver mais" só aparece quando há mais uma página', () => {
    mostrar([[profissional({ id: 'p1', full_name: 'Carlos Macamo' })]], { hasNextPage: true })

    expect(screen.getByRole('button', { name: 'Ver mais' })).toBeTruthy()
  })
})

describe('FindProfessionals — estados', () => {
  it('sem resultados com pesquisa: mensagem específica', () => {
    mostrar([[]], { url: '/profissionais?q=astronauta' })

    expect(screen.getByText('Nenhum profissional encontrado para esta pesquisa.')).toBeTruthy()
  })

  it('sem resultados nem filtros: diz que ainda não há profissionais', () => {
    mostrar([[]])

    expect(screen.getByText('Ainda não há profissionais registados.')).toBeTruthy()
  })

  it('erro: mensagem compreensível com "Tentar de novo"', () => {
    mostrar(undefined, { isError: true })

    expect(screen.getByText(/Não foi possível pesquisar agora/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })

  it('a pesquisa vinda do URL aparece no campo e a categoria vem marcada', () => {
    mostrar([[]], { url: '/profissionais?q=canalizador&category=pintura' })

    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('canalizador')
    expect(screen.getByRole('button', { name: 'Pintura' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Canalização' }).getAttribute('aria-pressed')).toBe('false')
  })
})
