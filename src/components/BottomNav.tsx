import { Link, useLocation } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'

interface BottomNavProps {
  className?: string
}

export function BottomNav({ className = '' }: BottomNavProps) {
  const location = useLocation()
  const { data: profile } = useProfile()
  const currentPath = location.pathname

  const isProfessional = profile?.role === 'PROFESSIONAL'

  const requestsPath = isProfessional ? '/pedidos-recebidos' : '/os-meus-pedidos'
  const historyOrCatalogPath = isProfessional ? '/catalogo' : '/os-meus-profissionais'

  const navItems = [
    {
      label: 'Início',
      path: '/',
      isActive: currentPath === '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: 'Profissionais',
      path: '/profissionais',
      isActive: currentPath.startsWith('/profissionais'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
      ),
    },
    {
      label: isProfessional ? 'Convites' : 'Pedidos',
      path: requestsPath,
      isActive: currentPath.startsWith('/os-meus-pedidos') || currentPath.startsWith('/pedidos-recebidos'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      label: isProfessional ? 'Catálogo' : 'Histórico',
      path: historyOrCatalogPath,
      isActive: currentPath.startsWith('/os-meus-profissionais') || currentPath.startsWith('/catalogo'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: 'Perfil',
      path: '/perfil',
      isActive: currentPath.startsWith('/perfil'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <nav
      aria-label="Navegação Principal"
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md select-none md:hidden ${className}`}
    >
      <div className="bg-[#0D1522]/95 backdrop-blur-xl border border-white/10 rounded-full px-2 py-2 shadow-2xl flex items-center justify-between ring-1 ring-black/10">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            title={item.label}
            aria-label={item.label}
            aria-current={item.isActive ? 'page' : undefined}
            className={`relative flex items-center justify-center transition-all duration-200 ${
              item.isActive
                ? 'w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                : 'w-11 h-11 rounded-full text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {item.icon}
          </Link>
        ))}
      </div>
    </nav>
  )
}
