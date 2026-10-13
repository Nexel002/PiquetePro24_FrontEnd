import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RotaDeAdmin } from './RotaDeAdmin'

const perfil = vi.hoisted(() => ({ data: undefined as { role: string } | undefined, isLoading: false }))
vi.mock('../../hooks/useProfile', () => ({ useProfile: () => perfil }))

function mostrar() {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route
          path="/admin"
          element={
            <RotaDeAdmin>
              <p>Ecrã de admin</p>
            </RotaDeAdmin>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('RotaDeAdmin', () => {
  it('mostra o ecrã a um ADMIN', () => {
    perfil.data = { role: 'ADMIN' }
    perfil.isLoading = false
    mostrar()
    expect(screen.getByText('Ecrã de admin')).toBeTruthy()
  })

  it.each(['CLIENT', 'PROFESSIONAL'])('manda %s para a Home sem montar o ecrã', (role) => {
    perfil.data = { role }
    perfil.isLoading = false
    mostrar()
    expect(screen.getByText('Home')).toBeTruthy()
    expect(screen.queryByText('Ecrã de admin')).toBeNull()
  })

  it('não decide enquanto o perfil carrega', () => {
    perfil.data = undefined
    perfil.isLoading = true
    mostrar()
    expect(screen.queryByText('Home')).toBeNull()
    expect(screen.queryByText('Ecrã de admin')).toBeNull()
  })

  it('perfil que falhou a carregar não dá acesso', () => {
    perfil.data = undefined
    perfil.isLoading = false
    mostrar()
    expect(screen.getByText('Home')).toBeTruthy()
  })
})
