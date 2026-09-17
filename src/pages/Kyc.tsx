import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useOwnKyc, useSubmitKyc } from '../hooks/useKyc'
import { KycUploadError } from '../services/kyc'
import type { KycStatus } from '../services/kyc'
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

// Tela única que cobre os dois momentos do fluxo (TRD Adendo v1.2 / Fase 4): sem
// submissão ainda, mostra o formulário; com submissão existente, mostra o estado
// atual — e permite submeter de novo quando REJECTED (o backend trata como upsert,
// ver kycService.submitKyc).
export function Kyc() {
  const { data: kyc, isLoading, isError } = useOwnKyc()
  const submitKycMutation = useSubmitKyc()

  const [biNumber, setBiNumber] = useState('')
  const [nuitNumber, setNuitNumber] = useState('')
  const [document, setDocument] = useState<File | null>(null)

  const showForm = !kyc || kyc.status === 'REJECTED'

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!document) {
      toast.error('Escolhe uma foto ou scan do teu BI.')
      return
    }

    submitKycMutation.mutate(
      { bi_number: biNumber, nuit_number: nuitNumber, document },
      {
        onSuccess: () => {
          toast.success('Documentos submetidos. A tua verificação está em análise.')
          setBiNumber('')
          setNuitNumber('')
          setDocument(null)
        },
        onError: (err) => {
          const message =
            err instanceof KycUploadError ? err.message : err instanceof Error ? err.message : 'Não foi possível submeter os teus documentos.'
          toast.error(message)
        },
      },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Verificação de identidade</h1>
        <Link to="/perfil" className="text-sm text-gray-600 underline">
          Perfil
        </Link>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-24 animate-pulse rounded bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">
          Não foi possível carregar o estado da tua verificação. Verifica a tua ligação e tenta novamente.
        </p>
      )}

      {!isLoading && !isError && kyc && (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900">Estado da submissão</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[kyc.status]}`}>
              {STATUS_LABELS[kyc.status]}
            </span>
          </div>

          {kyc.status === 'PENDING' && (
            <p className="text-sm text-gray-600">
              Os teus documentos estão a ser revistos por um administrador. Volta a verificar mais tarde.
            </p>
          )}

          {kyc.status === 'APPROVED' && (
            <p className="text-sm text-gray-600">A tua identidade foi verificada. Já podes aceitar pedidos de clientes.</p>
          )}

          {kyc.status === 'REJECTED' && (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-600">A tua submissão foi rejeitada. Corrige o problema indicado e submete novamente.</p>
              {kyc.review_notes && <p className="text-sm text-red-700">Motivo: {kyc.review_notes}</p>}
            </div>
          )}
        </div>
      )}

      {!isLoading && !isError && showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Submete o número do teu BI, o NUIT e uma foto ou scan legível do documento para verificarmos a tua identidade.
          </p>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Número do BI
            <input
              type="text"
              required
              value={biNumber}
              onChange={(event) => setBiNumber(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            NUIT
            <input
              type="text"
              required
              value={nuitNumber}
              onChange={(event) => setNuitNumber(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Foto ou scan do BI
            <input
              type="file"
              accept="image/*"
              required
              onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={submitKycMutation.isPending}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitKycMutation.isPending ? 'A submeter...' : 'Submeter documentos'}
          </button>
        </form>
      )}
    </main>
  )
}
