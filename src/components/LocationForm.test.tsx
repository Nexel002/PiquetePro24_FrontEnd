import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../services/profile'
import { LocationForm } from './LocationForm'

const MAPUTO = { latitude: -25.9692, longitude: 32.5732 }

type Estado =
  | { status: 'idle' }
  | { status: 'success'; coordinates: typeof MAPUTO; obtidaEm: number }
  | { status: 'aproximada'; coordinates: typeof MAPUTO; precisaoM: number; obtidaEm: number }
const gps = vi.hoisted(() => ({ estado: { status: 'idle' } as Estado, locate: vi.fn(), tentarDeNovo: vi.fn() }))
vi.mock('../hooks/useGeolocation', () => ({
  useGeolocation: () => ({ state: gps.estado, locate: gps.locate, tentarDeNovo: gps.tentarDeNovo }),
}))
vi.mock('../hooks/useReverseGeocode', () => ({
  useReverseGeocode: () => ({ data: { placeName: 'Av. das Indústrias, Machava', province: 'Maputo', district: null, neighborhood: null }, isLoading: false, isError: false }),
}))
const gravar = vi.hoisted(() => ({ mutate: vi.fn() }))
vi.mock('../hooks/useProfile', () => ({
  useUpdateLocation: () => ({ mutate: gravar.mutate, isPending: false, isError: false, error: null }),
}))

const perfil = { latitude: null, longitude: null, province: null, district: null, neighborhood: null } as unknown as UserProfile

function montar() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <LocationForm profile={perfil} allowManual={false} />
    </QueryClientProvider>,
  )
}
const botaoGps = () => screen.getByRole('button', { name: 'Atualizar localização por GPS' })

beforeEach(() => {
  gps.estado = { status: 'idle' }
  gps.locate.mockReset()
  gps.tentarDeNovo.mockReset()
  gravar.mutate.mockReset()
})
afterEach(cleanup)

describe('LocationForm — localização captada em segundo plano (Fase 36)', () => {
  it('uma posição captada em segundo plano NÃO é gravada sem o utilizador carregar no botão', () => {
    gps.estado = { status: 'success', coordinates: MAPUTO, obtidaEm: Date.now() }
    montar()

    expect(gravar.mutate).not.toHaveBeenCalled()
  })

  it('com a posição já captada, carregar no botão grava logo', () => {
    gps.estado = { status: 'success', coordinates: MAPUTO, obtidaEm: Date.now() }
    montar()

    fireEvent.click(botaoGps())

    expect(gps.locate).toHaveBeenCalled()
    expect(gravar.mutate).toHaveBeenCalledWith(expect.objectContaining(MAPUTO), expect.anything())
  })

  it('a caixa «aproximada» só aparece depois do clique, e «Tentar de novo» força uma captação nova', () => {
    gps.estado = { status: 'aproximada', coordinates: MAPUTO, precisaoM: 1_200, obtidaEm: Date.now() }
    montar()
    expect(screen.queryByText(/Localização aproximada/)).toBeNull()

    fireEvent.click(botaoGps())
    expect(screen.getByText(/Localização aproximada \(±1,2 km\)/)).toBeTruthy()
    expect(gravar.mutate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(gps.tentarDeNovo).toHaveBeenCalled()
  })

  it('«Usar esta localização» grava a posição aproximada', () => {
    gps.estado = { status: 'aproximada', coordinates: MAPUTO, precisaoM: 1_200, obtidaEm: Date.now() }
    montar()
    fireEvent.click(botaoGps())

    fireEvent.click(screen.getByRole('button', { name: 'Usar esta localização' }))

    expect(gravar.mutate).toHaveBeenCalledWith(expect.objectContaining({ ...MAPUTO, province: 'Maputo' }), expect.anything())
  })
})
