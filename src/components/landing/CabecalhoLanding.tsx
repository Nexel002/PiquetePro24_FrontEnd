import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { caminhoDoLogin } from '../../lib/postLoginRedirect'
import { LogoOficial } from '../ui/LogoOficial'

const LIGACOES = [
  { href: '#servicos', texto: 'Serviços' },
  { href: '#como-funciona', texto: 'Como funciona' },
  { href: '#profissionais', texto: 'Para profissionais' },
  { href: '#faq', texto: 'Perguntas' },
]

// Transparente sobre o hero e sólido depois de rolar um pouco: assim o logótipo e os botões
// continuam legíveis sobre os fundos claros das secções seguintes.
export function CabecalhoLanding() {
  const [rolou, setRolou] = useState(false)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        rolou ? 'border-b border-white/10 bg-piquete-blue-deep/90 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" aria-label="PiquetePro24 — início" className="shrink-0">
          <LogoOficial largura={112} fundo="escuro" />
        </Link>

        <nav aria-label="Secções da página" className="hidden items-center gap-7 md:flex">
          {LIGACOES.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-slate-200 transition-colors hover:text-piquete-yellow">
              {l.texto}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to={caminhoDoLogin()}
            className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-white transition-colors hover:text-piquete-yellow"
          >
            Entrar
          </Link>
          <Link
            to={caminhoDoLogin(undefined, 'criar-conta')}
            className="inline-flex min-h-10 items-center rounded-xl bg-piquete-yellow px-4 text-sm font-bold text-piquete-blue transition hover:brightness-105 active:scale-[0.97]"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </header>
  )
}
