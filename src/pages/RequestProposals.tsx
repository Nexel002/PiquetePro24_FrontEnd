import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useChooseProposal, useChosenProfessional, useRequestProposals } from '../hooks/useInvitations'
import { formatInternationalPhone } from '../lib/phone'
import type { Proposal } from '../services/invitations'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'

const priceFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'MZN' })
const dateFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })

interface ProposalCardProps {
  proposal: Proposal
  isCheapest: boolean
  // Só se escolhe enquanto o pedido está aberto e ainda ninguém foi escolhido.
  canChoose: boolean
  isChoosing: boolean
  onChoose: () => void
}

// Escolher é irreversível — confirmação em duas etapas, a mesma convenção de "Apagar
// conta" em Profile.tsx.
function ProposalCard({ proposal, isCheapest, canChoose, isChoosing, onChoose }: ProposalCardProps) {
  const [confirming, setConfirming] = useState(false)
  const chosen = proposal.status === 'CHOSEN'

  return (
    <Card variant="solid" className={chosen ? 'ring-2 ring-emerald-500' : ''}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {proposal.avatar_url ? (
            <img src={proposal.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
          ) : (
            <div
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-piquete-blue/10 text-lg font-bold text-piquete-blue"
            >
              {proposal.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <Link to={`/profissionais/${proposal.professional_id}`} className="truncate text-sm font-bold text-gray-900 hover:underline">
              {proposal.full_name}
            </Link>
            <p className="text-xs text-piquete-gray">
              {proposal.rating_avg !== null ? (
                <>
                  <span className="text-piquete-yellow">★</span> {proposal.rating_avg.toLocaleString('pt-PT', { minimumFractionDigits: 1 })} (
                  {proposal.rating_count})
                </>
              ) : (
                'Sem avaliações'
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="font-heading text-lg font-extrabold text-piquete-blue">{priceFormatter.format(proposal.proposal_price)}</p>
            {isCheapest && !chosen && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Mais barato</span>
            )}
            {chosen && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Escolhido</span>
            )}
          </div>
        </div>

        {proposal.proposal_message && (
          <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-piquete-gray-dark">{proposal.proposal_message}</p>
        )}

        {proposal.responded_at && <p className="text-[11px] text-gray-400">{dateFormatter.format(new Date(proposal.responded_at))}</p>}

        {canChoose && !confirming && (
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)} className="self-start">
            Escolher
          </Button>
        )}

        {canChoose && confirming && (
          <div className="flex flex-col gap-2 rounded-xl bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              Ao escolheres {proposal.full_name}, os outros profissionais são avisados e o pedido deixa de receber propostas. Confirmas?
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={onChoose} disabled={isChoosing} isLoading={isChoosing} className="flex-1">
                Sim, escolher
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={isChoosing} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Comparação das propostas de um pedido dirigido (Backend Fase 11, TRD Adendo v1.18):
// o cliente vê preço e mensagem de quem respondeu, lado a lado, e escolhe um. Só depois
// de escolher é revelado o telefone do profissional.
export function RequestProposals() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useRequestProposals(id)
  const chooseProposal = useChooseProposal(id ?? '')

  const hasChosen = data !== undefined && data.request_status !== 'OPEN' && data.request_status !== 'CANCELLED'
  const chosenProfessional = useChosenProfessional(id, hasChosen)
  const isOpen = data?.request_status === 'OPEN'

  const cheapestPrice = data?.proposals.length ? Math.min(...data.proposals.map((proposal) => proposal.proposal_price)) : null
  const pending = data ? data.invited_count - data.proposals.length : 0

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 pb-12 sm:p-6 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 font-heading text-xl font-bold text-piquete-blue">Propostas</h1>
        <Link to="/os-meus-pedidos" className="text-xs font-semibold text-piquete-blue hover:underline">
          Os meus pedidos
        </Link>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <div className="h-32 animate-pulse rounded-3xl bg-gray-200" />
          <div className="h-32 animate-pulse rounded-3xl bg-gray-200" />
        </div>
      )}

      {isError && (
        <Card className="border-red-100 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-600">Não foi possível carregar as propostas. Verifica a tua ligação.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </Card>
      )}

      {data && hasChosen && chosenProfessional.data && (
        <Card variant="solid" className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm font-bold text-emerald-800">Contacta {chosenProfessional.data.full_name}</p>
            {chosenProfessional.data.phone ? (
              <a
                href={`tel:${formatInternationalPhone(chosenProfessional.data.phone)}`}
                className="text-lg font-extrabold text-emerald-900 underline"
              >
                {formatInternationalPhone(chosenProfessional.data.phone)}
              </a>
            ) : (
              <p className="text-xs text-emerald-700">Este profissional ainda não registou um telefone.</p>
            )}
            <p className="text-xs text-emerald-700">Combina com ele os detalhes do trabalho e, no fim, conclui o pedido em “Os meus pedidos”.</p>
          </CardContent>
        </Card>
      )}

      {data && data.request_status === 'CANCELLED' && (
        <p className="rounded-2xl bg-gray-100 p-3 text-sm text-gray-600">Este pedido foi cancelado.</p>
      )}

      {data && data.proposals.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-sm font-semibold text-gray-700">Ainda sem propostas.</p>
          <p className="text-xs text-piquete-gray">Os {data.invited_count} profissionais foram avisados por email. Volta mais tarde.</p>
        </Card>
      )}

      {data && data.proposals.length > 0 && (
        <>
          {isOpen && pending > 0 && (
            <p className="px-1 text-xs text-piquete-gray">
              {data.proposals.length} de {data.invited_count} responderam. Podes esperar pelos restantes ou escolher já.
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {data.proposals.map((proposal) => (
              <li key={proposal.professional_id}>
                <ProposalCard
                  proposal={proposal}
                  isCheapest={data.proposals.length > 1 && proposal.proposal_price === cheapestPrice}
                  canChoose={isOpen}
                  isChoosing={chooseProposal.isPending && chooseProposal.variables === proposal.professional_id}
                  onChoose={() => chooseProposal.mutate(proposal.professional_id)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
