import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'

const authState = vi.hoisted(() => ({ session: null as unknown, isLoading: false }))
vi.mock('../store/AuthContext', () => ({
  useAuth: () => ({ session: authState.session, isLoading: authState.isLoading }),
}))

// Mostra para onde a navegação foi parar, incluindo a pesquisa do URL.
function LocalAtual() {
  const { pathname, search } = useLocation()
  return <p>{`${pathname}${search}`}</p>
}

function mostrar(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/entrar" element={<LocalAtual />} />
        <Route
          path="/profissionais"
          element={
            <ProtectedRoute>
              <p>Conteúdo protegido</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('ProtectedRoute', () => {
  it('sem sessão manda para o login levando o destino (cartão tocado na Home)', () => {
    authState.session = null

    mostrar('/profissionais?category=canalizacao')

    expect(screen.getByText('/entrar?next=%2Fprofissionais%3Fcategory%3Dcanalizacao')).toBeTruthy()
  })

  it('com sessão mostra o conteúdo', () => {
    authState.session = { user: { id: 'u1' } }

    mostrar('/profissionais')

    expect(screen.getByText('Conteúdo protegido')).toBeTruthy()
  })
})
