import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Invitation, MyInvitations } from '../services/invitations'
import { ReceivedInvitations } from './ReceivedInvitations'

// Os hooks do TanStack Query são simulados: o que se testa é o que o profissional vê e
// pode fazer em cada situação (elegível ou não, estado do convite), não o pedido de rede.
const estado = vi.hoisted(() => ({
  perfil: { data: { role: 'PROFESSIONAL' } as { role: string } | undefined, isLoading: false },
  convites: { data: undefined, isLoading: false, isError: false, refetch: () => undefined } as Record<string, unknown>,
  propor: vi.fn(),
  recusar: vi.fn(),
}))

vi.mock('../hooks/useProfile', () => ({ useProfile: () => estado.perfil }))
vi.mock('../hooks/useInvitations', () => ({
  useMyInvitations: () => estado.convites,
  useSubmitProposal: () => ({ mutate: estado.propor, isPending: false }),
  useDeclineInvitation: () => ({ mutate: estado.recusar, isPending: false }),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function convite(extra: Partial<Invitation> = {}, pedido: Partial<Invitation['request']> = {}): Invitation {
  return {
    service_request_id: 'sr-1',
    status: 'INVITED',
    proposal_price: null,
    proposal_message: null,
    responded_at: null,
    created_at: '2026-10-06T09:00:00.000Z',
    request: {
      title: 'Reparar torneira',
      description: 'Pinga há dias',
      status: 'OPEN',
      province: 'Maputo',
      district: 'KaMpfumo',
      neighborhood: null,
      created_at: '2026-10-06T09:00:00.000Z',
      ...pedido,
    },
    ...extra,
  }
}

const ELEGIVEL = { kyc_approved: true, subscription_active: true, eligible: true }

function mostrar(data: MyInvitations | undefined, opcoes: { role?: string; isError?: boolean } = {}) {
  estado.perfil = { data: { role: opcoes.role ?? 'PROFESSIONAL' }, isLoading: false }
  estado.convites = { data, isLoading: false, isError: opcoes.isError ?? false, refetch: vi.fn() }
  render(
    <MemoryRouter initialEntries={['/pedidos-recebidos']}>
      <Routes>
        <Route path="/pedidos-recebidos" element={<ReceivedInvitations />} />
        <Route path="/" element={<p>página inicial</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  estado.propor.mockClear()
  estado.recusar.mockClear()
})
afterEach(cleanup)

describe('ReceivedInvitations — elegibilidade', () => {
  it('elegível: mostra o pedido e o formulário de proposta', () => {
    mostrar({ eligibility: ELEGIVEL, invitations: [convite()] })

    expect(screen.getByText('Reparar torneira')).toBeTruthy()
    expect(screen.getByText('À espera da tua resposta')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeTruthy()
    expect(screen.queryByText('Ainda não podes responder aos pedidos')).toBeNull()
  })

  it('sem KYC nem subscrição: explica o que falta, com os dois caminhos, e não mostra o formulário', () => {
    mostrar({ eligibility: { kyc_approved: false, subscription_active: false, eligible: false }, invitations: [convite()] })

    expect(screen.getByText('Ainda não podes responder aos pedidos')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'submeter documentos' }).getAttribute('href')).toBe('/verificacao-identidade')
    expect(screen.getByRole('link', { name: 'ver subscrição' }).getAttribute('href')).toBe('/subscricao')
    expect(screen.queryByRole('button', { name: 'Enviar proposta' })).toBeNull()
    // O convite continua visível: o profissional sabe que há trabalho à espera.
    expect(screen.getByText('Reparar torneira')).toBeTruthy()
  })

  it('só falta a subscrição: só esse caminho aparece', () => {
    mostrar({ eligibility: { kyc_approved: true, subscription_active: false, eligible: false }, invitations: [convite()] })

    expect(screen.queryByRole('link', { name: 'submeter documentos' })).toBeNull()
    expect(screen.getByRole('link', { name: 'ver subscrição' })).toBeTruthy()
  })

  it('um CLIENT é mandado para a página inicial', () => {
    mostrar({ eligibility: ELEGIVEL, invitations: [] }, { role: 'CLIENT' })

    expect(screen.getByText('página inicial')).toBeTruthy()
  })
})

describe('ReceivedInvitations — responder', () => {
  it('envia a proposta com o preço (aceita vírgula decimal) e a mensagem', () => {
    mostrar({ eligibility: ELEGIVEL, invitations: [convite()] })

    fireEvent.change(screen.getByLabelText('O teu preço (MZN)'), { target: { value: '1500,50' } })
    fireEvent.change(screen.getByLabelText('Mensagem (opcional)'), { target: { value: '  Faço amanhã  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    expect(estado.propor).toHaveBeenCalledWith({ requestId: 'sr-1', payload: { price: 1500.5, message: 'Faço amanhã' } })
  })

  it('sem mensagem, o payload não leva mensagem', () => {
    mostrar({ eligibility: ELEGIVEL, invitations: [convite()] })

    fireEvent.change(screen.getByLabelText('O teu preço (MZN)'), { target: { value: '800' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    expect(estado.propor).toHaveBeenCalledWith({ requestId: 'sr-1', payload: { price: 800, message: undefined } })
  })

  it.each([['0'], ['-5'], ['abc']])('preço inválido "%s": não envia nada', (valor) => {
    mostrar({ eligibility: ELEGIVEL, invitations: [convite()] })

    fireEvent.change(screen.getByLabelText('O teu preço (MZN)'), { target: { value: valor } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    expect(estado.propor).not.toHaveBeenCalled()
  })

  it('"Recusar" recusa o pedido certo', () => {
    mostrar({ eligibility: ELEGIVEL, invitations: [convite()] })

    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }))

    expect(estado.recusar).toHaveBeenCalledWith('sr-1')
  })
})

describe('ReceivedInvitations — estados do convite', () => {
  it('proposta já enviada: mostra o preço e a mensagem, sem formulário', () => {
    mostrar({
      eligibility: ELEGIVEL,
      invitations: [convite({ status: 'PROPOSED', proposal_price: 450, proposal_message: 'Amanhã de manhã' })],
    })

    expect(screen.getByText('Proposta enviada')).toBeTruthy()
    expect(screen.getByText(/450/)).toBeTruthy()
    expect(screen.getByText(/Amanhã de manhã/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Enviar proposta' })).toBeNull()
  })

  it('escolhido: diz-o e leva aos trabalhos aceites', () => {
    mostrar({ eligibility: ELEGIVEL, invitations: [convite({ status: 'CHOSEN' }, { status: 'ASSIGNED' })] })

    expect(screen.getByText('Foste escolhido!')).toBeTruthy()
    expect(screen.getByRole('link', { name: /contacto do cliente/ }).getAttribute('href')).toBe('/trabalhos-aceites')
  })

  it('pedido que o cliente já fechou: não deixa responder', () => {
    mostrar({ eligibility: ELEGIVEL, invitations: [convite({}, { status: 'ASSIGNED' })] })

    expect(screen.getByText('Este pedido já foi fechado pelo cliente.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Enviar proposta' })).toBeNull()
  })

  it('sem convites: mensagem vazia com caminho para o catálogo', () => {
    mostrar({ eligibility: ELEGIVEL, invitations: [] })

    expect(screen.getByText('Ainda não recebeste nenhum pedido.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'catálogo' }).getAttribute('href')).toBe('/catalogo')
  })

  it('erro ao carregar: mensagem compreensível e "Tentar de novo"', () => {
    mostrar(undefined, { isError: true })

    expect(screen.getByText(/Não foi possível carregar os pedidos/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })
})
