import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminNote } from '../../services/adminNotes'
import { NotasInternas } from './NotasInternas'

type Fonte = { data: AdminNote[] | undefined; isLoading: boolean; isError: boolean }

const estado = vi.hoisted(() => ({ fonte: {} as Fonte, criar: vi.fn(), erro: vi.fn() }))
vi.mock('../../hooks/useAdminNotes', () => ({
  useAdminNotes: () => estado.fonte,
  useCreateAdminNote: () => ({ mutate: estado.criar, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { error: estado.erro, success: vi.fn() } }))

const NOTA: AdminNote = {
  id: 'n1',
  target_type: 'USER',
  target_id: 'u1',
  author_id: 'a1',
  author_name: 'Ana Admin',
  body: 'Pediu reembolso por telefone.',
  created_at: '2026-10-12T10:00:00Z',
}

afterEach(() => {
  cleanup()
  estado.criar.mockReset()
  estado.erro.mockReset()
})

function mostrar() {
  render(<NotasInternas targetType="USER" targetId="u1" />)
}

describe('NotasInternas', () => {
  it('lista as notas com o autor', () => {
    estado.fonte = { data: [NOTA], isLoading: false, isError: false }
    mostrar()
    expect(screen.getByText('Pediu reembolso por telefone.')).toBeTruthy()
    expect(screen.getByText(/ana admin/i)).toBeTruthy()
  })

  it('distingue a carregar, erro e vazio', () => {
    estado.fonte = { data: undefined, isLoading: true, isError: false }
    mostrar()
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    estado.fonte = { data: undefined, isLoading: false, isError: true }
    mostrar()
    expect(screen.getByText('Não foi possível carregar as notas.')).toBeTruthy()
    cleanup()

    estado.fonte = { data: [], isLoading: false, isError: false }
    mostrar()
    expect(screen.getByText('Ainda sem notas.')).toBeTruthy()
  })

  it('não guarda uma nota vazia e guarda a escrita sem espaços a mais', () => {
    estado.fonte = { data: [], isLoading: false, isError: false }
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }))
    expect(estado.criar).not.toHaveBeenCalled()
    expect(estado.erro).toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Nova nota interna'), { target: { value: '  falei com ele  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }))
    expect(estado.criar.mock.calls[0][0]).toBe('falei com ele')
  })
})
