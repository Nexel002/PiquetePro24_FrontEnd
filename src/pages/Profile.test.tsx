import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../services/profile'
import { Profile } from './Profile'

// Os hooks, o Supabase Auth e os blocos que têm testes próprios (localização, apagar conta)
// são simulados: o que se testa aqui são os estados do ecrã, o painel de definições e as
// validações da password, que são do próprio Profile.
const mocks = vi.hoisted(() => ({
  perfil: {} as Record<string, unknown>,
  pedidos: {} as Record<string, unknown>,
  atualizarDados: vi.fn(),
  estadoDosDados: { isPending: false, isError: false, error: null as unknown },
  enviarAvatar: vi.fn(),
  concluir: vi.fn(),
  cancelar: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('../hooks/useProfile', () => ({
  useProfile: () => mocks.perfil,
  useUpdateProfileDetails: () => ({ mutate: mocks.atualizarDados, ...mocks.estadoDosDados }),
  useUploadAvatar: () => ({ mutate: mocks.enviarAvatar, isPending: false, isError: false, error: null }),
}))
vi.mock('../hooks/useServiceRequests', () => ({
  useMyServiceRequests: () => mocks.pedidos,
  useCompleteServiceRequest: () => ({ mutate: mocks.concluir, isPending: false }),
  useCancelServiceRequest: () => ({ mutate: mocks.cancelar, isPending: false }),
}))
vi.mock('../components/LocationForm', () => ({ LocationForm: () => <div>formulário de localização</div> }))
vi.mock('../components/profile/DeleteAccountSection', () => ({
  DeleteAccountSection: ({ papel }: { papel: string }) => <div>apagar conta ({papel})</div>,
}))
vi.mock('../lib/supabase', () => ({ supabase: { auth: { updateUser: mocks.updateUser } } }))

function perfil(extra: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u1',
    full_name: 'Ana Machava',
    phone: '+258840000000',
    role: 'CLIENT',
    avatar_url: null,
    created_at: '2026-01-15T10:00:00.000Z',
    ...extra,
  } as UserProfile
}

function pedido(extra: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    title: 'Torneira a pingar',
    description: null,
    status: 'OPEN',
    province: 'Maputo Cidade',
    district: null,
    neighborhood: null,
    created_at: '2026-10-01T10:00:00.000Z',
    ...extra,
  }
}

function mostrar(opcoes: { perfil?: Record<string, unknown>; pedidos?: Record<string, unknown> } = {}) {
  mocks.perfil = opcoes.perfil ?? { data: perfil(), isLoading: false, isError: false }
  mocks.pedidos = opcoes.pedidos ?? { data: [], isLoading: false }
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  )
}

const abrirDefinicoes = () => fireEvent.click(screen.getByRole('button', { name: 'Definições da conta' }))

beforeEach(() => {
  mocks.updateUser.mockResolvedValue({ error: null })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.estadoDosDados = { isPending: false, isError: false, error: null }
})

describe('Profile — estados do ecrã', () => {
  it('a carregar: mensagem de espera e nenhum dado', () => {
    mostrar({ perfil: { data: undefined, isLoading: true, isError: false } })

    expect(screen.getByText('A carregar perfil...')).toBeTruthy()
    expect(screen.queryByText('Ana Machava')).toBeNull()
  })

  it('erro: mensagem compreensível com botão para tentar de novo', () => {
    mostrar({ perfil: { data: undefined, isLoading: false, isError: true } })

    expect(screen.getByText(/Não foi possível carregar o teu perfil/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy()
  })

  it('com dados: nome, telefone e a localização', () => {
    mostrar()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Ana Machava')
    expect(screen.getByText('+258840000000')).toBeTruthy()
    expect(screen.getByText('formulário de localização')).toBeTruthy()
  })

  it('só o profissional vê o atalho para o catálogo', () => {
    mostrar()
    expect(screen.queryByText('O meu catálogo')).toBeNull()

    cleanup()
    mostrar({ perfil: { data: perfil({ role: 'PROFESSIONAL' }), isLoading: false, isError: false } })
    expect(screen.getByText('O meu catálogo')).toBeTruthy()
  })
})

describe('Profile — definições', () => {
  it('abrir as definições preenche o nome e o telefone sem o indicativo', () => {
    mostrar()

    abrirDefinicoes()

    expect((screen.getByLabelText('Nome completo') as HTMLInputElement).value).toBe('Ana Machava')
    expect((screen.getByRole('textbox', { name: /Telefone/ }) as HTMLInputElement).value).toBe('840000000')
  })

  it('guardar manda o nome e o telefone com o indicativo +258', () => {
    mostrar()
    abrirDefinicoes()

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana M.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar dados' }))

    expect(mocks.atualizarDados).toHaveBeenCalledWith({ full_name: 'Ana M.', phone: '+258840000000' })
  })

  it('mostra o erro do servidor ao guardar dados', () => {
    mocks.estadoDosDados = { isPending: false, isError: true, error: new Error('Telefone já registado.') }
    mostrar()
    abrirDefinicoes()

    expect(screen.getByText('Telefone já registado.')).toBeTruthy()
  })

  it('"Remover foto de perfil" só existe com foto e manda avatar_url null', () => {
    mostrar()
    abrirDefinicoes()
    expect(screen.queryByText('Remover foto de perfil')).toBeNull()

    cleanup()
    mostrar({ perfil: { data: perfil({ avatar_url: 'https://x/a.webp' }), isLoading: false, isError: false } })
    abrirDefinicoes()
    fireEvent.click(screen.getByText('Remover foto de perfil'))

    expect(mocks.atualizarDados).toHaveBeenCalledWith({ avatar_url: null })
  })

  it('apagar conta aparece a clientes e profissionais, nunca a administradores', () => {
    mostrar()
    abrirDefinicoes()
    expect(screen.getByText('apagar conta (CLIENT)')).toBeTruthy()

    cleanup()
    mostrar({ perfil: { data: perfil({ role: 'ADMIN' }), isLoading: false, isError: false } })
    abrirDefinicoes()
    expect(screen.queryByText(/apagar conta/)).toBeNull()
  })
})

describe('Profile — alterar password', () => {
  // As definições abrem-se antes (fora do `act` assíncrono: dentro dele o React só desenha
  // no fim, e os campos ainda não existiriam para o `getBy...` seguinte).
  function preencher(nova: string, confirmacao: string) {
    fireEvent.change(screen.getByPlaceholderText(/Nova password/), { target: { value: nova } })
    fireEvent.change(screen.getByPlaceholderText('Confirmar nova password'), { target: { value: confirmacao } })
    // O formulário é submetido directamente: `minLength` do HTML impediria o clique em jsdom
    // de chegar ao handler, e a regra a testar é a do próprio componente.
    fireEvent.submit(screen.getByPlaceholderText('Confirmar nova password').closest('form') as HTMLFormElement)
  }

  it('password curta é recusada sem chamar o Supabase', () => {
    mostrar()

    abrirDefinicoes()
    preencher('123', '123')

    expect(screen.getByRole('alert').textContent).toBe('A password tem de ter pelo menos 6 caracteres.')
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('passwords diferentes são recusadas sem chamar o Supabase', () => {
    mostrar()

    abrirDefinicoes()
    preencher('segredo1', 'segredo2')

    expect(screen.getByRole('alert').textContent).toBe('As passwords não coincidem.')
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('password válida: actualiza, avisa e limpa os campos', async () => {
    mostrar()

    abrirDefinicoes()
    await act(async () => preencher('segredo1', 'segredo1'))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Password atualizada com sucesso.'))
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'segredo1' })
    expect((screen.getByPlaceholderText(/Nova password/) as HTMLInputElement).value).toBe('')
  })

  it('erro do Supabase aparece em mensagem de utilizador e mantém os campos', async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: 'New password should be different from the old password.', code: 'same_password' } })
    mostrar()

    abrirDefinicoes()
    await act(async () => preencher('segredo1', 'segredo1'))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.queryByRole('status')).toBeNull()
    expect((screen.getByPlaceholderText(/Nova password/) as HTMLInputElement).value).toBe('segredo1')
  })
})

describe('Profile — histórico de pedidos', () => {
  it('a carregar: esqueleto, sem lista nem estado vazio', () => {
    mostrar({ pedidos: { data: undefined, isLoading: true } })

    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText('Nenhum pedido realizado')).toBeNull()
  })

  it('sem pedidos: estado vazio com o caminho para fazer o primeiro', () => {
    mostrar()

    expect(screen.getByText('Nenhum pedido realizado')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Fazer o meu primeiro pedido' }).getAttribute('href')).toBe('/profissionais')
  })

  it('erro ao carregar os pedidos: aviso próprio (não «Nenhum pedido realizado») e «Tentar de novo»', () => {
    const refetch = vi.fn()
    mostrar({ pedidos: { data: undefined, isLoading: false, isError: true, refetch } })

    expect(screen.getByRole('alert').textContent).toMatch(/Não foi possível carregar os teus pedidos/)
    expect(screen.queryByText('Nenhum pedido realizado')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('lista os pedidos com o estado em português e o total', () => {
    mostrar({ pedidos: { data: [pedido(), pedido({ id: 'r2', title: 'Pintar sala', status: 'COMPLETED' })], isLoading: false } })

    expect(screen.getByText('Torneira a pingar')).toBeTruthy()
    expect(screen.getByText('Aberto')).toBeTruthy()
    expect(screen.getByText('Concluído')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver todos (2)' })).toBeTruthy()
  })

  it('"Concluir" só existe em pedidos atribuídos; "Cancelar" em abertos e atribuídos', () => {
    mostrar({
      pedidos: {
        data: [
          pedido({ id: 'a', title: 'Aberto', status: 'OPEN' }),
          pedido({ id: 'b', title: 'Atribuído', status: 'ASSIGNED' }),
          pedido({ id: 'c', title: 'Concluído', status: 'COMPLETED' }),
          pedido({ id: 'd', title: 'Cancelado', status: 'CANCELLED' }),
        ],
        isLoading: false,
      },
    })

    expect(screen.getAllByRole('button', { name: 'Concluir' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Cancelar' })).toHaveLength(2)
  })

  it('"Concluir" e "Cancelar" pedem ao hook o pedido certo', () => {
    mostrar({ pedidos: { data: [pedido({ id: 'b', status: 'ASSIGNED' })], isLoading: false } })

    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(mocks.concluir).toHaveBeenCalledWith('b')
    expect(mocks.cancelar).toHaveBeenCalledWith('b')
  })
})
