import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Broadcast } from '../services/adminBroadcasts'
import { AdminBroadcasts } from './AdminBroadcasts'

type Fonte = { data: Broadcast[] | undefined; isLoading: boolean; isError: boolean }

const estado = vi.hoisted(() => ({
  historico: {} as Fonte,
  prever: vi.fn(),
  enviar: vi.fn(),
  erro: vi.fn(),
}))
vi.mock('../hooks/useAdminBroadcasts', () => ({
  useBroadcasts: () => estado.historico,
  usePreviewBroadcast: () => ({ mutate: estado.prever, isPending: false }),
  useSendBroadcast: () => ({ mutate: estado.enviar, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { error: estado.erro, success: vi.fn() } }))

const ENVIADO: Broadcast = {
  id: 'b1',
  author_name: 'Ana Admin',
  subject: 'Manutenção no sábado',
  message: 'm',
  audience_role: 'PROFESSIONAL',
  audience_province: 'Maputo',
  status: 'DONE',
  recipient_count: 40,
  sent_count: 37,
  failed_count: 3,
  created_at: '2026-10-12T10:00:00Z',
  finished_at: '2026-10-12T10:02:00Z',
}

afterEach(() => {
  cleanup()
  estado.prever.mockReset()
  estado.enviar.mockReset()
  estado.erro.mockReset()
})

function mostrar(historico: Fonte = { data: [], isLoading: false, isError: false }) {
  estado.historico = historico
  render(
    <MemoryRouter>
      <AdminBroadcasts />
    </MemoryRouter>,
  )
}

function escrever() {
  fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: ' Manutenção ' } })
  fireEvent.change(screen.getByLabelText(/^Mensagem/), { target: { value: ' A plataforma fica parada duas horas. ' } })
}

describe('AdminBroadcasts — histórico', () => {
  it('mostra os totais de cada comunicado e o que não foi entregue', () => {
    mostrar({ data: [ENVIADO], isLoading: false, isError: false })
    expect(screen.getByText('37 de 40 enviados · 3 sem entrega')).toBeTruthy()
    expect(screen.getByText('Concluído')).toBeTruthy()
  })

  it('distingue a carregar, erro e vazio', () => {
    mostrar({ data: undefined, isLoading: true, isError: false })
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    mostrar({ data: undefined, isLoading: false, isError: true })
    expect(screen.getByText(/não foi possível carregar o histórico/i)).toBeTruthy()
    cleanup()

    mostrar()
    expect(screen.getByText('Ainda não enviaste nenhum comunicado.')).toBeTruthy()
  })
})

describe('AdminBroadcasts — envio', () => {
  it('não deixa enviar sem ver primeiro os destinatários', () => {
    mostrar()
    escrever()
    expect(screen.queryByRole('button', { name: 'Enviar comunicado' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Ver destinatários' })).toBeTruthy()
  })

  it('o fluxo pede o número, confirma e envia esse mesmo número', () => {
    estado.prever.mockImplementation((_grupo, opcoes) => opcoes.onSuccess({ recipients: 12 }))
    mostrar()
    escrever()
    fireEvent.change(screen.getByLabelText('Província'), { target: { value: 'Sofala' } })

    fireEvent.click(screen.getByRole('button', { name: 'Ver destinatários' }))
    expect(estado.prever.mock.calls[0][0]).toEqual({ role: 'PROFESSIONAL', province: 'Sofala' })
    expect(screen.getByText('12 pessoas neste grupo.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Enviar comunicado' }))
    expect(estado.enviar).not.toHaveBeenCalled() // ainda falta confirmar
    fireEvent.click(screen.getByRole('button', { name: 'Sim, enviar' }))

    expect(estado.enviar.mock.calls[0][0]).toEqual({
      subject: 'Manutenção',
      message: 'A plataforma fica parada duas horas.',
      audience: { role: 'PROFESSIONAL', province: 'Sofala' },
      confirm_recipients: 12,
    })
  })

  it('mudar o grupo depois de contar apaga o número: tem de contar outra vez', () => {
    estado.prever.mockImplementation((_grupo, opcoes) => opcoes.onSuccess({ recipients: 12 }))
    mostrar()
    escrever()
    fireEvent.click(screen.getByRole('button', { name: 'Ver destinatários' }))
    expect(screen.getByRole('button', { name: 'Enviar comunicado' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Para'), { target: { value: 'CLIENT' } })

    expect(screen.queryByRole('button', { name: 'Enviar comunicado' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Ver destinatários' })).toBeTruthy()
  })

  it('um grupo vazio não se pode enviar', () => {
    estado.prever.mockImplementation((_grupo, opcoes) => opcoes.onSuccess({ recipients: 0 }))
    mostrar()
    escrever()
    fireEvent.click(screen.getByRole('button', { name: 'Ver destinatários' }))

    expect(screen.getByText('Não há ninguém neste grupo.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Enviar comunicado' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('texto curto demais não deixa enviar', () => {
    estado.prever.mockImplementation((_grupo, opcoes) => opcoes.onSuccess({ recipients: 5 }))
    mostrar()
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Oi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ver destinatários' }))

    expect((screen.getByRole('button', { name: 'Enviar comunicado' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('o erro do servidor (ex. grupo mudou) volta a pedir confirmação', () => {
    estado.prever.mockImplementation((_grupo, opcoes) => opcoes.onSuccess({ recipients: 12 }))
    estado.enviar.mockImplementation((_payload, opcoes) => opcoes.onError(new Error('O grupo mudou: são agora 13 pessoas.')))
    mostrar()
    escrever()
    fireEvent.click(screen.getByRole('button', { name: 'Ver destinatários' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comunicado' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sim, enviar' }))

    expect(estado.erro).toHaveBeenCalledWith('O grupo mudou: são agora 13 pessoas.')
    expect(screen.getByRole('button', { name: 'Enviar comunicado' })).toBeTruthy()
  })
})
