import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAssignedServiceRequests, useServiceRequestContact } from '../hooks/useServiceRequests'
import { BackButton } from '../components/BackButton'
import { formatInternationalPhone } from '../lib/phone'
import type { RequestStatus, ServiceRequest } from '../services/serviceRequests'

const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: 'Aberto',
  ASSIGNED: 'Em curso',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  OPEN: 'bg-gray-100 text-gray-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeZone: 'Africa/Maputo' })

// Backend TRD Adendo v1.12, itens B e G: os pedidos que o profissional aceitou, e o
// contacto do cliente para os que estão em curso. Sem isto, depois de aceitar um
// pedido em "Pedidos perto de ti" não havia forma de lhe voltar.
export function AssignedServiceRequests() {
  const { data: requests, isLoading, isError } = useAssignedServiceRequests()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Trabalhos aceites</h1>
        <Link to="/perfil" className="text-sm text-gray-600 underline">
          Perfil
        </Link>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">
          Não foi possível carregar os teus trabalhos. Verifica a tua ligação e tenta novamente.
        </p>
      )}

      {requests && requests.length === 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600">Ainda não aceitaste nenhum pedido.</p>
          <Link to="/pedidos-proximos" className="self-start text-sm text-gray-900 underline">
            Ver pedidos perto de ti
          </Link>
        </div>
      )}

      {requests && requests.length > 0 && (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <TrabalhoAceite key={request.id} request={request} />
          ))}
        </ul>
      )}
    </main>
  )
}

function TrabalhoAceite({ request }: { request: ServiceRequest }) {
  // O contacto só é pedido quando o profissional o abre — dados pessoais do cliente
  // não ficam em cache para todos os trabalhos da lista de uma vez.
  const [mostrarContacto, setMostrarContacto] = useState(false)

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{request.title}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[request.status]}`}>
          {STATUS_LABELS[request.status]}
        </span>
      </div>
      {request.description && <p className="text-sm text-gray-600">{request.description}</p>}
      <p className="text-xs text-gray-500">
        {[request.neighborhood, request.district, request.province].filter(Boolean).join(', ')}
        {request.assigned_at && ` · aceite a ${dataFormatter.format(new Date(request.assigned_at))}`}
      </p>

      {request.status === 'ASSIGNED' &&
        (mostrarContacto ? (
          <ContactoCliente requestId={request.id} />
        ) : (
          <button
            type="button"
            onClick={() => setMostrarContacto(true)}
            className="self-start rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Ver contacto do cliente
          </button>
        ))}
    </li>
  )
}

function ContactoCliente({ requestId }: { requestId: string }) {
  const { data: contact, isLoading, error } = useServiceRequestContact(requestId, { enabled: true })

  if (isLoading) {
    return <div className="h-16 animate-pulse rounded-lg bg-gray-200" />
  }

  // A mensagem do backend explica o motivo (ex. subscrição expirou depois de aceitar:
  // "Para ver o contacto do cliente precisas de subscrição ativa."), e o link leva a
  // quem a pode resolver.
  if (error) {
    return (
      <div role="alert" className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm text-amber-800">{error.message}</p>
        {error.message.includes('subscrição') && (
          <Link to="/subscricao" className="self-start text-sm text-amber-900 underline">
            Ver subscrição
          </Link>
        )}
      </div>
    )
  }

  if (!contact) {
    return null
  }

  const temCoordenadas = contact.latitude !== null && contact.longitude !== null

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 text-sm">
      <p className="font-medium text-gray-900">{contact.client_name}</p>
      {contact.client_phone ? (
        <a href={`tel:${formatInternationalPhone(contact.client_phone)}`} className="self-start text-gray-900 underline">
          Ligar: {formatInternationalPhone(contact.client_phone)}
        </a>
      ) : (
        <p className="text-gray-600">O cliente ainda não registou um número de telefone.</p>
      )}
      <p className="text-gray-600">
        {[contact.neighborhood, contact.district, contact.province].filter(Boolean).join(', ')}
      </p>
      {temCoordenadas ? (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${contact.latitude},${contact.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-gray-900 underline"
        >
          Abrir localização exata no mapa
        </a>
      ) : (
        <p className="text-gray-600">Sem localização GPS — o cliente indicou só o bairro.</p>
      )}
    </div>
  )
}
