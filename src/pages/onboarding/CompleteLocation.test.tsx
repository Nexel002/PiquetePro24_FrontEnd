import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../../services/profile'
import { CompleteLocation } from './CompleteLocation'

const mocks = vi.hoisted(() => ({ consulta: {} as Record<string, unknown> }))

vi.mock('../../hooks/useProfile', () => ({ useProfile: () => mocks.consulta }))
// O formulário de localização tem lógica de GPS própria; aqui só interessa que aparece.
vi.mock('../../components/LocationForm', () => ({ LocationForm: () => <div>formulário de localização</div> }))

function perfil(extra: Partial<UserProfile> = {}): UserProfile {
  return { id: 'u1', full_name: 'Ana', phone: '+258840000000', province: null, latitude: null, ...extra } as UserProfile
}

function mostrar(consulta: Record<string, unknown>) {
  mocks.consulta = consulta
  render(
    <MemoryRouter initialEntries={['/completar-perfil/localizacao']}>
      <Routes>
        <Route path="/completar-perfil/localizacao" element={<CompleteLocation />} />
        <Route path="/completar-perfil/telefone" element={<p>passo do telefone</p>} />
        <Route path="/perfil" element={<p>ecrã do perfil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('CompleteLocation', () => {
  it('com telefone e sem localização: mostra o formulário', () => {
    mostrar({ data: perfil(), isLoading: false, isError: false })

    expect(screen.getByText('Onde estás?')).toBeTruthy()
    expect(screen.getByText('formulário de localização')).toBeTruthy()
  })

  it('sem telefone volta ao passo do telefone (a ordem do onboarding é telefone primeiro)', () => {
    mostrar({ data: perfil({ phone: null }), isLoading: false, isError: false })

    expect(screen.getByText('passo do telefone')).toBeTruthy()
  })

  it('onboarding já completo: segue para o perfil, não fica preso aqui', () => {
    mostrar({ data: perfil({ province: 'Maputo Cidade' }), isLoading: false, isError: false })

    expect(screen.getByText('ecrã do perfil')).toBeTruthy()
  })

  it('a carregar: sem formulário', () => {
    mostrar({ data: undefined, isLoading: true, isError: false })

    expect(screen.queryByText('formulário de localização')).toBeNull()
  })

  it('erro: mensagem e «Tentar de novo» repete o pedido do perfil', () => {
    const refetch = vi.fn()
    mostrar({ data: undefined, isLoading: false, isError: true, refetch })

    expect(screen.getByRole('alert').textContent).toMatch(/Não foi possível carregar o teu perfil/)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
