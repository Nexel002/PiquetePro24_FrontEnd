import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useChosenProfessional } from '../../hooks/useInvitations'
import type { RequestStatus, ServiceRequest } from '../../services/serviceRequests'
import { PropostasDoPedido } from '../../pages/RequestProposals'
import { BotaoDenunciar } from '../moderacao/BotaoDenunciar'
import { Button } from '../ui/Button'
import { ContactoDoProfissional } from './ContactoDoProfissional'
import { RepetirRegularmente } from './RepetirRegularmente'
import { ReviewForm } from './ReviewForm'

const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: 'Aberto',
  ASSIGNED: 'Atribuído',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  ASSIGNED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const createdAtFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })

// O contacto do profissional do pedido, só quando o cliente o pede (o backend só o entrega ao dono do pedido).
// É o mesmo endpoint dos pedidos de 3 profissionais, depois da escolha.
function VerContactoDoProfissional({ requestId }: { requestId: string }) {
  const [aberto, setAberto] = useState(false)
  const contacto = useChosenProfessional(requestId, aberto)

  if (!aberto) {
    return (
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setAberto(true)}>
        Ver contacto do profissional
      </Button>
    )
  }
  if (contacto.isLoading) return <div role="status" aria-label="A carregar" className="h-14 animate-pulse rounded-2xl bg-gray-200" />
  if (contacto.isError || !contacto.data) {
    return <p role="alert" className="text-xs text-gray-600">Não foi possível carregar o contacto. Tenta novamente.</p>
  }
  return <ContactoDoProfissional nome={contacto.data.full_name} telefone={contacto.data.phone} />
}

interface CartaoDoPedidoDoClienteProps {
  pedido: ServiceRequest
  propostasAbertas: boolean
  aoAlternarPropostas: () => void
  // As mutations vivem na página (uma para a lista toda), como antes da extracção: enquanto
  // uma conclusão ou um cancelamento está a correr, os botões desse tipo ficam todos bloqueados.
  aoConcluir: () => void
  aoCancelar: () => void
  aConcluir: boolean
  aCancelar: boolean
}

// Espelha as mesmas transições que o backend já valida (serviceRequestService.ts):
// só ASSIGNED pode ser concluído; OPEN ou ASSIGNED podem ser cancelados — nunca
// mostra um botão que o backend rejeitaria.
export function CartaoDoPedidoDoCliente({
  pedido,
  propostasAbertas,
  aoAlternarPropostas,
  aoConcluir,
  aoCancelar,
  aConcluir,
  aCancelar,
}: CartaoDoPedidoDoClienteProps) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{pedido.title}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[pedido.status]}`}>
          {STATUS_LABELS[pedido.status]}
        </span>
      </div>

      {pedido.description && <p className="text-sm text-gray-600">{pedido.description}</p>}

      <p className="text-xs text-gray-500">
        {[pedido.province, pedido.district, pedido.neighborhood].filter(Boolean).join(' — ')}
        {' · '}
        {createdAtFormatter.format(new Date(pedido.created_at))}
      </p>

      {pedido.professional_name && pedido.professional_id && (
        <p className="text-xs text-gray-600">
          Profissional:{' '}
          <Link to={`/profissionais/${pedido.professional_id}`} className="font-semibold text-piquete-blue hover:underline">
            {pedido.professional_name}
          </Link>
        </p>
      )}

      {pedido.is_direct && pedido.status === 'ASSIGNED' && (
        <p className="text-xs text-gray-600">
          {pedido.client_contact_viewed_at ? '✓ O profissional já viu o teu pedido.' : 'O profissional foi avisado e ainda não abriu o pedido.'}
        </p>
      )}

      {pedido.professional_id && pedido.status === 'ASSIGNED' && <VerContactoDoProfissional requestId={pedido.id} />}

      {pedido.technician && (
        <div className="flex items-center gap-2 rounded-xl bg-piquete-blue/5 px-3 py-2 text-xs text-piquete-blue">
          {pedido.technician.avatar_url ? (
            <img src={pedido.technician.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-piquete-blue/10 font-bold">
              {pedido.technician.first_name.charAt(0).toUpperCase()}
            </span>
          )}
          <span>
            Vem o <span className="font-bold">{pedido.technician.first_name}</span> · {pedido.technician.title}
          </span>
        </div>
      )}

      {(pedido.invited_count ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={propostasAbertas}
            onClick={aoAlternarPropostas}
            className="flex w-full items-center justify-between rounded-xl bg-piquete-blue/5 px-3 py-2 text-left text-xs font-semibold text-piquete-blue hover:bg-piquete-blue/10"
          >
            <span>
              Enviado a {pedido.invited_count} profissionais · {pedido.proposal_count ?? 0}{' '}
              {pedido.proposal_count === 1 ? 'proposta' : 'propostas'}
            </span>
            <span aria-hidden>{propostasAbertas ? '▾' : '›'}</span>
          </button>
          {propostasAbertas && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
              <PropostasDoPedido requestId={pedido.id} />
            </div>
          )}
        </div>
      )}

      {pedido.status === 'COMPLETED' && pedido.professional_id && pedido.has_review === false && (
        <ReviewForm requestId={pedido.id} professionalId={pedido.professional_id} technicianName={pedido.technician?.first_name} />
      )}

      {/* Fase 42 (N3): o mesmo serviço, com o mesmo profissional, regularmente. */}
      {pedido.status === 'COMPLETED' && pedido.professional_id && pedido.category_id && <RepetirRegularmente requestId={pedido.id} />}

      {pedido.professional_id && pedido.status !== 'OPEN' && (
        <BotaoDenunciar targetType="SERVICE_REQUEST" targetId={pedido.id} descricao="com este pedido" rotulo="Reportar um problema" />
      )}

      {(pedido.status === 'OPEN' || pedido.status === 'ASSIGNED') && (
        <div className="flex gap-2">
          {pedido.status === 'ASSIGNED' && (
            <button
              type="button"
              onClick={aoConcluir}
              disabled={aConcluir}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Concluir
            </button>
          )}
          <button
            type="button"
            onClick={aoCancelar}
            disabled={aCancelar}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      )}
    </li>
  )
}
