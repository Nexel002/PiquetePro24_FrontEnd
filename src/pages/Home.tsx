import { Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

export function Home() {
  const { session, signOut } = useAuth()

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">PiquetePro24</h1>
      <p className="text-sm text-gray-600">Marketplace de Serviços Locais</p>

      {session ? (
        <div className="flex flex-col gap-2">
          <Link to="/perfil" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
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
