import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../services/profile'
import { NewServiceRequest, type NewServiceRequestState } from './NewServiceRequest'

// Os hooks são simulados: o que se testa é o que o ecrã deixa enviar e o que entrega ao
// pedido (serviço, os 3 convidados, local do perfil), não a rede nem a fila offline.
const mocks = vi.hoisted(() => ({
  perfil: {} as Record<string, unknown>,
  mutate: vi.fn(),
  isPending: false,
}))

// Fase 40 (N6): locais guardados e exportação do cliente têm testes próprios; aqui não há locais.
vi.mock('../hooks/useClientLocations', () => ({
  useClientLocations: () => ({ data: [] }),
  useCreateClientLocation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteClientLocation: () => ({ mutate: vi.fn(), isPending: false }),
  useExportMyRequests: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => mocks.perfil }))
vi.mock('../hooks/useServiceRequests', () => ({
  useCreateServiceRequest: () => ({ mutate: mocks.mutate, isPending: mocks.isPending }),
}))

const estado: NewServiceRequestState = {
  categoryId: 'c1',
  categoryName: 'Canalização',
  professionals: [
    { id: 'p1', full_name: 'Carlos Macamo' },
    { id: 'p2', full_name: 'Joana Sitoe' },
    { id: 'p3', full_name: 'Bento Cossa' },
  ],
}

function perfil(extra: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u1',
    full_name: 'Ana',
    phone: '+258840000000',
    province: 'Maputo Cidade',
    district: 'KaMpfumo',
    neighborhood: 'Polana',
    latitude: -25.96,
    longitude: 32.58,
    ...extra,
  } as UserProfile
}

function mostrar(opcoes: { state?: NewServiceRequestState | null; perfil?: Record<string, unknown> } = {}) {
  mocks.perfil = opcoes.perfil ?? { data: perfil(), isLoading: false }
  const state = opcoes.state === undefined ? estado : opcoes.state
  render(
    <MemoryRouter initialEntries={[{ pathname: '/novo-pedido', state }]}>
      <Routes>
        <Route path="/novo-pedido" element={<NewServiceRequest />} />
        <Route path="/profissionais" element={<p>pesquisa de profissionais</p>} />
        <Route path="/os-meus-pedidos" element={<p>os meus pedidos</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const botaoEnviar = () => screen.getByRole('button', { name: /^Enviar a/ }) as HTMLButtonElement
const escreverTitulo = (texto: string) => fireEvent.change(screen.getByLabelText('O que precisas?'), { target: { value: texto } })

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.isPending = false
})

describe('NewServiceRequest', () => {
  it('sem estado de navegação (abrir o endereço directamente) volta à pesquisa', () => {
    mostrar({ state: null })

    expect(screen.getByText('pesquisa de profissionais')).toBeTruthy()
  })

  it('sem profissionais escolhidos volta à pesquisa', () => {
    mostrar({ state: { ...estado, professionals: [] } })

    expect(screen.getByText('pesquisa de profissionais')).toBeTruthy()
  })

  it('mostra o serviço, os profissionais escolhidos e o local do perfil', () => {
    mostrar()

    expect(screen.getByText('Canalização')).toBeTruthy()
    expect(screen.getByText('Carlos Macamo')).toBeTruthy()
    expect(screen.getByText('Bento Cossa')).toBeTruthy()
    expect(screen.getByText(/Polana, KaMpfumo, Maputo Cidade/)).toBeTruthy()
    expect(botaoEnviar().textContent).toBe('Enviar a 3 profissionais')
  })

  it('só deixa enviar com um título preenchido', () => {
    mostrar()
    expect(botaoEnviar().disabled).toBe(true)

    escreverTitulo('   ')
    expect(botaoEnviar().disabled).toBe(true)

    escreverTitulo('Torneira a pingar')
    expect(botaoEnviar().disabled).toBe(false)
  })

  it('envia serviço, convidados e local do perfil, com o título aparado e sem detalhes vazios', () => {
    mostrar()

    escreverTitulo('  Torneira a pingar  ')
    fireEvent.click(botaoEnviar())

    expect(mocks.mutate).toHaveBeenCalledTimes(1)
    expect(mocks.mutate.mock.calls[0][0]).toEqual({
      title: 'Torneira a pingar',
      description: undefined,
      location: {
        latitude: -25.96,
        longitude: 32.58,
        province: 'Maputo Cidade',
        district: 'KaMpfumo',
        neighborhood: 'Polana',
      },
      category_id: 'c1',
      professional_ids: ['p1', 'p2', 'p3'],
    })
  })

  it('perfil sem coordenadas envia só a hierarquia (sem latitude/longitude)', () => {
    mostrar({ perfil: { data: perfil({ latitude: null, longitude: null, district: null, neighborhood: null }), isLoading: false } })

    escreverTitulo('Pintar sala')
    fireEvent.click(botaoEnviar())

    expect(mocks.mutate.mock.calls[0][0].location).toEqual({ province: 'Maputo Cidade', district: undefined, neighborhood: undefined })
  })

  it('perfil sem província: explica o que falta e não deixa enviar', () => {
    mostrar({ perfil: { data: perfil({ province: null }), isLoading: false } })

    escreverTitulo('Pintar sala')

    expect(screen.getByText(/Ainda não tens uma localização no perfil/)).toBeTruthy()
    expect(botaoEnviar().disabled).toBe(true)
  })

  it('a carregar o perfil: esqueleto e botão desactivado, sem aviso de localização em falta', () => {
    mostrar({ perfil: { data: undefined, isLoading: true } })

    escreverTitulo('Pintar sala')

    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText(/Ainda não tens uma localização/)).toBeNull()
    expect(botaoEnviar().disabled).toBe(true)
  })

  it('erro ao carregar o perfil: não diz que falta localização, oferece tentar de novo e bloqueia o envio', () => {
    const refetch = vi.fn()
    mostrar({ perfil: { data: undefined, isLoading: false, isError: true, refetch } })

    escreverTitulo('Pintar sala')

    expect(screen.getByRole('alert').textContent).toMatch(/Não foi possível carregar o teu perfil/)
    expect(screen.queryByText(/Ainda não tens uma localização/)).toBeNull()
    expect(botaoEnviar().disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('durante o envio o botão fica desactivado (sem duplo clique)', () => {
    mocks.isPending = true
    mostrar()

    escreverTitulo('Pintar sala')

    expect(botaoEnviar().disabled).toBe(true)
  })

  it('depois de enviado segue para "Os meus pedidos"', () => {
    mocks.mutate.mockImplementation((_payload, opcoes) => opcoes.onSuccess())
    mostrar()

    escreverTitulo('Pintar sala')
    fireEvent.click(botaoEnviar())

    expect(screen.getByText('os meus pedidos')).toBeTruthy()
  })

  it('um só profissional (categoria com poucos) diz "profissional" no singular', () => {
    mostrar({ state: { ...estado, professionals: [estado.professionals[0]] } })

    expect(botaoEnviar().textContent).toBe('Enviar a 1 profissional')
  })
})
