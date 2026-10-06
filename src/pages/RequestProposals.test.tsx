import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Proposal, RequestProposals as RequestProposalsData } from '../services/invitations'
import { RequestProposals } from './RequestProposals'

// Os hooks são simulados: o que se testa é o que o cliente vê ao comparar propostas e o
// que acontece ao escolher, não o pedido de rede.
const estado = vi.hoisted(() => ({
  propostas: {} as Record<string, unknown>,
  escolhido: { data: undefined } as Record<string, unknown>,
  escolher: vi.fn(),
}))

vi.mock('../hooks/useInvitations', () => ({
  useRequestProposals: () => estado.propostas,
  useChooseProposal: () => ({ mutate: estado.escolher, isPending: false, variables: undefined }),
  useChosenProfessional: () => estado.escolhido,
}))

function proposta(extra: Partial<Proposal> & { professional_id: string; full_name: string; proposal_price: number }): Proposal {
  return {
    avatar_url: null,
    rating_avg: null,
    rating_count: 0,
    status: 'PROPOSED',
    proposal_message: null,
    responded_at: '2026-10-06T10:00:00.000Z',
    ...extra,
  }
}

function mostrar(
  data: RequestProposalsData | undefined,
  opcoes: { isLoading?: boolean; isError?: boolean; contacto?: { full_name: string; phone: string | null } } = {},
) {
  estado.propostas = { data, isLoading: opcoes.isLoading ?? false, isError: opcoes.isError ?? false, refetch: vi.fn() }
  estado.escolhido = { data: opcoes.contacto ? { professional_id: 'p1', ...opcoes.contacto } : undefined }
  render(
    <MemoryRouter initialEntries={['/os-meus-pedidos/sr-1/propostas']}>
      <Routes>
        <Route path="/os-meus-pedidos/:id/propostas" element={<RequestProposals />} />
      </Routes>
    </MemoryRouter>,
  )
}

const duasPropostas = (): RequestProposalsData => ({
  request_status: 'OPEN',
  invited_count: 3,
  proposals: [
    proposta({ professional_id: 'p2', full_name: 'Joana Sitoe', proposal_price: 300, proposal_message: 'Hoje à tarde' }),
    proposta({ professional_id: 'p1', full_name: 'Carlos Macamo', proposal_price: 450, rating_avg: 4.5, rating_count: 2 }),
  ],
})

beforeEach(() => estado.escolher.mockClear())
afterEach(cleanup)

describe('RequestProposals — comparar', () => {
  it('mostra as propostas pela ordem recebida (mais barata primeiro), a mais barata assinalada e quantos já responderam', () => {
    mostrar(duasPropostas())

    const nomes = screen.getAllByRole('link', { name: /Joana Sitoe|Carlos Macamo/ }).map((link) => link.textContent)
    expect(nomes).toEqual(['Joana Sitoe', 'Carlos Macamo'])
    expect(screen.getAllByText('Mais barato')).toHaveLength(1)
    expect(screen.getByText('Hoje à tarde')).toBeTruthy()
    expect(screen.getByText(/2 de 3 responderam/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Carlos Macamo' }).getAttribute('href')).toBe('/profissionais/p1')
  })

  it('uma única proposta não leva o selo "Mais barato" (não há com que comparar)', () => {
    mostrar({ request_status: 'OPEN', invited_count: 3, proposals: [proposta({ professional_id: 'p1', full_name: 'Carlos Macamo', proposal_price: 450 })] })

    expect(screen.queryByText('Mais barato')).toBeNull()
  })

  it('sem propostas: diz que os profissionais foram avisados', () => {
    mostrar({ request_status: 'OPEN', invited_count: 3, proposals: [] })

    expect(screen.getByText('Ainda sem propostas.')).toBeTruthy()
    expect(screen.getByText(/Os 3 profissionais foram avisados por email/)).toBeTruthy()
  })

  it('erro ao carregar: mensagem compreensível e "Tentar de novo"', () => {
    mostrar(undefined, { isError: true })

    expect(screen.getByText(/Não foi possível carregar as propostas/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })
})

describe('RequestProposals — escolher', () => {
  it('escolher exige confirmação: o primeiro toque só pergunta, e só "Sim, escolher" escolhe', () => {
    mostrar(duasPropostas())

    fireEvent.click(screen.getAllByRole('button', { name: 'Escolher' })[0])
    expect(estado.escolher).not.toHaveBeenCalled()
    expect(screen.getByText(/os outros profissionais são avisados/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Sim, escolher' }))
    expect(estado.escolher).toHaveBeenCalledWith('p2')
  })

  it('"Cancelar" desiste da escolha sem escolher ninguém', () => {
    mostrar(duasPropostas())

    fireEvent.click(screen.getAllByRole('button', { name: 'Escolher' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(estado.escolher).not.toHaveBeenCalled()
    expect(screen.queryByText(/os outros profissionais são avisados/)).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Escolher' })).toHaveLength(2)
  })

  it('depois de escolhido: sem botões de escolher, o escolhido assinalado e o telefone dele visível', () => {
    mostrar(
      {
        request_status: 'ASSIGNED',
        invited_count: 3,
        proposals: [
          proposta({ professional_id: 'p1', full_name: 'Carlos Macamo', proposal_price: 450, status: 'CHOSEN' }),
          proposta({ professional_id: 'p2', full_name: 'Joana Sitoe', proposal_price: 500, status: 'NOT_CHOSEN' }),
        ],
      },
      { contacto: { full_name: 'Carlos Macamo', phone: '+258841111111' } },
    )

    expect(screen.queryByRole('button', { name: 'Escolher' })).toBeNull()
    expect(screen.getByText('Escolhido')).toBeTruthy()
    expect(screen.getByText('Contacta Carlos Macamo')).toBeTruthy()
    expect(screen.getByRole('link', { name: '+258841111111' }).getAttribute('href')).toBe('tel:+258841111111')
  })

  it('o telefone do profissional guardado sem "+" aparece com um só "+"', () => {
    mostrar(
      { request_status: 'ASSIGNED', invited_count: 1, proposals: [proposta({ professional_id: 'p1', full_name: 'Carlos Macamo', proposal_price: 450, status: 'CHOSEN' })] },
      { contacto: { full_name: 'Carlos Macamo', phone: '258841111111' } },
    )

    expect(screen.getByRole('link', { name: '+258841111111' })).toBeTruthy()
  })

  it('escolhido sem telefone registado: avisa em vez de mostrar um link vazio', () => {
    mostrar(
      { request_status: 'ASSIGNED', invited_count: 1, proposals: [proposta({ professional_id: 'p1', full_name: 'Carlos Macamo', proposal_price: 450, status: 'CHOSEN' })] },
      { contacto: { full_name: 'Carlos Macamo', phone: null } },
    )

    expect(screen.getByText(/ainda não registou um telefone/)).toBeTruthy()
  })

  it('antes de escolher nunca mostra telefone', () => {
    mostrar(duasPropostas())

    expect(screen.queryByText(/Contacta /)).toBeNull()
    expect(screen.queryByRole('link', { name: /\+258/ })).toBeNull()
  })

  it('pedido cancelado: avisa e não deixa escolher', () => {
    mostrar({ request_status: 'CANCELLED', invited_count: 3, proposals: [proposta({ professional_id: 'p1', full_name: 'Carlos Macamo', proposal_price: 450 })] })

    expect(screen.getByText('Este pedido foi cancelado.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Escolher' })).toBeNull()
  })
})
