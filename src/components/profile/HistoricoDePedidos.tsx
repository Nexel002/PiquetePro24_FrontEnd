import { Link } from 'react-router-dom'
import { useCancelServiceRequest, useCompleteServiceRequest, useMyServiceRequests } from '../../hooks/useServiceRequests'
import { useServiceCategories } from '../../hooks/useServiceCategories'
import { Button } from '../ui/Button'
import { PedidoDoHistorico } from './PedidoDoHistorico'

export function HistoricoDePedidos() {
  const { data: requests, isLoading, isError, refetch } = useMyServiceRequests()
  const completeRequest = useCompleteServiceRequest()
  const cancelRequest = useCancelServiceRequest()
  const { data: categories } = useServiceCategories()
  const nomesDasCategorias = new Map((categories ?? []).map((categoria) => [categoria.id, categoria.name]))

  return (
    <section className="flex flex-col gap-4 rounded-[2.5rem] bg-white p-6 shadow-card border border-gray-100 sm:p-7">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-piquete-blue sm:text-xl">Histórico de Pedidos</h2>
          <p className="text-xs text-gray-500">Serviços solicitados e respetivo estado</p>
        </div>
        {requests && requests.length > 0 && (
          <Link to="/os-meus-pedidos" className="text-xs font-semibold text-piquete-blue hover:text-piquete-yellow-hover hover:underline">
            Ver todos ({requests.length})
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      ) : isError ? (
        // Sem este ramo, uma falha de rede caía no estado vazio e dizia «Nenhum pedido realizado»
        // a quem tem pedidos — um erro que parece um dado.
        <div role="alert" className="flex flex-col items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-800">Não foi possível carregar os teus pedidos. Verifica a tua ligação e tenta novamente.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : requests && requests.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {requests.map((pedido) => (
            <PedidoDoHistorico
              key={pedido.id}
              pedido={pedido}
              nomeDaCategoria={pedido.category_id ? (nomesDasCategorias.get(pedido.category_id) ?? null) : null}
              aConcluir={completeRequest.isPending}
              aCancelar={cancelRequest.isPending}
              aoConcluir={() => completeRequest.mutate(pedido.id)}
              aoCancelar={() => cancelRequest.mutate(pedido.id)}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white border border-gray-100 shadow-card text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-piquete-yellow/15 border border-piquete-yellow/30 flex items-center justify-center text-2xl text-piquete-blue">
            📋
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-piquete-blue">Nenhum pedido realizado</h3>
            <p className="text-xs text-gray-500 max-w-xs">
              Ainda não fizeste nenhum pedido de serviço no PiquetePro24. Encontra canalizadores, eletricistas e técnicos disponíveis perto de ti.
            </p>
          </div>
          <Link
            to="/profissionais"
            aria-label="Fazer o meu primeiro pedido"
            className="mt-2 w-14 h-14 rounded-full bg-gradient-to-r from-piquete-yellow via-yellow-400 to-amber-400 text-piquete-blue shadow-glow-yellow border border-yellow-300/30 flex items-center justify-center hover:brightness-105 active:scale-95 transition-all"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 5a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 0110 5z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      )}
    </section>
  )
}
