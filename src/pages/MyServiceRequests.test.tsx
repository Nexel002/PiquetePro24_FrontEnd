import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ServiceRequest } from '../services/serviceRequests'
import { MyServiceRequests } from './MyServiceRequests'

const estado = vi.hoisted(() => ({
  pedidos: { data: [] as unknown[], isLoading: false, isError: false },
  avaliar: vi.fn(),
  contactoPedido: [] as unknown[],
  contacto: { data: undefined as unknown, isLoading: false, isError: false },
}))
vi.mock('../hooks/useServiceRequests', () => ({
  useMyServiceRequests: () => estado.pedidos,
  useCancelServiceRequest: () => ({ mutate: vi.fn(), isPending: false }),
  useCompleteServiceRequest: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../hooks/useCatalog', () => ({ useSubmitReview: () => ({ mutate: estado.avaliar, isPending: false }) }))
vi.mock('../hooks/useInvitations', () => ({
  useChosenProfessional: (id: string, activo: boolean) => {
    estado.contactoPedido.push([id, activo])
    return estado.contacto
  },
}))
vi.mock('../hooks/usePedidosPendentes', () => ({ usePedidosPendentes: () => ({ pendentes: [], estado: 'ok' }) }))
vi.mock('../components/PedidosPorEnviar', () => ({ PedidosPorEnviar: () => null }))
vi.mock('../components/moderacao/BotaoDenunciar', () => ({ BotaoDenunciar: () => null }))

function pedido(extra: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: 'p1',
    client_id: 'c1',
    professional_id: 'emp-1',
    title: 'Torneira a pingar',
    description: null,
    status: 'ASSIGNED',
    province: 'Maputo',
    district: null,
    neighborhood: null,
    created_at: '2026-10-01T10:00:00Z',
    assigned_at: '2026-10-02T10:00:00Z',
    completed_at: null,
    category_id: null,
    assigned_member_id: null,
    professional_name: 'Empresa Lda',
    ...extra,
  }
}

afterEach(() => {
  cleanup()
  estado.avaliar.mockReset()
  estado.contactoPedido = []
  estado.contacto = { data: undefined, isLoading: false, isError: false }
})

function mostrar(pedidos: ServiceRequest[]) {
  estado.pedidos = { data: pedidos, isLoading: false, isError: false }
  render(
    <MemoryRouter>
      <MyServiceRequests />
    </MemoryRouter>,
  )
}

describe('Os meus pedidos — técnico do pedido', () => {
  it('o cliente vê quem vem: primeiro nome e título, da empresa escolhida', () => {
    mostrar([pedido({ assigned_member_id: 'm1', technician: { id: 'm1', first_name: 'João', title: 'Canalizador', avatar_url: null } })])

    expect(screen.getByText(/vem o/i).textContent).toContain('João')
    expect(screen.getByText(/vem o/i).textContent).toContain('Canalizador')
    expect(screen.getByRole('link', { name: 'Empresa Lda' })).toBeTruthy()
  })

  it('mostra a foto do técnico quando a tem', () => {
    mostrar([pedido({ technician: { id: 'm1', first_name: 'João', title: 'Canalizador', avatar_url: 'https://x/joao.webp' } })])
    expect(document.querySelector('img[src="https://x/joao.webp"]')).not.toBeNull()
  })

  it('sem foto, mostra a inicial', () => {
    mostrar([pedido({ technician: { id: 'm1', first_name: 'João', title: 'Canalizador', avatar_url: null } })])
    expect(screen.getByText('J')).toBeTruthy()
  })

  it('um pedido sem técnico (empresa ainda não atribuiu, ou profissional singular) não mostra nada', () => {
    mostrar([pedido()])
    expect(screen.queryByText(/vem o/i)).toBeNull()
  })

  it('nunca mostra telefone nem email do técnico', () => {
    mostrar([pedido({ technician: { id: 'm1', first_name: 'João', title: 'Canalizador', avatar_url: null } })])
    expect(document.body.textContent).not.toMatch(/@|\+258|tel:/)
  })
})

describe('Os meus pedidos — avaliar a empresa e o técnico', () => {
  const concluido = (extra: Partial<ServiceRequest> = {}) => pedido({ status: 'COMPLETED', has_review: false, ...extra })
  const joao = { id: 'm1', first_name: 'João', title: 'Canalizador', avatar_url: null }

  it('um pedido concluído com técnico oferece a nota do técnico, como opcional', () => {
    mostrar([concluido({ assigned_member_id: 'm1', technician: joao })])
    expect(screen.getByText(/avaliar também o joão/i)).toBeTruthy()
    expect(screen.getByText('(opcional)')).toBeTruthy()
  })

  it('sem técnico (singular, ou a empresa nunca atribuiu) não oferece a nota do técnico', () => {
    mostrar([concluido()])
    expect(screen.queryByText(/avaliar também/i)).toBeNull()
  })

  it('envia a nota da empresa e a do técnico', () => {
    mostrar([concluido({ assigned_member_id: 'm1', technician: joao })])
    fireEvent.click(screen.getByRole('button', { name: '4 estrelas' }))
    fireEvent.click(screen.getByRole('button', { name: '3 estrelas para João' }))
    fireEvent.click(screen.getByRole('button', { name: 'Avaliar profissional' }))

    expect(estado.avaliar.mock.calls[0][0].payload).toEqual({ rating: 4, comment: undefined, member_rating: 3 })
  })

  it('sem escolher a nota do técnico, não a envia (a avaliação da empresa segue sozinha)', () => {
    mostrar([concluido({ assigned_member_id: 'm1', technician: joao })])
    fireEvent.click(screen.getByRole('button', { name: 'Avaliar profissional' }))

    expect(estado.avaliar.mock.calls[0][0].payload).toEqual({ rating: 5, comment: undefined, member_rating: undefined })
  })

  it('tocar outra vez na nota escolhida tira-a', () => {
    mostrar([concluido({ assigned_member_id: 'm1', technician: joao })])
    fireEvent.click(screen.getByRole('button', { name: '3 estrelas para João' }))
    fireEvent.click(screen.getByRole('button', { name: '3 estrelas para João' }))
    fireEvent.click(screen.getByRole('button', { name: 'Avaliar profissional' }))

    expect(estado.avaliar.mock.calls[0][0].payload.member_rating).toBeUndefined()
  })
})

describe('Os meus pedidos — contacto do profissional (Fase 27)', () => {
  const direto = (extra: Partial<ServiceRequest> = {}) => pedido({ is_direct: true, client_contact_viewed_at: null, ...extra })

  it('o número não está à vista: só se pede quando o cliente o pede', () => {
    mostrar([direto()])

    expect(document.body.textContent).not.toMatch(/[+]?258[0-9]{9}/)
    expect(estado.contactoPedido.at(-1)).toEqual(['p1', false])
    expect(screen.getByRole('button', { name: 'Ver contacto do profissional' })).toBeTruthy()
  })

  it('ao pedir, mostra o nome e o número para ligar', () => {
    estado.contacto = { data: { professional_id: 'emp-1', full_name: 'Empresa Lda', phone: '258841111111' }, isLoading: false, isError: false }
    mostrar([direto()])
    fireEvent.click(screen.getByRole('button', { name: 'Ver contacto do profissional' }))

    expect(estado.contactoPedido.at(-1)).toEqual(['p1', true])
    expect(screen.getByRole('link', { name: /ligar: [+]258841111111/i }).getAttribute('href')).toBe('tel:+258841111111')
  })

  it('distingue a carregar e erro ao pedir o contacto', () => {
    estado.contacto = { data: undefined, isLoading: true, isError: false }
    mostrar([direto()])
    fireEvent.click(screen.getByRole('button', { name: 'Ver contacto do profissional' }))
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    estado.contacto = { data: undefined, isLoading: false, isError: true }
    mostrar([direto()])
    fireEvent.click(screen.getByRole('button', { name: 'Ver contacto do profissional' }))
    expect(screen.getByRole('alert').textContent).toMatch(/não foi possível carregar o contacto/i)
  })

  it('só se oferece enquanto o pedido está em curso', () => {
    mostrar([direto({ status: 'COMPLETED', has_review: true })])
    expect(screen.queryByRole('button', { name: 'Ver contacto do profissional' })).toBeNull()
  })

  it('diz se o profissional já viu o pedido, ou ainda não', () => {
    mostrar([direto({ client_contact_viewed_at: '2026-10-02T10:00:00Z' })])
    expect(screen.getByText(/o profissional já viu o teu pedido/i)).toBeTruthy()
    cleanup()

    mostrar([direto()])
    expect(screen.getByText(/foi avisado e ainda não abriu o pedido/i)).toBeTruthy()
  })

  it('um pedido que não é direto não mostra o estado de «visto»', () => {
    mostrar([pedido()])
    expect(screen.queryByText(/o profissional já viu|ainda não abriu/i)).toBeNull()
  })
})
