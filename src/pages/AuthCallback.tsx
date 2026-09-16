import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

// Destino do redirectTo em signInWithOAuth (ver Login.tsx). O supabase-js processa o
// `code` da URL automaticamente ao carregar esta página (PKCE, detectSessionInUrl por
// default) e dispara onAuthStateChange — AuthContext já reage a isso, esta página só
// espera a sessão ficar disponível e segue para /perfil (o ProtectedRoute/
// OnboardingGate tratam do resto, incluindo forçar o onboarding se for a primeira vez).
export function AuthCallback() {
  const { session, isLoading } = useAuth()

  if (!isLoading && session) {
    return <Navigate to="/perfil" replace />
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
