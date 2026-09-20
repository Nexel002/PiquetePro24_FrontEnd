import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/AuthContext'
import { sendWelcomeNotification } from '../services/notifications'
import { requestPasswordRecovery } from '../services/passwordRecovery'
import { describeAuthError } from '../lib/authErrors'

type Mode = 'sign-in' | 'sign-up'
// Backend Fase 2: registo/login suporta email ou telefone (decisão registada no
// plano do backend) — o Supabase Auth trata ambos nativamente, o frontend só decide
// qual campo mostrar.
type Channel = 'email' | 'phone'
type IntendedRole = 'CLIENT' | 'PROFESSIONAL'
// Espelha o enum professional_type do backend
// (20260916155516_tipo_profissional_singular_empresa.sql). Só perguntado quando
// intendedRole === 'PROFESSIONAL' — ideia surgida depois da escolha Cliente/
// Profissional já estar implementada (TRD Adendo v1.4, item F): um profissional pode
// ser pessoa singular ou empresa, e isso é perguntado logo no registo, não só na Fase
// 4 (KYC, que tratará os dois tipos de forma diferenciada).
type IntendedProfessionalType = 'SINGULAR' | 'COMPANY'

// Chave usada para guardar a escolha "Sou Profissional" ANTES do redirect para o
// Google — signInWithOAuth não permite passar metadata customizado (diferente de
// signUp, que aceita options.data), por isso a escolha tem de sobreviver ao
// round-trip inteiro do OAuth via sessionStorage, e é lida em AuthCallback.tsx depois
// do login completar, para chamar POST /profile/become-professional.
export const INTENDED_ROLE_STORAGE_KEY = 'piquetepro24:intended-role'
// Mesma razão que INTENDED_ROLE_STORAGE_KEY, para a sub-escolha Singular/Empresa —
// só é gravada quando intendedRole é PROFESSIONAL (ver handleGoogleSignIn).
export const INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY = 'piquetepro24:intended-professional-type'

export function Login() {
  const { session, isLoading: isSessionLoading } = useAuth()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [channel, setChannel] = useState<Channel>('email')
  const [intendedRole, setIntendedRole] = useState<IntendedRole>('CLIENT')
  const [intendedProfessionalType, setIntendedProfessionalType] =
    useState<IntendedProfessionalType>('SINGULAR')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRedirectingToGoogle, setIsRedirectingToGoogle] = useState(false)

  // Ecrã "Esqueci a password" — estado à parte do formulário principal, mostrado no
  // lugar dele (não um modal) quando showRecovery é true. Só disponível no canal
  // email: o backend gera o link via supabase.auth.admin.generateLink({ type:
  // 'recovery' }), que exige um endereço de email (ver TRD Adendo v1.7 do backend).
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const [isSubmittingRecovery, setIsSubmittingRecovery] = useState(false)

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
      if (intendedRole === 'PROFESSIONAL') {
        sessionStorage.setItem(INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY, intendedProfessionalType)
      } else {
        sessionStorage.removeItem(INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY)
      }
    } else {
      sessionStorage.removeItem(INTENDED_ROLE_STORAGE_KEY)
      sessionStorage.removeItem(INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY)
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
          // Só faz sentido quando role é PROFESSIONAL — a trigger do backend
          // (handle_new_user()) ignora este campo em qualquer outro caso.
          professional_type: intendedRole === 'PROFESSIONAL' ? intendedProfessionalType : undefined,
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
        } else {
          // Só faz sentido chamar isto quando há sessão imediata: sem ela ainda não
          // há token para o interceptor de lib/api.ts injetar (ver TRD Adendo v1.7 do
          // backend — limitação conhecida quando o projeto exige confirmação de
          // email antes de emitir sessão). Sem await/toast: uma falha aqui não pode
          // parecer que o signup em si falhou, e o endpoint é idempotente.
          void sendWelcomeNotification().catch(() => {})
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

  // A mensagem de sucesso é sempre a que o backend devolveu (anti-enumeração, ver
  // services/passwordRecovery.ts) — um erro real (rede, 400, 429 de rate limit)
  // aparece à parte, nunca disfarçado de sucesso.
  async function handleRecoverySubmit(event: FormEvent) {
    event.preventDefault()
    setRecoveryError(null)
    setRecoveryMessage(null)
    setIsSubmittingRecovery(true)

    try {
      const message = await requestPasswordRecovery(recoveryEmail)
      setRecoveryMessage(message)
    } catch (caught) {
      setRecoveryError(caught instanceof Error ? caught.message : 'Não foi possível pedir a recuperação. Tenta novamente.')
    } finally {
      setIsSubmittingRecovery(false)
    }
  }

  if (showRecovery) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
        <header>
          <h1 className="text-2xl font-semibold text-gray-900">Recuperar password</h1>
          <p className="text-sm text-gray-600">Indica o teu email para receberes um link de recuperação.</p>
        </header>

        <form onSubmit={(event) => void handleRecoverySubmit(event)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Email
            <input
              type="email"
              value={recoveryEmail}
              onChange={(event) => setRecoveryEmail(event.target.value)}
              required
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          {recoveryError && (
            <p role="alert" className="text-sm text-red-600">
              {recoveryError}
            </p>
          )}
          {recoveryMessage && (
            <p role="status" className="text-sm text-green-700">
              {recoveryMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmittingRecovery}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmittingRecovery ? 'A enviar...' : 'Enviar link de recuperação'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setShowRecovery(false)
            setRecoveryError(null)
            setRecoveryMessage(null)
          }}
          className="text-sm text-gray-600 underline"
        >
          Voltar a entrar
        </button>
      </main>
    )
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

      {mode === 'sign-up' && intendedRole === 'PROFESSIONAL' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-gray-700">
            És profissional singular ou empresa?
          </legend>
          <div className="flex gap-2 text-sm">
            <label
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center ${
                intendedProfessionalType === 'SINGULAR'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              <input
                type="radio"
                name="intended-professional-type"
                value="SINGULAR"
                checked={intendedProfessionalType === 'SINGULAR'}
                onChange={() => setIntendedProfessionalType('SINGULAR')}
                className="sr-only"
              />
              Singular
            </label>
            <label
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center ${
                intendedProfessionalType === 'COMPANY'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              <input
                type="radio"
                name="intended-professional-type"
                value="COMPANY"
                checked={intendedProfessionalType === 'COMPANY'}
                onChange={() => setIntendedProfessionalType('COMPANY')}
                className="sr-only"
              />
              Empresa
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

        {mode === 'sign-in' && channel === 'email' && (
          <button
            type="button"
            onClick={() => setShowRecovery(true)}
            className="self-end text-xs text-gray-600 underline"
          >
            Esqueci a password
          </button>
        )}

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
