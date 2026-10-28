import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCancelServiceRequest, useCompleteServiceRequest, useMyServiceRequests } from '../hooks/useServiceRequests'
import { BackButton } from '../components/BackButton'
import { PedidosPorEnviar } from '../components/PedidosPorEnviar'
import { usePedidosPendentes } from '../hooks/usePedidosPendentes'
import { ExportarOsMeusPedidos } from '../components/pedidos/ExportarOsMeusPedidos'
import { CartaoDoPedidoDoCliente } from '../components/pedidos/CartaoDoPedidoDoCliente'
import { Separadores, type DefinicaoDeSeparador } from '../components/admin/estrutura/Separadores'
import { useSeparadorDoEndereco } from '../components/admin/estrutura/useSeparadorDoEndereco'
import { ConteudoDeRecorrentes } from './RecurringRequests'
import { ConteudoDeProfissionais } from './MyProfessionals'

export const SEPARADORES_DOS_MEUS_PEDIDOS = ['pedidos', 'recorrentes', 'profissionais'] as const
export type SeparadorDosMeusPedidos = (typeof SEPARADORES_DOS_MEUS_PEDIDOS)[number]

const SEPARADORES: DefinicaoDeSeparador<SeparadorDosMeusPedidos>[] = [
  { id: 'pedidos', rotulo: 'Pedidos' },
  { id: 'recorrentes', rotulo: 'Recorrentes' },
  { id: 'profissionais', rotulo: 'Profissionais' },
]

// Central do cliente: pedidos, serviços recorrentes e profissionais já contratados, por
// separadores. O que cada pedido mostra e permite fazer vive em CartaoDoPedidoDoCliente.
export function MyServiceRequests() {
  const [separador, mudarSeparador] = useSeparadorDoEndereco(SEPARADORES_DOS_MEUS_PEDIDOS)
  const { data: requests, isLoading, isError } = useMyServiceRequests()
  const completeRequest = useCompleteServiceRequest()
  const cancelRequest = useCancelServiceRequest()
  const { pedidos: porEnviar } = usePedidosPendentes()
  const [propostasAbertasId, setPropostasAbertasId] = useState<string | null>(null)

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 pb-12 sm:p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Os meus pedidos</h1>
        <Link to="/perfil" className="text-sm text-gray-600 underline">
          Perfil
        </Link>
      </header>

      <Separadores rotulo="Secções dos meus pedidos" separadores={SEPARADORES} activo={separador} aoMudar={mudarSeparador} />

      {separador === 'recorrentes' && <ConteudoDeRecorrentes />}
      {separador === 'profissionais' && <ConteudoDeProfissionais />}

      {separador === 'pedidos' && (
        <>
          <PedidosPorEnviar />

          {isLoading && (
            <div className="flex flex-col gap-2">
              <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
            </div>
          )}

          {isError && (
            <p className="text-sm text-gray-600">
              Não foi possível carregar os teus pedidos. Verifica a tua ligação e tenta novamente.
            </p>
          )}

          {requests && requests.length === 0 && porEnviar.length === 0 && (
            <p className="text-sm text-gray-600">
              Ainda não criaste nenhum pedido.{' '}
              <Link to="/profissionais" className="underline">
                Procura um profissional
              </Link>{' '}
              para começar.
            </p>
          )}

          {requests && requests.length > 0 && (
            <div className="flex items-center justify-end gap-2">
              <ExportarOsMeusPedidos />
            </div>
          )}

          {requests && requests.length > 0 && (
            <ul className="flex flex-col gap-3">
              {requests.map((serviceRequest) => (
                <CartaoDoPedidoDoCliente
                  key={serviceRequest.id}
                  pedido={serviceRequest}
                  propostasAbertas={propostasAbertasId === serviceRequest.id}
                  aoAlternarPropostas={() => setPropostasAbertasId(propostasAbertasId === serviceRequest.id ? null : serviceRequest.id)}
                  aoConcluir={() => completeRequest.mutate(serviceRequest.id)}
                  aoCancelar={() => cancelRequest.mutate(serviceRequest.id)}
                  aConcluir={completeRequest.isPending}
                  aCancelar={cancelRequest.isPending}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
