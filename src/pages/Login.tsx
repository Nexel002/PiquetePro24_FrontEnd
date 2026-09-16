import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/AuthContext'

type Mode = 'sign-in' | 'sign-up'
// Backend Fase 2: registo/login suporta email ou telefone (decisão registada no
// plano do backend) — o Supabase Auth trata ambos nativamente, o frontend só decide
// qual campo mostrar.
type Channel = 'email' | 'phone'

// Traduz os erros mais comuns do Supabase Auth para mensagens compreensíveis (CLAUDE.md
// Secção 3: nunca mostrar o erro técnico cru). O rate limit de segurança do Supabase
// ("For security purposes, you can only request this after N seconds") aparece quando
// se tenta submeter o formulário mais do que uma vez em sucessão rápida — não é uma
// falha do signup em si.
function describeAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''

  if (message.includes('security purposes')) {
    return 'Aguarda alguns segundos antes de tentar novamente.'
  }
  if (message.includes('email rate limit exceeded')) {
    return 'Foram enviados demasiados emails de confirmação recentemente. Aguarda uns minutos e tenta novamente.'
  }
  if (message.includes('already registered') || message.includes('already exists')) {
    return 'Já existe uma conta com este email ou telefone. Tenta entrar em vez de criar uma nova conta.'
  }
  if (message.includes('Invalid login credentials')) {
    return 'Email/telefone ou palavra-passe incorretos.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Ainda não confirmaste o teu email. Verifica a caixa de entrada antes de entrares.'
  }
  if (message.includes('Phone not confirmed')) {
    return 'Ainda não confirmaste o teu telefone. Verifica o SMS recebido antes de entrares.'
  }

  return message || 'Não foi possível autenticar. Tenta novamente.'
}

export function Login() {
  const { session, isLoading: isSessionLoading } = useAuth()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [channel, setChannel] = useState<Channel>('email')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isSessionLoading && session) {
    return <Navigate to="/perfil" replace />
  }

  // Troca de canal ou de modo (entrar <-> criar conta) limpa mensagens antigas — uma
  // mensagem de sucesso do signup anterior não deve continuar visível depois de o
  // utilizador mudar de ideias e ir tentar entrar em vez disso.
  function resetFeedback() {
    setError(null)
    setSuccessMessage(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      if (mode === 'sign-up') {
        // full_name e phone vão em raw_user_meta_data: a trigger on_auth_user_created
        // do backend (Fase 2) lê daqui para criar users_profile atomicamente — sem
        // isto o insert falha porque full_name/phone são NOT NULL (mesmo no signup por
        // email, que não tem número de telefone próprio em auth.users).
        const metadata = { full_name: fullName, phone: channel === 'phone' ? identifier : phone }
        const { data, error: signUpError } =
          channel === 'email'
            ? await supabase.auth.signUp({ email: identifier, password, options: { data: metadata } })
            : await supabase.auth.signUp({ phone: identifier, password, options: { data: metadata } })

        if (signUpError) throw signUpError

        // O Supabase devolve 200 sem erro tanto quando a conta fica ativa de imediato
        // (data.session preenchida) como quando fica a aguardar confirmação por
        // email/SMS (data.session null) — sem distinguir os dois, o utilizador via a
        // tela ficar "parada" sem perceber que a conta foi criada mas precisa de
        // confirmar antes de conseguir entrar.
        if (!data.session) {
          setSuccessMessage(
            channel === 'email'
              ? 'Conta criada. Verifica o teu email para confirmar antes de entrares.'
              : 'Conta criada. Verifica o teu telefone para confirmar antes de entrares.',
          )
        }
      } else {
        const { error: signInError } =
          channel === 'email'
            ? await supabase.auth.signInWithPassword({ email: identifier, password })
            : await supabase.auth.signInWithPassword({ phone: identifier, password })

        if (signInError) throw signInError
      }
    } catch (caught) {
      setError(describeAuthError(caught))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">PiquetePro24</h1>
        <p className="text-sm text-gray-600">
          {mode === 'sign-in' ? 'Entra na tua conta' : 'Cria a tua conta'}
        </p>
      </header>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setChannel('email')
            resetFeedback()
          }}
          className={`rounded-lg px-3 py-1.5 ${channel === 'email' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => {
            setChannel('phone')
            resetFeedback()
          }}
          className={`rounded-lg px-3 py-1.5 ${channel === 'phone' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Telefone
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === 'sign-up' && (
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Nome completo
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {channel === 'email' ? 'Email' : 'Telefone'}
          <input
            type={channel === 'email' ? 'email' : 'tel'}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder={channel === 'phone' ? '+258840000000' : undefined}
            required
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        {mode === 'sign-up' && channel === 'email' && (
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Telefone
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+258840000000"
              required
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Palavra-passe
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
        {successMessage && (
          <p role="status" className="text-sm text-green-700">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? mode === 'sign-in'
              ? 'A entrar...'
              : 'A criar conta...'
            : mode === 'sign-in'
              ? 'Entrar'
              : 'Criar conta'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
          resetFeedback()
        }}
        className="text-sm text-gray-600 underline"
      >
        {mode === 'sign-in' ? 'Ainda não tens conta? Cria uma' : 'Já tens conta? Entra'}
      </button>
    </main>
  )
}
