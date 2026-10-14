import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ServiceRequest } from '../services/serviceRequests'
import type { TechnicianContext } from '../services/technician'
import { TechnicianJobs } from './TechnicianJobs'

type Fonte<T> = { data: T | undefined; isLoading: boolean; isError: boolean; error?: Error }

const estado = vi.hoisted(() => ({
  contexto: {} as Fonte<TechnicianContext>,
  trabalhos: {} as Fonte<ServiceRequest[]>,
}))
vi.mock('../hooks/useTechnician', () => ({
  useTechnicianContext: () => estado.contexto,
  useTechnicianJobs: () => estado.trabalhos,
}))
// O contacto tem teste próprio; aqui só interessa quando é pedido.
vi.mock('../components/ContactoCliente', () => ({ ContactoCliente: ({ requestId }: { requestId: string }) => <p>Contacto de {requestId}</p> }))

const CONTEXTO: TechnicianContext = { member_id: 'm1', title: 'Canalizador', status: 'ACTIVE', company_name: 'Empresa Lda', own_kyc_approved: true, company_eligible: true }

function pedido(extra: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: 'p1',
    client_id: 'c1',
    professional_id: 'emp-1',
    title: 'Torneira a pingar',
    description: null,
    status: 'ASSIGNED',
    province: 'Maputo',
    district: 'KaMpfumo',
    neighborhood: 'Polana',
    created_at: '2026-10-01T10:00:00Z',
    assigned_at: '2026-10-02T10:00:00Z',
    completed_at: null,
    category_id: null,
    assigned_member_id: 'm1',
    ...extra,
  }
}

afterEach(cleanup)

function mostrar(contexto: Partial<Fonte<TechnicianContext>>, trabalhos: Partial<Fonte<ServiceRequest[]>>) {
  estado.contexto = { data: CONTEXTO, isLoading: false, isError: false, ...contexto }
  estado.trabalhos = { data: [], isLoading: false, isError: false, ...trabalhos }
  render(
    <MemoryRouter>
      <TechnicianJobs />
    </MemoryRouter>,
  )
}

describe('TechnicianJobs', () => {
  it('distingue a carregar, erro (com a mensagem do backend) e vazio', () => {
    mostrar({ data: undefined, isLoading: true }, { data: undefined, isLoading: true })
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    mostrar({ data: undefined }, { data: undefined, isError: true, error: new Error('A tua conta de técnico foi desativada pela empresa.') })
    expect(screen.getByRole('alert').textContent).toBe('A tua conta de técnico foi desativada pela empresa.')
    cleanup()

    mostrar({}, { data: [] })
    expect(screen.getByText('Ainda não tens trabalhos atribuídos')).toBeTruthy()
  })

  it('mostra a empresa e o título do técnico', () => {
    mostrar({}, { data: [] })
    expect(screen.getByText('Canalizador · Empresa Lda')).toBeTruthy()
  })

  it('o contacto do cliente só é pedido quando o técnico o abre', () => {
    mostrar({}, { data: [pedido()] })
    expect(screen.queryByText('Contacto de p1')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Ver contacto do cliente' }))
    expect(screen.getByText('Contacto de p1')).toBeTruthy()
  })

  it('um trabalho concluído não oferece o contacto', () => {
    mostrar({}, { data: [pedido({ status: 'COMPLETED' })] })
    expect(screen.queryByRole('button', { name: 'Ver contacto do cliente' })).toBeNull()
    expect(screen.getByText('Concluído')).toBeTruthy()
  })

  it('sem o KYC aprovado, explica e leva ao ecrã de verificação', () => {
    mostrar({ data: { ...CONTEXTO, own_kyc_approved: false } }, { data: [] })

    expect(screen.getByText(/identidade verificada \(kyc\)/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Enviar os meus documentos' }).getAttribute('href')).toBe('/verificacao-identidade')
  })

  it('empresa sem subscrição ou verificação: avisa que a empresa ainda não pode receber trabalhos', () => {
    mostrar({ data: { ...CONTEXTO, company_eligible: false } }, { data: [] })
    expect(screen.getByText(/a tua empresa ainda não pode receber trabalhos/i)).toBeTruthy()
  })

  it('com tudo em ordem não mostra nenhum aviso', () => {
    mostrar({}, { data: [pedido()] })
    expect(screen.queryByText(/identidade verificada \(kyc\)/i)).toBeNull()
    expect(screen.queryByText(/a tua empresa ainda não pode/i)).toBeNull()
  })
})
