import { INVITATIONS_PER_REQUEST } from '../../services/invitations'
import { Button } from '../ui/Button'

interface BarraDeEnvioDoPedidoProps {
  nomeDoServico: string
  escolhidos: number
  necessarios: number
  podeEnviar: boolean
  aoEnviar: () => void
}

export function BarraDeEnvioDoPedido({ nomeDoServico, escolhidos, necessarios, podeEnviar, aoEnviar }: BarraDeEnvioDoPedidoProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/60 bg-white/95 p-4 shadow-glass backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <p className="flex-1 text-sm text-piquete-gray-dark" aria-live="polite">
          <span className="font-extrabold text-piquete-blue">
            {escolhidos}/{necessarios}
          </span>{' '}
          {necessarios === INVITATIONS_PER_REQUEST
            ? `profissionais escolhidos para ${nomeDoServico}`
            : `escolhidos (só há ${necessarios} para ${nomeDoServico})`}
        </p>
        <Button type="button" onClick={aoEnviar} disabled={!podeEnviar} className="px-6 py-2.5 font-bold shadow-glow-yellow">
          Pedir a {necessarios}
        </Button>
      </div>
    </div>
  )
}
