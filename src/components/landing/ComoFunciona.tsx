import { PASSOS } from './dados'
import { Revelar } from './Revelar'

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-slate-50 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <Revelar className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-extrabold text-piquete-blue sm:text-4xl">Em três passos</h2>
          <p className="mt-3 text-slate-600">Do problema à solução sem sair do telemóvel.</p>
        </Revelar>

        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
          {/* Linha que une os círculos (só em ecrã largo, onde os passos estão lado a lado). */}
          <span aria-hidden="true" className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-piquete-blue/25 md:block" />
          {PASSOS.map((p, i) => (
            <li key={p.titulo}>
              <Revelar atraso={i * 150} className="relative text-center">
                <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-piquete-blue font-heading text-xl font-extrabold text-piquete-yellow shadow-glow-blue ring-4 ring-slate-50">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-xl">{p.titulo}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600">{p.texto}</p>
              </Revelar>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
