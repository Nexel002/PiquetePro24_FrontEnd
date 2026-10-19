import { useState } from 'react'
import { toast } from 'sonner'
import { useReopenKyc, useReviewKyc } from '../../../hooks/useKyc'
import { esperaDaSubmissao, MOTIVOS_DE_REJEICAO_KYC } from '../../../lib/esperaKyc'
import type { KycStatus, ProfessionalKyc } from '../../../services/kyc'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { AreaDeTexto } from '../estrutura/CamposDeFormulario'

const ESTADOS: Record<KycStatus, { rotulo: string; variante: 'pending' | 'approved' | 'rejected' }> = {
  PENDING: { rotulo: 'Em análise', variante: 'pending' },
  APPROVED: { rotulo: 'Aprovado', variante: 'approved' },
  REJECTED: { rotulo: 'Rejeitado', variante: 'rejected' },
}

// Há quanto tempo a submissão espera. O alerta tem texto («em atraso») e não só cor.
function EsperaNaFila({ submittedAt }: { submittedAt: string }) {
  const espera = esperaDaSubmissao(submittedAt)

  return (
    <p className={`text-xs ${espera.emAtraso ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>
      Em espera há {espera.texto}
      {espera.emAtraso && ' — em atraso'}
    </p>
  )
}

function FormularioDeRejeicao({ kyc, aoFechar }: { kyc: ProfessionalKyc; aoFechar: () => void }) {
  const rever = useReviewKyc()
  const [motivo, setMotivo] = useState('')

  function confirmar() {
    if (!motivo.trim()) {
      toast.error('Indica o motivo da rejeição.')
      return
    }
    rever.mutate(
      { kycId: kyc.id, payload: { status: 'REJECTED', review_notes: motivo.trim() } },
      {
        onSuccess: () => {
          toast.success(`Submissão de ${kyc.bi_number} rejeitada.`)
          aoFechar()
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível rejeitar esta submissão.'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
      <div className="flex flex-wrap gap-1.5" aria-label="Motivos frequentes">
        {MOTIVOS_DE_REJEICAO_KYC.map((frequente) => (
          <button
            key={frequente}
            type="button"
            onClick={() => setMotivo(frequente)}
            className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {frequente.split('.')[0]}
          </button>
        ))}
      </div>
      <AreaDeTexto
        rotulo="Motivo da rejeição"
        value={motivo}
        onChange={(event) => setMotivo(event.target.value)}
        placeholder="Escreve o motivo da rejeição..."
      />
      <div className="flex gap-2">
        <Button type="button" variant="danger" size="sm" onClick={confirmar} disabled={rever.isPending}>
          Confirmar rejeição
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={aoFechar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

function AccoesDaPendente({ kyc }: { kyc: ProfessionalKyc }) {
  const rever = useReviewKyc()
  const [aRejeitar, setARejeitar] = useState(false)

  if (aRejeitar) return <FormularioDeRejeicao kyc={kyc} aoFechar={() => setARejeitar(false)} />

  function aprovar() {
    rever.mutate(
      { kycId: kyc.id, payload: { status: 'APPROVED' } },
      {
        onSuccess: () => toast.success(`Submissão de ${kyc.bi_number} aprovada.`),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível aprovar esta submissão.'),
      },
    )
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="primary" size="sm" onClick={aprovar} disabled={rever.isPending}>
        Aprovar
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setARejeitar(true)}
        disabled={rever.isPending}
        className="border-rose-300 text-rose-600 hover:bg-rose-600 hover:text-white"
      >
        Rejeitar
      </Button>
    </div>
  )
}

export function CartaoDeKyc({ kyc }: { kyc: ProfessionalKyc }) {
  const reabrir = useReopenKyc()
  const estado = ESTADOS[kyc.status]

  function reabrirRevisao() {
    reabrir.mutate(kyc.id, {
      onSuccess: () => toast.success(`Revisão de ${kyc.bi_number} reaberta.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível reabrir esta submissão.'),
    })
  }

  return (
    <div className="p-4 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
            ID
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">BI {kyc.bi_number}</p>
            <p className="text-xs text-slate-500 font-mono">NUIT {kyc.nuit_number}</p>
          </div>
        </div>
        <Badge variant={estado.variante} className="self-start sm:self-center">
          {estado.rotulo}
        </Badge>
      </div>

      {kyc.status === 'PENDING' && (
        <div className="bg-slate-50 rounded-xl px-3.5 py-2 border border-slate-200/60">
          <EsperaNaFila submittedAt={kyc.submitted_at} />
        </div>
      )}

      {kyc.review_notes && (
        <p className="text-xs sm:text-sm text-slate-600 bg-rose-50/50 border border-rose-100 rounded-xl px-3.5 py-2">
          <strong className="text-rose-700">Motivo:</strong> {kyc.review_notes}
        </p>
      )}

      {kyc.status === 'REJECTED' && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={reabrirRevisao} disabled={reabrir.isPending}>
          Reabrir revisão
        </Button>
      )}

      {kyc.status === 'PENDING' && <AccoesDaPendente kyc={kyc} />}
    </div>
  )
}
