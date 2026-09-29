import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaymentTransaction, SubscriptionSummary } from '../services/subscriptions'
import { Subscription } from './Subscription'

// Hooks simulados: testa-se o que o ecrã mostra para cada resumo de GET /subscriptions
// (Backend TRD Adendo v1.12) e o que envia ao iniciar o pagamento.
const estado = vi.hoisted(() => ({
  resumo: undefined as SubscriptionSummary | undefined,
  mutate: undefined as unknown as ReturnType<typeof vi.fn>,
}))

vi.mock('../hooks/useSubscription', () => ({
  useMySubscription: () => ({ data: estado.resumo, isLoading: false, isError: false }),
  useInitiateSubscription: () => ({ mutate: estado.mutate, isPending: false }),
}))

function resumo(overrides: Partial<SubscriptionSummary> = {}): SubscriptionSummary {
  return {
    status: 'INACTIVE',
    valid_until: null,
    latest_transaction: null,
    plan: { amount: 800, currency: 'MZN', duration_days: 30 },
    payments_available: true,
    gateways: ['MPESA_MOCK', 'EMOLA_MOCK'],
    kyc_approved: true,
    ...overrides,
  }
}

function transacao(overrides: Partial<PaymentTransaction>): PaymentTransaction {
  return {
    id: 'tx-1',
    subscription_id: 'sub-1',
    professional_id: 'pro-1',
    gateway: 'MPESA_MOCK',
    payer_phone: '258841234567',
    amount: 800,
    status: 'CONFIRMED',
    provider_reference: null,
    created_at: '2026-09-29T10:00:00.000Z',
    confirmed_at: '2026-09-29T10:00:05.000Z',
    ...overrides,
  }
}

function mostrar(summary: SubscriptionSummary) {
  estado.resumo = summary
  render(
    <MemoryRouter>
      <Subscription />
    </MemoryRouter>,
  )
}

const botaoPagar = () => screen.queryByRole('button', { name: /^Pagar/ })

beforeEach(() => {
  estado.mutate = vi.fn()
})
afterEach(cleanup)

describe('Subscription — os três estados', () => {
  it('INACTIVE: "Inativa", explica que é precisa para aceitar pedidos, formulário de pagamento', () => {
    mostrar(resumo())

    expect(screen.getByText('Inativa')).toBeTruthy()
    expect(screen.getByText(/Precisas de uma subscrição ativa para aceitar pedidos/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pagar 800,00 MZN' })).toBeTruthy()
  })

  it('ACTIVE: "Ativa" com a data de fim, e o formulário passa a renovação antecipada', () => {
    mostrar(resumo({ status: 'ACTIVE', valid_until: '2026-10-29T10:00:05.000Z', latest_transaction: transacao({}) }))

    expect(screen.getByText('Ativa')).toBeTruthy()
    expect(screen.getByText('Válida até 29 de outubro de 2026.')).toBeTruthy()
    expect(screen.getByText('Renovar antecipadamente')).toBeTruthy()
    expect(screen.getByText(/somam-se aos que ainda tens/)).toBeTruthy()
  })

  it('EXPIRED: "Expirada", pede para renovar e mostra o formulário', () => {
    mostrar(resumo({ status: 'EXPIRED', latest_transaction: transacao({}) }))

    expect(screen.getByText('Expirada')).toBeTruthy()
    expect(screen.getByText(/A tua subscrição expirou. Renova-a/)).toBeTruthy()
    expect(botaoPagar()).toBeTruthy()
  })
})

describe('Subscription — o que bloqueia o pagamento, pela ordem', () => {
  it('sem KYC aprovado: manda para a verificação e não mostra o formulário', () => {
    mostrar(resumo({ kyc_approved: false }))

    expect(screen.getByText('Primeiro, a verificação de identidade')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir para a verificação de identidade' }).getAttribute('href')).toBe(
      '/verificacao-identidade',
    )
    expect(botaoPagar()).toBeNull()
  })

  it('pagamento PENDING: a aguardar confirmação, com o telefone com um só "+"', () => {
    mostrar(resumo({ latest_transaction: transacao({ status: 'PENDING', confirmed_at: null }) }))

    expect(screen.getByText('A aguardar confirmação do pagamento')).toBeTruthy()
    expect(screen.getByText(/\+258841234567/)).toBeTruthy()
    expect(screen.queryByText(/\+\+258/)).toBeNull()
    expect(botaoPagar()).toBeNull()
  })

  it('sem gateway (produção): explica que a ativação é feita pela equipa', () => {
    mostrar(resumo({ payments_available: false, gateways: [] }))

    expect(screen.getByText('Pagamento online ainda indisponível')).toBeTruthy()
    expect(botaoPagar()).toBeNull()
  })

  it('último pagamento FAILED: avisa e deixa tentar outra vez', () => {
    mostrar(resumo({ latest_transaction: transacao({ status: 'FAILED', confirmed_at: null }) }))

    expect(screen.getByRole('alert').textContent).toContain('O último pagamento não foi concluído')
    expect(botaoPagar()).toBeTruthy()
  })
})

describe('Subscription — formulário de pagamento', () => {
  function preencher(gateway: 'MPESA_MOCK' | 'EMOLA_MOCK', digitos: string) {
    fireEvent.click(screen.getByDisplayValue(gateway))
    fireEvent.change(screen.getByPlaceholderText('841234567'), { target: { value: digitos } })
    fireEvent.click(botaoPagar()!)
  }

  it('e-Mola com número Vodacom: erro no ecrã e nenhum pedido', () => {
    mostrar(resumo())
    preencher('EMOLA_MOCK', '841234567')

    expect(screen.getByText('O e-Mola só aceita números Movitel (86 ou 87).')).toBeTruthy()
    expect(estado.mutate).not.toHaveBeenCalled()
  })

  it('número incompleto: erro no ecrã e nenhum pedido', () => {
    mostrar(resumo())
    preencher('MPESA_MOCK', '8412')

    expect(screen.getByText(/Indica os 9 dígitos/)).toBeTruthy()
    expect(estado.mutate).not.toHaveBeenCalled()
  })

  it('M-Pesa com número Vodacom: envia só os 9 dígitos locais e o gateway', () => {
    mostrar(resumo())
    preencher('MPESA_MOCK', '84 123 4567')

    expect(estado.mutate).toHaveBeenCalledTimes(1)
    expect(estado.mutate.mock.calls[0][0]).toEqual({ gateway: 'MPESA_MOCK', phone: '841234567' })
  })
})
