import { IconeDeAdmin } from './IconeDeAdmin'

interface PaginacaoProps {
  offset: number
  // Quantas linhas a página actual trouxe.
  quantos: number
  tamanho: number
  aoMudar: (offset: number) => void
}

// Paginação alinhada à direita no rodapé da tabela, inspirada na imagem de referência.
export function Paginacao({ offset, quantos, tamanho, aoMudar }: PaginacaoProps) {
  if (offset === 0 && quantos < tamanho) return null

  return (
    <div className="flex justify-end items-center gap-4 text-sm py-4 px-4 sm:px-8 border-t border-slate-100 bg-white">
      <span className="text-xs text-slate-500 font-medium">
        {offset + 1} - {offset + quantos}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => aoMudar(Math.max(0, offset - tamanho))}
          disabled={offset === 0}
          aria-label="Anterior"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <IconeDeAdmin nome="recolher" className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => aoMudar(offset + tamanho)}
          disabled={quantos < tamanho}
          aria-label="Seguinte"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <IconeDeAdmin nome="expandir" className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
