import { Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useProfile } from '../hooks/useProfile'

export function Home() {
  const { session, signOut } = useAuth()
  const { data: profile } = useProfile()

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">PiquetePro24</h1>
      <p className="text-sm text-gray-600">Marketplace de Serviços Locais</p>

      {session ? (
        <div className="flex flex-col gap-2">
          {/* PROFESSIONAL vê pedidos disponíveis perto de si; CLIENT (ou perfil ainda
              a carregar) vê a descoberta de profissionais — a mesma conta nunca
              precisa das duas telas ao mesmo tempo (ver Fase 2/3 do frontend). */}
          {profile?.role === 'ADMIN' ? (
            <>
              <Link to="/admin/kyc" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
                Revisão de KYC
              </Link>
              <Link
                to="/admin/utilizadores"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Utilizadores
              </Link>
              <Link
                to="/admin/audit-log"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Histórico de ações
              </Link>
            </>
          ) : profile?.role === 'PROFESSIONAL' ? (
            <>
              <Link to="/pedidos-proximos" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
                Pedidos perto de ti
              </Link>
              <Link
                to="/verificacao-identidade"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Verificação de identidade
              </Link>
            </>
          ) : (
            <>
              <Link to="/profissionais" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
                Procurar profissionais
              </Link>
              <Link
                to="/os-meus-pedidos"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Os meus pedidos
              </Link>
            </>
          )}
          <Link to="/perfil" className="text-sm text-gray-600 underline">
            O meu perfil
          </Link>
          <button type="button" onClick={() => void signOut()} className="text-sm text-gray-600 underline">
            Terminar sessão
          </button>
        </div>
      ) : (
        <Link to="/entrar" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          Entrar
        </Link>
      )}
    </main>
  )
}
