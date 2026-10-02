import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useOwnKyc, useSubmitKyc } from '../hooks/useKyc'
import { KycUploadError } from '../services/kyc'
import type { KycStatus } from '../services/kyc'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
          Verificação de identidade
        </h1>
        <Link to="/perfil" className="text-xs font-semibold text-piquete-blue hover:text-piquete-yellow-hover hover:underline">
          Perfil
        </Link>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <div className="h-6 w-40 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-24 animate-pulse rounded-3xl bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">
          Não foi possível carregar o estado da tua verificação. Verifica a tua ligação e tenta novamente.
        </p>
      )}

      {!isLoading && !isError && kyc && (
        <Card variant="solid">
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-piquete-blue">Estado da submissão</p>
              <Badge variant={STATUS_BADGE_VARIANT[kyc.status]}>{STATUS_LABELS[kyc.status]}</Badge>
            </div>

            {kyc.status === 'PENDING' && (
              <p className="text-sm text-gray-600">
                Os teus documentos estão a ser revistos por um administrador. Volta a verificar mais tarde.
              </p>
            )}

            {kyc.status === 'APPROVED' && (
              // Aceitar pedidos exige também subscrição ativa (Backend TRD Adendo v1.12,
              // item C) — dizer "já podes aceitar pedidos" aqui seria falso.
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-600">
                  A tua identidade foi verificada. O passo seguinte é ativar a subscrição para aceitares pedidos.
                </p>
                <Link to="/subscricao" className="self-start text-sm font-semibold text-piquete-blue underline">
                  Ver subscrição
                </Link>
              </div>
            )}

            {kyc.status === 'REJECTED' && (
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-600">A tua submissão foi rejeitada. Corrige o problema indicado e submete novamente.</p>
                {kyc.review_notes && <p className="text-sm text-rose-600">Motivo: {kyc.review_notes}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && showForm && (
        <Card variant="solid">
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                Submete o número do teu BI, o NUIT e uma foto ou scan legível do documento para verificarmos a tua identidade.
              </p>

              <Input
                label="Número do BI"
                type="text"
                required
                value={biNumber}
                onChange={(event) => setBiNumber(event.target.value)}
              />

              <Input
                label="NUIT"
                type="text"
                required
                value={nuitNumber}
                onChange={(event) => setNuitNumber(event.target.value)}
              />

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-piquete-blue-dark">Foto ou scan do BI</span>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
                  className="text-sm text-gray-600 file:mr-3 file:rounded-xl file:border-0 file:bg-piquete-blue/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-piquete-blue hover:file:bg-piquete-blue/15"
                />
              </label>

              <Button type="submit" variant="primary" size="lg" disabled={submitKycMutation.isPending} isLoading={submitKycMutation.isPending} className="w-full">
                Submeter documentos
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
