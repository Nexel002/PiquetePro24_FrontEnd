import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useProfile } from '../hooks/useProfile'
import { useKycSubmissions, useReviewKyc } from '../hooks/useKyc'
import type { KycStatus, ProfessionalKyc } from '../services/kyc'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'

const STATUS_LABELS: Record<KycStatus, string> = {
  PENDING: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
}

const STATUS_BADGE_VARIANT: Record<KycStatus, 'pending' | 'approved' | 'rejected'> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-piquete-yellow border-t-piquete-blue" />
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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
          Revisão de KYC
        </h1>
      </header>

      <div className="flex gap-2 text-sm">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`rounded-xl px-3 py-1.5 font-semibold transition-colors ${
              statusFilter === filter ? 'bg-piquete-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {STATUS_FILTER_LABELS[filter]}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">Não foi possível carregar as submissões. Verifica a tua ligação e tenta novamente.</p>
      )}

      {submissions && submissions.length === 0 && <p className="text-sm text-gray-600">Não há submissões neste estado.</p>}

      {submissions && submissions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {submissions.map((kyc) => (
            <li key={kyc.id}>
              <Card variant="solid" className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-piquete-blue">BI {kyc.bi_number}</p>
                    <p className="text-xs text-gray-500">NUIT {kyc.nuit_number}</p>
                  </div>
                  <Badge variant={STATUS_BADGE_VARIANT[kyc.status]}>{STATUS_LABELS[kyc.status]}</Badge>
                </div>

                {kyc.review_notes && <p className="text-sm text-gray-600">Motivo: {kyc.review_notes}</p>}

                {kyc.status === 'PENDING' && (
                  <div className="flex flex-col gap-2">
                    {rejectingId === kyc.id ? (
                      <div className="flex flex-col gap-2">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-piquete-blue-dark">Motivo da rejeição</span>
                          <textarea
                            value={rejectNotes}
                            onChange={(event) => setRejectNotes(event.target.value)}
                            rows={2}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue"
                          />
                        </label>
                        <div className="flex gap-2">
                          <Button type="button" variant="danger" size="sm" onClick={() => handleConfirmReject(kyc)} disabled={reviewKycMutation.isPending}>
                            Confirmar rejeição
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setRejectingId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button type="button" variant="primary" size="sm" onClick={() => handleApprove(kyc)} disabled={reviewKycMutation.isPending}>
                          Aprovar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartReject(kyc.id)}
                          disabled={reviewKycMutation.isPending}
                          className="border-rose-300 text-rose-600 hover:bg-rose-600 hover:text-white"
                        >
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
