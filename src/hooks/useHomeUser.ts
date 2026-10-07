import { useMemo } from 'react'
import { useAuth } from '../store/AuthContext'
import { useProfile } from './useProfile'

// Dados de quem está na Home, já prontos para apresentar. Separa "quem é o utilizador" de
// "como se desenha o ecrã": o componente não repete a lógica de nomes por omissão.
export function useHomeUser() {
  const { session, signOut, isLoading: isAuthLoading } = useAuth()
  const { data: profile, isLoading: isProfileLoading } = useProfile()

  const isLoadingUser = isAuthLoading || (Boolean(session) && isProfileLoading)

  const primeiroNome = useMemo(() => {
    if (isLoadingUser) return '...'
    if (!profile?.full_name) return session ? 'Cliente' : 'Visitante'
    return profile.full_name.trim().split(' ')[0]
  }, [profile?.full_name, session, isLoadingUser])

  const localizacao = useMemo(() => {
    if (profile?.neighborhood && profile?.province) return `${profile.neighborhood}, ${profile.province}`
    if (profile?.province) return `${profile.province}, Moçambique`
    return 'Maputo, Moçambique'
  }, [profile?.neighborhood, profile?.province])

  return { temSessao: session !== null, profile, primeiroNome, localizacao, terminarSessao: signOut }
}
