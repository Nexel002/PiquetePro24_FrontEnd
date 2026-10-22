import { Link } from 'react-router-dom'
import { CATEGORIAS } from './dados'

// Faixa que corre em loop. A lista aparece duas vezes e a animação desloca 50%: quando a primeira
// metade sai, a segunda ocupa o seu lugar e o salto de volta ao início não se vê. A cópia é
// `aria-hidden` e fora da ordem de tabulação, para leitores de ecrã e teclado não percorrerem tudo
// duas vezes. Com «reduzir movimento» a faixa pára e quebra em linhas, sem cortar nada.
export function FaixaDeCategorias() {
  return (
    <section id="servicos" aria-label="Serviços disponíveis" className="scroll-mt-20 overflow-hidden border-b border-slate-100 bg-white py-6">
      <div className="group flex w-max animate-faixa gap-3 hover:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:px-4">
        {[0, 1].map((copia) =>
          CATEGORIAS.map((c) => (
            <Link
              key={`${copia}-${c.slug}`}
              to={`/profissionais?category=${c.slug}`}
              tabIndex={copia === 1 ? -1 : undefined}
              aria-hidden={copia === 1 ? true : undefined}
              className={`whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-piquete-blue transition-colors hover:border-piquete-yellow hover:bg-piquete-yellow/20 ${
                copia === 1 ? 'motion-reduce:hidden' : ''
              }`}
            >
              {c.nome}
            </Link>
          )),
        )}
      </div>
    </section>
  )
}
