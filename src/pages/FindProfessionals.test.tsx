import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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
      <Routes>
        <Route path="/profissionais" element={<FindProfessionals />} />
        <Route path="/novo-pedido" element={<EstadoRecebido />} />
      </Routes>
    </MemoryRouter>,
  )
}

// Destino de "Pedir a N": mostra o estado de navegação que o ecrã seguinte recebe.
function EstadoRecebido() {
  return <pre data-testid="estado-novo-pedido">{JSON.stringify(useLocation().state)}</pre>
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

// Bloco B (Backend Fase 11, Adendo v1.18): escolher exatamente 3 profissionais (ou todos
// se houver menos) e seguir para /novo-pedido.
describe('FindProfessionals — escolher a quem enviar o pedido', () => {
  const quatro = () => [
    [
      profissional({ id: 'p1', full_name: 'Ana Um' }),
      profissional({ id: 'p2', full_name: 'Bruno Dois' }),
      profissional({ id: 'p3', full_name: 'Carla Três' }),
      profissional({ id: 'p4', full_name: 'Diogo Quatro' }),
    ],
  ]
  const escolher = (nome: string) => fireEvent.click(screen.getByRole('checkbox', { name: `Escolher ${nome}` }))
  const botaoPedir = () => screen.getByRole('button', { name: /^Pedir a / }) as HTMLButtonElement

  it('só deixa enviar com exatamente 3 escolhidos, e bloqueia os restantes quando chega aos 3', () => {
    mostrar(quatro(), { url: '/profissionais?category=canalizacao' })

    expect(botaoPedir().disabled).toBe(true)
    escolher('Ana Um')
    escolher('Bruno Dois')
    expect(botaoPedir().disabled).toBe(true)
    expect(screen.getByText('2/3')).toBeTruthy()

    escolher('Carla Três')
    expect(botaoPedir().disabled).toBe(false)
    expect((screen.getByRole('checkbox', { name: 'Escolher Diogo Quatro' }) as HTMLInputElement).disabled).toBe(true)
  })

  it('desmarcar liberta de novo as outras caixas', () => {
    mostrar(quatro(), { url: '/profissionais?category=canalizacao' })

    escolher('Ana Um')
    escolher('Bruno Dois')
    escolher('Carla Três')
    escolher('Ana Um')

    expect(botaoPedir().disabled).toBe(true)
    expect((screen.getByRole('checkbox', { name: 'Escolher Diogo Quatro' }) as HTMLInputElement).disabled).toBe(false)
  })

  it('"Pedir a 3" leva ao novo pedido com o serviço e os profissionais escolhidos', () => {
    mostrar(quatro(), { url: '/profissionais?category=canalizacao' })

    escolher('Ana Um')
    escolher('Carla Três')
    escolher('Diogo Quatro')
    fireEvent.click(botaoPedir())

    expect(JSON.parse(screen.getByTestId('estado-novo-pedido').textContent ?? '')).toEqual({
      categoryId: 'c1',
      categoryName: 'Canalização',
      professionals: [
        { id: 'p1', full_name: 'Ana Um' },
        { id: 'p3', full_name: 'Carla Três' },
        { id: 'p4', full_name: 'Diogo Quatro' },
      ],
    })
  })

  it('serviço com menos de 3 profissionais: escolhem-se todos', () => {
    mostrar([[profissional({ id: 'p1', full_name: 'Ana Um' }), profissional({ id: 'p2', full_name: 'Bruno Dois' })]], {
      url: '/profissionais?category=canalizacao',
    })

    expect(screen.getByText(/só há 2 para Canalização/)).toBeTruthy()
    escolher('Ana Um')
    expect(botaoPedir().disabled).toBe(true)
    escolher('Bruno Dois')
    expect(botaoPedir().disabled).toBe(false)
  })

  it('pesquisa por texto: o serviço comum a todos os resultados é deduzido, sem escolher o botão do serviço', () => {
    mostrar(quatro(), { url: '/profissionais?q=canalizador' })

    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
    expect(screen.queryByText(/escolhe primeiro o serviço/)).toBeNull()
  })

  it('resultados com serviços diferentes e sem serviço escolhido: pede para escolher o serviço, sem caixas', () => {
    mostrar(
      [
        [
          profissional({ id: 'p1', full_name: 'Ana Um' }),
          profissional({ id: 'p2', full_name: 'Bruno Dois', services: [{ id: 'c2', slug: 'pintura', name: 'Pintura' }] }),
        ],
      ],
      { url: '/profissionais?q=a' },
    )

    expect(screen.getByText(/escolhe primeiro o serviço/)).toBeTruthy()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /^Pedir a / })).toBeNull()
  })
})
