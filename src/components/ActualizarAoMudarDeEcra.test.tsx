import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActualizarAoMudarDeEcra } from './ActualizarAoMudarDeEcra'

const versao = vi.hoisted(() => ({ aplicarSePendente: vi.fn() }))
vi.mock('../lib/novaVersao', () => versao)

afterEach(cleanup)

function montar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ActualizarAoMudarDeEcra />
      <Routes>
        <Route path="/" element={<Link to="/perfil">Perfil</Link>} />
        <Route path="/perfil" element={<p>Perfil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ActualizarAoMudarDeEcra', () => {
  it('ao abrir não aplica nada (o arranque é tratado em lib/novaVersao)', () => {
    montar()

    expect(versao.aplicarSePendente).not.toHaveBeenCalled()
  })

  it('na mudança de ecrã aplica a versão nova, se houver uma à espera', () => {
    montar()

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))

    expect(versao.aplicarSePendente).toHaveBeenCalledTimes(1)
  })
})
