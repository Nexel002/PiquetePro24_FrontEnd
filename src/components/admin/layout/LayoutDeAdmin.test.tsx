import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LayoutDeAdmin } from './LayoutDeAdmin'
import { ParaOSeparador } from './ParaOSeparador'
import { ROTAS_ANTIGAS } from './rotas'

const estado = vi.hoisted(() => ({ kycPendentes: 0, terminar: vi.fn() }))

vi.mock('../../../hooks/useAdminMetrics', () => ({
  useAdminMetrics: () => ({ data: { kycByStatus: { PENDING: estado.kycPendentes } } }),
}))
vi.mock('../../../hooks/useProfile', () => ({
  useProfile: () => ({ data: { id: 'a1', full_name: 'Ana Admin', role: 'ADMIN' } }),
}))
vi.mock('../../../store/AuthContext', () => ({
  useAuth: () => ({ signOut: estado.terminar }),
}))

afterEach(() => {
  cleanup()
  estado.kycPendentes = 0
  estado.terminar.mockReset()
})

function Local() {
  const { pathname, search, state } = useLocation()
  return <p data-testid="local">{`${pathname}${search}|${(state as { segundoFactorExigido?: boolean } | null)?.segundoFactorExigido ?? ''}`}</p>
}

function mostrar(inicial: string | { pathname: string; state?: unknown }) {
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <Routes>
        <Route path="/" element={<Local />} />
        <Route path="/admin" element={<LayoutDeAdmin />}>
          <Route path="*" element={<Local />} />
          {ROTAS_ANTIGAS.map((antiga) => (
            <Route key={antiga.caminho} path={antiga.caminho} element={<ParaOSeparador seccao={antiga.seccao} separador={antiga.separador} />} />
          ))}
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

// A barra aparece duas vezes no DOM só com a gaveta aberta; fechada, há uma (a de desktop).
const menu = () => within(screen.getAllByRole('navigation', { name: /secções do painel/i })[0])

describe('LayoutDeAdmin', () => {
  it('acende uma só secção — a ficha de um utilizador acende «Utilizadores» — e põe o nome no cabeçalho', () => {
    mostrar('/admin/utilizadores/123')
    const acesas = menu()
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(acesas.map((link) => link.textContent)).toEqual(['Utilizadores'])
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Utilizadores')
  })

  it('o selo do KYC mostra o número por rever e desaparece a zero', () => {
    estado.kycPendentes = 4
    mostrar('/admin/kyc')
    expect(menu().getByRole('link', { name: /revisão de kyc/i }).textContent).toContain('4')
    cleanup()

    estado.kycPendentes = 0
    mostrar('/admin/kyc')
    expect(menu().getByRole('link', { name: /revisão de kyc/i }).textContent).toBe('Revisão de KYC')
  })

  it('recolhida, a barra mostra só ícones mas cada secção continua com nome acessível', () => {
    mostrar('/admin/kyc')
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }))
    expect(menu().getByRole('link', { name: 'Pedidos' }).textContent).toBe('')
    expect(screen.getByRole('button', { name: 'Expandir menu' })).toBeTruthy()
  })

  it('a gaveta do telemóvel abre pelo ☰, fecha com Escape e fecha ao mudar de secção', () => {
    mostrar('/admin/kyc')
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Fechar menu' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const gaveta = within(screen.getAllByRole('navigation', { name: /secções do painel/i })[1])
    fireEvent.click(gaveta.getByRole('link', { name: 'Pedidos' }))
    expect(screen.queryByRole('button', { name: 'Fechar menu' })).toBeNull()
    expect(screen.getByTestId('local').textContent).toBe('/admin/pedidos-servico|')
  })

  it('o cabeçalho tem «voltar»: sem ecrã anterior, a ficha volta à lista e a secção volta à Home', () => {
    mostrar('/admin/utilizadores/123')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByTestId('local').textContent).toBe('/admin/utilizadores|')

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByTestId('local').textContent).toBe('/|')
  })

  it('o menu do perfil termina a sessão', () => {
    mostrar('/admin/kyc')
    fireEvent.click(screen.getByRole('button', { name: /ana admin/i }))
    fireEvent.click(screen.getByRole('button', { name: /terminar sessão/i }))
    expect(estado.terminar).toHaveBeenCalled()
  })
})

describe('rotas antigas', () => {
  it('cada uma leva ao separador que a substituiu', () => {
    mostrar('/admin/subscricoes')
    expect(screen.getByTestId('local').textContent).toBe('/admin/mais?tab=subscricoes|')
    cleanup()

    mostrar('/admin/metricas')
    expect(screen.getByTestId('local').textContent).toBe('/admin/visao-geral?tab=metricas|')
  })

  it('o «Ver histórico» antigo continua filtrado', () => {
    mostrar('/admin/audit-log?entity_type=service_requests&entity_id=r1')
    expect(screen.getByTestId('local').textContent).toBe('/admin/visao-geral?entity_type=service_requests&entity_id=r1&tab=auditoria|')
  })

  it('a Segurança antiga mantém o aviso do segundo factor', () => {
    mostrar({ pathname: '/admin/seguranca', state: { segundoFactorExigido: true } })
    expect(screen.getByTestId('local').textContent).toBe('/admin/mais?tab=seguranca|true')
  })
})
