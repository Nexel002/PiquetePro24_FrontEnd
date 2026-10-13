import { useState } from 'react'
import { toast } from 'sonner'
import { useCreateReport } from '../../hooks/useModeration'
import { ROTULOS_DE_MOTIVO, type ReportReason, type ReportTargetType } from '../../services/moderation'
import { Button } from '../ui/Button'

interface BotaoDenunciarProps {
  targetType: ReportTargetType
  targetId: string
  // Para o leitor de ecrã distinguir os vários botões da página («Denunciar a avaliação de Ana»).
  descricao: string
}

// Formulário inline em vez de modal: no telemóvel um modal por cima do catálogo é mais um
// layer a fechar; aqui o formulário abre no sítio e fecha-se com «Cancelar».
export function BotaoDenunciar({ targetType, targetId, descricao }: BotaoDenunciarProps) {
  const criar = useCreateReport()
  const [aberto, setAberto] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const [motivo, setMotivo] = useState<ReportReason>('INAPPROPRIATE')
  const [detalhes, setDetalhes] = useState('')

  if (enviada) {
    return <p className="text-xs text-piquete-gray">Denúncia enviada. A equipa vai analisar.</p>
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={`Denunciar ${descricao}`}
        className="self-start text-xs font-semibold text-piquete-gray underline hover:text-rose-600"
      >
        Denunciar
      </button>
    )
  }

  function enviar() {
    criar.mutate(
      { target_type: targetType, target_id: targetId, reason: motivo, details: detalhes.trim() || undefined },
      {
        onSuccess: () => setEnviada(true),
        // O 409 («já denunciaste») chega com mensagem própria do backend.
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível enviar a denúncia.'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
        Motivo
        <select
          value={motivo}
          onChange={(e) => setMotivo(e.target.value as ReportReason)}
          className="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-sm font-normal"
        >
          {Object.entries(ROTULOS_DE_MOTIVO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
        Detalhes (opcional)
        <textarea
          value={detalhes}
          onChange={(e) => setDetalhes(e.target.value)}
          maxLength={1000}
          rows={2}
          className="rounded-xl border border-gray-200 px-2 py-1.5 text-sm font-normal"
        />
      </label>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={enviar} isLoading={criar.isPending} disabled={criar.isPending}>
          Enviar denúncia
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
