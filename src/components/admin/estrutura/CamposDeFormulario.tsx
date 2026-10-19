import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

// Campos com rótulo visível dos formulários do painel. O `<label>` envolve o controlo, por isso
// o rótulo é o nome acessível sem precisar de `id` — é por ele que os testes encontram o campo.
// A ajuda fica fora do `<label>`, para não entrar nesse nome.

const CLASSE_DO_CONTROLO =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-normal text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-piquete-blue-bright/20 focus:border-piquete-blue-bright transition-all'

function Rotulado({ rotulo, ajuda, children }: { rotulo: string; ajuda?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
        {rotulo}
        {children}
      </label>
      {ajuda && <span className="text-xs text-slate-500">{ajuda}</span>}
    </div>
  )
}

interface CampoDeTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  rotulo: string
  ajuda?: string
}

export function CampoDeTexto({ rotulo, ajuda, ...props }: CampoDeTextoProps) {
  return (
    <Rotulado rotulo={rotulo} ajuda={ajuda}>
      <input className={`placeholder:text-slate-400 ${CLASSE_DO_CONTROLO}`} {...props} />
    </Rotulado>
  )
}

interface AreaDeTextoProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  rotulo: string
  ajuda?: string
}

export function AreaDeTexto({ rotulo, ajuda, rows = 2, ...props }: AreaDeTextoProps) {
  return (
    <Rotulado rotulo={rotulo} ajuda={ajuda}>
      <textarea rows={rows} className={`placeholder:text-slate-400 ${CLASSE_DO_CONTROLO}`} {...props} />
    </Rotulado>
  )
}

interface CampoDeSeleccaoProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  rotulo: string
}

export function CampoDeSeleccao({ rotulo, children, ...props }: CampoDeSeleccaoProps) {
  return (
    <Rotulado rotulo={rotulo}>
      <select className={`cursor-pointer ${CLASSE_DO_CONTROLO}`} {...props}>
        {children}
      </select>
    </Rotulado>
  )
}
