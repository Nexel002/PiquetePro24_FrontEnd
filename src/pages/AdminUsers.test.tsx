import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminUsers } from './AdminUsers'
import type { AdminUserSummary } from '../services/adminUsers'

const estado = vi.hoisted(() => ({
  lista: [] as AdminUserSummary[],
  isLoading: false,
  isError: false,
  contagens: undefined as undefined | { all: number; clients: number; technicians: number; companies: number; admins: number },
  filtros: [] as Array<{ group?: string }>,
}))

vi.mock('../hooks/useAdminUsers', () => ({
  useAdminUsers: (filtros: { group?: string }) => {
    estado.filtros.push(filtros)
    return { data: estado.lista, isLoading: estado.isLoading, isError: estado.isError }
  },
  useAdminUserCounts: () => ({ data: estado.contagens }),
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
  estado.contagens = undefined
  estado.filtros = []
})

describe('AdminUsers — separadores', () => {
  it('mostra Todos, Clientes, Técnicos, Empresas e Administradores, cada um com o seu total', () => {
    estado.contagens = { all: 12, clients: 5, technicians: 4, companies: 2, admins: 1 }
    mostrar()

    const separadores = screen.getAllByRole('tab').map((t) => t.textContent)
    expect(separadores).toEqual(['Todos12', 'Clientes5', 'Técnicos4', 'Empresas2', 'Administradores1'])
  })

  it('sem contagens (a carregar ou erro) mostra só os rótulos, sem números', () => {
    mostrar()

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Todos',
      'Clientes',
      'Técnicos',
      'Empresas',
      'Administradores',
    ])
  })

  it('marca o separador escolhido e pede ao servidor o grupo respectivo', () => {
    mostrar()
    expect(screen.getByRole('tab', { name: /todos/i }).getAttribute('aria-selected')).toBe('true')
    expect(estado.filtros.at(-1)?.group).toBeUndefined()

    fireEvent.click(screen.getByRole('tab', { name: /empresas/i }))

    expect(screen.getByRole('tab', { name: /empresas/i }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: /todos/i }).getAttribute('aria-selected')).toBe('false')
    expect(estado.filtros.at(-1)?.group).toBe('COMPANIES')
  })
})

describe('AdminUsers', () => {
  it('mostra a lista com avatar circular, nome, cargo, telefone e botão de olho para ver detalhes', () => {
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

    const botoesOlho = screen.getAllByRole('link', { name: 'Ver ficha' })
    expect(botoesOlho).toHaveLength(2)
    expect(botoesOlho[0].getAttribute('href')).toBe('/admin/utilizadores/u1')
    expect(botoesOlho[1].getAttribute('href')).toBe('/admin/utilizadores/u2')
  })

  it('filtra instantaneamente letra a letra e mostra sugestões ao escrever sem esperar pelo nome completo', () => {
    estado.lista = [USER_MOCK, PROF_MOCK]
    mostrar()

    const campoPesquisa = screen.getByRole('textbox', { name: /pesquisar utilizadores/i })
    fireEvent.focus(campoPesquisa)
    fireEvent.change(campoPesquisa, { target: { value: 'Am' } })

    // A tabela filtra de imediato: Latifa desaparece e Amélia permanece
    expect(screen.queryByText('Latifa Sidik')).toBeNull()
    const caixaSugestoes = screen.getByRole('listbox', { name: /sugestões de utilizadores/i })
    expect(within(caixaSugestoes).getByText('Amélia Nhantumbo')).toBeTruthy()
  })

  it('expande e recolhe os detalhes rápidos da linha ao clicar na seta', () => {
    estado.lista = [USER_MOCK]
    mostrar()

    const botaoExpandir = screen.getByRole('button', { name: /expandir resumo de latifa sidik/i })
    fireEvent.click(botaoExpandir)

    expect(screen.getByText('Localização Registada')).toBeTruthy()
    expect(screen.getByText('Central, Cidade de Maputo, Maputo')).toBeTruthy()

    const botaoRecolher = screen.getByRole('button', { name: /recolher resumo de latifa sidik/i })
    fireEvent.click(botaoRecolher)
    expect(screen.queryByText('Localização Registada')).toBeNull()
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
