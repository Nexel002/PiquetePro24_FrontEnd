import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkedWithProfessional } from '../services/clientHistory'
import { MyProfessionals } from './MyProfessionals'

// O hook é simulado: o que se testa é o que o cliente vê no histórico e para onde o
// leva "Pedir outra vez", não o pedido de rede.
const estado = vi.hoisted(() => ({ consulta: {} as Record<string, unknown> }))

vi.mock('../hooks/useWorkedWithProfessionals', () => ({
  useWorkedWithProfessionals: () => estado.consulta,
}))

function profissional(extra: Partial<WorkedWithProfessional> = {}): WorkedWithProfessional {
  return {
    professional_id: 'p1',
    full_name: 'Carlos Macamo',
    avatar_url: null,
    jobs_count: 1,
    last_job_at: '2026-10-01T10:00:00.000Z',
    last_job_title: 'Reparar torneira',
    my_rating: null,
    ...extra,
  }
}

function mostrar(data: WorkedWithProfessional[] | undefined, opcoes: { isLoading?: boolean; isError?: boolean } = {}) {
  estado.consulta = { data, isLoading: opcoes.isLoading ?? false, isError: opcoes.isError ?? false, refetch: vi.fn() }
  render(
    <MemoryRouter>
      <MyProfessionals />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('MyProfessionals', () => {
  it('lista os profissionais com nº de trabalhos, último trabalho e a avaliação dada', () => {
    mostrar([
      profissional({ jobs_count: 3, my_rating: 4 }),
      profissional({ professional_id: 'p2', full_name: 'Joana Sitoe', last_job_title: 'Pintar sala' }),
    ])

    expect(screen.getByText('Carlos Macamo')).toBeTruthy()
    expect(screen.getByText(/3 trabalhos/)).toBeTruthy()
    expect(screen.getByText('Reparar torneira')).toBeTruthy()
    expect(screen.getByText(/1 trabalho ·/)).toBeTruthy()
    expect(screen.getByText('Pintar sala')).toBeTruthy()
    expect(screen.getByText('Sem avaliação')).toBeTruthy()
    expect(screen.getByText('(a tua avaliação)').parentElement?.textContent).toContain('4')
  })

  it('"Pedir outra vez" abre o catálogo do profissional certo', () => {
    mostrar([profissional({ professional_id: 'p1' }), profissional({ professional_id: 'p2', full_name: 'Joana Sitoe' })])

    const ligacoes = screen.getAllByRole('link', { name: 'Pedir outra vez' })

    expect(ligacoes.map((ligacao) => ligacao.getAttribute('href'))).toEqual(['/profissionais/p1', '/profissionais/p2'])
  })

  it('a carregar: mostra o esqueleto e nenhum cartão', () => {
    mostrar(undefined, { isLoading: true })

    expect(screen.queryByText('Pedir outra vez')).toBeNull()
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('erro: mensagem compreensível e botão para tentar de novo', () => {
    mostrar(undefined, { isError: true })

    expect(screen.getByText(/Não foi possível carregar os teus profissionais/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })

  it('sem trabalhos concluídos: texto próprio (não é erro) com atalho para procurar', () => {
    mostrar([])

    expect(screen.getByText(/Ainda não concluíste nenhum trabalho/)).toBeTruthy()
    expect(screen.queryByText(/Não foi possível/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Procura um profissional' }).getAttribute('href')).toBe('/profissionais')
  })
})
