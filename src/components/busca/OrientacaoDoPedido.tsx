interface OrientacaoDoPedidoProps {
  nomeDoServico: string | null
  profissionaisNecessarios: number
}

// Diz ao utilizador o que falta para poder enviar um pedido: sem serviço escolhido não há
// caixas de selecção nos cartões, e este aviso explica porquê.
export function OrientacaoDoPedido({ nomeDoServico, profissionaisNecessarios }: OrientacaoDoPedidoProps) {
  if (nomeDoServico === null) {
    return (
      <div className="mt-4 flex justify-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-piquete-blue/15 bg-piquete-blue/5 px-4 py-2 text-xs font-semibold text-piquete-blue shadow-xs">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Para enviares um pedido, escolhe primeiro o serviço nos botões acima.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-piquete-blue px-3.5 py-1.5 text-xs font-bold text-white shadow-xs">
        ✓ {nomeDoServico}
      </span>
      <span className="text-xs font-medium text-gray-500">
        Escolhe até {profissionaisNecessarios} profissionais na lista abaixo para enviar o pedido
      </span>
    </div>
  )
}
