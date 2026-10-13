import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProfessionalKyc } from '../services/kyc'
import { AdminKyc } from './AdminKyc'

const estado = vi.hoisted(() => ({
  lista: [] as unknown[],
  reabrir: vi.fn(),
  rever: vi.fn(),
}))
vi.mock('../hooks/useKyc', () => ({
  useKycSubmissions: () => ({ data: estado.lista, isLoading: false, isError: false }),
  useReopenKyc: () => ({ mutate: estado.reabrir, isPending: false }),
  useReviewKyc: () => ({ mutate: estado.rever, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const haHoras = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()

function kyc(overrides: Partial<ProfessionalKyc>): ProfessionalKyc {
  return {
    id: 'k1',
    user_id: 'u1',
    bi_number: '110100123456B',
    nuit_number: '400123456',
    bi_document_url: 'u1/bi.jpg',
    status: 'PENDING',
    reviewed_by: null,
    review_notes: null,
    verified_at: null,
    submitted_at: haHoras(2),
    ...overrides,
  }
}

function mostrar() {
  render(
    <MemoryRouter>
      <AdminKyc />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  estado.reabrir.mockReset()
})

describe('AdminKyc', () => {
  it('mostra há quanto tempo cada submissão espera', () => {
    estado.lista = [kyc({ submitted_at: haHoras(5) })]
    mostrar()
    expect(screen.getByText(/em espera há 5 horas/i)).toBeTruthy()
    expect(screen.queryByText(/em atraso/i)).toBeNull()
  })

  it('assinala em texto uma espera acima de 48h', () => {
    estado.lista = [kyc({ submitted_at: haHoras(72) })]
    mostrar()
    expect(screen.getByText(/em espera há 3 dias — em atraso/i)).toBeTruthy()
  })

  it('um motivo frequente preenche a caixa de rejeição', () => {
    estado.lista = [kyc({})]
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar' }))
    fireEvent.click(screen.getByRole('button', { name: /documento fora de validade/i }))

    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Documento fora de validade.')
  })

  it('uma rejeição pode ser reaberta; uma pendente não oferece reabrir', () => {
    estado.lista = [kyc({ id: 'k1', status: 'REJECTED', review_notes: 'BI ilegível' }), kyc({ id: 'k2', status: 'PENDING' })]
    mostrar()

    const botoes = screen.getAllByRole('button', { name: 'Reabrir revisão' })
    expect(botoes).toHaveLength(1)
    fireEvent.click(botoes[0])
    expect(estado.reabrir.mock.calls[0][0]).toBe('k1')
  })
})
