import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { anunciarNovaVersao, reporNovaVersaoParaTestes } from '../lib/novaVersao'
import { AvisoDeNovaVersao } from './AvisoDeNovaVersao'

const NOVIDADES = {
  atualizadoEm: '2026-10-13',
  novidades: ['Pedidos guardados sem internet.', 'Aplicação mais rápida.'],
}

function simularFicheiro(corpo: unknown | Error) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (corpo instanceof Error) throw corpo
      return { ok: true, json: async () => corpo }
    }),
  )
}

beforeEach(() => {
  reporNovaVersaoParaTestes()
  simularFicheiro(NOVIDADES)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AvisoDeNovaVersao', () => {
  it('não mostra nada enquanto não houver versão nova', () => {
    const { container } = render(<AvisoDeNovaVersao />)
    expect(container.innerHTML).toBe('')
  })

  it('mostra a data e o resumo do que mudou, em linguagem simples', async () => {
    render(<AvisoDeNovaVersao />)

    act(() => anunciarNovaVersao(vi.fn()))

    expect(screen.getByRole('dialog', { name: 'Nova versão disponível' })).toBeTruthy()
    expect(await screen.findByText('Pedidos guardados sem internet.')).toBeTruthy()
    expect(screen.getByText('Aplicação mais rápida.')).toBeTruthy()
    expect(screen.getByText(/13 de outubro de 2026/)).toBeTruthy()
  })

  it('«Actualizar agora» chama a actualização', async () => {
    const aoAceitar = vi.fn()
    render(<AvisoDeNovaVersao />)
    act(() => anunciarNovaVersao(aoAceitar))

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar agora' }))

    expect(aoAceitar).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole('button', { name: /A actualizar/ })).toBeTruthy())
  })

  it('«Mais tarde» fecha o aviso sem actualizar (o que o utilizador escreve não se perde)', () => {
    const aoAceitar = vi.fn()
    render(<AvisoDeNovaVersao />)
    act(() => anunciarNovaVersao(aoAceitar))

    fireEvent.click(screen.getByRole('button', { name: 'Mais tarde' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(aoAceitar).not.toHaveBeenCalled()
  })

  it('Escape também fecha sem actualizar', () => {
    const aoAceitar = vi.fn()
    render(<AvisoDeNovaVersao />)
    act(() => anunciarNovaVersao(aoAceitar))

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(aoAceitar).not.toHaveBeenCalled()
  })

  it('o foco abre no botão principal', () => {
    render(<AvisoDeNovaVersao />)
    act(() => anunciarNovaVersao(vi.fn()))

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Actualizar agora' }))
  })

  it('o Tab não sai do aviso: do último botão volta ao primeiro, e Shift+Tab ao contrário', () => {
    render(<AvisoDeNovaVersao />)
    act(() => anunciarNovaVersao(vi.fn()))
    const principal = screen.getByRole('button', { name: 'Actualizar agora' })
    const maisTarde = screen.getByRole('button', { name: 'Mais tarde' })

    maisTarde.focus()
    fireEvent.keyDown(maisTarde, { key: 'Tab' })
    expect(document.activeElement).toBe(principal)

    fireEvent.keyDown(principal, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(maisTarde)
  })

  it('se o ficheiro de novidades falhar, o aviso aparece na mesma, sem data nem lista', async () => {
    simularFicheiro(new TypeError('Failed to fetch'))
    render(<AvisoDeNovaVersao />)

    act(() => anunciarNovaVersao(vi.fn()))

    expect(await screen.findByText(/Melhorámos a aplicação/)).toBeTruthy()
    expect(screen.queryByText(/Actualização de/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Actualizar agora' })).toBeTruthy()
  })
})
