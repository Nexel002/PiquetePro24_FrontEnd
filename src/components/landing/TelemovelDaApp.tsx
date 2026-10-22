import { Icone } from './Icone'

// Telemóvel desenhado em CSS com um ecrã da app «inventado» só com formas: nomes, notas e fotos
// de pessoas reais não existem aqui de propósito (seriam dados falsos), e uma imagem a mais pesava
// no 3G. As linhas cinzentas fazem de texto.
const CARTOES = [
  { servico: 'Canalização', zona: 'Maputo · KaMpfumo', cor: 'bg-sky-500' },
  { servico: 'Eletricidade', zona: 'Matola · Machava', cor: 'bg-amber-500' },
  { servico: 'Pintura', zona: 'Maputo · Polana', cor: 'bg-emerald-500' },
]

export function TelemovelDaApp() {
  return (
    <div className="relative mx-auto w-[15.5rem] sm:w-[17rem]" aria-hidden="true">
      <div className="absolute -inset-10 animate-pulsar-brilho rounded-full bg-piquete-blue-bright/40 blur-3xl motion-reduce:animate-none" />

      <div className="relative animate-float rounded-[2.4rem] border-[6px] border-slate-800 bg-slate-900 p-2 shadow-2xl shadow-black/50 motion-reduce:animate-none">
        <div className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-slate-900" />
        <div className="overflow-hidden rounded-[1.8rem] bg-slate-50 pb-4 pt-8">
          <div className="px-4">
            <div className="h-2.5 w-24 rounded-full bg-piquete-blue/80" />
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm">
              <span className="h-3 w-3 rounded-full border-2 border-slate-400" />
              <span className="h-2 w-28 rounded-full bg-slate-200" />
            </div>
            <div className="mt-3 flex gap-1.5 overflow-hidden">
              {['Todos', 'Água', 'Luz', 'Tinta'].map((c, i) => (
                <span key={c} className={`rounded-full px-2.5 py-1 text-[0.6rem] font-semibold ${i === 0 ? 'bg-piquete-blue text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2.5 px-4">
            {CARTOES.map((c) => (
              <div key={c.servico} className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-sm">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${c.cor}`}>
                  <Icone nome="escudo" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.7rem] font-bold leading-tight text-slate-900">{c.servico}</span>
                  <span className="mt-0.5 block text-[0.6rem] text-slate-500">{c.zona}</span>
                  <span className="mt-1.5 block h-1.5 w-16 rounded-full bg-slate-200" />
                </span>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[0.55rem] font-bold text-emerald-700">Verificado</span>
              </div>
            ))}
          </div>

          <div className="mx-4 mt-4 rounded-xl bg-piquete-yellow py-2.5 text-center text-[0.7rem] font-bold text-piquete-blue">Pedir propostas</div>
        </div>
      </div>

      {/* Etiquetas flutuantes à volta do telemóvel: dão profundidade e dizem o essencial. */}
      <div
        className="absolute -left-10 top-16 flex animate-float items-center gap-2 rounded-2xl border border-white/15 bg-piquete-blue-deep/95 px-3 py-2 text-xs font-semibold text-white shadow-xl motion-reduce:animate-none sm:-left-16"
        style={{ animationDelay: '0.8s' }}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Icone nome="visto" className="h-3.5 w-3.5" />
        </span>
        Identidade verificada
      </div>
      <div
        className="absolute -right-8 bottom-24 flex animate-float items-center gap-2 rounded-2xl border border-white/15 bg-piquete-blue-deep/95 px-3 py-2 text-xs font-semibold text-white shadow-xl motion-reduce:animate-none sm:-right-14"
        style={{ animationDelay: '1.9s' }}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-piquete-yellow text-piquete-blue">
          <Icone nome="grupo" className="h-3.5 w-3.5" />
        </span>
        3 propostas
      </div>
    </div>
  )
}
