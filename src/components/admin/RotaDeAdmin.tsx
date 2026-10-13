import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useEstadoDoMfa } from '../../hooks/useMfa'
import { useProfile } from '../../hooks/useProfile'
import { DesafioMfa } from './DesafioMfa'

function ACarregar() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-piquete-yellow border-t-piquete-blue" />
    </main>
  )
}

// Fronteira de acesso dos ecrãs de administração, aplicada na rota e não dentro de cada
// página: assim uma página de admin nem chega a montar (nem a pedir dados que dariam 403)
// para quem não é ADMIN. A UI só esconde — quem autoriza é o backend (`requireRole('ADMIN')`
// e, com ADMIN_REQUIRE_MFA, o nível aal2 da sessão).
//
// Um admin que já registou o segundo factor mas entrou só com a palavra-passe (aal1) vê o
// desafio antes do painel. Se não for possível ler o estado do MFA, deixa-se passar: o que
// protege é o backend, e trancar o painel por uma falha de leitura seria pior do que deixar o
// backend dizer 403.
export function RotaDeAdmin({ children }: { children: ReactNode }) {
  const { data: profile, isLoading } = useProfile()
  const ehAdmin = profile?.role === 'ADMIN'
  const mfa = useEstadoDoMfa({ enabled: ehAdmin })

  if (isLoading) return <ACarregar />
  if (!ehAdmin) return <Navigate to="/" replace />
  if (mfa.isLoading) return <ACarregar />

  if (mfa.data?.temFactor && mfa.data.nivelAtual !== 'aal2' && mfa.data.factorId) {
    return <DesafioMfa factorId={mfa.data.factorId} />
  }

  return <>{children}</>
}
