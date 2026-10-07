import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { AuthLayout, CredentialsForm, RecoveryForm } from '../components/auth'
import { useLoginForm } from '../hooks/useLoginForm'
import { destinoSeguro } from '../lib/postLoginRedirect'
import { useAuth } from '../store/AuthContext'

// Esta página só compõe: a estrutura (AuthLayout), o estado e os envios (useLoginForm) e os
// dois formulários possíveis (entrar/registar e recuperar palavra-passe).
export function Login() {
  const { session, isLoading: isSessionLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const [aRecuperar, setARecuperar] = useState(false)

  // `?next=` é o sítio onde a pessoa queria chegar quando foi mandada para aqui (ver
  // ProtectedRoute); `?modo=criar-conta` abre logo no registo (botão "Criar conta" da Home).
  const destino = destinoSeguro(searchParams.get('next'))
  const form = useLoginForm({
    modoInicial: searchParams.get('modo') === 'criar-conta' ? 'sign-up' : 'sign-in',
    destino,
  })

  // Home ("/") é quem decide o ecrã por role — quem já tem sessão não deve ver o login.
  if (!isSessionLoading && session) {
    return <Navigate to={destino ?? '/'} replace />
  }

  return (
    <AuthLayout>
      {aRecuperar ? (
        <RecoveryForm onBack={() => setARecuperar(false)} />
      ) : (
        <CredentialsForm form={form} aoEsquecerPalavraPasse={() => setARecuperar(true)} />
      )}
    </AuthLayout>
  )
}
