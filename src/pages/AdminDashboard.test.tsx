import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminMetrics } from '../services/adminMetrics'
import type { SecurityAlert } from '../services/adminSecurityAlerts'
import { AdminDashboard } from './AdminDashboard'

type Fonte<T> = { data: T | undefined; isLoading: boolean; isError: boolean }

const fontes = vi.hoisted(() => ({
  metricas: {} as Fonte<unknown>,
  alertas: {} as Fonte<unknown>,
  subscricoes: {} as Fonte<unknown>,
  denuncias: {} as Fonte<unknown>,
  mfa: { data: { temFactor: true }, isLoading: false, isError: false } as Fonte<unknown>,
}))
vi.mock('../hooks/useMfa', () => ({ useEstadoDoMfa: () => fontes.mfa }))
vi.mock('../hooks/useModeration', () => ({ useAdminReports: () => fontes.denuncias }))
vi.mock('../hooks/useAdminSubscriptions', () => ({ useAdminSubscriptions: () => fontes.subscricoes }))
vi.mock('../hooks/useAdminMetrics', () => ({ useAdminMetrics: () => fontes.metricas }))
vi.mock('../hooks/useAdminSecurityAlerts', () => ({ useAdminSecurityAlerts: () => fontes.alertas }))

const METRICAS: AdminMetrics = {
  usersByRole: {},
  signupsLast30Days: [],
  kycByStatus: { PENDING: 4, APPROVED: 10 },
  activeProfessionalsByProvince: [],
  serviceRequestsByStatus: { OPEN: 7 },
  avgTimeToAssignmentMinutes: null,
  avgTimeToCompletionMinutes: null,
}
const ALERTA: SecurityAlert = { groupKey: 'u1', groupType: 'user_id', attempts: 9, lastAttemptAt: '2026-10-13T10:00:00Z' }

function definir(
  metricas: Fonte<AdminMetrics>,
  alertas: Fonte<SecurityAlert[]>,
  subscricoes: Fonte<unknown[]> = pronto([]),
  denuncias: Fonte<unknown[]> = pronto([]),
) {
  fontes.denuncias = denuncias
  fontes.metricas = metricas
  fontes.alertas = alertas
  fontes.subscricoes = subscricoes
}
const pronto = <T,>(data: T): Fonte<T> => ({ data, isLoading: false, isError: false })
const aCarregar: Fonte<never> = { data: undefined, isLoading: true, isError: false }
const falhou: Fonte<never> = { data: undefined, isLoading: false, isError: true }

function mostrar() {
  render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('AdminDashboard', () => {
  it('mostra os contadores e liga cada cartão ao seu ecrã', () => {
    definir(pronto(METRICAS), pronto([ALERTA]), pronto([{}, {}]), pronto([{}, {}, {}]))
    mostrar()

    const den = screen.getByRole('link', { name: /denúncias por tratar/i })
    expect(den.textContent).toContain('3')
    expect(den.getAttribute('href')).toBe('/admin/moderacao')

    const subs = screen.getByRole('link', { name: /subscrições a expirar/i })
    expect(subs.textContent).toContain('2')
    expect(subs.getAttribute('href')).toBe('/admin/subscricoes')
    const kyc = screen.getByRole('link', { name: /verificações em análise/i })
    expect(kyc.textContent).toContain('4')
    expect(kyc.getAttribute('href')).toBe('/admin/kyc')
    expect(screen.getByRole('link', { name: /pedidos abertos/i }).textContent).toContain('7')
    const alertas = screen.getByRole('link', { name: /alertas de segurança/i })
    expect(alertas.textContent).toContain('1')
    expect(alertas.getAttribute('href')).toBe('/admin/audit-log')
  })

  it('zero pendentes é «tudo em dia», não um número', () => {
    definir(pronto({ ...METRICAS, kycByStatus: {}, serviceRequestsByStatus: {} }), pronto([]))
    mostrar()

    expect(screen.getByText('Tudo em dia')).toBeTruthy()
    expect(screen.getByText('Nenhum aberto')).toBeTruthy()
    expect(screen.getByText('Sem alertas')).toBeTruthy()
  })

  it('mostra esqueletos enquanto carrega', () => {
    definir(aCarregar, aCarregar, aCarregar, aCarregar)
    mostrar()
    expect(screen.getAllByRole('status', { name: /a carregar/i })).toHaveLength(5)
  })

  it('o erro de uma fonte não esconde a outra', () => {
    definir(falhou, pronto([ALERTA]))
    mostrar()

    expect(screen.getAllByText('Não foi possível carregar.')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /alertas de segurança/i }).textContent).toContain('1')
  })

  it('avisa o admin sem segundo factor e não alarma quem o tem', () => {
    definir(pronto(METRICAS), pronto([]))
    fontes.mfa = pronto({ temFactor: false })
    mostrar()
    expect(screen.getByRole('link', { name: /protege a tua conta/i }).getAttribute('href')).toBe('/admin/seguranca')
    cleanup()

    fontes.mfa = pronto({ temFactor: true })
    mostrar()
    expect(screen.queryByText(/protege a tua conta/i)).toBeNull()
  })

  it('oferece atalho para todos os ecrãs, incluindo Subscrições, Métricas e Auditoria', () => {
    definir(pronto(METRICAS), pronto([]))
    mostrar()

    const destinos = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((href) => href?.startsWith('/admin/'))
    for (const rota of ['/admin/kyc', '/admin/utilizadores', '/admin/pedidos-servico', '/admin/subscricoes', '/admin/moderacao', '/admin/seguranca', '/admin/metricas', '/admin/audit-log']) {
      expect(destinos).toContain(rota)
    }
  })
})
