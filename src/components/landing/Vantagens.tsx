import { VANTAGENS } from './dados'
import { Icone } from './Icone'
import { Revelar } from './Revelar'

export function Vantagens() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Revelar className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-extrabold text-piquete-blue text-balance sm:text-4xl">Contratar sem adivinhar</h2>
          <p className="mt-3 text-slate-600">Tudo o que precisas para escolher bem, num só sítio.</p>
        </Revelar>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VANTAGENS.map((v, i) => (
            <Revelar key={v.titulo} atraso={i * 90}>
              <article className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1.5 hover:border-piquete-yellow/60 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-piquete-blue text-piquete-yellow transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 motion-reduce:transition-none">
                  <Icone nome={v.icone} />
                </span>
                <h3 className="mt-5 text-lg">{v.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.texto}</p>
              </article>
            </Revelar>
          ))}
        </div>
      </div>
    </section>
  )
}
