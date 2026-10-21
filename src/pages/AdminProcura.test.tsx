import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminProcura } from './AdminProcura'

// Fase 39 (TRD Adendo v1.66, N4): os quatro estados do separador «Procura».
const estado = vi.hoisted(() => ({ procura: {} as Record<string, unknown> }))

vi.mock('../hooks/useAdminReports', () => ({
  useProcura: () => estado.procura,
  useExportar: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

afterEach(cleanup)

describe('AdminProcura', () => {
  it('com dados: tabela por serviço e província, «Falta oferta» onde não há elegíveis', () => {
    estado.procura = {
      data: {
        from: '2026-09-21',
        to: '2026-10-21',
        rows: [
          { category_id: 'c1', category_name: 'Canalização', province: 'Gaza', searches: 7, clients: 5, pending_alerts: 2, eligible_professionals: 0 },
          { category_id: null, category_name: null, province: 'Sofala', searches: 1, clients: 1, pending_alerts: 0, eligible_professionals: null },
        ],
      },
    }
    render(<AdminProcura />)

    expect(screen.getByText('Canalização')).toBeTruthy()
    expect(screen.getByText('Pesquisa por texto')).toBeTruthy()
    expect(screen.getAllByText('Falta oferta')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeTruthy()
  })

  it('vazio: diz que os clientes encontraram profissionais', () => {
    estado.procura = { data: { from: '', to: '', rows: [] } }
    render(<AdminProcura />)
    expect(screen.getByText(/Nenhuma procura sem oferta/)).toBeTruthy()
  })

  it('erro: mensagem compreensível', () => {
    estado.procura = { isError: true }
    render(<AdminProcura />)
    expect(screen.getByText(/Não foi possível carregar a procura/)).toBeTruthy()
  })
})
