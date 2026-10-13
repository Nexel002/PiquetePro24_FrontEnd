import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AddAdminResult, AdminAccount } from '../services/adminAccounts'
import { AdminAdmins } from './AdminAdmins'

type Fonte = { data: AdminAccount[] | undefined; isLoading: boolean; isError: boolean }

const estado = vi.hoisted(() => ({
  admins: {} as Fonte,
  perfil: { data: { id: 'a1' } },
  adicionar: vi.fn(),
  remover: vi.fn(),
  erro: vi.fn(),
  sucesso: vi.fn(),
}))
vi.mock('../hooks/useAdminAccounts', () => ({
  useAdmins: () => estado.admins,
  useAddAdmin: () => ({ mutate: estado.adicionar, isPending: false }),
  useRevokeAdmin: () => ({ mutate: estado.remover, isPending: false }),
}))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => estado.perfil }))
vi.mock('sonner', () => ({ toast: { error: estado.erro, success: estado.sucesso } }))

const EU: AdminAccount = { id: 'a1', full_name: 'Antonio Mambo', email: 'antonio@x.test', created_at: '2026-09-17T08:00:00Z' }
const OUTRO: AdminAccount = { id: 'a2', full_name: 'Bruno Admin', email: 'bruno@x.test', created_at: '2026-10-01T08:00:00Z' }

afterEach(() => {
  cleanup()
  estado.adicionar.mockReset()
  estado.remover.mockReset()
  estado.erro.mockReset()
  estado.sucesso.mockReset()
})

function mostrar(admins: Fonte = { data: [EU, OUTRO], isLoading: false, isError: false }) {
  estado.admins = admins
  render(
    <MemoryRouter>
      <AdminAdmins />
    </MemoryRouter>,
  )
}

function preencher(nome = 'Novo Admin', email = 'novo@x.test') {
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: nome } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
}

describe('AdminAdmins — lista', () => {
  it('mostra os administradores e marca o próprio', () => {
    mostrar()
    expect(screen.getByText('Antonio Mambo')).toBeTruthy()
    expect(screen.getByText('(tu)')).toBeTruthy()
    expect(screen.getByText(/bruno@x.test/)).toBeTruthy()
  })

  it('distingue a carregar e erro', () => {
    mostrar({ data: undefined, isLoading: true, isError: false })
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    mostrar({ data: undefined, isLoading: false, isError: true })
    expect(screen.getByText(/não foi possível carregar os administradores/i)).toBeTruthy()
  })

  it('não oferece «Remover» na própria conta', () => {
    mostrar()
    expect(screen.queryByRole('button', { name: 'Remover Antonio Mambo' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Remover Bruno Admin' })).toBeTruthy()
  })

  it('remover pede confirmação e explica que a conta não é apagada', () => {
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Bruno Admin' }))
    expect(estado.remover).not.toHaveBeenCalled()
    expect(screen.getByText(/não é apagada/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Sim, retirar' }))
    expect(estado.remover.mock.calls[0][0]).toBe('a2')
  })

  it('o erro do servidor (ex. último administrador) aparece e volta a pedir confirmação', () => {
    estado.remover.mockImplementation((_id, opcoes) => opcoes.onError(new Error('Não se pode remover o último administrador.')))
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Bruno Admin' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sim, retirar' }))

    expect(estado.erro).toHaveBeenCalledWith('Não se pode remover o último administrador.')
    expect(screen.getByRole('button', { name: 'Remover Bruno Admin' })).toBeTruthy()
  })
})

describe('AdminAdmins — adicionar', () => {
  it('recusa email inválido ou nome curto sem chamar o backend', () => {
    mostrar()
    preencher('X', 'isto-nao-e-email')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar administrador' }))

    expect(estado.adicionar).not.toHaveBeenCalled()
    expect(estado.erro).toHaveBeenCalledWith('Indica um email válido e o nome completo.')
  })

  it('conta nova: mostra a palavra-passe provisória uma vez, com aviso, e deixa fechar', () => {
    const resultado: AddAdminResult = {
      account: { id: 'n1', full_name: 'Novo Admin', email: 'novo@x.test', created_at: '2026-10-14T10:00:00Z' },
      temporary_password: 'Abc123XyzProvisoria',
      promoted: false,
    }
    estado.adicionar.mockImplementation((_in, opcoes) => opcoes.onSuccess(resultado))
    mostrar()
    preencher(' Novo Admin ', ' novo@x.test ')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar administrador' }))

    expect(estado.adicionar.mock.calls[0][0]).toEqual({ email: 'novo@x.test', full_name: 'Novo Admin' })
    expect(screen.getByText('Abc123XyzProvisoria')).toBeTruthy()
    expect(screen.getByText(/só aparece agora/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Já guardei, fechar' }))
    expect(screen.queryByText('Abc123XyzProvisoria')).toBeNull()
  })

  it('promoção de uma conta existente: não mostra nenhuma palavra-passe', () => {
    estado.adicionar.mockImplementation((_in, opcoes) =>
      opcoes.onSuccess({
        account: { id: 'c1', full_name: 'Carla', email: 'carla@x.test', created_at: '2026-10-01T10:00:00Z' },
        temporary_password: null,
        promoted: true,
      }),
    )
    mostrar()
    preencher('Carla', 'carla@x.test')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar administrador' }))

    expect(screen.getByText(/carla passou a administrador/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Copiar' })).toBeNull()
  })

  it('mostra o erro do servidor (ex. conta de profissional)', () => {
    estado.adicionar.mockImplementation((_in, opcoes) =>
      opcoes.onError(new Error('Esta conta é de um profissional e não pode ser promovida a administrador.')),
    )
    mostrar()
    preencher('Pro', 'pro@x.test')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar administrador' }))

    expect(estado.erro).toHaveBeenCalledWith('Esta conta é de um profissional e não pode ser promovida a administrador.')
  })
})
