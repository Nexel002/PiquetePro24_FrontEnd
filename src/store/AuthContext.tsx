import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()
  // Quem estava com sessão da última vez que a vimos — para saber se a próxima é de outra pessoa.
  const utilizadorAnterior = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      utilizadorAnterior.current = data.session?.user.id ?? null
      setSession(data.session)
      setIsLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Ao sair, ou ao entrar outra pessoa no mesmo aparelho, nada do que foi carregado para a
      // sessão anterior pode ficar à vista (TRD Adendo v1.71, item S3): as queries em memória do
      // React Query são por chave (['profile'], ['service-requests']…), não por utilizador, e até
      // aqui só eram limpas ao apagar a conta. Num telemóvel partilhado, o seguinte via os dados
      // do anterior até a query voltar a pedir.
      const novoUtilizador = newSession?.user.id ?? null
      if (event === 'SIGNED_OUT' || (novoUtilizador && utilizadorAnterior.current && novoUtilizador !== utilizadorAnterior.current)) {
        queryClient.clear()
      }
      if (novoUtilizador) utilizadorAnterior.current = novoUtilizador
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [queryClient])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return <AuthContext.Provider value={{ session, isLoading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
