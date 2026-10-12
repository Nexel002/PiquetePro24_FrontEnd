import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErroDeEcra, ErroDeEcraPorRota } from './ErroDeEcra'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Quebrado(): never {
  throw new Error('falhou a carregar')
}

describe('ErroDeEcra', () => {
  it('mostra o conteúdo quando nada falha', () => {
    render(
      <ErroDeEcra>
        <p>ecrã normal</p>
      </ErroDeEcra>,
    )
    expect(screen.getByText('ecrã normal')).toBeTruthy()
  })

  it('em vez de uma página em branco, mostra uma mensagem sem termos técnicos e uma saída', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErroDeEcra>
        <Quebrado />
      </ErroDeEcra>,
    )

    expect(screen.getByRole('alert').textContent).toContain('Não foi possível abrir este ecrã')
    expect(screen.queryByText(/falhou a carregar/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeTruthy()
  })

  it('«Tentar de novo» recarrega a página', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const recarregar = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload: recarregar } as Location)
    render(
      <ErroDeEcra>
        <Quebrado />
      </ErroDeEcra>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(recarregar).toHaveBeenCalledTimes(1)
  })

  it('o erro de um ecrã não fica preso: ao navegar para outro, o aviso desaparece', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Ir() {
      const navegar = useNavigate()
      return <button onClick={() => navegar('/bom')}>ir</button>
    }
    render(
      <MemoryRouter initialEntries={['/mau']}>
        <ErroDeEcraPorRota>
          <Routes>
            <Route path="/mau" element={<Quebrado />} />
            <Route path="/bom" element={<p>ecrã bom</p>} />
          </Routes>
        </ErroDeEcraPorRota>
        <Ir />
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toBeTruthy()

    fireEvent.click(screen.getByText('ir'))

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('ecrã bom')).toBeTruthy()
  })
})
