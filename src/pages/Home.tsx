import { Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { Card } from '../components/ui/Card'

export function Home() {
  const { session, signOut } = useAuth()
  const { data: profile } = useProfile()

  const primaryButtonClass = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 px-6 py-3 text-base bg-piquete-yellow text-piquete-blue hover:bg-piquete-yellow-hover hover:shadow-lg hover:shadow-piquete-yellow/30 w-full";
  const secondaryButtonClass = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 px-6 py-3 text-base bg-piquete-blue/5 text-piquete-blue hover:bg-piquete-blue/10 w-full";

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
      <Card className="p-6 md:p-8">
        <header className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-piquete-blue rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-piquete-yellow text-2xl font-bold font-heading">P24</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-piquete-blue mb-1">PiquetePro24</h1>
          <p className="text-sm text-gray-500">Marketplace de Serviços Locais</p>
        </header>

        {session ? (
          <div className="flex flex-col gap-3">
            {/* PROFESSIONAL vê pedidos disponíveis perto de si; CLIENT (ou perfil ainda
                a carregar) vê a descoberta de profissionais — a mesma conta nunca
                precisa das duas telas ao mesmo tempo (ver Fase 2/3 do frontend). */}
            {profile?.role === 'ADMIN' ? (
              <>
                <Link to="/admin/kyc" className={primaryButtonClass}>Revisão de KYC</Link>
                <Link to="/admin/utilizadores" className={secondaryButtonClass}>Utilizadores</Link>
                <Link to="/admin/pedidos-servico" className={secondaryButtonClass}>Pedidos de serviço</Link>
                <Link to="/admin/metricas" className={secondaryButtonClass}>Métricas</Link>
                <Link to="/admin/audit-log" className={secondaryButtonClass}>Histórico de ações</Link>
              </>
            ) : profile?.role === 'PROFESSIONAL' ? (
              <>
                <Link to="/pedidos-proximos" className={primaryButtonClass}>Pedidos perto de ti</Link>
                <Link to="/trabalhos-aceites" className={secondaryButtonClass}>Trabalhos aceites</Link>
                <Link to="/verificacao-identidade" className={secondaryButtonClass}>Verificação de identidade</Link>
                <Link to="/subscricao" className={secondaryButtonClass}>Subscrição</Link>
              </>
            ) : (
              <>
                <Link to="/profissionais" className={primaryButtonClass}>Procurar profissionais</Link>
                <Link to="/os-meus-pedidos" className={secondaryButtonClass}>Os meus pedidos</Link>
              </>
            )}

            <div className="flex items-center gap-3 my-2">
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <Link to="/perfil" className={secondaryButtonClass}>O meu perfil</Link>
            <button type="button" onClick={() => void signOut()} className="text-sm font-semibold text-red-500 hover:text-red-600 mt-2">
              Terminar sessão
            </button>
          </div>
        ) : (
          <Link to="/entrar" className={primaryButtonClass}>Entrar</Link>
        )}
      </Card>
    </main>
  )
}
