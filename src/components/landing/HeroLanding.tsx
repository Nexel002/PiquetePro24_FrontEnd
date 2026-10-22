import { Link } from 'react-router-dom'
import { caminhoDoLogin } from '../../lib/postLoginRedirect'
import { CeuEstrelado } from '../CeuEstrelado'
import { Icone } from './Icone'
import { Revelar } from './Revelar'
import { TelemovelDaApp } from './TelemovelDaApp'

export function HeroLanding() {
  return (
    <section className="bg-mesh-dark relative overflow-hidden pb-24 pt-28 text-white sm:pb-32 sm:pt-32">
      <CeuEstrelado />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="text-center lg:text-left">
          <Revelar>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Profissionais com identidade verificada, em Moçambique
            </span>
          </Revelar>
          <Revelar atraso={100}>
            <h1 className="mt-6 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-white text-balance sm:text-5xl lg:text-6xl">
              O profissional certo,{' '}
              <span className="bg-gradient-to-r from-piquete-yellow to-amber-300 bg-clip-text text-transparent">ao teu alcance.</span>
            </h1>
          </Revelar>
          <Revelar atraso={200}>
            <p className="mx-auto mt-5 max-w-xl text-base text-slate-300 sm:text-lg lg:mx-0">
              Pede a até 3 canalizadores, eletricistas, pintores e outros profissionais da tua zona, compara as propostas e escolhe quem te dá mais confiança.
            </p>
          </Revelar>
          <Revelar atraso={300}>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/profissionais"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-yellow-300/30 bg-gradient-to-r from-piquete-yellow via-yellow-400 to-amber-400 px-7 text-base font-bold text-piquete-blue shadow-glow-yellow transition hover:brightness-105 active:scale-[0.97]"
              >
                Pedir um profissional
                <Icone nome="seta" className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
              </Link>
              <Link
                to={caminhoDoLogin(undefined, 'criar-conta')}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-7 text-base font-semibold text-white transition hover:bg-white/10 active:scale-[0.97]"
              >
                Sou profissional
              </Link>
            </div>
          </Revelar>
        </div>

        <Revelar atraso={250} className="pb-6">
          <TelemovelDaApp />
        </Revelar>
      </div>

      {/* Curva que liga o céu à secção branca, em vez de um corte seco. */}
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-12 w-full fill-white sm:h-20">
        <path d="M0 80V40C240 0 480 0 720 30s480 40 720 0v50H0Z" />
      </svg>
    </section>
  )
}
