import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useProfile } from '../hooks/useProfile'
import { useAdminUserDetail, useBanUser, useChangeUserRole, useResendEmail, useUnbanUser } from '../hooks/useAdminUsers'
import { BackButton } from '../components/BackButton'
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
        <div className="h-6 w-6 animate-pulse rounded-full bg-gray-300" />
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-2xl font-semibold text-gray-900">Ficha de utilizador</h1>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-24 animate-pulse rounded bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">Não foi possível carregar este utilizador. Verifica a tua ligação e tenta novamente.</p>
      )}

      {user && (
        <>
          <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div
                  aria-hidden
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-lg font-medium text-gray-500"
                >
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-lg font-medium text-gray-900">{user.full_name}</p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-gray-500">Telefone</dt>
              <dd className="text-gray-900">{user.phone ?? 'sem telefone'}</dd>

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
          </section>

          {/* Adendo v1.9, item B: liga à mesma tela de audit log já existente
              (Adendo v1.8), filtrada por este utilizador — sem endpoint novo, o
              backend já aceita user_id como filtro desde a Fase 8. */}
          <Link
            to={`/admin/audit-log?user_id=${user.id}`}
            className="self-start rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            Ver histórico de ações
          </Link>

          {/* Adendo v1.9, item F: sem endpoint novo de leitura — reaproveita o
              EmailService já existente do lado do backend. Sem lógica de mostrar só
              os templates "relevantes" para este utilizador (ex. esconder KYC para
              um CLIENT sem submissão) — decisão consciente de simplicidade, o admin
              sabe o que está a fazer ao escolher. */}
          <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-medium text-gray-500">Reenviar email</h2>
            <div className="flex gap-2">
              <select
                value={resendTemplate}
                onChange={(event) => setResendTemplate(event.target.value as ResendEmailTemplate)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              >
                {Object.entries(RESEND_EMAIL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={resendEmailMutation.isPending}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                {resendEmailMutation.isPending ? 'A enviar...' : 'Reenviar'}
              </button>
            </div>
          </section>

          {/* Adendo v1.9, item G: moderação de contas. "sign-out" (revogar sessões
              por ID) não existe nesta entrega — o SDK instalado exige o JWT da
              sessão, não um ID de utilizador; ver TRD para o detalhe. Mudar role só
              aparece para CLIENT/PROFESSIONAL — nunca para ADMIN, o backend rejeita
              e a UI nem oferece a opção. */}
          <section className="flex flex-col gap-3 rounded-lg border border-red-200 p-4">
            <h2 className="text-sm font-medium text-red-700">Moderação de conta</h2>

            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-700">
                {isBanned(user.banned_until)
                  ? `Conta banida até ${banExpiryFormatter.format(new Date(user.banned_until as string))}.`
                  : 'Conta sem banimento ativo.'}
              </p>

              {isBanned(user.banned_until) ? (
                <button
                  type="button"
                  onClick={handleUnban}
                  disabled={unbanMutation.isPending}
                  className="self-start rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  {unbanMutation.isPending ? 'A levantar banimento...' : 'Levantar banimento'}
                </button>
              ) : isConfirmingBan ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmBan}
                    disabled={banMutation.isPending}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {banMutation.isPending ? 'A banir...' : 'Sim, banir'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingBan(false)}
                    disabled={banMutation.isPending}
                    className="text-sm text-gray-600 underline disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingBan(true)}
                  className="self-start rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700"
                >
                  Banir conta
                </button>
              )}
            </div>

            {user.role !== 'ADMIN' && (
              <div className="flex flex-col gap-2 border-t border-red-100 pt-3">
                <p className="text-sm text-gray-700">
                  Role atual: <span className="font-medium">{ROLE_LABELS[user.role]}</span>
                </p>

                {isConfirmingRoleChange ? (
                  <div className="flex flex-col gap-2">
                    {user.role === 'CLIENT' && (
                      <select
                        value={targetProfessionalType}
                        onChange={(event) => setTargetProfessionalType(event.target.value as ProfessionalType)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      >
                        {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmRoleChange}
                        disabled={changeRoleMutation.isPending}
                        className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {changeRoleMutation.isPending
                          ? 'A alterar...'
                          : `Sim, mudar para ${user.role === 'CLIENT' ? 'Profissional' : 'Cliente'}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingRoleChange(false)}
                        disabled={changeRoleMutation.isPending}
                        className="text-sm text-gray-600 underline disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingRoleChange(true)}
                    className="self-start rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700"
                  >
                    Mudar para {user.role === 'CLIENT' ? 'Profissional' : 'Cliente'}
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
