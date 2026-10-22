import { Link } from 'react-router-dom'
import { caminhoDoLogin } from '../../lib/postLoginRedirect'
import { Icone } from './Icone'
import { Revelar } from './Revelar'

const PARA_CLIENTES = ['Pedido gratuito de propostas, sem compromisso', 'Perfis, trabalhos feitos e avaliações à vista', 'Funciona mesmo com rede fraca']
const PARA_PROFISSIONAIS = ['Perfil e catálogo de trabalhos com as tuas fotos', 'Selo «Verificado» depois da verificação de identidade', 'Pedidos da tua zona, por email e na app']

function Lista({ itens, cor }: { itens: readonly string[]; cor: string }) {
  return (
    <ul className="mt-6 space-y-3">
      {itens.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm">
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${cor}`}>
            <Icone nome="visto" className="h-3 w-3" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function ParaQuem() {
  return (
    <section id="profissionais" className="scroll-mt-20 bg-white px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        <Revelar>
          <article className="h-full rounded-3xl bg-slate-100 p-8 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-widest text-piquete-blue-bright">Para clientes</p>
            <h2 className="mt-3 text-2xl sm:text-3xl">Preciso de um profissional</h2>
            <Lista itens={PARA_CLIENTES} cor="bg-piquete-blue text-white" />
            <Link
              to="/profissionais"
              className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-piquete-blue px-6 text-sm font-bold text-white transition hover:bg-piquete-blue-light active:scale-[0.97]"
            >
              Procurar profissionais
            </Link>
          </article>
        </Revelar>

        <Revelar atraso={120}>
          <article className="bg-mesh-dark relative h-full overflow-hidden rounded-3xl p-8 text-white sm:p-10">
            <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-piquete-yellow/20 blur-3xl" />
            <p className="relative text-xs font-bold uppercase tracking-widest text-piquete-yellow">Para profissionais</p>
            <h2 className="relative mt-3 text-2xl !text-white sm:text-3xl">Sou profissional</h2>
            <div className="relative text-slate-200">
              <Lista itens={PARA_PROFISSIONAIS} cor="bg-piquete-yellow text-piquete-blue" />
            </div>
            <Link
              to={caminhoDoLogin(undefined, 'criar-conta')}
              className="relative mt-8 inline-flex min-h-12 items-center rounded-xl bg-piquete-yellow px-6 text-sm font-bold text-piquete-blue transition hover:brightness-105 active:scale-[0.97]"
            >
              Criar conta de profissional
            </Link>
          </article>
        </Revelar>
      </div>
    </section>
  )
}
