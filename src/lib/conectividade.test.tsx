import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IndicadorDeLigacao } from '../components/IndicadorDeLigacao'
import { definirNavegadorOnline, registarRespostaDoServidor, reporConectividadeParaTestes } from './conectividade'

beforeEach(() => {
  reporConectividadeParaTestes()
})
// Sem globals no vitest o RTL não limpa sozinho: o indicador do caso anterior ficava no DOM.
afterEach(cleanup)

describe('indicador de ligação', () => {
  it('não mostra nada quando está tudo ligado', () => {
    const { container } = render(<IndicadorDeLigacao />)
    expect(container.innerHTML).toBe("")
  })

  it('mostra «sem ligação» quando o navegador fica offline e esconde-o ao voltar', () => {
    render(<IndicadorDeLigacao />)

    act(() => definirNavegadorOnline(false))
    expect(screen.getByRole('status').textContent).toContain('Sem ligação à internet')

    act(() => definirNavegadorOnline(true))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('apanha o caso comum em redes móveis: navegador «online» mas o servidor não responde', () => {
    render(<IndicadorDeLigacao />)

    act(() => registarRespostaDoServidor(false))
    expect(screen.getByRole('status').textContent).toContain('Sem resposta do servidor')

    // Uma resposta qualquer (até um 4xx) prova que o servidor está vivo.
    act(() => registarRespostaDoServidor(true))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('offline prevalece sobre servidor inalcançável', () => {
    render(<IndicadorDeLigacao />)
    act(() => registarRespostaDoServidor(false))
    act(() => definirNavegadorOnline(false))
    expect(screen.getByRole('status').textContent).toContain('Sem ligação à internet')
  })

  it('ao voltar a rede deixa de assumir o servidor em baixo', () => {
    render(<IndicadorDeLigacao />)
    act(() => registarRespostaDoServidor(false))
    act(() => definirNavegadorOnline(false))
    act(() => definirNavegadorOnline(true))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('reage aos eventos reais online/offline da janela', () => {
    render(<IndicadorDeLigacao />)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByRole('status').textContent).toContain('Sem ligação à internet')
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByRole('status')).toBeNull()
  })
})
