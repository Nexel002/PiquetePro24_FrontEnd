import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../services/profile'
import { OnboardingGate } from './OnboardingGate'

// O perfil é simulado: o que se testa é para onde o guarda leva cada estado do onboarding,
// em particular que nunca entra em ciclo dentro das próprias telas de onboarding.
const estado = vi.hoisted(() => ({ consulta: {} as Record<string, unknown> }))

vi.mock('../hooks/useProfile', () => ({
  useProfile: () => estado.consulta,
}))

function perfil(extra: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u1',
    full_name: 'Ana',
    phone: '+258840000000',
    role: 'CLIENT',
    professional_type: null,
    province: 'Maputo',
    district: null,
    neighborhood: null,
    location: null,
    latitude: null,
    longitude: null,
    avatar_url: null,
    bio: null,
    created_at: '2026-10-01T10:00:00.000Z',
    ...extra,
  } as UserProfile
}

function mostrar(consulta: Record<string, unknown>, caminho = '/perfil') {
  estado.consulta = consulta
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/perfil" element={<OnboardingGate>conteúdo protegido</OnboardingGate>} />
        <Route path="/completar-perfil/telefone" element={<OnboardingGate>passo do telefone</OnboardingGate>} />
        <Route path="/completar-perfil/localizacao" element={<OnboardingGate>passo da localização</OnboardingGate>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('OnboardingGate', () => {
  it('onboarding completo: deixa passar', () => {
    mostrar({ data: perfil(), isLoading: false, isError: false })

    expect(screen.getByText('conteúdo protegido')).toBeTruthy()
  })

  it('um técnico não passa pelo onboarding de telefone nem de localização', () => {
    mostrar({ data: perfil({ role: 'TECHNICIAN', phone: null, province: null }), isLoading: false, isError: false })

    expect(screen.getByText('conteúdo protegido')).toBeTruthy()
  })

  it('sem telefone: leva ao passo do telefone', () => {
    mostrar({ data: perfil({ phone: null }), isLoading: false, isError: false })

    expect(screen.getByText('passo do telefone')).toBeTruthy()
  })

  it('com telefone mas sem localização: leva ao passo da localização', () => {
    mostrar({ data: perfil({ province: null, latitude: null }), isLoading: false, isError: false })

    expect(screen.getByText('passo da localização')).toBeTruthy()
  })

  it('sem telefone nem localização, o telefone vem primeiro', () => {
    mostrar({ data: perfil({ phone: null, province: null }), isLoading: false, isError: false })

    expect(screen.getByText('passo do telefone')).toBeTruthy()
  })

  it('já no passo certo, não redirecciona outra vez (sem ciclo)', () => {
    mostrar({ data: perfil({ province: null }), isLoading: false, isError: false }, '/completar-perfil/localizacao')

    expect(screen.getByText('passo da localização')).toBeTruthy()
  })

  it('coordenadas sem província contam como localização definida', () => {
    mostrar({ data: perfil({ province: null, latitude: -25.9, longitude: 32.5 }), isLoading: false, isError: false })

    expect(screen.getByText('conteúdo protegido')).toBeTruthy()
  })

  it('a carregar: não mostra o conteúdo nem redirecciona', () => {
    mostrar({ data: undefined, isLoading: true, isError: false })

    expect(screen.queryByText('conteúdo protegido')).toBeNull()
    expect(screen.queryByText('passo do telefone')).toBeNull()
  })

  it('erro ao carregar o perfil: mensagem, nada de conteúdo protegido e «Tentar de novo» repete o pedido', () => {
    const refetch = vi.fn()
    mostrar({ data: undefined, isLoading: false, isError: true, refetch })

    expect(screen.getByText(/Não foi possível carregar o teu perfil/)).toBeTruthy()
    expect(screen.queryByText('conteúdo protegido')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
