import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/AuthContext'
import { describeAuthError } from '../lib/authErrors'

// Destino do redirectTo em requestPasswordRecovery (backend, TRD Adendo v1.7). O
// link do email aponta para cá com o token de recuperação na URL — o supabase-js
// processa-o automaticamente ao carregar a página (detectSessionInUrl, já ligado por
// default nesta app) e estabelece uma sessão real, que AuthContext capta como
// qualquer outra via onAuthStateChange. Sem ProtectedRoute de propósito: essa
// resolução é assíncrona, e um ProtectedRoute que redirecionasse para /entrar antes
// dela terminar mandaria embora um link válido — a mesma tela espera isLoading ficar
// false (igual a AuthCallback.tsx) antes de decidir se a sessão existe.
export function DefinirNovaPassword() {
  const { session, isLoading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A password tem de ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As passwords não coincidem.')
      return
    }

    setIsSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setIsSubmitting(false)

    if (updateError) {
      setError(describeAuthError(updateError))
      return
    }

    setIsDone(true)
  }

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-pulse rounded-full bg-gray-300" />
      </main>
    )
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Link inválido ou expirado</h1>
        <p className="text-sm text-gray-600">
          Este link de recuperação já não é válido. Pede um novo em "Esqueci a password" no ecrã de entrada.
        </p>
        <Link to="/entrar" className="text-sm text-gray-600 underline">
          Voltar a entrar
        </Link>
      </main>
    )
  }

  if (isDone) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Password atualizada</h1>
        <p className="text-sm text-gray-600">Já podes continuar a usar a tua conta com a nova password.</p>
        <Link to="/perfil" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          Continuar
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Definir nova password</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Nova password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Confirmar password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'A guardar...' : 'Guardar nova password'}
        </button>
      </form>
    </main>
  )
}
