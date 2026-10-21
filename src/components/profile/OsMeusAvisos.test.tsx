import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OsMeusAvisos } from './OsMeusAvisos'

// Fase 39 (TRD Adendo v1.66, N4).
const estado = vi.hoisted(() => ({ avisos: {} as Record<string, unknown>, apagar: vi.fn() }))

vi.mock('../../hooks/useSearchAlerts', () => ({
  useSearchAlerts: () => estado.avisos,
  useDeleteSearchAlert: () => ({ mutate: estado.apagar, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

afterEach(cleanup)

describe('OsMeusAvisos', () => {
  it('lista os avisos com o estado e apaga o escolhido', () => {
    estado.avisos = {
      data: [
        { id: 'a1', category: { id: 'c1', slug: 'canalizacao', name: 'Canalização' }, province: 'Gaza', created_at: '', notified_at: null },
        { id: 'a2', category: { id: 'c2', slug: 'pintura', name: 'Pintura' }, province: 'Sofala', created_at: '', notified_at: '2026-10-21' },
      ],
    }
    render(<OsMeusAvisos />)

    expect(screen.getByText('À espera de profissionais.')).toBeTruthy()
    expect(screen.getByText('Já avisámos: há profissionais.')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Apagar' })[0]!)
    expect(estado.apagar).toHaveBeenCalledWith('a1', expect.anything())
  })

  it('sem avisos, a secção não aparece', () => {
    estado.avisos = { data: [] }
    const { container } = render(<OsMeusAvisos />)
    expect(container.textContent).toBe('')
  })

  it('erro ao carregar: mensagem própria', () => {
    estado.avisos = { isError: true }
    render(<OsMeusAvisos />)
    expect(screen.getByText(/Não foi possível carregar os teus avisos/)).toBeTruthy()
  })
})
