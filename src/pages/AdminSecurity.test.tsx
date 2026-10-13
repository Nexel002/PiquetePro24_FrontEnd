import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EstadoDoMfa, RegistoDeFactor } from '../services/mfa'
import { AdminSecurity } from './AdminSecurity'

type FonteEstado = { data: EstadoDoMfa | undefined; isLoading: boolean; isError: boolean }

const estado = vi.hoisted(() => ({
  estado: {} as FonteEstado,
  iniciar: { mutate: vi.fn(), isPending: false, data: undefined as RegistoDeFactor | undefined },
  verificar: vi.fn(),
  erro: vi.fn(),
  sucesso: vi.fn(),
}))
vi.mock('../hooks/useMfa', () => ({
  useEstadoDoMfa: () => estado.estado,
  useIniciarRegistoDeFactor: () => estado.iniciar,
  useVerificarCodigo: () => ({ mutate: estado.verificar, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { error: estado.erro, success: estado.sucesso } }))

afterEach(() => {
  cleanup()
  estado.iniciar.mutate.mockReset()
  estado.iniciar.data = undefined
  estado.verificar.mockReset()
  estado.erro.mockReset()
  estado.sucesso.mockReset()
})

function mostrar(fonte: FonteEstado) {
  estado.estado = fonte
  render(
    <MemoryRouter>
      <AdminSecurity />
    </MemoryRouter>,
  )
}
const pronto = (data: EstadoDoMfa): FonteEstado => ({ data, isLoading: false, isError: false })

describe('AdminSecurity', () => {
  it('distingue a carregar e erro', () => {
    mostrar({ data: undefined, isLoading: true, isError: false })
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    mostrar({ data: undefined, isLoading: false, isError: true })
    expect(screen.getByText(/não foi possível ler o estado/i)).toBeTruthy()
  })

  it('com o factor ativo, diz que está ativo e não oferece ativar nem remover', () => {
    mostrar(pronto({ temFactor: true, factorId: 'f1', nivelAtual: 'aal2' }))

    expect(screen.getByText('Ativa nesta conta.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /ativar/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /remover|desativar/i })).toBeNull()
  })

  it('sem factor, oferece ativar', () => {
    mostrar(pronto({ temFactor: false, factorId: null, nivelAtual: 'aal1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ativar verificação em dois passos' }))
    expect(estado.iniciar.mutate).toHaveBeenCalledTimes(1)
  })

  it('depois de iniciar mostra o QR, o segredo e o campo do código', () => {
    estado.iniciar.data = { factorId: 'novo', qrCode: 'data:image/svg+xml;utf8,<svg/>', segredo: 'ABC123' }
    mostrar(pronto({ temFactor: false, factorId: null, nivelAtual: 'aal1' }))

    expect(screen.getByAltText('Código QR para a app de autenticação').getAttribute('src')).toContain('data:image/svg+xml')
    expect(screen.getByText('ABC123')).toBeTruthy()
    expect(screen.getByLabelText('Código de 6 dígitos')).toBeTruthy()
  })

  it('confirmar envia o factor novo e o código; código incompleto é recusado antes de gastar um pedido', () => {
    estado.iniciar.data = { factorId: 'novo', qrCode: 'x', segredo: 'ABC123' }
    mostrar(pronto({ temFactor: false, factorId: null, nivelAtual: 'aal1' }))

    fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), { target: { value: '12ab34' } })
    // Só dígitos: as letras são descartadas ao escrever.
    expect((screen.getByLabelText('Código de 6 dígitos') as HTMLInputElement).value).toBe('1234')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e ativar' }))
    expect(estado.verificar).not.toHaveBeenCalled()
    expect(estado.erro).toHaveBeenCalledWith('O código tem 6 dígitos.')

    fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e ativar' }))
    expect(estado.verificar.mock.calls[0][0]).toEqual({ factorId: 'novo', codigo: '123456' })
  })

  it('um código recusado mostra a mensagem em português e limpa o campo', () => {
    estado.iniciar.data = { factorId: 'novo', qrCode: 'x', segredo: 'ABC123' }
    estado.verificar.mockImplementation((_in, opcoes) => opcoes.onError(new Error('Invalid TOTP code entered')))
    mostrar(pronto({ temFactor: false, factorId: null, nivelAtual: 'aal1' }))

    fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e ativar' }))

    expect(estado.erro.mock.calls[0][0]).toMatch(/inválido ou expirado/)
    expect((screen.getByLabelText('Código de 6 dígitos') as HTMLInputElement).value).toBe('')
  })
})
