import { act, cleanup, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'

// TRD Adendo v1.71, item S3: ao sair, ou ao entrar outra pessoa no mesmo aparelho, as respostas
// guardadas pelo React Query para a sessão anterior não podem ficar à vista.

type Ouvinte = (evento: string, sessao: { user: { id: string } } | null) => void

const estado = vi.hoisted(() => ({ ouvinte: null as Ouvinte | null, sessaoInicial: null as unknown }))
const supabase = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: estado.sessaoInicial } })),
    onAuthStateChange: vi.fn((ouvinte: Ouvinte) => {
      estado.ouvinte = ouvinte
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }),
    signOut: vi.fn(),
  },
}))

vi.mock('../lib/supabase', () => ({ supabase }))

const sessaoDe = (id: string) => ({ user: { id } })

async function montar(sessaoInicial: unknown) {
  estado.sessaoInicial = sessaoInicial
  const queryClient = new QueryClient()
  queryClient.setQueryData(['profile'], { full_name: 'Ana' })
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <span />
      </AuthProvider>
    </QueryClientProvider>,
  )
  await waitFor(() => expect(supabase.auth.getSession).toHaveBeenCalled())
  // Deixa o getSession() resolver antes de disparar eventos, como na app real.
  await act(async () => {})
  return queryClient
}

function emitir(evento: string, sessao: { user: { id: string } } | null) {
  act(() => estado.ouvinte?.(evento, sessao))
}

beforeEach(() => {
  estado.ouvinte = null
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AuthProvider — dados da sessão anterior', () => {
  it('ao terminar sessão, apaga as respostas guardadas', async () => {
    const queryClient = await montar(sessaoDe('ana'))

    emitir('SIGNED_OUT', null)

    expect(queryClient.getQueryData(['profile'])).toBeUndefined()
  })

  it('outra pessoa a entrar no mesmo aparelho também apaga', async () => {
    const queryClient = await montar(sessaoDe('ana'))

    emitir('SIGNED_IN', sessaoDe('bruno'))

    expect(queryClient.getQueryData(['profile'])).toBeUndefined()
  })

  it('a mesma pessoa a renovar o token não perde nada', async () => {
    const queryClient = await montar(sessaoDe('ana'))

    emitir('TOKEN_REFRESHED', sessaoDe('ana'))
    emitir('SIGNED_IN', sessaoDe('ana'))

    expect(queryClient.getQueryData(['profile'])).toEqual({ full_name: 'Ana' })
  })

  it('primeiro login no aparelho (sem sessão antes) não apaga o que já se carregou', async () => {
    const queryClient = await montar(null)

    emitir('SIGNED_IN', sessaoDe('ana'))

    expect(queryClient.getQueryData(['profile'])).toEqual({ full_name: 'Ana' })
  })
})
