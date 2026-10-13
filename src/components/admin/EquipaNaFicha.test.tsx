import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import type { TeamMember } from '../../services/companyTeam'
import { EmpresaNaFicha, EquipaNaFicha } from './EquipaNaFicha'

afterEach(cleanup)

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
    services: [],
    created_at: '2026-10-01T10:00:00Z',
    ...extra,
  }
}

describe('EquipaNaFicha (ficha de uma empresa)', () => {
  it('mostra cada técnico com o KYC, o título e a ligação à ficha dele', () => {
    render(
      <MemoryRouter>
        <EquipaNaFicha team={[membro(), membro({ id: 'm2', user_id: 'u2', full_name: 'Rui', kyc_status: 'PENDING', active_jobs: 2 })]} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'João Silva' }).getAttribute('href')).toBe('/admin/utilizadores/u1')
    expect(screen.getByText('Identidade verificada')).toBeTruthy()
    expect(screen.getByText('Em análise')).toBeTruthy()
    expect(screen.getByText(/2 em curso/)).toBeTruthy()
  })

  it('conta só os ativos no título e marca os desativados', () => {
    render(
      <MemoryRouter>
        <EquipaNaFicha team={[membro(), membro({ id: 'm2', user_id: 'u2', status: 'INACTIVE' })]} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Equipa (1 ativos de 2)')).toBeTruthy()
    expect(screen.getByText('Desativado')).toBeTruthy()
  })

  it('uma empresa sem técnicos diz isso', () => {
    render(
      <MemoryRouter>
        <EquipaNaFicha team={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Esta empresa ainda não tem técnicos.')).toBeTruthy()
  })
})

describe('EmpresaNaFicha (ficha de um técnico)', () => {
  it('mostra a empresa, com ligação à ficha dela, e o título do técnico', () => {
    render(
      <MemoryRouter>
        <EmpresaNaFicha company={{ id: 'emp-1', full_name: 'Empresa Lda', title: 'Canalizador', status: 'ACTIVE' }} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Empresa Lda' }).getAttribute('href')).toBe('/admin/utilizadores/emp-1')
    expect(screen.queryByText(/desativado/i)).toBeNull()
  })

  it('avisa quando a empresa desativou o técnico', () => {
    render(
      <MemoryRouter>
        <EmpresaNaFicha company={{ id: 'emp-1', full_name: 'Empresa Lda', title: 'Canalizador', status: 'INACTIVE' }} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Desativado pela empresa.')).toBeTruthy()
  })
})
