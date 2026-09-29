import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/AuthContext'
import { sendWelcomeNotification } from '../services/notifications'
import { requestPasswordRecovery } from '../services/passwordRecovery'
import { describeAuthError } from '../lib/authErrors'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

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

  // Home ("/") é quem decide o ecrã por role (admin vê os links de administração,
  // profissional/cliente veem os deles) — redirecionar para /perfil aqui obrigava
  // sempre a um passo manual extra para lá chegar, mesmo o admin logo a seguir a
  // entrar.
  if (!isSessionLoading && session) {
    return <Navigate to="/" replace />
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
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
        <Card className="p-6 md:p-8">
          <header className="mb-6 text-center">
            <h1 className="text-2xl mb-2 text-piquete-blue">Recuperar password</h1>
            <p className="text-sm text-gray-500">Indica o teu email para receberes um link de recuperação.</p>
          </header>

          <form onSubmit={(event) => void handleRecoverySubmit(event)} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={recoveryEmail}
              onChange={(event) => setRecoveryEmail(event.target.value)}
              required
            />

            {recoveryError && (
              <p role="alert" className="text-sm text-red-600 font-medium text-center">
                {recoveryError}
              </p>
            )}
            {recoveryMessage && (
              <p role="status" className="text-sm text-green-700 font-medium text-center">
                {recoveryMessage}
              </p>
            )}

            <Button type="submit" isLoading={isSubmittingRecovery} className="w-full mt-2">
              {isSubmittingRecovery ? 'A enviar...' : 'Enviar link'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setShowRecovery(false)
                setRecoveryError(null)
                setRecoveryMessage(null)
              }}
              className="text-sm text-piquete-blue hover:underline font-semibold"
            >
              Voltar a entrar
            </button>
          </div>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
      <Card className="p-6 md:p-8">
        <header className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            {/* Placeholder logótipo */}
            <div className="w-16 h-16 bg-piquete-blue rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-piquete-yellow text-2xl font-bold font-heading">P24</span>
            </div>
          </div>
          <h1 className="text-2xl mb-1 text-piquete-blue">PiquetePro24</h1>
          <p className="text-sm text-gray-500">
            {mode === 'sign-in' ? 'Bem-vindo de volta!' : 'Cria a tua conta e junta-te a nós'}
          </p>
        </header>

        {mode === 'sign-up' && (
          <fieldset className="flex flex-col gap-2 mb-4">
            <legend className="text-sm font-semibold text-piquete-blue-dark mb-1">Como vais usar o PiquetePro24?</legend>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`cursor-pointer rounded-xl border-2 px-3 py-3 text-center transition-all ${
                  intendedRole === 'CLIENT'
                    ? 'border-piquete-blue bg-piquete-blue/5 text-piquete-blue font-semibold'
                    : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
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
                className={`cursor-pointer rounded-xl border-2 px-3 py-3 text-center transition-all ${
                  intendedRole === 'PROFESSIONAL'
                    ? 'border-piquete-yellow bg-piquete-yellow/10 text-piquete-blue font-semibold'
                    : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
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
          <fieldset className="flex flex-col gap-2 mb-4">
            <legend className="text-sm font-semibold text-piquete-blue-dark mb-1">
              És profissional singular ou empresa?
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-center text-sm transition-all ${
                  intendedProfessionalType === 'SINGULAR'
                    ? 'border-piquete-blue bg-piquete-blue/5 text-piquete-blue font-semibold'
                    : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
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
                className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-center text-sm transition-all ${
                  intendedProfessionalType === 'COMPANY'
                    ? 'border-piquete-blue bg-piquete-blue/5 text-piquete-blue font-semibold'
                    : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
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

        <Button
          variant="outline"
          onClick={() => void handleGoogleSignIn()}
          disabled={isRedirectingToGoogle}
          className="w-full mb-6"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
            <path fill="none" d="M1 1h22v22H1z" />
          </svg>
          {isRedirectingToGoogle ? 'A abrir...' : 'Continuar com Google'}
        </Button>

        <div className="flex items-center gap-4 mb-6">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">ou continua com</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setChannel('email')
              resetFeedback()
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
              channel === 'email' ? 'bg-white text-piquete-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setChannel('phone')
              resetFeedback()
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
              channel === 'phone' ? 'bg-white text-piquete-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Telefone
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'sign-up' && (
            <Input
              label="Nome completo"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          )}

          <Input
            label={channel === 'email' ? 'Email' : 'Telefone'}
            type={channel === 'email' ? 'email' : 'tel'}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder={channel === 'phone' ? '+258 84 000 0000' : undefined}
            required
          />

          {mode === 'sign-up' && channel === 'email' && (
            <Input
              label="Telefone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+258 84 000 0000"
              required
            />
          )}

          <div className="flex flex-col gap-1.5">
            <Input
              label="Palavra-passe"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
            {mode === 'sign-in' && channel === 'email' && (
              <button
                type="button"
                onClick={() => setShowRecovery(true)}
                className="self-end text-xs font-medium text-piquete-blue hover:underline"
              >
                Esqueceste-te?
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600 text-center bg-red-50 p-2 rounded-lg">
              {error}
            </p>
          )}
          {successMessage && (
            <p role="status" className="text-sm font-medium text-green-700 text-center bg-green-50 p-2 rounded-lg">
              {successMessage}
            </p>
          )}

          <Button type="submit" isLoading={isSubmitting} className="w-full mt-2">
            {mode === 'sign-in' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
              resetFeedback()
            }}
            className="text-sm font-medium text-gray-500 hover:text-piquete-blue transition-colors"
          >
            {mode === 'sign-in' ? (
              <>Ainda não tens conta? <span className="font-semibold text-piquete-blue">Cria uma agora</span></>
            ) : (
              <>Já tens conta? <span className="font-semibold text-piquete-blue">Entrar</span></>
            )}
          </button>
        </div>
      </Card>
    </main>
  )
}
