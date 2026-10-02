import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAssignedServiceRequests, useServiceRequestContact } from '../hooks/useServiceRequests'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { formatInternationalPhone } from '../lib/phone'
import type { RequestStatus, ServiceRequest } from '../services/serviceRequests'

const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: 'Aberto',
  ASSIGNED: 'Em curso',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const STATUS_BADGE_VARIANT: Record<RequestStatus, 'info' | 'pending' | 'approved' | 'rejected'> = {
  OPEN: 'info',
  ASSIGNED: 'pending',
  COMPLETED: 'approved',
  CANCELLED: 'rejected',
}

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeZone: 'Africa/Maputo' })

// Backend TRD Adendo v1.12, itens B e G: os pedidos que o profissional aceitou, e o
// contacto do cliente para os que estão em curso. Sem isto, depois de aceitar um
// pedido em "Pedidos perto de ti" não havia forma de lhe voltar.
export function AssignedServiceRequests() {
  const { data: requests, isLoading, isError } = useAssignedServiceRequests()

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
          Trabalhos aceites
        </h1>
        <Link to="/perfil" className="text-xs font-semibold text-piquete-blue hover:text-piquete-yellow-hover hover:underline">
          Perfil
        </Link>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">
          Não foi possível carregar os teus trabalhos. Verifica a tua ligação e tenta novamente.
        </p>
      )}

      {requests && requests.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white border border-gray-100 shadow-card text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-piquete-yellow/15 border border-piquete-yellow/30 flex items-center justify-center text-2xl text-piquete-blue">
            🧰
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-piquete-blue">Ainda não aceitaste nenhum pedido</h3>
          </div>
          <Link to="/pedidos-proximos" className="mt-2">
            <Button variant="primary" size="md" className="rounded-xl font-bold shadow-glow-yellow">
              Ver pedidos perto de ti
            </Button>
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
    <li className="flex flex-col gap-2.5 rounded-2xl bg-white border border-gray-100 shadow-card p-4 transition-all duration-300 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-piquete-blue">{request.title}</p>
        <Badge variant={STATUS_BADGE_VARIANT[request.status]}>{STATUS_LABELS[request.status]}</Badge>
      </div>
      {request.description && <p className="text-xs text-gray-600 leading-relaxed">{request.description}</p>}
      <p className="text-[11px] text-gray-400">
        {[request.neighborhood, request.district, request.province].filter(Boolean).join(', ')}
        {request.assigned_at && ` · aceite a ${dataFormatter.format(new Date(request.assigned_at))}`}
      </p>

      {request.status === 'ASSIGNED' &&
        (mostrarContacto ? (
          <ContactoCliente requestId={request.id} />
        ) : (
          <Button type="button" variant="primary" size="sm" onClick={() => setMostrarContacto(true)} className="self-start">
            Ver contacto do cliente
          </Button>
        ))}
    </li>
  )
}

function ContactoCliente({ requestId }: { requestId: string }) {
  const { data: contact, isLoading, error } = useServiceRequestContact(requestId, { enabled: true })

  if (isLoading) {
    return <div className="h-16 animate-pulse rounded-2xl bg-gray-200" />
  }

  // A mensagem do backend explica o motivo (ex. subscrição expirou depois de aceitar:
  // "Para ver o contacto do cliente precisas de subscrição ativa."), e o link leva a
  // quem a pode resolver.
  if (error) {
    return (
      <div role="alert" className="flex flex-col gap-1 rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm text-amber-800">{error.message}</p>
        {error.message.includes('subscrição') && (
          <Link to="/subscricao" className="self-start text-sm font-semibold text-amber-900 underline">
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
    <div className="flex flex-col gap-2 rounded-2xl bg-gray-50 border border-gray-100 p-3 text-sm">
      <p className="font-bold text-piquete-blue">{contact.client_name}</p>
      {contact.client_phone ? (
        <a href={`tel:${formatInternationalPhone(contact.client_phone)}`} className="self-start text-piquete-blue font-semibold underline">
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
          className="self-start text-piquete-blue font-semibold underline"
        >
          Abrir localização exata no mapa
        </a>
      ) : (
        <p className="text-gray-600">Sem localização GPS — o cliente indicou só o bairro.</p>
      )}
    </div>
  )
}
