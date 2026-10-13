import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminReport } from '../services/moderation'
import { AdminModeration } from './AdminModeration'

type Fonte<T> = { data: T | undefined; isLoading: boolean; isError: boolean }

const estado = vi.hoisted(() => ({
  fonte: {} as Fonte<unknown>,
  resolver: vi.fn(),
  repor: vi.fn(),
  filtros: [] as unknown[],
}))
vi.mock('../hooks/useModeration', () => ({
  useAdminReports: (filtros: unknown) => {
    estado.filtros.push(filtros)
    return estado.fonte
  },
  useResolveReport: () => ({ mutate: estado.resolver, isPending: false }),
  useUnhideTarget: () => ({ mutate: estado.repor, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function denuncia(extra: Partial<AdminReport> = {}): AdminReport {
  return {
    id: 'r1',
    reporter_id: 'u1',
    reporter_name: 'Carla Cliente',
    target_type: 'PORTFOLIO_PROJECT',
    target_id: 'proj-1',
    reason: 'INAPPROPRIATE',
    details: 'Fotos que não são do trabalho',
    status: 'OPEN',
    resolution_note: null,
    resolved_at: null,
    created_at: '2026-10-12T10:00:00Z',
    target: { label: 'Casa de banho completa', exists: true, hidden: false },
    ...extra,
  }
}
const pronto = (data: AdminReport[]): Fonte<AdminReport[]> => ({ data, isLoading: false, isError: false })

function mostrar() {
  render(
    <MemoryRouter>
      <AdminModeration />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  estado.resolver.mockReset()
  estado.repor.mockReset()
  estado.filtros = []
})

describe('AdminModeration', () => {
  it('abre nas denúncias abertas e mostra quem denunciou e o alvo', () => {
    estado.fonte = pronto([denuncia()])
    mostrar()

    expect(estado.filtros[0]).toMatchObject({ status: 'OPEN', offset: 0 })
    expect(screen.getByText(/carla cliente/i)).toBeTruthy()
    expect(screen.getByText('Casa de banho completa')).toBeTruthy()
  })

  it('distingue a carregar, erro e vazio', () => {
    estado.fonte = { data: undefined, isLoading: true, isError: false }
    mostrar()
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    estado.fonte = { data: undefined, isLoading: false, isError: true }
    mostrar()
    expect(screen.getByText(/não foi possível carregar/i)).toBeTruthy()
    cleanup()

    estado.fonte = pronto([])
    mostrar()
    expect(screen.getByText('Nenhuma denúncia por tratar.')).toBeTruthy()
  })

  it('decidir exige uma nota e pode ocultar o conteúdo', () => {
    estado.fonte = pronto([denuncia()])
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Decidir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }))
    expect(estado.resolver).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/nota da decisão/i), { target: { value: ' Imagens impróprias ' } })
    fireEvent.click(screen.getByLabelText(/ocultar o conteúdo/i))
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }))

    expect(estado.resolver.mock.calls[0][0]).toEqual({
      reportId: 'r1',
      payload: { action: 'RESOLVE', note: 'Imagens impróprias', hide_target: true },
    })
  })

  it('rejeitar nunca pede para ocultar', () => {
    estado.fonte = pronto([denuncia()])
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Decidir' }))
    fireEvent.click(screen.getByLabelText(/ocultar o conteúdo/i))
    fireEvent.change(screen.getByLabelText(/nota da decisão/i), { target: { value: 'Sem fundamento' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar denúncia' }))

    expect(estado.resolver.mock.calls[0][0].payload).toEqual({ action: 'DISMISS', note: 'Sem fundamento', hide_target: false })
  })

  it('contas e pedidos não oferecem «ocultar»', () => {
    estado.fonte = pronto([denuncia({ target_type: 'USER', target: { label: 'Paulo', exists: true, hidden: false } })])
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Decidir' }))
    expect(screen.queryByLabelText(/ocultar o conteúdo/i)).toBeNull()
    expect(screen.getByRole('link', { name: 'Ver conta' }).getAttribute('href')).toBe('/admin/utilizadores/proj-1')
  })

  it('conteúdo oculto pode ser reposto; conteúdo que já não existe é dito', () => {
    estado.fonte = pronto([
      denuncia({ id: 'a', status: 'RESOLVED', target: { label: 'x', exists: true, hidden: true } }),
      denuncia({ id: 'b', target: { label: null, exists: false, hidden: false } }),
    ])
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Repor conteúdo' }))
    expect(estado.repor.mock.calls[0][0]).toEqual({ targetType: 'PORTFOLIO_PROJECT', targetId: 'proj-1' })
    expect(screen.getByText('O conteúdo denunciado já não existe.')).toBeTruthy()
  })
})
