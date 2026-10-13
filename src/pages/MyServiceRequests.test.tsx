import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ServiceRequest } from '../services/serviceRequests'
import { MyServiceRequests } from './MyServiceRequests'

const estado = vi.hoisted(() => ({ pedidos: { data: [] as unknown[], isLoading: false, isError: false } }))
vi.mock('../hooks/useServiceRequests', () => ({
  useMyServiceRequests: () => estado.pedidos,
  useCancelServiceRequest: () => ({ mutate: vi.fn(), isPending: false }),
  useCompleteServiceRequest: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../hooks/useCatalog', () => ({ useSubmitReview: () => ({ mutate: vi.fn(), isPending: false }) }))
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

afterEach(cleanup)

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
