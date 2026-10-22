import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaginaInicial } from './PaginaInicial'

const auth = vi.hoisted(() => ({ valor: { session: null as unknown, isLoading: false } }))

vi.mock('../store/AuthContext', () => ({ useAuth: () => auth.valor }))
vi.mock('./Home', () => ({ Home: () => <p>ecrã da Home</p> }))
vi.mock('./Landing', () => ({ Landing: () => <p>ecrã da landing</p> }))

afterEach(cleanup)

const mostrar = () =>
  render(
    <MemoryRouter>
      <PaginaInicial />
    </MemoryRouter>,
  )

describe('PaginaInicial', () => {
  it('visitante sem sessão vê a landing', async () => {
    auth.valor = { session: null, isLoading: false }
    mostrar()
    expect(await screen.findByText('ecrã da landing')).toBeTruthy()
    expect(screen.queryByText('ecrã da Home')).toBeNull()
  })

  it('quem tem sessão vê a Home, sem passar pela landing', () => {
    auth.valor = { session: { user: { id: 'u1' } }, isLoading: false }
    mostrar()
    expect(screen.getByText('ecrã da Home')).toBeTruthy()
    expect(screen.queryByText('ecrã da landing')).toBeNull()
  })

  it('enquanto a sessão se lê, mostra o esqueleto e nenhum dos dois ecrãs', () => {
    auth.valor = { session: null, isLoading: true }
    mostrar()
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.queryByText('ecrã da landing')).toBeNull()
    expect(screen.queryByText('ecrã da Home')).toBeNull()
  })
})
