import { Link, Navigate, useParams } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAdminUserDetail } from '../hooks/useAdminUsers'
import { BackButton } from '../components/BackButton'
import type { UserRole } from '../services/profile'
import type { AdminUserDetail as AdminUserDetailData } from '../services/adminUsers'

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

const memberSinceFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' })

// TRD Adendo v1.9, item B. Mesma convenção de guard de role dentro do próprio
// componente já usada em AdminKyc.tsx/AdminAuditLog.tsx/AdminUsers.tsx.
export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const { data: user, isLoading, isError } = useAdminUserDetail(id ?? '')

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
        </>
      )}
    </main>
  )
}
