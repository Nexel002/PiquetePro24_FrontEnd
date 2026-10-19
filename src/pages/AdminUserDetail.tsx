import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAdminUserDetail, useBanUser, useChangeUserRole, useResendEmail, useUnbanUser } from '../hooks/useAdminUsers'
import { useActivateSubscriptionManually, useUserSubscription } from '../hooks/useSubscription'
import { NotasInternas } from '../components/admin/NotasInternas'
import { EmpresaNaFicha, EquipaNaFicha } from '../components/admin/EquipaNaFicha'
import { rotaDaAuditoria } from '../components/admin/layout/rotas'
import type { SubscriptionStatus } from '../services/subscriptions'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card, CardContent } from '../components/ui/Card'
import type { ProfessionalType, UserRole } from '../services/profile'
import type { AdminUserDetail as AdminUserDetailData, ResendEmailTemplate } from '../services/adminUsers'
import { LayoutDividido, ColunaDaFoto } from '../components/layout/LayoutDividido'

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Administrador',
  TECHNICIAN: 'Técnico',
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

function isBanned(bannedUntil: string | null): boolean {
  return bannedUntil !== null && new Date(bannedUntil).getTime() > Date.now()
}

export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: user, isLoading, isError } = useAdminUserDetail(id ?? '')
  const resendEmailMutation = useResendEmail()
  const [resendTemplate, setResendTemplate] = useState<ResendEmailTemplate>('welcome')

  const banMutation = useBanUser()
  const unbanMutation = useUnbanUser()
  const [isConfirmingBan, setIsConfirmingBan] = useState(false)

  const changeRoleMutation = useChangeUserRole()
  const [targetProfessionalType, setTargetProfessionalType] = useState<ProfessionalType>('SINGULAR')
  const [isConfirmingRoleChange, setIsConfirmingRoleChange] = useState(false)

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

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-piquete-yellow border-t-piquete-blue" />
          <p className="text-sm font-medium text-gray-600">A carregar ficha de utilizador...</p>
        </div>
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 text-xl">
          ⚠️
        </div>
        <p className="text-sm text-gray-700 max-w-sm">
          Não foi possível carregar este utilizador. Verifica a tua ligação e tenta novamente.
        </p>
        <Link to="/admin/utilizadores">
          <Button variant="outline" size="sm">
            Voltar aos utilizadores
          </Button>
        </Link>
      </div>
    )
  }

  const initial = (user.full_name || 'U').charAt(0).toUpperCase()
  const localidade = [user.neighborhood, user.district, user.province].filter(Boolean).join(', ')

  return (
    <div className="min-h-dvh w-full pb-28 animate-fade-in lg:pb-0">
      <LayoutDividido
        foto={
          <ColunaDaFoto
            imagem={
              user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-piquete-blue via-piquete-blue-light to-piquete-blue-bright p-8 text-white">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/10 border-2 border-white/25 text-5xl font-extrabold font-heading shadow-xl backdrop-blur-md">
                    {initial}
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/70">
                    Sem fotografia registada
                  </p>
                </div>
              )
            }
            identidade={
              <div className="flex flex-col gap-2 text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-md border border-white/30">
                    {ROLE_LABELS[user.role]}
                  </span>
                  {user.kyc_status && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/95 border border-white/20 backdrop-blur-md">
                      KYC: {KYC_STATUS_LABELS[user.kyc_status]}
                    </span>
                  )}
                  {isBanned(user.banned_until) && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white border border-rose-300">
                      Conta Banida
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading drop-shadow-sm">
                  {user.full_name}
                </h1>

                <p className="text-xs text-white/80">
                  Membro desde {memberSinceFormatter.format(new Date(user.created_at))}
                </p>
              </div>
            }
          />
        }
      >
        {/* Lado direito: Ficha de dados e ações de administração */}
        <section className="flex flex-col gap-5 rounded-[2.5rem] bg-white p-6 shadow-card border border-gray-100 sm:p-7">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Painel de Controlo</span>
              <h2 className="text-lg font-bold text-piquete-blue font-heading">Ficha e Moderação de Conta</h2>
            </div>
            <Link to={rotaDaAuditoria({ user_id: user.id })}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Histórico de ações</span>
              </Button>
            </Link>
          </div>

          {/* Dados Pessoais e Contacto */}
          <div className="flex flex-col gap-3 rounded-2xl bg-gray-50/80 border border-gray-100 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Dados do Registo</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500 font-medium">Telefone</dt>
              <dd className="text-gray-900 font-semibold flex items-center gap-2">
                {user.phone ? (
                  <>
                    <span>{user.phone}</span>
                    <a
                      href={`tel:${user.phone}`}
                      className="text-xs text-piquete-blue underline hover:text-piquete-blue-light"
                    >
                      Ligar
                    </a>
                  </>
                ) : (
                  <span className="text-gray-400 font-normal">Sem telefone registado</span>
                )}
              </dd>

              <dt className="text-gray-500 font-medium">Localização</dt>
              <dd className="text-gray-900">
                {localidade || <span className="text-gray-400 font-normal">Não definida</span>}
              </dd>

              <dt className="text-gray-500 font-medium">Estado do KYC</dt>
              <dd className="text-gray-900 font-medium">
                {user.kyc_status ? (
                  <Badge variant={user.kyc_status === 'APPROVED' ? 'approved' : user.kyc_status === 'REJECTED' ? 'rejected' : 'pending'}>
                    {KYC_STATUS_LABELS[user.kyc_status]}
                  </Badge>
                ) : (
                  <span className="text-gray-400 font-normal">Sem submissão de KYC</span>
                )}
              </dd>

              <dt className="text-gray-500 font-medium">Pedidos como cliente</dt>
              <dd className="text-gray-900 font-semibold">{user.service_requests_as_client}</dd>

              <dt className="text-gray-500 font-medium">Pedidos como profissional</dt>
              <dd className="text-gray-900 font-semibold">{user.service_requests_as_professional}</dd>
            </dl>
          </div>

          {/* Se for profissional singular ou empresa */}
          {user.role === 'PROFESSIONAL' && <SubscricaoDoProfissional userId={user.id} />}

          {/* Equipa ou Empresa associada */}
          {user.team && <EquipaNaFicha team={user.team} />}
          {user.company && <EmpresaNaFicha company={user.company} />}

          {/* Notas internas do Admin */}
          <NotasInternas targetType="USER" targetId={user.id} />

          {/* Reenviar Email */}
          <Card variant="solid">
            <CardContent className="flex flex-col gap-2 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Reenviar email</h3>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendEmail}
                  disabled={resendEmailMutation.isPending}
                  isLoading={resendEmailMutation.isPending}
                >
                  Reenviar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Moderação de Conta */}
          <Card variant="solid" className="border-rose-200 bg-rose-50/30">
            <CardContent className="flex flex-col gap-3 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700">Moderação de conta</h3>

              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-700">
                  {isBanned(user.banned_until)
                    ? `Conta banida até ${banExpiryFormatter.format(new Date(user.banned_until as string))}.`
                    : 'Conta com acesso ativo sem restrições.'}
                </p>

                {isBanned(user.banned_until) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUnban}
                    disabled={unbanMutation.isPending}
                    isLoading={unbanMutation.isPending}
                    className="self-start"
                  >
                    Levantar banimento
                  </Button>
                ) : isConfirmingBan ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleConfirmBan}
                      disabled={banMutation.isPending}
                      isLoading={banMutation.isPending}
                    >
                      Confirmar Banimento
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsConfirmingBan(false)}
                      disabled={banMutation.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConfirmingBan(true)}
                    className="self-start border-rose-300 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors"
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
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={handleConfirmRoleChange}
                          disabled={changeRoleMutation.isPending}
                          isLoading={changeRoleMutation.isPending}
                        >
                          {`Confirmar mudança para ${user.role === 'CLIENT' ? 'Profissional' : 'Cliente'}`}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsConfirmingRoleChange(false)}
                          disabled={changeRoleMutation.isPending}
                        >
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
                      className="self-start border-rose-300 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors"
                    >
                      Mudar para {user.role === 'CLIENT' ? 'Profissional' : 'Cliente'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </LayoutDividido>
    </div>
  )
}

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  INACTIVE: 'Inativa',
  ACTIVE: 'Ativa',
  EXPIRED: 'Expirada',
}

const subscriptionDateFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long', timeZone: 'Africa/Maputo' })

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
      <CardContent className="flex flex-col gap-3 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Subscrição</h3>

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
