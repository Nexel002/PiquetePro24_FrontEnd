import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { BackButton } from './BackButton'

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '')
})

function Local() {
  return <p data-testid="local">{useLocation().pathname}</p>
}

function Ecra({ destino }: { destino?: string }) {
  const navegar = useNavigate()
  return (
    <>
      <Local />
      <BackButton destinoSemHistorico={destino} />
      <button type="button" onClick={() => navegar('/b')}>
        Ir para B
      </button>
    </>
  )
}

function mostrar(destino?: string) {
  render(
    <MemoryRouter initialEntries={['/a']}>
      <Routes>
        <Route path="*" element={<Ecra destino={destino} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BackButton', () => {
  it('sem ecrã anterior nesta app, vai para o destino indicado', () => {
    mostrar('/inicio')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByTestId('local').textContent).toBe('/inicio')
  })

  it('com ecrã anterior, volta a ele em vez de ir para o destino', () => {
    mostrar('/inicio')
    fireEvent.click(screen.getByRole('button', { name: 'Ir para B' }))
    // O BrowserRouter escreve a posição na pilha em `history.state.idx`; o MemoryRouter não,
    // por isso simula-se aqui o que o browser teria depois de navegar.
    window.history.replaceState({ idx: 1 }, '')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByTestId('local').textContent).toBe('/a')
  })
})
