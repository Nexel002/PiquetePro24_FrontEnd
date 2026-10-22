import { PERGUNTAS } from './dados'
import { Icone } from './Icone'
import { Revelar } from './Revelar'

// `<details>` nativo: abre e fecha com teclado e leitor de ecrã sem JavaScript. O ícone gira pelo
// estado `open` do próprio elemento (`group-open:`).
export function PerguntasFrequentes() {
  return (
    <section id="faq" className="scroll-mt-20 bg-slate-50 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <Revelar className="text-center">
          <h2 className="font-heading text-3xl font-extrabold text-piquete-blue sm:text-4xl">Perguntas frequentes</h2>
        </Revelar>

        <div className="mt-10 space-y-3">
          {PERGUNTAS.map((p, i) => (
            <Revelar key={p.pergunta} atraso={i * 60}>
              <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow open:shadow-card">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-semibold text-piquete-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-piquete-yellow [&::-webkit-details-marker]:hidden">
                  {p.pergunta}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-piquete-blue/5 text-piquete-blue transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none">
                    <Icone nome="mais" className="h-4 w-4" />
                  </span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{p.resposta}</p>
              </details>
            </Revelar>
          ))}
        </div>
      </div>
    </section>
  )
}
