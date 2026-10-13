import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RotaDeAdmin } from './RotaDeAdmin'

const perfil = vi.hoisted(() => ({ data: undefined as { role: string } | undefined, isLoading: false }))
const mfa = vi.hoisted(() => ({
  data: { temFactor: false, factorId: null, nivelAtual: 'aal1' } as { temFactor: boolean; factorId: string | null; nivelAtual: string | null } | undefined,
  isLoading: false,
  isError: false,
  opcoes: [] as unknown[],
}))
vi.mock('../../hooks/useProfile', () => ({ useProfile: () => perfil }))
vi.mock('../../hooks/useMfa', () => ({
  useEstadoDoMfa: (opcoes: unknown) => {
    mfa.opcoes.push(opcoes)
    return mfa
  },
}))
// O desafio tem teste próprio; aqui só interessa quando aparece.
vi.mock('./DesafioMfa', () => ({ DesafioMfa: ({ factorId }: { factorId: string }) => <p>Desafio {factorId}</p> }))

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

function comoAdmin() {
  perfil.data = { role: 'ADMIN' }
  perfil.isLoading = false
}

afterEach(() => {
  cleanup()
  mfa.data = { temFactor: false, factorId: null, nivelAtual: 'aal1' }
  mfa.isLoading = false
  mfa.isError = false
  mfa.opcoes = []
})

describe('RotaDeAdmin — papel', () => {
  it('mostra o ecrã a um ADMIN', () => {
    comoAdmin()
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

  it('só consulta o estado do MFA para quem é admin', () => {
    perfil.data = { role: 'CLIENT' }
    perfil.isLoading = false
    mostrar()
    expect(mfa.opcoes.at(-1)).toEqual({ enabled: false })
  })
})

describe('RotaDeAdmin — verificação em dois passos', () => {
  it('admin sem segundo factor entra (o aviso para o ativar está no painel)', () => {
    comoAdmin()
    mostrar()
    expect(screen.getByText('Ecrã de admin')).toBeTruthy()
  })

  it('admin com factor mas sessão aal1 vê o desafio e não o ecrã', () => {
    comoAdmin()
    mfa.data = { temFactor: true, factorId: 'f1', nivelAtual: 'aal1' }
    mostrar()

    expect(screen.getByText('Desafio f1')).toBeTruthy()
    expect(screen.queryByText('Ecrã de admin')).toBeNull()
  })

  it('admin com factor e sessão aal2 entra', () => {
    comoAdmin()
    mfa.data = { temFactor: true, factorId: 'f1', nivelAtual: 'aal2' }
    mostrar()
    expect(screen.getByText('Ecrã de admin')).toBeTruthy()
  })

  it('enquanto lê o estado do MFA não mostra o ecrã nem o desafio', () => {
    comoAdmin()
    mfa.data = undefined
    mfa.isLoading = true
    mostrar()
    expect(screen.queryByText('Ecrã de admin')).toBeNull()
    expect(screen.queryByText(/Desafio/)).toBeNull()
  })

  it('se o estado do MFA não puder ser lido, deixa o backend decidir (não tranca o painel)', () => {
    comoAdmin()
    mfa.data = undefined
    mfa.isError = true
    mostrar()
    expect(screen.getByText('Ecrã de admin')).toBeTruthy()
  })
})
