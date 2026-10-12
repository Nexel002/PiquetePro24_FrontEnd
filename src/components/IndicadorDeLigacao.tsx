import { useEstadoDeLigacao } from '../lib/conectividade'

// Faixa fixa no topo, só visível quando há problema: com tudo bem não ocupa espaço nem
// distrai (o público usa telemóveis de gama baixa, o ecrã é pequeno).
// role="status" (polite) e não "alert": a perda de rede é frequente neste contexto e um
// leitor de ecrã não deve interromper o que está a ler de cada vez que acontece.
export function IndicadorDeLigacao() {
  const estado = useEstadoDeLigacao()
  if (estado === 'ligado') return null

  const texto =
    estado === 'sem-rede'
      ? 'Sem ligação à internet. Os dados já carregados continuam visíveis.'
      : 'Sem resposta do servidor. A tentar de novo ao fazer uma nova acção.'

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 bg-gray-900 px-4 py-1.5 text-center text-xs font-medium text-white"
    >
      {texto}
    </div>
  )
}
