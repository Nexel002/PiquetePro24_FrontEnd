import type { ReactNode } from 'react'

export function CartaoDeMetrica({ rotulo, valor, nota }: { rotulo: string; valor: string | number; nota?: string }) {
  return (
    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-200 transition-all shadow-2xs">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{rotulo}</span>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-extrabold text-piquete-blue font-heading tracking-tight">{valor}</span>
        {nota && <span className="text-xs text-slate-400 font-medium">{nota}</span>}
      </div>
    </div>
  )
}

export function SeccaoDeMetricas({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-4 bg-piquete-blue rounded-full" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{titulo}</h3>
      </div>
      {children}
    </section>
  )
}

// Uma secção sem dados diz porquê, em vez de mostrar uma grelha vazia.
export function SemDados({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">{children}</p>
}
