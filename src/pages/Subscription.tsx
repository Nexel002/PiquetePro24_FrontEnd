import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useInitiateSubscription, useMySubscription } from '../hooks/useSubscription'
import { BackButton } from '../components/BackButton'
import { formatInternationalPhone, PHONE_PREFIX } from '../lib/phone'
import type { InitiateSubscriptionPayload, SubscriptionStatus, SubscriptionSummary } from '../services/subscriptions'

type GatewayPagavel = InitiateSubscriptionPayload['gateway']

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  INACTIVE: 'Inativa',
  ACTIVE: 'Ativa',
  EXPIRED: 'Expirada',
}

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  INACTIVE: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
}

// Prefixos por operador — os mesmos que o backend valida (subscriptionController.ts):
// validar aqui também dá a mensagem antes do pedido, em vez de depois de um round-trip
// numa rede lenta.
const GATEWAYS: Record<GatewayPagavel, { nome: string; operador: string; prefixos: string[] }> = {
  MPESA_MOCK: { nome: 'M-Pesa', operador: 'Vodacom', prefixos: ['84', '85'] },
  EMOLA_MOCK: { nome: 'e-Mola', operador: 'Movitel', prefixos: ['86', '87'] },
}

// Hora de Maputo, não a do browser — mesma convenção de AdminAuditLog.tsx.
const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long', timeZone: 'Africa/Maputo' })
const valorFormatter = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function erroTelefone(gateway: GatewayPagavel, digitos: string): string | null {
  if (!/^8\d{8}$/.test(digitos)) {
    return 'Indica os 9 dígitos do número de telemóvel (ex. 841234567).'
  }
  const { nome, operador, prefixos } = GATEWAYS[gateway]
  if (!prefixos.includes(digitos.slice(0, 2))) {
    return `O ${nome} só aceita números ${operador} (${prefixos.join(' ou ')}).`
  }
  return null
}

// Backend Fase 5 (TRD Adendo v1.12). Um só ecrã para os estados todos — o que mostrar
// decide-se pelo resumo de GET /subscriptions, pela ordem em que as condições
// bloqueiam o profissional: KYC → pagamento a decorrer → pagamentos indisponíveis →
// formulário.
export function Subscription() {
  const { data: summary, isLoading, isError } = useMySubscription()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Subscrição</h1>
        <Link to="/perfil" className="text-sm text-gray-600 underline">
          Perfil
        </Link>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-32 animate-pulse rounded bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">
          Não foi possível carregar a tua subscrição. Verifica a tua ligação e tenta novamente.
        </p>
      )}

      {summary && <ConteudoSubscricao summary={summary} />}
    </main>
  )
}

function ConteudoSubscricao({ summary }: { summary: SubscriptionSummary }) {
  const transacao = summary.latest_transaction
  const pendente = transacao?.status === 'PENDING'

  return (
    <>
      <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900">Estado</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[summary.status]}`}>
            {STATUS_LABELS[summary.status]}
          </span>
        </div>
        {summary.status === 'ACTIVE' && summary.valid_until && (
          <p className="text-sm text-gray-600">Válida até {dataFormatter.format(new Date(summary.valid_until))}.</p>
        )}
        {summary.status === 'EXPIRED' && (
          <p className="text-sm text-gray-600">
            A tua subscrição expirou. Renova-a para voltares a aceitar pedidos.
          </p>
        )}
        {summary.status === 'INACTIVE' && (
          <p className="text-sm text-gray-600">Precisas de uma subscrição ativa para aceitar pedidos de clientes.</p>
        )}
        <p className="text-sm text-gray-600">
          Plano mensal: {valorFormatter.format(summary.plan.amount)} {summary.plan.currency} por{' '}
          {summary.plan.duration_days} dias.
        </p>
      </section>

      {!summary.kyc_approved ? (
        <section className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Primeiro, a verificação de identidade</p>
          <p className="text-sm text-amber-800">
            Só podes pagar a subscrição depois de a tua identidade (KYC) estar aprovada — assim não pagas por um serviço
            que ainda não podes usar.
          </p>
          <Link to="/verificacao-identidade" className="self-start text-sm text-amber-900 underline">
            Ir para a verificação de identidade
          </Link>
        </section>
      ) : pendente ? (
        <section role="status" className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <div aria-hidden className="h-4 w-4 animate-pulse rounded-full bg-amber-400" />
            <p className="text-sm font-medium text-amber-800">A aguardar confirmação do pagamento</p>
          </div>
          <p className="text-sm text-amber-800">
            Confirma o pagamento no telemóvel {transacao.payer_phone ? formatInternationalPhone(transacao.payer_phone) : ''} (introduz o PIN
            quando o pedido aparecer). Esta página atualiza sozinha.
          </p>
        </section>
      ) : !summary.payments_available ? (
        <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-900">Pagamento online ainda indisponível</p>
          <p className="text-sm text-gray-600">
            Por agora, a ativação da subscrição é feita pela equipa PiquetePro24. Contacta-nos para combinar o pagamento
            — a tua subscrição fica ativa assim que o confirmarmos.
          </p>
        </section>
      ) : (
        <>
          {transacao?.status === 'FAILED' && summary.status !== 'ACTIVE' && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              O último pagamento não foi concluído. Podes tentar outra vez.
            </p>
          )}
          <FormularioPagamento summary={summary} />
        </>
      )}
    </>
  )
}

function FormularioPagamento({ summary }: { summary: SubscriptionSummary }) {
  const gatewaysDisponiveis = summary.gateways.filter((g): g is GatewayPagavel => g in GATEWAYS)
  const [gateway, setGateway] = useState<GatewayPagavel>(gatewaysDisponiveis[0] ?? 'MPESA_MOCK')
  const [digitos, setDigitos] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const initiate = useInitiateSubscription()

  const simulado = gatewaysDisponiveis.some((g) => g.endsWith('_MOCK'))

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const mensagem = erroTelefone(gateway, digitos)
    setErro(mensagem)
    if (mensagem) return

    initiate.mutate(
      { gateway, phone: digitos },
      {
        onSuccess: () => toast.success('Pedido de pagamento enviado. Confirma-o no telemóvel.'),
        // Mensagens do backend já são para o utilizador (403 KYC, 409 pagamento
        // pendente, 429 demasiadas tentativas, 503 sem gateway).
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível iniciar o pagamento.'),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-sm font-medium text-gray-900">
        {summary.status === 'ACTIVE' ? 'Renovar antecipadamente' : 'Pagar subscrição'}
      </h2>
      {summary.status === 'ACTIVE' && (
        <p className="text-sm text-gray-600">Os novos {summary.plan.duration_days} dias somam-se aos que ainda tens.</p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-gray-700">Método de pagamento</legend>
        {gatewaysDisponiveis.map((g) => (
          <label
            key={g}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
              gateway === g ? 'border-gray-900' : 'border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="gateway"
              value={g}
              checked={gateway === g}
              onChange={() => {
                setGateway(g)
                setErro(null)
              }}
            />
            <span className="text-gray-900">
              {GATEWAYS[g].nome} <span className="text-gray-500">({GATEWAYS[g].operador} {GATEWAYS[g].prefixos.join('/')})</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        Número que vai pagar
        <div className="flex items-center rounded-lg border border-gray-300">
          <span className="border-r border-gray-300 px-3 py-2 text-sm text-gray-500">{PHONE_PREFIX}</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            required
            maxLength={9}
            value={digitos}
            onChange={(event) => {
              setDigitos(event.target.value.replace(/\D/g, ''))
              setErro(null)
            }}
            aria-invalid={erro !== null}
            aria-describedby={erro ? 'erro-telefone' : undefined}
            className="min-w-0 flex-1 rounded-r-lg px-3 py-2 text-sm"
            placeholder="841234567"
          />
        </div>
        {erro && (
          <span id="erro-telefone" className="text-sm text-red-600">
            {erro}
          </span>
        )}
      </label>

      <button
        type="submit"
        disabled={initiate.isPending}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {initiate.isPending
          ? 'A enviar pedido...'
          : `Pagar ${valorFormatter.format(summary.plan.amount)} ${summary.plan.currency}`}
      </button>

      {simulado && (
        <p className="text-xs text-gray-500">Ambiente de testes: o pagamento é simulado e nenhum valor é cobrado.</p>
      )}
    </form>
  )
}
