import { Link } from 'react-router-dom'
import { caminhoDoLogin } from '../../lib/postLoginRedirect'
import { CeuEstrelado } from '../CeuEstrelado'
import { LogoOficial } from '../ui/LogoOficial'
import { Icone } from './Icone'
import { Revelar } from './Revelar'

// Convite final sobre o céu estrelado e, por baixo, o rodapé. Sem contactos nem redes sociais por
// enquanto: não há endereços oficiais para pôr (ver o plano, Fase 47).
export function RodapeLanding() {
  return (
    <footer className="bg-mesh-dark relative overflow-hidden text-white">
      <CeuEstrelado />
      <div className="relative mx-auto max-w-4xl px-4 pb-10 pt-20 text-center sm:px-6 sm:pt-28">
        <Revelar>
          <h2 className="font-heading text-3xl font-extrabold !text-white text-balance sm:text-5xl">Pronto para resolver isso hoje?</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">Cria a tua conta em poucos minutos e recebe propostas de profissionais verificados.</p>
          <Link
            to={caminhoDoLogin(undefined, 'criar-conta')}
            className="group mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-yellow-300/30 bg-gradient-to-r from-piquete-yellow via-yellow-400 to-amber-400 px-8 text-base font-bold text-piquete-blue shadow-glow-yellow transition hover:brightness-105 active:scale-[0.97]"
          >
            Criar conta grátis
            <Icone nome="seta" className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
          </Link>
        </Revelar>

        <div className="mt-20 flex flex-col items-center gap-6 border-t border-white/10 pt-8 sm:flex-row sm:justify-between">
          <LogoOficial largura={110} fundo="escuro" />
          <nav aria-label="Ligações do rodapé" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-300">
            <Link to="/termos" className="hover:text-piquete-yellow">Termos de utilização</Link>
            <Link to="/privacidade" className="hover:text-piquete-yellow">Política de privacidade</Link>
            <Link to={caminhoDoLogin()} className="hover:text-piquete-yellow">Entrar</Link>
          </nav>
          <p className="text-xs text-slate-400">© 2026 PiquetePro24</p>
        </div>
      </div>
    </footer>
  )
}
