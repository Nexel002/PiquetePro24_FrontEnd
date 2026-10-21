import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ServiceRequest } from '../services/serviceRequests'
import { AssignedServiceRequests } from './AssignedServiceRequests'

const estado = vi.hoisted(() => ({
  pedidos: { data: [] as unknown[], isLoading: false, isError: false },
  perfil: { data: undefined as { role: string; professional_type: string | null } | undefined },
  equipaPedida: [] as unknown[],
}))
// Fase 42 (N3): as recorrências do profissional têm teste próprio; aqui não há nenhuma.
vi.mock('../hooks/useRecurringRequests', () => ({
  useAssignedRecurringRequests: () => ({ data: [] }),
  useDeclineRecurringRequest: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../hooks/useServiceRequests', () => ({ useAssignedServiceRequests: () => estado.pedidos }))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => estado.perfil }))
vi.mock('../hooks/useCompanyTeam', () => ({
  useTeam: (opcoes: unknown) => {
    estado.equipaPedida.push(opcoes)
    return { data: [] }
  },
}))
vi.mock('../components/equipa/AtribuirTecnico', () => ({ AtribuirTecnico: ({ pedido }: { pedido: ServiceRequest }) => <p>Atribuir em {pedido.id}</p> }))
vi.mock('../components/moderacao/BotaoDenunciar', () => ({ BotaoDenunciar: () => null }))

function pedido(id: string, extra: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id,
    client_id: 'c1',
    professional_id: 'emp-1',
    title: `Pedido ${id}`,
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
    ...extra,
  }
}

afterEach(() => {
  cleanup()
  estado.equipaPedida = []
})

function mostrar(pedidos: ServiceRequest[], perfil: { role: string; professional_type: string | null }) {
  estado.pedidos = { data: pedidos, isLoading: false, isError: false }
  estado.perfil = { data: perfil }
  render(
    <MemoryRouter>
      <AssignedServiceRequests />
    </MemoryRouter>,
  )
}

const EMPRESA = { role: 'PROFESSIONAL', professional_type: 'COMPANY' }
const SINGULAR = { role: 'PROFESSIONAL', professional_type: 'SINGULAR' }

describe('AssignedServiceRequests — empresa', () => {
  it('oferece atribuir técnico nos pedidos em curso, e só nesses', () => {
    mostrar([pedido('p1'), pedido('p2', { status: 'COMPLETED' })], EMPRESA)

    expect(screen.getByText('Atribuir em p1')).toBeTruthy()
    expect(screen.queryByText('Atribuir em p2')).toBeNull()
  })

  it('avisa quantos trabalhos em curso ainda não têm técnico', () => {
    mostrar([pedido('p1'), pedido('p2'), pedido('p3', { assigned_member_id: 'm1' }), pedido('p4', { status: 'COMPLETED' })], EMPRESA)

    expect(screen.getByRole('status').textContent).toContain('2 trabalhos aceites ainda não têm técnico')
  })

  it('no singular da frase: «1 trabalho aceite ainda não tem técnico»', () => {
    mostrar([pedido('p1')], EMPRESA)
    expect(screen.getByRole('status').textContent).toContain('1 trabalho aceite ainda não tem técnico')
  })

  it('sem trabalhos por atribuir, não há aviso', () => {
    mostrar([pedido('p1', { assigned_member_id: 'm1' })], EMPRESA)
    expect(screen.queryByText(/ainda não tem/i)).toBeNull()
  })

  it('pede a equipa à empresa', () => {
    mostrar([pedido('p1')], EMPRESA)
    expect(estado.equipaPedida.at(-1)).toEqual({ enabled: true })
  })
})

describe('AssignedServiceRequests — profissional singular', () => {
  it('não vê nada de técnicos nem de equipa, e não lhe pede a equipa', () => {
    mostrar([pedido('p1')], SINGULAR)

    expect(screen.queryByText('Atribuir em p1')).toBeNull()
    expect(screen.queryByText(/técnico/i)).toBeNull()
    expect(estado.equipaPedida.at(-1)).toEqual({ enabled: false })
  })
})
