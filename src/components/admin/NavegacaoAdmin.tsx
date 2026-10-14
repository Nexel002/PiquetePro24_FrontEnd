import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DESTINOS_DE_ADMIN } from './destinos'

// Abas principais do Painel de Admin (Tab Anatomy)
const ABAS_PRINCIPAIS = [
  {
    to: '/admin/kyc',
    rotulo: 'Revisão de KYC',
    descricao: 'Pedidos de adesão e identidades',
    icone: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    isMatch: (path: string) => path === '/admin' || path === '/admin/' || path === '/admin/kyc',
  },
  {
    to: '/admin/utilizadores',
    rotulo: 'Utilizadores',
    descricao: 'Contas, estados e perfis',
    icone: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    isMatch: (path: string) => path.startsWith('/admin/utilizadores'),
  },
  {
    to: '/admin/pedidos-servico',
    rotulo: 'Pedidos',
    descricao: 'Todos os pedidos de serviço',
    icone: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    isMatch: (path: string) => path === '/admin/pedidos-servico',
  },
  {
    to: '/admin/visao-geral',
    rotulo: 'Visão Geral',
    descricao: 'Métricas e alertas',
    icone: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    isMatch: (path: string) => path === '/admin/visao-geral',
  },
]

// Ferramentas secundárias acessíveis pelo menu Mais
const ROTAS_PRINCIPAIS_SET = new Set(['/admin', '/admin/', '/admin/kyc', '/admin/utilizadores', '/admin/pedidos-servico', '/admin/visao-geral'])

export function NavegacaoAdmin() {
  const location = useLocation()
  const pathname = location.pathname
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Encontra se a página atual é uma das ferramentas secundárias
  const destinoSecundarioAtivo = DESTINOS_DE_ADMIN.find(
    (d) => d.to === pathname || (d.to !== '/admin' && pathname.startsWith(d.to))
  )

  const ehSecundario = Boolean(destinoSecundarioAtivo && !ROTAS_PRINCIPAIS_SET.has(pathname))

  // Fecha o menu se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAberto(false)
      }
    }
    if (menuAberto) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuAberto])

  return (
    <nav
      aria-label="Navegação do Painel de Administração"
      className="relative z-30 flex flex-col gap-2 rounded-2xl bg-slate-100/90 p-1.5 border border-slate-200/80 shadow-sm backdrop-blur-md"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        {ABAS_PRINCIPAIS.map((aba) => {
          const ativo = aba.isMatch(pathname)

          return (
            <Link
              key={aba.to}
              to={aba.to}
              aria-current={ativo ? 'page' : undefined}
              className={`group flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 shrink-0 ${
                ativo
                  ? 'bg-piquete-blue text-white shadow-md'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900 active:scale-95'
              }`}
            >
              <span className={`transition-transform duration-200 ${ativo ? 'scale-110 text-piquete-yellow' : 'text-slate-500 group-hover:text-slate-700'}`}>
                {aba.icone}
              </span>
              <span>{aba.rotulo}</span>
            </Link>
          )
        })}

        {/* Menu de ferramentas complementares */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            aria-expanded={menuAberto}
            aria-haspopup="menu"
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
              ehSecundario
                ? 'bg-piquete-blue text-white shadow-md'
                : 'text-slate-700 hover:bg-white hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <span>{ehSecundario ? destinoSecundarioAtivo?.rotulo : 'Mais'}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${menuAberto ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuAberto && (
            <div
              role="menu"
              className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-64 rounded-2xl bg-white p-2 shadow-card-hover border border-slate-200 animate-slide-up z-50 max-h-80 overflow-y-auto"
            >
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Outras Ferramentas
              </div>
              <div className="flex flex-col gap-0.5">
                {DESTINOS_DE_ADMIN.filter(
                  (d) => !['/admin/kyc', '/admin/utilizadores', '/admin/pedidos-servico'].includes(d.to)
                ).map((destino) => {
                  const itemAtivo = pathname === destino.to || pathname.startsWith(destino.to)
                  return (
                    <Link
                      key={destino.to}
                      to={destino.to}
                      role="menuitem"
                      onClick={() => setMenuAberto(false)}
                      className={`flex flex-col rounded-xl px-3 py-2 text-left transition-colors ${
                        itemAtivo
                          ? 'bg-piquete-blue/10 text-piquete-blue font-bold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-sm font-semibold">{destino.rotulo}</span>
                      <span className="text-xs text-slate-500 line-clamp-1">{destino.descricao}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
