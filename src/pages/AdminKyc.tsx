import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useProfile } from '../hooks/useProfile'
import { useKycSubmissions, useReviewKyc } from '../hooks/useKyc'
import type { KycStatus, ProfessionalKyc } from '../services/kyc'
import { BackButton } from '../components/BackButton'

const STATUS_LABELS: Record<KycStatus, string> = {
  PENDING: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
}

const STATUS_STYLES: Record<KycStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const STATUS_FILTERS: Array<KycStatus | 'ALL'> = ['PENDING', 'APPROVED', 'REJECTED', 'ALL']

const STATUS_FILTER_LABELS: Record<KycStatus | 'ALL', string> = {
  PENDING: 'Em análise',
  APPROVED: 'Aprovados',
  REJECTED: 'Rejeitados',
  ALL: 'Todos',
}

// TRD Adendo v1.6: superfície mínima para o ADMIN exercer GET/PATCH /admin/kyc — não
// é um "painel" com métricas, só a fila de revisão. Guard de role feito aqui (não há
// convenção de RequireRole dedicada no projeto ainda — ver OnboardingGate.tsx para a
// mesma decisão tomada para onboarding): sem role ADMIN, redireciona para a Home em
// vez de mostrar um ecrã vazio ou um 403 cru do backend.
export function AdminKyc() {
  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const [statusFilter, setStatusFilter] = useState<KycStatus | 'ALL'>('PENDING')
  const { data: submissions, isLoading, isError } = useKycSubmissions(statusFilter === 'ALL' ? undefined : statusFilter)
  const reviewKycMutation = useReviewKyc()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

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

  function handleApprove(kyc: ProfessionalKyc) {
    reviewKycMutation.mutate(
      { kycId: kyc.id, payload: { status: 'APPROVED' } },
      {
        onSuccess: () => toast.success(`Submissão de ${kyc.bi_number} aprovada.`),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível aprovar esta submissão.'),
      },
    )
  }

  function handleStartReject(kycId: string) {
    setRejectingId(kycId)
    setRejectNotes('')
  }

  function handleConfirmReject(kyc: ProfessionalKyc) {
    if (!rejectNotes.trim()) {
      toast.error('Indica o motivo da rejeição.')
      return
    }

    reviewKycMutation.mutate(
      { kycId: kyc.id, payload: { status: 'REJECTED', review_notes: rejectNotes.trim() } },
      {
        onSuccess: () => {
          toast.success(`Submissão de ${kyc.bi_number} rejeitada.`)
          setRejectingId(null)
          setRejectNotes('')
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível rejeitar esta submissão.'),
      },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Revisão de KYC</h1>
      </header>

      <div className="flex gap-2 text-sm">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`rounded-lg px-3 py-1.5 ${statusFilter === filter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {STATUS_FILTER_LABELS[filter]}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">Não foi possível carregar as submissões. Verifica a tua ligação e tenta novamente.</p>
      )}

      {submissions && submissions.length === 0 && <p className="text-sm text-gray-600">Não há submissões neste estado.</p>}

      {submissions && submissions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {submissions.map((kyc) => (
            <li key={kyc.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">BI {kyc.bi_number}</p>
                  <p className="text-xs text-gray-500">NUIT {kyc.nuit_number}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[kyc.status]}`}>
                  {STATUS_LABELS[kyc.status]}
                </span>
              </div>

              {kyc.review_notes && <p className="text-sm text-gray-600">Motivo: {kyc.review_notes}</p>}

              {kyc.status === 'PENDING' && (
                <div className="flex flex-col gap-2">
                  {rejectingId === kyc.id ? (
                    <div className="flex flex-col gap-2">
                      <label className="flex flex-col gap-1 text-sm text-gray-700">
                        Motivo da rejeição
                        <textarea
                          value={rejectNotes}
                          onChange={(event) => setRejectNotes(event.target.value)}
                          rows={2}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmReject(kyc)}
                          disabled={reviewKycMutation.isPending}
                          className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                        >
                          Confirmar rejeição
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingId(null)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(kyc)}
                        disabled={reviewKycMutation.isPending}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartReject(kyc.id)}
                        disabled={reviewKycMutation.isPending}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
