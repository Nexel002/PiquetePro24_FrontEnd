import { Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Logo } from '../components/ui/Logo'
import { ServiceSearch } from '../components/ServiceSearch'

export function Home() {
  const { session, signOut } = useAuth()
  const { data: profile } = useProfile()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-4 sm:p-6 animate-fade-in">
      <Card variant="glass" className="p-6 sm:p-8 relative overflow-hidden border-white/15">
        {/* Glow ambient background sphere */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-piquete-yellow/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-piquete-blue-bright/20 rounded-full blur-3xl pointer-events-none" />

        <header className="mb-8 text-center relative z-10 flex flex-col items-center">
          <div className="mb-3">
            <Logo variant="stacked" size="lg" showSubtitle />
          </div>

          {profile && (
            <div className="mt-4 flex justify-center">
              <Badge variant={profile.role === 'ADMIN' ? 'warning' : profile.role === 'PROFESSIONAL' ? 'approved' : 'info'}>
                {profile.role === 'ADMIN' ? 'Administrador' : profile.role === 'PROFESSIONAL' ? 'Profissional' : 'Cliente'}
              </Badge>
            </div>
          )}
        </header>


        {session ? (
          <div className="flex flex-col gap-3.5 relative z-10">
            {profile?.role === 'ADMIN' ? (
              <>
                <Link to="/admin/kyc" className="w-full">
                  <Button variant="primary" className="w-full">Revisão de KYC</Button>
                </Link>
                <Link to="/admin/utilizadores" className="w-full">
                  <Button variant="glass" className="w-full">Utilizadores</Button>
                </Link>
                <Link to="/admin/pedidos-servico" className="w-full">
                  <Button variant="glass" className="w-full">Pedidos de serviço</Button>
                </Link>
                <Link to="/admin/metricas" className="w-full">
                  <Button variant="glass" className="w-full">Métricas</Button>
                </Link>
                <Link to="/admin/audit-log" className="w-full">
                  <Button variant="glass" className="w-full">Histórico de ações</Button>
                </Link>
              </>
            ) : profile?.role === 'PROFESSIONAL' ? (
              <>
                <Link to="/pedidos-recebidos" className="w-full">
                  <Button variant="primary" className="w-full">Pedidos recebidos</Button>
                </Link>
                <Link to="/pedidos-proximos" className="w-full">
                  <Button variant="glass" className="w-full">Pedidos perto de ti</Button>
                </Link>
                <Link to="/trabalhos-aceites" className="w-full">
                  <Button variant="glass" className="w-full">Trabalhos aceites</Button>
                </Link>
                <Link to="/catalogo" className="w-full">
                  <Button variant="glass" className="w-full">O meu catálogo</Button>
                </Link>
                <Link to="/verificacao-identidade" className="w-full">
                  <Button variant="glass" className="w-full">Verificação de identidade</Button>
                </Link>
                <Link to="/subscricao" className="w-full">
                  <Button variant="glass" className="w-full">Subscrição</Button>
                </Link>
              </>
            ) : (
              <>
                <ServiceSearch />
                <Link to="/os-meus-pedidos" className="w-full">
                  <Button variant="glass" className="w-full">Os meus pedidos</Button>
                </Link>
                <Link to="/os-meus-profissionais" className="w-full">
                  <Button variant="glass" className="w-full">Os meus profissionais</Button>
                </Link>
              </>
            )}

            <div className="flex items-center gap-3 my-1">
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <Link to="/perfil" className="w-full">
              <Button variant="ghost" className="w-full">O meu perfil</Button>
            </Link>
            
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors py-2 mt-1 text-center"
            >
              Terminar sessão
            </button>
          </div>
        ) : (
          <div className="relative z-10">
            <Link to="/entrar" className="w-full block">
              <Button variant="primary" size="lg" className="w-full">Entrar na Aplicação</Button>
            </Link>
          </div>
        )}
      </Card>
    </main>
  )
}

