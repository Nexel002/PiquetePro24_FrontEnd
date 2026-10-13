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

function catalogo(extra: Partial<Catalogo> = {}): Catalogo {
  return {
    id: 'p1',
    full_name: 'Carlos Sitoe',
    avatar_url: null,
    professional_type: 'SINGULAR',
    bio: 'Canalizador há 10 anos.',
    services: [{ id: 's1', slug: 'canalizacao', name: 'Canalização' }],
    projects: [],
    rating_avg: null,
    rating_count: 0,
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

  it('não afirma que o profissional está verificado nem inventa uma descrição', () => {
    mostrar({ data: catalogo({ bio: null }), isLoading: false, isError: false })

    expect(screen.queryByTitle(/Verificado/i)).toBeNull()
    expect(screen.queryByText(/Profissional qualificado disponível/)).toBeNull()
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

  it('sem trabalhos nem avaliações, mostra os estados vazios', () => {
    mostrar({ data: catalogo(), isLoading: false, isError: false })

    expect(screen.getByText('Este profissional ainda não adicionou trabalhos.')).toBeTruthy()
    expect(screen.getByText('Ainda sem avaliações nesta plataforma.')).toBeTruthy()
  })
})
