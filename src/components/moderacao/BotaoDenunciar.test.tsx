import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BotaoDenunciar } from './BotaoDenunciar'

const estado = vi.hoisted(() => ({ mutate: vi.fn(), erro: vi.fn() }))
vi.mock('../../hooks/useModeration', () => ({
  useCreateReport: () => ({ mutate: estado.mutate, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { error: estado.erro, success: vi.fn() } }))

afterEach(() => {
  cleanup()
  estado.mutate.mockReset()
  estado.erro.mockReset()
})

function mostrar() {
  render(<BotaoDenunciar targetType="REVIEW" targetId="rev-1" descricao="a avaliação de Ana" />)
}

describe('BotaoDenunciar', () => {
  it('começa fechado e abre o formulário ao clicar', () => {
    mostrar()
    expect(screen.queryByText('Enviar denúncia')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Denunciar a avaliação de Ana' }))
    expect(screen.getByRole('button', { name: 'Enviar denúncia' })).toBeTruthy()
  })

  it('envia o alvo, o motivo escolhido e os detalhes sem espaços a mais', () => {
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: /denunciar/i }))
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'ABUSE' } })
    fireEvent.change(screen.getByLabelText(/detalhes/i), { target: { value: '  linguagem ofensiva  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

    expect(estado.mutate.mock.calls[0][0]).toEqual({
      target_type: 'REVIEW',
      target_id: 'rev-1',
      reason: 'ABUSE',
      details: 'linguagem ofensiva',
    })
  })

  it('depois de enviada, confirma em vez de deixar denunciar outra vez', () => {
    estado.mutate.mockImplementation((_payload, opcoes) => opcoes.onSuccess())
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: /denunciar/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

    expect(screen.getByText(/denúncia enviada/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /denunciar/i })).toBeNull()
  })

  it('mostra o erro do servidor (ex. já denunciado) e mantém o formulário', () => {
    estado.mutate.mockImplementation((_payload, opcoes) => opcoes.onError(new Error('Já denunciaste este conteúdo.')))
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: /denunciar/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

    expect(estado.erro).toHaveBeenCalledWith('Já denunciaste este conteúdo.')
    expect(screen.getByRole('button', { name: 'Enviar denúncia' })).toBeTruthy()
  })
})
