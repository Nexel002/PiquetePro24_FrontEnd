import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useProfile } from '../hooks/useProfile'
import { useAdminUserDetail, useBanUser, useChangeUserRole, useResendEmail, useUnbanUser } from '../hooks/useAdminUsers'
import { useActivateSubscriptionManually, useUserSubscription } from '../hooks/useSubscription'
import type { SubscriptionStatus } from '../services/subscriptions'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card, CardContent } from '../components/ui/Card'
import type { ProfessionalType, UserRole } from '../services/profile'
import type { AdminUserDetail as AdminUserDetailData, ResendEmailTemplate } from '../services/adminUsers'

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Administrador',
}

const KYC_STATUS_LABELS: Record<NonNullable<AdminUserDetailData['kyc_status']>, string> = {
  PENDING: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
}

const RESEND_EMAIL_LABELS: Record<ResendEmailTemplate, string> = {
  welcome: 'Boas-vindas',
  kyc_aprovado: 'KYC aprovado',
  kyc_rejeitado: 'KYC rejeitado',
}

const PROFESSIONAL_TYPE_LABELS: Record<ProfessionalType, string> = {
  SINGULAR: 'Profissional singular',
  COMPANY: 'Empresa',
}

const memberSinceFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' })
const banExpiryFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long', timeStyle: 'short' })

// Adendo v1.9, item G: ban_duration indefinido (876000h, ~100 anos) faz
// banned_until cair muito longe no futuro — qualquer data futura já conta como
// "banido" para efeitos da UI, sem precisar de um valor sentinela especial.
function isBanned(bannedUntil: string | null): boolean {
  return bannedUntil !== null && new Date(bannedUntil).getTime() > Date.now()
}

// TRD Adendo v1.9, item B. Mesma convenção de guard de role dentro do próprio
// componente já usada em AdminKyc.tsx/AdminAuditLog.tsx/AdminUsers.tsx.
export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const { data: user, isLoading, isError } = useAdminUserDetail(id ?? '')
  const resendEmailMutation = useResendEmail()
  const [resendTemplate, setResendTemplate] = useState<ResendEmailTemplate>('welcome')

  const banMutation = useBanUser()
  const unbanMutation = useUnbanUser()
  const [isConfirmingBan, setIsConfirmingBan] = useState(false)

  const changeRoleMutation = useChangeUserRole()
  const [targetProfessionalType, setTargetProfessionalType] = useState<ProfessionalType>('SINGULAR')
  const [isConfirmingRoleChange, setIsConfirmingRoleChange] = useState(false)

  if (isProfileLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-piquete-yellow border-t-piquete-blue" />
      </main>
    )
  }

  if (profile?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  if (!id) {
    return <Navigate to="/admin/utilizadores" replace />
  }

  function handleResendEmail() {
    if (!id) return
    resendEmailMutation.mutate(
      { userId: id, template: resendTemplate },
      {
        onSuccess: (result) => {
          if (result.enviado) {
            toast.success('Email reenviado.')
          } else if (result.motivo === 'desligado') {
            // Estado válido em dev/test (sem SMTP configurado) — não é um erro do
            // admin nem do utilizador, mas também não é "sucesso" no sentido normal.
            toast.info('Envio de email está desligado neste ambiente (sem SMTP configurado).')
          } else {
            toast.error('Não foi possível enviar o email. Tenta novamente.')
          }
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível reenviar o email.'),
      },
    )
  }

  function handleConfirmBan() {
    if (!id) return
    banMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Utilizador banido.')
        setIsConfirmingBan(false)
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível banir este utilizador.'),
    })
  }

  function handleUnban() {
    if (!id) return
    unbanMutation.mutate(id, {
      onSuccess: () => toast.success('Banimento levantado.'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível levantar o banimento.'),
    })
  }

  function handleConfirmRoleChange() {
    if (!id || !user) return
    const payload =
      user.role === 'CLIENT'
        ? ({ role: 'PROFESSIONAL', professionalType: targetProfessionalType } as const)
        : ({ role: 'CLIENT' } as const)

    changeRoleMutation.mutate(
      { userId: id, payload },
      {
        onSuccess: () => {
          toast.success('Role alterado.')
          setIsConfirmingRoleChange(false)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível alterar o role.'),
      },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">Ficha de utilizador</h1>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <div className="h-6 w-40 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-24 animate-pulse rounded-3xl bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">Não foi possível carregar este utilizador. Verifica a tua ligação e tenta novamente.</p>
      )}

      {user && (
        <>
          <Card variant="solid">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div
                    aria-hidden
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-piquete-yellow/15 border border-piquete-yellow/30 text-lg font-bold text-piquete-blue"
                  >
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-lg font-bold text-piquete-blue">{user.full_name}</p>
                  <Badge variant="info">{ROLE_LABELS[user.role]}</Badge>
                </div>
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm pt-1 border-t border-gray-100">
                <dt className="text-gray-500 pt-1.5">Telefone</dt>
                <dd className="text-gray-900 pt-1.5">{user.phone ?? 'sem telefone'}</dd>

                <dt className="text-gray-500">Localização</dt>
                <dd className="text-gray-900">
                  {[user.neighborhood, user.district, user.province].filter(Boolean).join(', ') || 'não definida'}
                </dd>

                <dt className="text-gray-500">Estado do KYC</dt>
                <dd className="text-gray-900">{user.kyc_status ? KYC_STATUS_LABELS[user.kyc_status] : 'sem submissão'}</dd>

                <dt className="text-gray-500">Pedidos como cliente</dt>
                <dd className="text-gray-900">{user.service_requests_as_client}</dd>

                <dt className="text-gray-500">Pedidos como profissional</dt>
                <dd className="text-gray-900">{user.service_requests_as_professional}</dd>

                <dt className="text-gray-500">Membro desde</dt>
                <dd className="text-gray-900">{memberSinceFormatter.format(new Date(user.created_at))}</dd>
              </dl>
            </CardContent>
          </Card>

          {/* Adendo v1.9, item B: liga à mesma tela de audit log já existente
              (Adendo v1.8), filtrada por este utilizador — sem endpoint novo, o
              backend já aceita user_id como filtro desde a Fase 8. */}
          <Link to={`/admin/audit-log?user_id=${user.id}`} className="self-start">
            <Button variant="outline" size="sm">
              Ver histórico de ações
            </Button>
          </Link>

          {user.role === 'PROFESSIONAL' && <SubscricaoDoProfissional userId={user.id} />}

          {/* Adendo v1.9, item F: sem endpoint novo de leitura — reaproveita o
              EmailService já existente do lado do backend. Sem lógica de mostrar só
              os templates "relevantes" para este utilizador (ex. esconder KYC para
              um CLIENT sem submissão) — decisão consciente de simplicidade, o admin
              sabe o que está a fazer ao escolher. */}
          <Card variant="solid">
            <CardContent className="flex flex-col gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Reenviar email</h2>
              <div className="flex gap-2">
                <select
                  value={resendTemplate}
                  onChange={(event) => setResendTemplate(event.target.value as ResendEmailTemplate)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue"
                >
                  {Object.entries(RESEND_EMAIL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm" onClick={handleResendEmail} disabled={resendEmailMutation.isPending} isLoading={resendEmailMutation.isPending}>
                  Reenviar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Adendo v1.9, item G: moderação de contas. "sign-out" (revogar sessões
              por ID) não existe nesta entrega — o SDK instalado exige o JWT da
              sessão, não um ID de utilizador; ver TRD para o detalhe. Mudar role só
              aparece para CLIENT/PROFESSIONAL — nunca para ADMIN, o backend rejeita
              e a UI nem oferece a opção. */}
          <Card variant="solid" className="border-rose-200">
            <CardContent className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-600">Moderação de conta</h2>

              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-700">
                  {isBanned(user.banned_until)
                    ? `Conta banida até ${banExpiryFormatter.format(new Date(user.banned_until as string))}.`
                    : 'Conta sem banimento ativo.'}
                </p>

                {isBanned(user.banned_until) ? (
                  <Button type="button" variant="outline" size="sm" onClick={handleUnban} disabled={unbanMutation.isPending} isLoading={unbanMutation.isPending} className="self-start">
                    Levantar banimento
                  </Button>
                ) : isConfirmingBan ? (
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="danger" size="sm" onClick={handleConfirmBan} disabled={banMutation.isPending} isLoading={banMutation.isPending}>
                      Sim, banir
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsConfirmingBan(false)} disabled={banMutation.isPending}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConfirmingBan(true)}
                    className="self-start border-rose-300 text-rose-600 hover:bg-rose-600 hover:text-white"
                  >
                    Banir conta
                  </Button>
                )}
              </div>

              {user.role !== 'ADMIN' && (
                <div className="flex flex-col gap-2 border-t border-rose-100 pt-3">
                  <p className="text-sm text-gray-700">
                    Role atual: <span className="font-semibold">{ROLE_LABELS[user.role]}</span>
                  </p>

                  {isConfirmingRoleChange ? (
                    <div className="flex flex-col gap-2">
                      {user.role === 'CLIENT' && (
                        <select
                          value={targetProfessionalType}
                          onChange={(event) => setTargetProfessionalType(event.target.value as ProfessionalType)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue"
                        >
                          {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="danger" size="sm" onClick={handleConfirmRoleChange} disabled={changeRoleMutation.isPending} isLoading={changeRoleMutation.isPending}>
                          {`Sim, mudar para ${user.role === 'CLIENT' ? 'Profissional' : 'Cliente'}`}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsConfirmingRoleChange(false)} disabled={changeRoleMutation.isPending}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsConfirmingRoleChange(true)}
                      className="self-start border-rose-300 text-rose-600 hover:bg-rose-600 hover:text-white"
                    >
                      Mudar para {user.role === 'CLIENT' ? 'Profissional' : 'Cliente'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  INACTIVE: 'Inativa',
  ACTIVE: 'Ativa',
  EXPIRED: 'Expirada',
}

const subscriptionDateFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long', timeZone: 'Africa/Maputo' })

// Backend TRD Adendo v1.12, item D: ativação manual — o caminho de produção enquanto não
// houver integração M-Pesa/e-Mola real. Componente próprio (e não mais estado dentro de
// AdminUserDetail) para os hooks de subscrição só correrem para perfis PROFESSIONAL: o
// backend não tem subscrição para CLIENT/ADMIN e o pedido seria desperdício. Mesma
// confirmação em dois passos das outras ações desta ficha.
function SubscricaoDoProfissional({ userId }: { userId: string }) {
  const { data: summary, isLoading, isError } = useUserSubscription(userId)
  const activateMutation = useActivateSubscriptionManually()
  const [note, setNote] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)

  function handleConfirm() {
    activateMutation.mutate(
      { userId, note: note.trim() },
      {
        onSuccess: (subscription) => {
          toast.success(
            subscription.expires_at
              ? `Subscrição ativada até ${subscriptionDateFormatter.format(new Date(subscription.expires_at))}.`
              : 'Subscrição ativada.',
          )
          setNote('')
          setIsConfirming(false)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível ativar a subscrição.'),
      },
    )
  }

  return (
    <Card variant="solid">
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Subscrição</h2>

        {isLoading && <div className="h-12 animate-pulse rounded-xl bg-gray-200" />}

        {isError && <p className="text-sm text-gray-600">Não foi possível carregar a subscrição deste profissional.</p>}

        {summary && (
          <>
            <p className="text-sm text-gray-700">
              Estado: <Badge variant={summary.status === 'ACTIVE' ? 'active' : summary.status === 'EXPIRED' ? 'rejected' : 'info'}>{SUBSCRIPTION_STATUS_LABELS[summary.status]}</Badge>
              {summary.valid_until && summary.status === 'ACTIVE' && (
                <span className="ml-2">— válida até {subscriptionDateFormatter.format(new Date(summary.valid_until))}</span>
              )}
            </p>

            {!summary.kyc_approved ? (
              <p className="text-sm text-gray-600">
                A ativação só fica disponível depois de o KYC deste profissional ser aprovado.
              </p>
            ) : isConfirming ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-700">
                  Confirmas que recebeste {summary.plan.amount} {summary.plan.currency}? A subscrição fica ativa por{' '}
                  {summary.plan.duration_days} dias
                  {summary.status === 'ACTIVE' ? ', somados aos que ainda restam' : ''}.
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="primary" size="sm" onClick={handleConfirm} disabled={activateMutation.isPending} isLoading={activateMutation.isPending}>
                    Sim, ativar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsConfirming(false)} disabled={activateMutation.isPending}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setIsConfirming(true)
                }}
                className="flex flex-col gap-2"
              >
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-piquete-blue-dark">Nota sobre o pagamento recebido</span>
                  {/* Fica no audit log — é a única prova de um pagamento feito por fora. */}
                  <textarea
                    required
                    maxLength={500}
                    rows={2}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="ex. Pago em numerário, recibo 0042"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue"
                  />
                </label>
                <Button type="submit" variant="outline" size="sm" disabled={note.trim().length === 0} className="self-start">
                  {summary.status === 'ACTIVE' ? 'Renovar manualmente' : 'Ativar subscrição'}
                </Button>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
