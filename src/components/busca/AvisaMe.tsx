import { useState } from 'react'
import { toast } from 'sonner'
import { useCreateSearchAlert } from '../../hooks/useSearchAlerts'
import { MOZAMBIQUE_PROVINCES } from '../../lib/provinces'
import type { ServiceCategory } from '../../services/serviceCategories'
import { Button } from '../ui/Button'

interface AvisaMeProps {
  servico: ServiceCategory
  // A província do perfil do cliente, pré-escolhida (pode mudá-la: procura para outra casa).
  provinciaPadrao: string | null
  // Sem ninguém nenhum, ou só sem ninguém perto: muda só a frase.
  semNinguem: boolean
}

// Fase 39 (TRD Adendo v1.66, N4): quando a pesquisa não encontra ninguém perto, o cliente pede para
// ser avisado (uma vez, por email) quando aparecer um profissional verificado na província.
export function AvisaMe({ servico, provinciaPadrao, semNinguem }: AvisaMeProps) {
  const criar = useCreateSearchAlert()
  const inicial = provinciaPadrao && (MOZAMBIQUE_PROVINCES as readonly string[]).includes(provinciaPadrao) ? provinciaPadrao : MOZAMBIQUE_PROVINCES[0]
  const [provincia, setProvincia] = useState<string>(inicial)
  const [pedido, setPedido] = useState(false)

  function aoPedir() {
    criar.mutate(
      { category_id: servico.id, province: provincia },
      {
        onSuccess: () => {
          setPedido(true)
          toast.success('Combinado: avisamos-te por email quando houver.')
        },
        // 409 = já há um aviso pendente igual; a mensagem do servidor diz isso mesmo.
        onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível guardar o aviso. Tenta novamente.'),
      },
    )
  }

  if (pedido) {
    return (
      <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
        Vamos avisar-te quando houver {servico.name} em {provincia}. Podes apagar o aviso no teu perfil.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-piquete-blue/15 bg-piquete-blue/5 p-4 text-left">
      <p className="text-sm font-semibold text-piquete-blue">
        {semNinguem ? `Ainda não há ${servico.name} disponível.` : `Ainda não há ${servico.name} perto de ti.`} Queres que te avisemos quando houver?
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-gray-700">
          Província
          <select
            value={provincia}
            onChange={(evento) => setProvincia(evento.target.value)}
            className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none focus:ring-1 focus:ring-piquete-blue"
          >
            {MOZAMBIQUE_PROVINCES.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={aoPedir} disabled={criar.isPending} isLoading={criar.isPending}>
          Avisa-me quando houver
        </Button>
      </div>
    </div>
  )
}
