import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useProfile } from '../hooks/useProfile'
import { useDeclineInvitation, useMyInvitations, useSubmitProposal } from '../hooks/useInvitations'
import type { Eligibility, Invitation, InvitationStatus } from '../services/invitations'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

const STATUS_LABELS: Record<InvitationStatus, string> = {
  INVITED: 'À espera da tua resposta',
  PROPOSED: 'Proposta enviada',
  DECLINED: 'Recusado',
  CHOSEN: 'Foste escolhido!',
  NOT_CHOSEN: 'Outro profissional foi escolhido',
}

const STATUS_STYLES: Record<InvitationStatus, string> = {
  INVITED: 'bg-amber-100 text-amber-700',
  PROPOSED: 'bg-blue-100 text-blue-700',
  DECLINED: 'bg-gray-100 text-gray-500',
  CHOSEN: 'bg-green-100 text-green-700',
  NOT_CHOSEN: 'bg-gray-100 text-gray-500',
}

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })
const priceFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'MZN' })

// Explica o que falta em vez de esconder o formulário em silêncio (Backend TRD Adendo
// v1.18, item E): quem não tem KYC aprovado e subscrição ativa recebe os convites, mas
// o backend recusa a proposta — o ecrã diz porquê e leva ao sítio de o resolver.
function EligibilityNotice({ eligibility }: { eligibility: Eligibility }) {
  return (
    <Card variant="solid" className="border-amber-200 bg-amber-50">
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm font-bold text-amber-800">Ainda não podes responder aos pedidos</p>
        <p className="text-xs text-amber-700">Para enviares propostas precisas de:</p>
        <ul className="flex flex-col gap-1 text-xs text-amber-800">
          {!eligibility.kyc_approved && (
            <li>
              Verificação de identidade (KYC) aprovada —{' '}
              <Link to="/verificacao-identidade" className="font-semibold underline">
                submeter documentos
              </Link>
            </li>
          )}
          {!eligibility.subscription_active && (
            <li>
              Subscrição ativa —{' '}
              <Link to="/subscricao" className="font-semibold underline">
                ver subscrição
              </Link>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}

function ProposalForm({ requestId }: { requestId: string }) {
  const submitProposal = useSubmitProposal()
  const declineInvitation = useDeclineInvitation()
  const [price, setPrice] = useState('')
  const [message, setMessage] = useState('')
  const busy = submitProposal.isPending || declineInvitation.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const value = Number(price.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Indica um preço válido, em meticais.')
      return
    }
    submitProposal.mutate({ requestId, payload: { price: value, message: message.trim() || undefined } })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-gray-100 pt-3">
      <Input
        label="O teu preço (MZN)"
        type="text"
        inputMode="decimal"
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        required
        placeholder="Ex: 1500"
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-piquete-blue-dark">Mensagem (opcional)</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Quando podes fazer, o que está incluído..."
          className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none focus:ring-2 focus:ring-piquete-blue/20"
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} isLoading={submitProposal.isPending} className="flex-1">
          Enviar proposta
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          isLoading={declineInvitation.isPending}
          onClick={() => declineInvitation.mutate(requestId)}
          className="flex-1"
        >
          Recusar
        </Button>
      </div>
    </form>
  )
}

function InvitationCard({ invitation, canRespond }: { invitation: Invitation; canRespond: boolean }) {
  const { request } = invitation
  const requestClosed = request.status !== 'OPEN'
  const zone = [request.neighborhood, request.district, request.province].filter(Boolean).join(', ')

  return (
    <Card variant="solid">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-gray-900">{request.title}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[invitation.status]}`}>
            {STATUS_LABELS[invitation.status]}
          </span>
        </div>

        {request.description && <p className="text-sm text-gray-600">{request.description}</p>}

        <p className="text-xs text-gray-500">
          {zone} · {dateFormatter.format(new Date(invitation.created_at))}
        </p>

        {invitation.status === 'PROPOSED' && invitation.proposal_price !== null && (
          <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
            A tua proposta: <span className="font-bold">{priceFormatter.format(invitation.proposal_price)}</span>
            {invitation.proposal_message && <span className="block text-xs text-blue-700">“{invitation.proposal_message}”</span>}
          </p>
        )}

        {invitation.status === 'CHOSEN' && (
          <Link to="/trabalhos-aceites" className="text-sm font-semibold text-piquete-blue underline">
            Ver o contacto do cliente nos trabalhos aceites
          </Link>
        )}

        {invitation.status === 'INVITED' && requestClosed && (
          <p className="text-xs text-gray-500">Este pedido já foi fechado pelo cliente.</p>
        )}

        {invitation.status === 'INVITED' && !requestClosed && canRespond && <ProposalForm requestId={invitation.service_request_id} />}
      </CardContent>
    </Card>
  )
}

// Pedidos que clientes enviaram ao profissional (Backend Fase 11, TRD Adendo v1.18):
// responde com uma proposta (preço + mensagem) ou recusa. Guard inline de role, mesmo
// padrão de Kyc.tsx/Subscription.tsx.
export function ReceivedInvitations() {
  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const isProfessional = profile?.role === 'PROFESSIONAL'
  const { data, isLoading, isError, refetch } = useMyInvitations(isProfessional)

  if (isProfileLoading) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 p-4 sm:p-6">
        <div className="h-6 w-40 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-32 animate-pulse rounded-3xl bg-gray-200" />
      </main>
    )
  }

  if (!isProfessional) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 pb-12 sm:p-6 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 font-heading text-xl font-bold text-piquete-blue">Pedidos recebidos</h1>
        <Link to="/perfil" className="text-xs font-semibold text-piquete-blue hover:underline">
          Perfil
        </Link>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <div className="h-28 animate-pulse rounded-3xl bg-gray-200" />
          <div className="h-28 animate-pulse rounded-3xl bg-gray-200" />
        </div>
      )}

      {isError && (
        <Card className="border-red-100 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-600">Não foi possível carregar os pedidos. Verifica a tua ligação.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </Card>
      )}

      {data && !data.eligibility.eligible && data.invitations.length > 0 && <EligibilityNotice eligibility={data.eligibility} />}

      {data && data.invitations.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-sm font-semibold text-gray-700">Ainda não recebeste nenhum pedido.</p>
          <p className="text-xs text-piquete-gray">
            Escolhe os teus serviços no{' '}
            <Link to="/catalogo" className="font-semibold text-piquete-blue underline">
              catálogo
            </Link>{' '}
            para os clientes te encontrarem.
          </p>
        </Card>
      )}

      {data && data.invitations.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.invitations.map((invitation) => (
            <li key={invitation.service_request_id}>
              <InvitationCard invitation={invitation} canRespond={data.eligibility.eligible} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
