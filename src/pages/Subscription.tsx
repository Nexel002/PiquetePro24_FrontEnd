import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useInitiateSubscription, useMySubscription } from '../hooks/useSubscription'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card, CardContent } from '../components/ui/Card'
import { formatInternationalPhone, PHONE_PREFIX } from '../lib/phone'
import type { InitiateSubscriptionPayload, SubscriptionStatus, SubscriptionSummary } from '../services/subscriptions'

type GatewayPagavel = InitiateSubscriptionPayload['gateway']

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  INACTIVE: 'Inativa',
  ACTIVE: 'Ativa',
  EXPIRED: 'Expirada',
}

const STATUS_BADGE_VARIANT: Record<SubscriptionStatus, 'info' | 'active' | 'rejected'> = {
  INACTIVE: 'info',
  ACTIVE: 'active',
  EXPIRED: 'rejected',
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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
          Subscrição
        </h1>
        <Link to="/perfil" className="text-xs font-semibold text-piquete-blue hover:text-piquete-yellow-hover hover:underline">
          Perfil
        </Link>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <div className="h-6 w-40 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-32 animate-pulse rounded-3xl bg-gray-200" />
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
      <Card variant="solid">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-piquete-blue">Estado</p>
            <Badge variant={STATUS_BADGE_VARIANT[summary.status]}>{STATUS_LABELS[summary.status]}</Badge>
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
        </CardContent>
      </Card>

      {!summary.kyc_approved ? (
        <Card variant="solid" className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm font-bold text-amber-800">Primeiro, a verificação de identidade</p>
            <p className="text-sm text-amber-800">
              Só podes pagar a subscrição depois de a tua identidade (KYC) estar aprovada — assim não pagas por um serviço
              que ainda não podes usar.
            </p>
            <Link to="/verificacao-identidade" className="self-start text-sm font-semibold text-amber-900 underline">
              Ir para a verificação de identidade
            </Link>
          </CardContent>
        </Card>
      ) : pendente ? (
        <Card variant="solid" className="border-amber-200 bg-amber-50">
          <CardContent role="status" className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div aria-hidden className="h-4 w-4 animate-pulse rounded-full bg-amber-400" />
              <p className="text-sm font-bold text-amber-800">A aguardar confirmação do pagamento</p>
            </div>
            <p className="text-sm text-amber-800">
              Confirma o pagamento no telemóvel {transacao.payer_phone ? formatInternationalPhone(transacao.payer_phone) : ''} (introduz o PIN
              quando o pedido aparecer). Esta página atualiza sozinha.
            </p>
          </CardContent>
        </Card>
      ) : !summary.payments_available ? (
        <Card variant="solid">
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm font-bold text-piquete-blue">Pagamento online ainda indisponível</p>
            <p className="text-sm text-gray-600">
              Por agora, a ativação da subscrição é feita pela equipa PiquetePro24. Contacta-nos para combinar o pagamento
              — a tua subscrição fica ativa assim que o confirmarmos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {transacao?.status === 'FAILED' && summary.status !== 'ACTIVE' && (
            <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
    <Card variant="solid">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-piquete-blue">
            {summary.status === 'ACTIVE' ? 'Renovar antecipadamente' : 'Pagar subscrição'}
          </h2>
          {summary.status === 'ACTIVE' && (
            <p className="text-sm text-gray-600">Os novos {summary.plan.duration_days} dias somam-se aos que ainda tens.</p>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-piquete-blue-dark">
              Método de pagamento
            </legend>
            {gatewaysDisponiveis.map((g) => (
              <label
                key={g}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  gateway === g ? 'border-piquete-blue bg-piquete-blue/5' : 'border-gray-200 hover:border-gray-300'
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
                  className="accent-piquete-blue"
                />
                <span className="text-gray-900">
                  {GATEWAYS[g].nome} <span className="text-gray-500">({GATEWAYS[g].operador} {GATEWAYS[g].prefixos.join('/')})</span>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col gap-1.5 group">
            <span className="text-xs font-semibold uppercase tracking-wider text-piquete-blue-dark">Número que vai pagar</span>
            <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-piquete-blue focus-within:ring-2 focus-within:ring-piquete-blue/20">
              <span className="flex items-center bg-gray-50 px-3 text-sm text-gray-500 border-r border-gray-200">{PHONE_PREFIX}</span>
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
                className="min-w-0 flex-1 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                placeholder="841234567"
              />
            </div>
            {erro && (
              <span id="erro-telefone" className="text-xs text-rose-500 font-medium">
                {erro}
              </span>
            )}
          </label>

          <Button type="submit" variant="primary" size="lg" disabled={initiate.isPending} isLoading={initiate.isPending} className="w-full">
            {initiate.isPending ? 'A enviar pedido...' : `Pagar ${valorFormatter.format(summary.plan.amount)} ${summary.plan.currency}`}
          </Button>

          {simulado && (
            <p className="text-xs text-gray-500 text-center">Ambiente de testes: o pagamento é simulado e nenhum valor é cobrado.</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
