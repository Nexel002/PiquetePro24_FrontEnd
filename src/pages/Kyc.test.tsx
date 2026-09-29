import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProfessionalKyc } from '../services/kyc'
import { Kyc } from './Kyc'

// Os hooks do TanStack Query são simulados: o que se testa aqui é o que o ecrã mostra
// em cada estado da verificação, não o pedido de rede.
const estadoKyc = vi.hoisted(() => ({
  atual: { data: undefined, isLoading: false, isError: false } as {
    data: Partial<ProfessionalKyc> | null | undefined
    isLoading: boolean
    isError: boolean
  },
}))

vi.mock('../hooks/useKyc', () => ({
  useOwnKyc: () => estadoKyc.atual,
  useSubmitKyc: () => ({ mutate: vi.fn(), isPending: false }),
}))

function mostrar(data: Partial<ProfessionalKyc> | null | undefined, extra: { isLoading?: boolean; isError?: boolean } = {}) {
  estadoKyc.atual = { data, isLoading: false, isError: false, ...extra }
  render(
    <MemoryRouter>
      <Kyc />
    </MemoryRouter>,
  )
}

const formularioVisivel = () => screen.queryByRole('button', { name: 'Submeter documentos' }) !== null

afterEach(cleanup)

describe('Kyc — estados da verificação', () => {
  it('sem submissão: mostra o formulário e nenhum estado', () => {
    mostrar(null)

    expect(formularioVisivel()).toBe(true)
    expect(screen.queryByText('Estado da submissão')).toBeNull()
  })

  it('PENDING: "Em análise", sem formulário', () => {
    mostrar({ status: 'PENDING', review_notes: null })

    expect(screen.getByText('Em análise')).toBeTruthy()
    expect(screen.getByText(/estão a ser revistos por um administrador/)).toBeTruthy()
    expect(formularioVisivel()).toBe(false)
  })

  it('APPROVED: "Aprovado", aponta para a subscrição (não diz que já pode aceitar pedidos), sem formulário', () => {
    mostrar({ status: 'APPROVED', review_notes: null })

    expect(screen.getByText('Aprovado')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver subscrição' }).getAttribute('href')).toBe('/subscricao')
    expect(screen.queryByText(/já podes aceitar pedidos/i)).toBeNull()
    expect(formularioVisivel()).toBe(false)
  })

  it('REJECTED: "Rejeitado" com o motivo, e o formulário para submeter de novo', () => {
    mostrar({ status: 'REJECTED', review_notes: 'Foto do BI ilegível' })

    expect(screen.getByText('Rejeitado')).toBeTruthy()
    expect(screen.getByText('Motivo: Foto do BI ilegível')).toBeTruthy()
    expect(formularioVisivel()).toBe(true)
  })

  it('erro ao carregar: mensagem compreensível, sem formulário nem estado', () => {
    mostrar(undefined, { isError: true })

    expect(screen.getByText(/Não foi possível carregar o estado da tua verificação/)).toBeTruthy()
    expect(formularioVisivel()).toBe(false)
    expect(screen.queryByText('Estado da submissão')).toBeNull()
  })
})
