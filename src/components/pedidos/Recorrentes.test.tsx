import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { proximasDatas } from '../../services/recurringRequests'
import { RecurringRequests } from '../../pages/RecurringRequests'
import { RecorrenciasDoProfissional } from './RecorrenciasDoProfissional'
import { RepetirRegularmente } from './RepetirRegularmente'

// Fase 42 (TRD Adendo v1.66, N3).
const mocks = vi.hoisted(() => ({
  criar: vi.fn(),
  mudar: vi.fn(),
  recusar: vi.fn(),
  meus: {} as Record<string, unknown>,
  atribuidos: {} as Record<string, unknown>,
}))

vi.mock('../../hooks/useRecurringRequests', () => ({
  useCreateRecurringRequest: () => ({ mutate: mocks.criar, isPending: false }),
  useUpdateRecurringRequest: () => ({ mutate: mocks.mudar, isPending: false }),
  useDeclineRecurringRequest: () => ({ mutate: mocks.recusar, isPending: false }),
  useMyRecurringRequests: () => mocks.meus,
  useAssignedRecurringRequests: () => mocks.atribuidos,
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

beforeEach(() => {
  mocks.criar.mockReset()
  mocks.mudar.mockReset()
  mocks.recusar.mockReset()
})
afterEach(cleanup)

const recorrencia = {
  id: 'r1',
  title: 'Limpeza da casa',
  frequency: 'WEEKLY',
  next_date: '2026-10-30',
  status: 'ACTIVE',
  consecutive_failures: 0,
  cancel_reason: null,
  source_request_id: 'p1',
  last_request_id: null,
  category: { id: 'c1', name: 'Limpeza' },
  counterpart_name: 'Carlos Mondlane',
  created_at: '',
}

describe('proximasDatas (a mesma regra do backend)', () => {
  it('mensal encosta ao último dia dos meses curtos e volta ao dia escolhido', () => {
    expect(proximasDatas('MONTHLY', '2027-01-31')).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
    expect(proximasDatas('BIWEEKLY', '2026-12-25')).toEqual(['2026-12-25', '2027-01-08', '2027-01-22'])
  })
})

describe('RepetirRegularmente', () => {
  it('mostra as próximas datas e marca com a frequência e a data escolhidas', () => {
    mocks.criar.mockImplementation((_v, opcoes: { onSuccess: () => void }) => opcoes.onSuccess())
    render(
      <MemoryRouter>
        <RepetirRegularmente requestId="p1" />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Repetir regularmente' }))
    fireEvent.change(screen.getByLabelText('Com que frequência'), { target: { value: 'MONTHLY' } })
    fireEvent.change(screen.getByLabelText('Próxima vez'), { target: { value: '2099-01-31' } })

    expect(screen.getByText(/31\/01\/2099, 28\/02\/2099, 31\/03\/2099/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Marcar' }))
    expect(mocks.criar).toHaveBeenCalledWith({ source_request_id: 'p1', frequency: 'MONTHLY', next_date: '2099-01-31' }, expect.anything())
    expect(screen.getByRole('status').textContent).toContain('Marcado')
  })

  it('uma data antes de amanhã não deixa marcar', () => {
    render(
      <MemoryRouter>
        <RepetirRegularmente requestId="p1" />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Repetir regularmente' }))
    fireEvent.change(screen.getByLabelText('Próxima vez'), { target: { value: '2000-01-01' } })
    expect((screen.getByRole('button', { name: 'Marcar' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('RecurringRequests (cliente)', () => {
  it('lista com estado e próxima data; pausar e cancelar pedem o estado certo', () => {
    mocks.meus = { data: [recorrencia] }
    render(
      <MemoryRouter>
        <RecurringRequests />
      </MemoryRouter>,
    )
    expect(screen.getByText(/próxima a 30\/10\/2026/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(mocks.mudar).toHaveBeenCalledWith({ id: 'r1', status: 'PAUSED' }, expect.anything())
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(mocks.mudar).toHaveBeenLastCalledWith({ id: 'r1', status: 'CANCELLED' }, expect.anything())
  })

  it('pausado por falhas explica porquê; cancelado pelo profissional mostra o motivo', () => {
    mocks.meus = {
      data: [
        { ...recorrencia, status: 'PAUSED', consecutive_failures: 3 },
        { ...recorrencia, id: 'r2', status: 'CANCELLED', cancel_reason: 'Mudei de zona' },
      ],
    }
    render(
      <MemoryRouter>
        <RecurringRequests />
      </MemoryRouter>,
    )
    expect(screen.getByText(/três vezes seguidas/)).toBeTruthy()
    expect(screen.getByText(/Mudei de zona/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retomar' })).toBeTruthy()
  })

  it('vazio: explica como se cria', () => {
    mocks.meus = { data: [] }
    render(
      <MemoryRouter>
        <RecurringRequests />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Ainda não tens serviços recorrentes/)).toBeTruthy()
  })
})

describe('RecorrenciasDoProfissional', () => {
  it('deixar de aceitar exige um motivo e manda-o', () => {
    mocks.atribuidos = { data: [{ ...recorrencia, counterpart_name: 'Ana' }] }
    render(<RecorrenciasDoProfissional />)
    fireEvent.click(screen.getByRole('button', { name: 'Deixar de aceitar' }))
    const confirmar = screen.getByRole('button', { name: 'Deixar de aceitar' }) as HTMLButtonElement
    expect(confirmar.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Mudei de zona' } })
    fireEvent.click(confirmar)
    expect(mocks.recusar).toHaveBeenCalledWith({ id: 'r1', reason: 'Mudei de zona' }, expect.anything())
  })

  it('sem recorrências, não aparece', () => {
    mocks.atribuidos = { data: [] }
    const { container } = render(<RecorrenciasDoProfissional />)
    expect(container.textContent).toBe('')
  })
})
