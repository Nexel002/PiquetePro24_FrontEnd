import { useState } from 'react'
import { toast } from 'sonner'
import { useAssignMember } from '../../hooks/useCompanyTeam'
import type { TeamMember } from '../../services/companyTeam'
import type { ServiceRequest } from '../../services/serviceRequests'
import { Button } from '../ui/Button'

// Quem pode ir a este pedido: técnico ativo, com a identidade verificada e que faça o serviço
// pedido. É a mesma regra que o backend aplica (que é quem decide); aqui só serve para a lista não
// oferecer escolhas que o backend ia recusar.
export function tecnicosElegiveis(equipa: TeamMember[], pedido: Pick<ServiceRequest, 'category_id'>): TeamMember[] {
  return equipa.filter(
    (m) =>
      m.status === 'ACTIVE' &&
      m.kyc_status === 'APPROVED' &&
      (pedido.category_id === null || m.services.some((s) => s.id === pedido.category_id)),
  )
}

interface AtribuirTecnicoProps {
  pedido: ServiceRequest
  equipa: TeamMember[]
}

// Só para a empresa a quem o pedido foi atribuído, e só com o pedido em curso. Mostra o técnico
// atual (ou a falta dele) e deixa escolher/mudar.
export function AtribuirTecnico({ pedido, equipa }: AtribuirTecnicoProps) {
  const atribuir = useAssignMember()
  const [aEscolher, setAEscolher] = useState(false)
  const [escolhido, setEscolhido] = useState('')

  const elegiveis = tecnicosElegiveis(equipa, pedido)
  const atual = pedido.technician

  function confirmar() {
    if (!escolhido) {
      toast.error('Escolhe um técnico.')
      return
    }
    atribuir.mutate(
      { requestId: pedido.id, memberId: escolhido },
      {
        onSuccess: () => {
          toast.success('Técnico atribuído. Recebeu um email.')
          setAEscolher(false)
          setEscolhido('')
        },
        // O 409 (técnico sem KYC aprovado, que não faz o serviço, pedido que mudou) chega com mensagem própria.
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível atribuir o técnico.'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm">
      {atual ? (
        <p className="text-gray-800">
          Técnico: <span className="font-bold text-piquete-blue">{atual.first_name}</span> · {atual.title}
        </p>
      ) : (
        <p role="status" className="font-semibold text-amber-800">
          Este trabalho ainda não tem técnico.
        </p>
      )}

      {aEscolher ? (
        <div className="flex flex-col gap-2">
          {elegiveis.length === 0 ? (
            <p className="text-xs text-gray-600">
              Nenhum técnico pode ir a este pedido: precisa de estar ativo, com a identidade verificada e de fazer este serviço. Vê a tua equipa.
            </p>
          ) : (
            <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
              Técnico
              <select value={escolhido} onChange={(e) => setEscolhido(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal">
                <option value="">Escolhe…</option>
                {elegiveis.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} · {m.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={confirmar} isLoading={atribuir.isPending} disabled={atribuir.isPending || elegiveis.length === 0}>
              Atribuir
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAEscolher(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setAEscolher(true)}>
          {atual ? 'Mudar técnico' : 'Atribuir técnico'}
        </Button>
      )}
    </div>
  )
}
