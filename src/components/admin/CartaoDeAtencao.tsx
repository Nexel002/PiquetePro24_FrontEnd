import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'

interface CartaoDeAtencaoProps {
  rotulo: string
  to: string
  // `undefined` = ainda a carregar; `null` = a fonte falhou. Zero é um valor válido
  // («tudo em dia»), por isso não pode servir de marcador de nenhum dos dois.
  valor: number | null | undefined
  vazio: string
  destaque?: boolean
}

export function CartaoDeAtencao({ rotulo, to, valor, vazio, destaque = false }: CartaoDeAtencaoProps) {
  let conteudo
  if (valor === undefined) {
    conteudo = <div role="status" aria-label="A carregar" className="h-8 w-16 animate-pulse rounded-lg bg-gray-200" />
  } else if (valor === null) {
    conteudo = <span className="text-sm text-gray-600">Não foi possível carregar.</span>
  } else if (valor === 0) {
    conteudo = <span className="text-sm font-semibold text-emerald-700">{vazio}</span>
  } else {
    conteudo = (
      <span className={`text-3xl font-extrabold font-heading ${destaque ? 'text-amber-700' : 'text-piquete-blue'}`}>
        {valor}
      </span>
    )
  }

  return (
    <Link to={to} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-piquete-blue">
      <Card variant="interactive" className="flex min-h-24 flex-col justify-between gap-2 p-4">
        <span className="text-sm text-gray-600">{rotulo}</span>
        {conteudo}
      </Card>
    </Link>
  )
}
