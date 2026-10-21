import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../../services/profile'
import { LOCAL_DO_PERFIL, moradaEscolhida } from '../../lib/localDoPedido'
import { DadosDaEmpresa } from './DadosDaEmpresa'
import { OsMeusLocais } from './OsMeusLocais'

// Fase 40 (TRD Adendo v1.66, N6): dados da empresa, locais guardados e a morada do pedido.
const mocks = vi.hoisted(() => ({ atualizar: vi.fn(), criar: vi.fn(), apagar: vi.fn(), locais: [] as unknown[] }))

vi.mock('../../hooks/useProfile', () => ({ useUpdateProfileDetails: () => ({ mutate: mocks.atualizar, isPending: false }) }))
vi.mock('../../hooks/useClientLocations', () => ({
  useClientLocations: () => ({ data: mocks.locais }),
  useCreateClientLocation: () => ({ mutate: mocks.criar, isPending: false }),
  useDeleteClientLocation: () => ({ mutate: mocks.apagar, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

beforeEach(() => {
  mocks.atualizar.mockReset()
  mocks.criar.mockReset()
  mocks.locais = []
})
afterEach(cleanup)

function perfil(extra: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'c1',
    full_name: 'Ana',
    phone: '+258840000000',
    role: 'CLIENT',
    professional_type: null,
    province: 'Cidade de Maputo',
    district: 'KaMpfumo',
    neighborhood: null,
    location: null,
    latitude: -25.96,
    longitude: 32.58,
    avatar_url: null,
    bio: null,
    created_at: '',
    ...extra,
  }
}

const sede = { id: 'l1', label: 'Sede', province: 'Gaza', district: 'Xai-Xai', neighborhood: null, latitude: null, longitude: null, created_at: '' }

describe('DadosDaEmpresa', () => {
  it('passar a empresa manda o nome e o NUIT', () => {
    render(<DadosDaEmpresa profile={perfil()} />)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Nome da empresa ou instituição'), { target: { value: 'Condomínio Polana' } })
    fireEvent.change(screen.getByLabelText('NUIT (opcional)'), { target: { value: '400123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(mocks.atualizar).toHaveBeenCalledWith(
      { client_type: 'BUSINESS', business_name: 'Condomínio Polana', business_nuit: '400123456' },
      expect.anything(),
    )
  })

  it('NUIT incompleto ou empresa sem nome não deixam guardar', () => {
    render(<DadosDaEmpresa profile={perfil()} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Nome da empresa ou instituição'), { target: { value: 'Loja X' } })
    fireEvent.change(screen.getByLabelText('NUIT (opcional)'), { target: { value: '1234' } })
    expect(screen.getByText('O NUIT tem 9 dígitos.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('voltar a particular manda só o tipo', () => {
    render(<DadosDaEmpresa profile={perfil({ client_type: 'BUSINESS', business_name: 'Loja X', business_nuit: null })} />)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(mocks.atualizar).toHaveBeenCalledWith({ client_type: 'INDIVIDUAL' }, expect.anything())
  })
})

describe('OsMeusLocais', () => {
  it('acrescenta um local com as coordenadas do perfil, se o cliente o indicar', () => {
    render(<OsMeusLocais profile={perfil()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Acrescentar local' }))
    fireEvent.change(screen.getByLabelText('Nome do local'), { target: { value: 'Casa' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar local' }))

    expect(mocks.criar).toHaveBeenCalledWith(
      { label: 'Casa', province: 'Cidade de Maputo', district: undefined, neighborhood: undefined, latitude: -25.96, longitude: 32.58 },
      expect.anything(),
    )
  })

  it('lista e apaga um local', () => {
    mocks.locais = [sede]
    render(<OsMeusLocais profile={perfil()} />)
    expect(screen.getByText('Sede')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }))
    expect(mocks.apagar).toHaveBeenCalledWith('l1', expect.anything())
  })
})

describe('moradaEscolhida', () => {
  it('o perfil, ou uma cópia do local guardado escolhido', () => {
    expect(moradaEscolhida(perfil(), LOCAL_DO_PERFIL, [])).toEqual({
      latitude: -25.96,
      longitude: 32.58,
      province: 'Cidade de Maputo',
      district: 'KaMpfumo',
      neighborhood: undefined,
    })
    expect(moradaEscolhida(perfil(), 'l1', [sede])).toEqual({ province: 'Gaza', district: 'Xai-Xai', neighborhood: undefined })
    // Local apagado entretanto: sem morada, o envio fica bloqueado.
    expect(moradaEscolhida(perfil(), 'l1', [])).toBeNull()
  })
})
