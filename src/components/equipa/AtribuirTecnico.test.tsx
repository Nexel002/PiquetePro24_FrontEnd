import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TeamMember } from '../../services/companyTeam'
import type { ServiceRequest } from '../../services/serviceRequests'
import { AtribuirTecnico, tecnicosElegiveis } from './AtribuirTecnico'

const estado = vi.hoisted(() => ({ atribuir: vi.fn(), erro: vi.fn(), sucesso: vi.fn() }))
vi.mock('../../hooks/useCompanyTeam', () => ({ useAssignMember: () => ({ mutate: estado.atribuir, isPending: false }) }))
vi.mock('sonner', () => ({ toast: { error: estado.erro, success: estado.sucesso } }))

function membro(extra: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'm1',
    user_id: 'u1',
    full_name: 'João Silva',
    email: 'joao@x.test',
    title: 'Canalizador',
    status: 'ACTIVE',
    active_jobs: 0,
    kyc_status: 'APPROVED',
    services: [{ id: 'cat-1', name: 'Canalização' }],
    created_at: '2026-10-01T10:00:00Z',
    ...extra,
  }
}

function pedido(extra: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: 'p1',
    client_id: 'c1',
    professional_id: 'emp-1',
    title: 'Torneira',
    description: null,
    status: 'ASSIGNED',
    province: 'Maputo',
    district: null,
    neighborhood: null,
    created_at: '2026-10-01T10:00:00Z',
    assigned_at: '2026-10-02T10:00:00Z',
    completed_at: null,
    category_id: 'cat-1',
    assigned_member_id: null,
    ...extra,
  }
}

afterEach(() => {
  cleanup()
  estado.atribuir.mockReset()
  estado.erro.mockReset()
  estado.sucesso.mockReset()
})

describe('tecnicosElegiveis', () => {
  const equipa = [
    membro({ id: 'ok' }),
    membro({ id: 'desativado', status: 'INACTIVE' }),
    membro({ id: 'sem-kyc', kyc_status: 'PENDING' }),
    membro({ id: 'sem-docs', kyc_status: 'NONE' }),
    membro({ id: 'outro-servico', services: [{ id: 'cat-2', name: 'Pintura' }] }),
  ]

  it('só os ativos, com a identidade verificada e que fazem o serviço do pedido', () => {
    expect(tecnicosElegiveis(equipa, { category_id: 'cat-1' }).map((m) => m.id)).toEqual(['ok'])
  })

  it('um pedido sem serviço escolhido aceita qualquer técnico ativo e verificado', () => {
    expect(tecnicosElegiveis(equipa, { category_id: null }).map((m) => m.id)).toEqual(['ok', 'outro-servico'])
  })
})

describe('AtribuirTecnico', () => {
  it('sem técnico, avisa e oferece atribuir', () => {
    render(<AtribuirTecnico pedido={pedido()} equipa={[membro()]} />)

    expect(screen.getByText('Este trabalho ainda não tem técnico.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Atribuir técnico' })).toBeTruthy()
  })

  it('com técnico, mostra quem é e oferece mudar', () => {
    const atual = { id: 'm1', first_name: 'João', title: 'Canalizador', avatar_url: null }
    render(<AtribuirTecnico pedido={pedido({ assigned_member_id: 'm1', technician: atual })} equipa={[membro()]} />)

    expect(screen.getByText('João')).toBeTruthy()
    expect(screen.queryByText('Este trabalho ainda não tem técnico.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Mudar técnico' })).toBeTruthy()
  })

  it('só lista os técnicos elegíveis e atribui o escolhido', () => {
    render(<AtribuirTecnico pedido={pedido()} equipa={[membro(), membro({ id: 'm2', full_name: 'Sem KYC', kyc_status: 'PENDING' })]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Atribuir técnico' }))
    expect(screen.queryByRole('option', { name: /sem kyc/i })).toBeNull()

    fireEvent.change(screen.getByLabelText('Técnico'), { target: { value: 'm1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir' }))

    expect(estado.atribuir.mock.calls[0][0]).toEqual({ requestId: 'p1', memberId: 'm1' })
  })

  it('não atribui sem escolher', () => {
    render(<AtribuirTecnico pedido={pedido()} equipa={[membro()]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir técnico' }))
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir' }))

    expect(estado.atribuir).not.toHaveBeenCalled()
    expect(estado.erro).toHaveBeenCalledWith('Escolhe um técnico.')
  })

  it('sem nenhum técnico elegível explica porquê e não deixa atribuir', () => {
    render(<AtribuirTecnico pedido={pedido()} equipa={[membro({ kyc_status: 'NONE' })]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir técnico' }))

    expect(screen.getByText(/nenhum técnico pode ir a este pedido/i)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Atribuir' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('o erro do servidor aparece', () => {
    estado.atribuir.mockImplementation((_in, opcoes) => opcoes.onError(new Error('Este técnico não faz o serviço pedido.')))
    render(<AtribuirTecnico pedido={pedido()} equipa={[membro()]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir técnico' }))
    fireEvent.change(screen.getByLabelText('Técnico'), { target: { value: 'm1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir' }))

    expect(estado.erro).toHaveBeenCalledWith('Este técnico não faz o serviço pedido.')
  })
})
