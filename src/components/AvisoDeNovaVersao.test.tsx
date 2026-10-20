import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AvisoDeNovaVersao } from './AvisoDeNovaVersao'

const NOVIDADES = {
  atualizadoEm: '2026-10-13',
  novidades: ['Pedidos guardados sem internet.', 'Aplicação mais rápida.'],
}

const novidades = vi.hoisted(() => ({ porMostrar: vi.fn(), marcarVistas: vi.fn() }))
vi.mock('../lib/novidades', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/novidades')>()),
  novidadesPorMostrar: novidades.porMostrar,
  marcarNovidadesVistas: novidades.marcarVistas,
}))

beforeEach(() => {
  novidades.porMostrar.mockReset().mockReturnValue(NOVIDADES)
  novidades.marcarVistas.mockReset()
})
afterEach(cleanup)

describe('AvisoDeNovaVersao — depois de a app se actualizar sozinha', () => {
  it('sem novidades por mostrar não mostra nada', () => {
    novidades.porMostrar.mockReturnValue(null)

    const { container } = render(<AvisoDeNovaVersao />)

    expect(container.innerHTML).toBe('')
  })

  it('diz que a app foi actualizada, com a data e o que mudou', () => {
    render(<AvisoDeNovaVersao />)

    expect(screen.getByRole('dialog', { name: 'A app foi actualizada' })).toBeTruthy()
    expect(screen.getByText('Pedidos guardados sem internet.')).toBeTruthy()
    expect(screen.getByText('Aplicação mais rápida.')).toBeTruthy()
    expect(screen.getByText(/13 de outubro de 2026/)).toBeTruthy()
  })

  it('só informa: não há botão para autorizar a actualização', () => {
    render(<AvisoDeNovaVersao />)

    expect(screen.queryByRole('button', { name: /Actualizar agora|Mais tarde/ })).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('«Continuar» fecha o aviso e marca as novidades como vistas', () => {
    render(<AvisoDeNovaVersao />)

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(novidades.marcarVistas).toHaveBeenCalledTimes(1)
  })

  it('Escape também fecha e marca como vistas', () => {
    render(<AvisoDeNovaVersao />)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(novidades.marcarVistas).toHaveBeenCalledTimes(1)
  })

  it('o foco abre no botão, e o Tab não sai do aviso', () => {
    render(<AvisoDeNovaVersao />)
    const continuar = screen.getByRole('button', { name: 'Continuar' })

    expect(document.activeElement).toBe(continuar)
    fireEvent.keyDown(continuar, { key: 'Tab' })
    expect(document.activeElement).toBe(continuar)
  })
})
