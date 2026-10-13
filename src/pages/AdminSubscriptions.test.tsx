import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminPaymentRow, AdminSubscriptionRow } from '../services/adminSubscriptions'
import { AdminSubscriptions } from './AdminSubscriptions'

type Fonte<T> = { data: T | undefined; isLoading: boolean; isError: boolean }

const estado = vi.hoisted(() => ({
  subscricoes: {} as Fonte<unknown>,
  pagamentos: {} as Fonte<unknown>,
  revogar: vi.fn(),
  filtrosPedidos: [] as unknown[],
}))
vi.mock('../hooks/useAdminSubscriptions', () => ({
  useAdminSubscriptions: (filtros: unknown) => {
    estado.filtrosPedidos.push(filtros)
    return estado.subscricoes
  },
  useAdminPayments: () => estado.pagamentos,
  useRevokeSubscription: () => ({ mutate: estado.revogar, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const SUB: AdminSubscriptionRow = {
  id: 's1',
  professional_id: 'p1',
  professional_name: 'Ana Canalizadora',
  amount: 800,
  status: 'ACTIVE',
  gateway: 'MANUAL',
  starts_at: '2026-09-20T00:00:00Z',
  expires_at: '2026-10-18T00:00:00Z',
  created_at: '2026-09-20T00:00:00Z',
}
const PAGAMENTO: AdminPaymentRow = {
  id: 't1',
  subscription_id: 's1',
  professional_id: 'p1',
  professional_name: 'Ana Canalizadora',
  gateway: 'MPESA_MOCK',
  payer_phone: '258841234567',
  amount: 800,
  status: 'CONFIRMED',
  provider_reference: null,
  created_at: '2026-09-20T00:00:00Z',
  confirmed_at: '2026-09-20T00:01:00Z',
}
const pronto = <T,>(data: T): Fonte<T> => ({ data, isLoading: false, isError: false })

function mostrar() {
  render(
    <MemoryRouter>
      <AdminSubscriptions />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  estado.revogar.mockReset()
  estado.filtrosPedidos = []
})

describe('AdminSubscriptions', () => {
  it('abre em «a expirar» e mostra a subscrição com o nome do profissional', () => {
    estado.subscricoes = pronto([SUB])
    mostrar()

    expect(estado.filtrosPedidos[0]).toMatchObject({ filtro: 'EXPIRING', offset: 0 })
    expect(screen.getByRole('link', { name: 'Ana Canalizadora' }).getAttribute('href')).toBe('/admin/utilizadores/p1')
  })

  it('distingue a carregar, erro e vazio', () => {
    estado.subscricoes = { data: undefined, isLoading: true, isError: false }
    mostrar()
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    estado.subscricoes = { data: undefined, isLoading: false, isError: true }
    mostrar()
    expect(screen.getByText(/não foi possível carregar/i)).toBeTruthy()
    cleanup()

    estado.subscricoes = pronto([])
    mostrar()
    expect(screen.getByText('Nenhuma subscrição neste filtro.')).toBeTruthy()
  })

  it('suspender exige motivo e só então chama o backend', () => {
    estado.subscricoes = pronto([SUB])
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Suspender' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar suspensão' }))
    expect(estado.revogar).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: '  pagamento estornado  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar suspensão' }))
    expect(estado.revogar.mock.calls[0][0]).toEqual({ userId: 'p1', note: 'pagamento estornado' })
  })

  it('subscrições já expiradas não oferecem «Suspender»', () => {
    estado.subscricoes = pronto([{ ...SUB, status: 'EXPIRED' }])
    mostrar()
    expect(screen.queryByRole('button', { name: 'Suspender' })).toBeNull()
  })

  it('o separador Pagamentos lista as transacções', () => {
    estado.subscricoes = pronto([])
    estado.pagamentos = pronto([PAGAMENTO])
    mostrar()

    fireEvent.click(screen.getByRole('tab', { name: 'Pagamentos' }))
    // «Confirmado» também é uma opção do filtro: o que interessa é o que está na lista.
    const lista = within(screen.getByRole('list'))
    expect(lista.getByText('Confirmado')).toBeTruthy()
    expect(lista.getByText(/258841234567/)).toBeTruthy()
  })
})
