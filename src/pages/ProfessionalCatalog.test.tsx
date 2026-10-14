import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProfessionalCatalog as Catalogo } from '../services/catalog'
import { ProfessionalCatalog } from './ProfessionalCatalog'

const estado = vi.hoisted(() => ({
  catalogo: {} as Record<string, unknown>,
  perfil: { data: undefined } as Record<string, unknown>,
}))

vi.mock('../hooks/useCatalog', () => ({ useProfessionalCatalog: () => estado.catalogo }))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => estado.perfil }))
// Só o botão de denunciar usa este hook; o comportamento dele tem teste próprio.
vi.mock('../hooks/useModeration', () => ({ useCreateReport: () => ({ mutate: vi.fn(), isPending: false }) }))

function catalogo(extra: Partial<Catalogo> = {}): Catalogo {
  return {
    id: 'p1',
    full_name: 'Carlos Sitoe',
    avatar_url: null,
    professional_type: 'SINGULAR',
    bio: 'Canalizador há 10 anos.',
    identity_verified: false,
    services: [{ id: 's1', slug: 'canalizacao', name: 'Canalização' }],
    projects: [],
    rating_avg: null,
    rating_count: 0,
    team: [],
    reviews: [],
    ...extra,
  }
}

function mostrar(resultado: Record<string, unknown>, perfil: Record<string, unknown> = { data: undefined }) {
  estado.catalogo = resultado
  estado.perfil = perfil
  render(
    <MemoryRouter initialEntries={['/profissionais/p1']}>
      <Routes>
        <Route path="/profissionais/:id" element={<ProfessionalCatalog />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

function avaliacaoBase() {
  return {
    id: 'r1',
    service_request_id: 's1',
    professional_id: 'p1',
    client_id: 'c1',
    client_full_name: 'Ana',
    rating: 5,
    comment: 'Bom trabalho',
    comment_hidden: false,
    member_rating: null,
    technician: null,
    created_at: '2026-10-02T10:00:00Z',
  }
}

describe('ProfessionalCatalog', () => {
  it('mostra o esqueleto a carregar e o erro, sem catálogo', () => {
    mostrar({ data: undefined, isLoading: true, isError: false })
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    cleanup()

    mostrar({ data: undefined, isLoading: false, isError: true })
    expect(screen.getByText(/Não foi possível carregar este catálogo/)).toBeTruthy()
  })

  it('tem um único <h1>, com o nome, e os serviços do profissional', () => {
    mostrar({ data: catalogo(), isLoading: false, isError: false })

    const titulos = screen.getAllByRole('heading', { level: 1 })
    expect(titulos).toHaveLength(1)
    expect(titulos[0].textContent).toBe('Carlos Sitoe')
    expect(screen.getByRole('list', { name: 'Serviços' }).textContent).toContain('Canalização')
  })

  it('só mostra «Identidade verificada» quando o backend o confirma; nunca inventa uma descrição', () => {
    mostrar({ data: catalogo({ bio: null }), isLoading: false, isError: false })
    expect(screen.queryByText('Identidade verificada')).toBeNull()
    expect(screen.queryByText(/Profissional qualificado disponível/)).toBeNull()
    cleanup()

    mostrar({ data: catalogo({ identity_verified: true }), isLoading: false, isError: false })
    expect(screen.getByText('Identidade verificada')).toBeTruthy()
  })

  it('com um só serviço, «Pedir» leva à busca já com esse serviço; com vários, à busca geral', () => {
    mostrar({ data: catalogo(), isLoading: false, isError: false })
    const pedir = screen.getByRole('link', { name: 'Pedir Canalização' })
    expect(pedir.getAttribute('href')).toBe('/profissionais?category=canalizacao')
    expect(screen.getByText(/O pedido segue para 3 profissionais/)).toBeTruthy()
    cleanup()

    mostrar({
      data: catalogo({
        services: [
          { id: 's1', slug: 'canalizacao', name: 'Canalização' },
          { id: 's2', slug: 'pintura', name: 'Pintura' },
        ],
      }),
      isLoading: false,
      isError: false,
    })
    expect(screen.getByRole('link', { name: 'Pedir um serviço' }).getAttribute('href')).toBe('/profissionais')
  })

  it('o dono vê «Editar o meu catálogo» e a dica de descrição em falta, em vez de «Pedir»', () => {
    mostrar({ data: catalogo({ bio: null }), isLoading: false, isError: false }, { data: { id: 'p1' } })

    expect(screen.getByRole('link', { name: 'Editar o meu catálogo' }).getAttribute('href')).toBe('/catalogo')
    expect(screen.getByText(/Ainda não escreveste uma descrição/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: /^Pedir/ })).toBeNull()
  })

  describe('moderação', () => {
    const projecto = {
      id: 't1',
      category: null,
      description: 'Casa de banho',
      created_at: '2026-10-01T10:00:00Z',
      photos: [{ id: 'f1', photo_url: 'https://x/1.webp', position: 0 }],
      hidden: false,
      hidden_reason: null,
    }
    const avaliacao = {
      id: 'r1',
      service_request_id: 's1',
      professional_id: 'p1',
      client_id: 'c1',
      client_full_name: 'Ana',
      rating: 4,
      comment: 'Bom trabalho',
      comment_hidden: false,
      member_rating: null,
      technician: null,
      created_at: '2026-10-02T10:00:00Z',
    }

    it('quem não é o dono pode denunciar a conta, o trabalho e o comentário', () => {
      mostrar({ data: catalogo({ projects: [projecto], reviews: [avaliacao], rating_avg: 4, rating_count: 1 }), isLoading: false, isError: false })

      expect(screen.getByRole('button', { name: 'Denunciar este profissional' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Denunciar este trabalho' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Denunciar a avaliação de Ana' })).toBeTruthy()
    })

    it('o dono não se denuncia a si próprio e vê o aviso do trabalho ocultado', () => {
      mostrar(
        {
          data: catalogo({ projects: [{ ...projecto, hidden: true, hidden_reason: 'Imagens impróprias' }] }),
          isLoading: false,
          isError: false,
        },
        { data: { id: 'p1' } },
      )

      expect(screen.queryByRole('button', { name: /denunciar/i })).toBeNull()
      expect(screen.getByRole('status').textContent).toContain('Imagens impróprias')
    })

    it('um comentário ocultado é explicado e não se pode denunciar', () => {
      mostrar({
        data: catalogo({ reviews: [{ ...avaliacao, comment: null, comment_hidden: true }], rating_avg: 4, rating_count: 1 }),
        isLoading: false,
        isError: false,
      })

      expect(screen.getByText('Comentário removido pela moderação.')).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Denunciar a avaliação de Ana' })).toBeNull()
    })
  })

  describe('equipa e técnico', () => {
    const tecnico = { id: 'm1', first_name: 'João', title: 'Canalizador', avatar_url: null, services: [], rating_avg: 4.5, rating_count: 2 }

    it('uma empresa com equipa mostra os técnicos, com título e nota', () => {
      mostrar({ data: catalogo({ professional_type: 'COMPANY', team: [tecnico] }), isLoading: false, isError: false })

      const equipa = screen.getByRole('region', { name: 'A equipa' })
      expect(equipa.textContent).toContain('João')
      expect(equipa.textContent).toContain('Canalizador')
      expect(equipa.textContent).toContain('4.5 (2)')
    })

    it('um técnico sem avaliações diz que ainda não tem', () => {
      mostrar({ data: catalogo({ team: [{ ...tecnico, rating_avg: null, rating_count: 0 }] }), isLoading: false, isError: false })
      expect(screen.getByText('Ainda sem avaliações')).toBeTruthy()
    })

    it('sem equipa (singular ou empresa sem técnicos) a secção não aparece', () => {
      mostrar({ data: catalogo({ team: [] }), isLoading: false, isError: false })
      expect(screen.queryByRole('region', { name: 'A equipa' })).toBeNull()
    })

    it('a avaliação diz quem fez o trabalho e a nota que teve', () => {
      mostrar({
        data: catalogo({
          reviews: [{ ...avaliacaoBase(), technician: { first_name: 'João', title: 'Canalizador' }, member_rating: 4 }],
          rating_avg: 5,
          rating_count: 1,
        }),
        isLoading: false,
        isError: false,
      })

      expect(screen.getByText(/feito por/i).textContent).toContain('João')
      expect(screen.getByRole('img', { name: '4 de 5 estrelas' })).toBeTruthy()
    })

    it('uma avaliação de um pedido sem técnico não menciona nenhum', () => {
      mostrar({ data: catalogo({ reviews: [avaliacaoBase()], rating_avg: 5, rating_count: 1 }), isLoading: false, isError: false })
      expect(screen.queryByText(/feito por/i)).toBeNull()
    })

    it('nunca mostra telefone nem email de um técnico', () => {
      mostrar({ data: catalogo({ team: [tecnico] }), isLoading: false, isError: false })
      expect(document.body.textContent).not.toMatch(/@|[+]258/)
    })
  })

  it('sem trabalhos nem avaliações, mostra os estados vazios', () => {
    mostrar({ data: catalogo(), isLoading: false, isError: false })

    expect(screen.getByText('Este profissional ainda não adicionou trabalhos.')).toBeTruthy()
    expect(screen.getByText('Ainda sem avaliações nesta plataforma.')).toBeTruthy()
  })
})
