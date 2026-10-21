import { Link } from 'react-router-dom'
import { useServiceRequestContact } from '../hooks/useServiceRequests'
import { formatInternationalPhone } from '../lib/phone'

// Contacto e localização do cliente de um pedido atribuído. Usado pela empresa/profissional
// («Trabalhos aceites») e pelo técnico a quem o trabalho foi atribuído («Os meus trabalhos»): a
// regra de quem pode ver vive no backend, aqui só se mostra o resultado ou o motivo da recusa.
export function ContactoCliente({ requestId }: { requestId: string }) {
  const { data: contact, isLoading, error } = useServiceRequestContact(requestId, { enabled: true })

  if (isLoading) {
    return <div className="h-16 animate-pulse rounded-2xl bg-gray-200" />
  }

  // A mensagem do backend explica o motivo (ex. subscrição expirou depois de aceitar: «Para ver o
  // contacto do cliente precisas de subscrição ativa.»), e o link leva a quem a pode resolver.
  if (error) {
    return (
      <div role="alert" className="flex flex-col gap-1 rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm text-amber-800">{error.message}</p>
        {error.message.includes('subscrição') && !error.message.includes('empresa') && (
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
      {/* Fase 40 (N6): cliente empresa ou instituição — o que é preciso para a factura. */}
      {contact.business && (
        <p className="rounded-xl bg-white px-3 py-2 text-xs text-gray-700">
          <span className="font-semibold">Facturar a:</span> {contact.business.name ?? 'Empresa sem nome indicado'}
          {contact.business.nuit && <> · NUIT {contact.business.nuit}</>}
        </p>
      )}
      {contact.client_phone ? (
        <a href={`tel:${formatInternationalPhone(contact.client_phone)}`} className="self-start text-piquete-blue font-semibold underline">
          Ligar: {formatInternationalPhone(contact.client_phone)}
        </a>
      ) : (
        <p className="text-gray-600">O cliente ainda não registou um número de telefone.</p>
      )}
      <p className="text-gray-600">{[contact.neighborhood, contact.district, contact.province].filter(Boolean).join(', ')}</p>
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
