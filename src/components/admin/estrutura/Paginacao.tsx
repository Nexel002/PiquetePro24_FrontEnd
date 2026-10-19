import { Button } from '../../ui/Button'

interface PaginacaoProps {
  offset: number
  // Quantas linhas a página actual trouxe.
  quantos: number
  tamanho: number
  aoMudar: (offset: number) => void
}

// Os endpoints do admin não devolvem o total, só a página: «há seguinte» deduz-se de a página
// vir cheia. Por isso, com uma página só (início e menos linhas que o tamanho), não se mostra nada.
export function Paginacao({ offset, quantos, tamanho, aoMudar }: PaginacaoProps) {
  if (offset === 0 && quantos < tamanho) return null

  return (
    <div className="flex justify-between items-center text-sm p-4 sm:px-6 border-t border-slate-100 bg-slate-50/30">
      <Button type="button" variant="ghost" size="sm" onClick={() => aoMudar(Math.max(0, offset - tamanho))} disabled={offset === 0}>
        ← Anterior
      </Button>
      <span className="text-xs text-slate-500 font-medium">
        A mostrar {offset + 1}–{offset + quantos}
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={() => aoMudar(offset + tamanho)} disabled={quantos < tamanho}>
        Seguinte →
      </Button>
    </div>
  )
}
