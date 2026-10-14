import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminUsers } from './AdminUsers'
import type { AdminUserSummary } from '../services/adminUsers'

const estado = vi.hoisted(() => ({
  lista: [] as AdminUserSummary[],
  isLoading: false,
  isError: false,
}))

vi.mock('../hooks/useAdminUsers', () => ({
  useAdminUsers: () => ({
    data: estado.lista,
    isLoading: estado.isLoading,
    isError: estado.isError,
  }),
}))

const USER_MOCK: AdminUserSummary = {
  id: 'u1',
  full_name: 'Latifa Sidik',
  phone: '+258843744350',
  role: 'CLIENT',
  professional_type: null,
  province: 'Maputo',
  district: 'Cidade de Maputo',
  neighborhood: 'Central',
  avatar_url: null,
  created_at: '2026-01-01T10:00:00Z',
}

const PROF_MOCK: AdminUserSummary = {
  id: 'u2',
  full_name: 'Amélia Nhantumbo',
  phone: '+258841112236',
  role: 'PROFESSIONAL',
  professional_type: 'SINGULAR',
  province: 'Maputo',
  district: 'Matola',
  neighborhood: 'Fomento',
  avatar_url: 'https://example.com/avatar.jpg',
  created_at: '2026-02-01T10:00:00Z',
}

function mostrar() {
  render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  estado.lista = []
  estado.isLoading = false
  estado.isError = false
})

describe('AdminUsers', () => {
  it('mostra a lista com avatar, nome, telefone e badge de papel', () => {
    estado.lista = [USER_MOCK, PROF_MOCK]
    mostrar()

    expect(screen.getByText('Latifa Sidik')).toBeTruthy()
    expect(screen.getByText('+258843744350')).toBeTruthy()
    expect(screen.getByText('Cliente')).toBeTruthy()

    expect(screen.getByText('Amélia Nhantumbo')).toBeTruthy()
    expect(screen.getByText('+258841112236')).toBeTruthy()
    expect(screen.getByText('Profissional')).toBeTruthy()

    const linkCliente = screen.getByRole('link', { name: /latifa sidik/i })
    expect(linkCliente.getAttribute('href')).toBe('/admin/utilizadores/u1')

    const linkProf = screen.getByRole('link', { name: /amélia nhantumbo/i })
    expect(linkProf.getAttribute('href')).toBe('/admin/utilizadores/u2')
  })

  it('mostra estado vazio quando não há utilizadores', () => {
    estado.lista = []
    mostrar()
    expect(screen.getByText(/nenhum utilizador encontrado/i)).toBeTruthy()
  })

  it('mostra mensagem de erro compreensível quando a consulta falha', () => {
    estado.isError = true
    mostrar()
    expect(screen.getByText(/não foi possível carregar os utilizadores/i)).toBeTruthy()
  })
})
