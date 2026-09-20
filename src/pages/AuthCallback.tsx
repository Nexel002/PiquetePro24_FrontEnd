import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useBecomeProfessional } from '../hooks/useProfile'
import type { ProfessionalType } from '../services/profile'
import { sendWelcomeNotification } from '../services/notifications'
import { INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY, INTENDED_ROLE_STORAGE_KEY } from './Login'

// Destino do redirectTo em signInWithOAuth (ver Login.tsx). O supabase-js processa o
// `code` da URL automaticamente ao carregar esta página (PKCE, detectSessionInUrl por
// default) e dispara onAuthStateChange — AuthContext já reage a isso, esta página só
// espera a sessão ficar disponível e segue para "/" (o ProtectedRoute/OnboardingGate
// tratam do resto, incluindo forçar o onboarding se for a primeira vez; a Home decide
// o ecrã por role, mesmo motivo do redirect de Login.tsx).
//
// Antes de navegar, aplica a escolha "Sou Profissional" feita antes do redirect (se
// alguma), guardada em sessionStorage porque signInWithOAuth não permite passar
// metadata customizado como signUp() permite — ver INTENDED_ROLE_STORAGE_KEY.
export function AuthCallback() {
  const { session, isLoading } = useAuth()
  const becomeProfessional = useBecomeProfessional()
  const [hasAppliedIntendedRole, setHasAppliedIntendedRole] = useState(false)

  useEffect(() => {
    if (isLoading || !session || hasAppliedIntendedRole) return

    const intendedRole = sessionStorage.getItem(INTENDED_ROLE_STORAGE_KEY)
    const intendedProfessionalType = sessionStorage.getItem(
      INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY,
    ) as ProfessionalType | null
    sessionStorage.removeItem(INTENDED_ROLE_STORAGE_KEY)
    sessionStorage.removeItem(INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY)

    // A chave só existe quando o redirect partiu de Login.tsx em modo sign-up (ver
    // handleGoogleSignIn) — presença dela, não o seu valor, é o sinal de "isto é uma
    // conta nova", o mesmo sinal que já decide se se chama become-professional.
    // Idempotente do lado do backend (TRD Adendo v1.7): não há problema se disparar
    // outra vez por engano.
    if (intendedRole !== null) {
      void sendWelcomeNotification().catch(() => {})
    }

    if (intendedRole === 'PROFESSIONAL') {
      // Falha aqui não deve travar o login — o utilizador fica como CLIENT e pode
      // ser promovido a profissional mais tarde por outro caminho (ex. Fase 4/KYC);
      // não há razão de negócio para bloquear o acesso à app por causa disto.
      // Fallback SINGULAR nunca deve disparar na prática (Login.tsx grava sempre a
      // sub-escolha junto com o role), mas o endpoint exige o campo — este é o valor
      // mais conservador caso a chave se perca por algum motivo (ex. sessionStorage
      // limpa manualmente entre o clique e o regresso do Google).
      becomeProfessional.mutate(intendedProfessionalType ?? 'SINGULAR', {
        onSettled: () => setHasAppliedIntendedRole(true),
      })
    } else {
      setHasAppliedIntendedRole(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, session, hasAppliedIntendedRole])

  if (!isLoading && session && hasAppliedIntendedRole) {
    return <Navigate to="/" replace />
  }

  if (!isLoading && !session) {
    // O code na URL era inválido/expirado, ou o utilizador cancelou no Google.
    return <Navigate to="/entrar" replace />
  }

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-sm text-gray-600">A concluir a autenticação...</p>
    </main>
  )
}
