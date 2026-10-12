import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../../services/profile'
import { CompletePhone } from './CompletePhone'

const mocks = vi.hoisted(() => ({
  consulta: {} as Record<string, unknown>,
  mutate: vi.fn(),
  mutacao: { isPending: false, isError: false, error: null as unknown },
}))

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => mocks.consulta,
  useUpdateProfileDetails: () => ({ mutate: mocks.mutate, ...mocks.mutacao }),
}))

function perfil(extra: Partial<UserProfile> = {}): UserProfile {
  return { id: 'u1', full_name: 'Ana', phone: null, province: null, latitude: null, ...extra } as UserProfile
}

function mostrar(consulta: Record<string, unknown>) {
  mocks.consulta = consulta
  render(
    <MemoryRouter initialEntries={['/completar-perfil/telefone']}>
      <Routes>
        <Route path="/completar-perfil/telefone" element={<CompletePhone />} />
        <Route path="/perfil" element={<p>ecrã do perfil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.mutacao = { isPending: false, isError: false, error: null }
})

describe('CompletePhone', () => {
  it('envia o número com o indicativo +258 à frente', () => {
    mostrar({ data: perfil(), isLoading: false, isError: false })

    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '840000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(mocks.mutate).toHaveBeenCalledWith({ phone: '+258840000000' })
  })

  it('sem dígitos o botão fica desactivado e não há "saltar"', () => {
    mostrar({ data: perfil(), isLoading: false, isError: false })

    expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText(/mais tarde|saltar/i)).toBeNull()
  })

  it('mostra o erro do servidor, por exemplo número já usado', () => {
    mocks.mutacao = { isPending: false, isError: true, error: new Error('Este telefone já está registado.') }
    mostrar({ data: perfil(), isLoading: false, isError: false })

    expect(screen.getByRole('alert').textContent).toBe('Este telefone já está registado.')
  })

  it('erro sem mensagem usa o texto por omissão', () => {
    mocks.mutacao = { isPending: false, isError: true, error: 'falha' }
    mostrar({ data: perfil(), isLoading: false, isError: false })

    expect(screen.getByRole('alert').textContent).toMatch(/Não foi possível guardar o telefone/)
  })

  it('quem já tem telefone não fica preso aqui: segue para o perfil', () => {
    mostrar({ data: perfil({ phone: '+258840000000', province: 'Maputo' }), isLoading: false, isError: false })

    expect(screen.getByText('ecrã do perfil')).toBeTruthy()
  })

  it('erro ao carregar o perfil: mensagem compreensível e sem formulário', () => {
    mostrar({ data: undefined, isLoading: false, isError: true })

    expect(screen.getByText(/Não foi possível carregar o teu perfil/)).toBeTruthy()
    expect(screen.queryByLabelText('Telefone')).toBeNull()
  })

  it('a carregar: sem formulário', () => {
    mostrar({ data: undefined, isLoading: true, isError: false })

    expect(screen.queryByLabelText('Telefone')).toBeNull()
  })
})
