import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminServiceRequests } from './AdminServiceRequests'
import type { ServiceRequest } from '../services/serviceRequests'

const estado = vi.hoisted(() => ({
  lista: [] as ServiceRequest[],
  isLoading: false,
  isError: false,
  cancelar: vi.fn(),
}))

vi.mock('../hooks/useAdminServiceRequests', () => ({
  useAdminServiceRequests: () => ({
    data: estado.lista,
    isLoading: estado.isLoading,
    isError: estado.isError,
  }),
  useAdminCancelServiceRequest: () => ({
    mutate: estado.cancelar,
    isPending: false,
  }),
}))

const REQUEST_MOCK: ServiceRequest = {
  id: 'r1',
  client_id: 'c1',
  category_id: 'cat1',
  title: 'Quero melhorar minha cozinha americana',
  description: 'Instalar bancada e torneiras novas',
  status: 'OPEN',
  province: 'Maputo',
  district: 'Cidade de Maputo',
  neighborhood: 'Central C',
  created_at: '2026-10-06T15:34:00Z',
  professional_id: null,
  assigned_at: null,
  completed_at: null,
  assigned_member_id: null,
}

function mostrar() {
  render(
    <MemoryRouter>
      <AdminServiceRequests />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  estado.lista = []
  estado.isLoading = false
  estado.isError = false
  estado.cancelar.mockReset()
})

describe('AdminServiceRequests', () => {
  it('mostra os pedidos com título, localização, badge e ligação ao histórico', () => {
    estado.lista = [REQUEST_MOCK]
    mostrar()

    expect(screen.getByText('Quero melhorar minha cozinha americana')).toBeTruthy()
    expect(screen.getByText('Aberto')).toBeTruthy()
    expect(screen.getByText(/Central C/)).toBeTruthy()

    const linkHistorico = screen.getByRole('link', { name: /ver histórico/i })
    expect(linkHistorico.getAttribute('href')).toBe('/admin/audit-log?entity_type=service_requests&entity_id=r1')
  })

  it('cancelar exige confirmação em dois passos', () => {
    estado.lista = [REQUEST_MOCK]
    mostrar()

    const botaoCancelar = screen.getByRole('button', { name: /cancelar pedido/i })
    fireEvent.click(botaoCancelar)

    expect(screen.getByText('Cancelar este pedido?')).toBeTruthy()
    const botaoSim = screen.getByRole('button', { name: 'Sim' })
    fireEvent.click(botaoSim)

    expect(estado.cancelar).toHaveBeenCalledWith('r1', expect.any(Object))
  })

  it('mostra estado vazio quando não há pedidos', () => {
    estado.lista = []
    mostrar()
    expect(screen.getByText(/nenhum pedido encontrado/i)).toBeTruthy()
  })
})
