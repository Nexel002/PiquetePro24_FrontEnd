import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/AuthContext'

type Mode = 'sign-in' | 'sign-up'
// Backend Fase 2: registo/login suporta email ou telefone (decisão registada no
// plano do backend) — o Supabase Auth trata ambos nativamente, o frontend só decide
// qual campo mostrar.
type Channel = 'email' | 'phone'
type IntendedRole = 'CLIENT' | 'PROFESSIONAL'

// Chave usada para guardar a escolha "Sou Profissional" ANTES do redirect para o
// Google — signInWithOAuth não permite passar metadata customizado (diferente de
// signUp, que aceita options.data), por isso a escolha tem de sobreviver ao
// round-trip inteiro do OAuth via sessionStorage, e é lida em AuthCallback.tsx depois
// do login completar, para chamar POST /profile/become-professional.
export const INTENDED_ROLE_STORAGE_KEY = 'piquetepro24:intended-role'

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
  const [intendedRole, setIntendedRole] = useState<IntendedRole>('CLIENT')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRedirectingToGoogle, setIsRedirectingToGoogle] = useState(false)

  if (!isSessionLoading && session) {
    return <Navigate to="/perfil" replace />
  }

  // signInWithOAuth redireciona o browser inteiro para o Google — o error devolvido
  // aqui só cobre falhas antes do redirect (ex. provider Google desativado no
  // Supabase), nunca um "login falhou" no sentido normal (isso acontece do lado do
  // Google, fora do nosso controlo). Depois de autorizar, o Google devolve o
  // utilizador a /auth/callback (ver App.tsx).
  async function handleGoogleSignIn() {
    setError(null)
    setIsRedirectingToGoogle(true)
    // A escolha só é relevante em modo sign-up: entrar com uma conta Google já
    // existente não deve poder mudar o role de quem já é CLIENT (ou já é
    // PROFESSIONAL) — só um signup novo decide o role de origem.
    if (mode === 'sign-up') {
      sessionStorage.setItem(INTENDED_ROLE_STORAGE_KEY, intendedRole)
    } else {
      sessionStorage.removeItem(INTENDED_ROLE_STORAGE_KEY)
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) {
      setError(describeAuthError(oauthError))
      setIsRedirectingToGoogle(false)
    }
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
        // full_name, phone e role vão em raw_user_meta_data: a trigger
        // on_auth_user_created do backend (Fase 2) lê daqui para criar users_profile
        // atomicamente — sem full_name/phone o insert falha (NOT NULL); role sem
        // valor reconhecido cai em CLIENT (a trigger só aceita 'PROFESSIONAL'
        // explícito, nunca 'ADMIN' vindo do próprio signup).
        const metadata = {
          full_name: fullName,
          phone: channel === 'phone' ? identifier : phone,
          role: intendedRole,
        }
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

      {mode === 'sign-up' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-gray-700">Como vais usar o PiquetePro24?</legend>
          <div className="flex gap-2 text-sm">
            <label
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center ${
                intendedRole === 'CLIENT'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              <input
                type="radio"
                name="intended-role"
                value="CLIENT"
                checked={intendedRole === 'CLIENT'}
                onChange={() => setIntendedRole('CLIENT')}
                className="sr-only"
              />
              Sou cliente
            </label>
            <label
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center ${
                intendedRole === 'PROFESSIONAL'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              <input
                type="radio"
                name="intended-role"
                value="PROFESSIONAL"
                checked={intendedRole === 'PROFESSIONAL'}
                onChange={() => setIntendedRole('PROFESSIONAL')}
                className="sr-only"
              />
              Sou profissional
            </label>
          </div>
        </fieldset>
      )}

      <button
        type="button"
        onClick={() => void handleGoogleSignIn()}
        disabled={isRedirectingToGoogle}
        className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
      >
        {isRedirectingToGoogle ? 'A abrir o Google...' : 'Continuar com Google'}
      </button>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        ou
        <span className="h-px flex-1 bg-gray-200" />
      </div>

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
