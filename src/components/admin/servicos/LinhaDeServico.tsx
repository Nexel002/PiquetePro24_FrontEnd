import { useState } from 'react'
import { toast } from 'sonner'
import { useDeleteAdminCategory, useUpdateAdminCategory } from '../../../hooks/useAdminCategories'
import type { AdminCategory } from '../../../services/adminCategories'
import { CAMINHOS_DOS_ICONES } from '../../busca/caminhosDosIcones'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { FormularioDeServico } from './FormularioDeServico'

export function LinhaDeServico({ servico }: { servico: AdminCategory }) {
  const atualizar = useUpdateAdminCategory()
  const apagar = useDeleteAdminCategory()
  const [aEditar, setAEditar] = useState(false)
  const [aConfirmarApagar, setAConfirmarApagar] = useState(false)

  const semIcone = !(servico.slug in CAMINHOS_DOS_ICONES)
  const emUso = servico.professional_count > 0

  function guardar(dados: { name: string; keywords: string[] }) {
    atualizar.mutate(
      { id: servico.id, changes: dados },
      {
        onSuccess: () => {
          toast.success('Serviço atualizado.')
          setAEditar(false)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível guardar.'),
      },
    )
  }

  function confirmarApagar() {
    apagar.mutate(servico.id, {
      onSuccess: () => toast.success('Serviço apagado.'),
      // O 409 («em uso») chega com mensagem própria do backend.
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Não foi possível apagar.')
        setAConfirmarApagar(false)
      },
    })
  }

  return (
    <Card variant="solid" className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-piquete-blue">{servico.name}</p>
          <p className="text-xs text-gray-500">
            {servico.slug} · {servico.professional_count} {servico.professional_count === 1 ? 'profissional' : 'profissionais'}
          </p>
        </div>
        {semIcone && <Badge variant="warning">Sem ícone</Badge>}
      </div>

      {servico.keywords.length > 0 && <p className="text-xs text-gray-600">Pesquisa: {servico.keywords.join(', ')}</p>}
      {semIcone && (
        <p className="text-xs text-amber-700">
          Este serviço usa o ícone genérico. Para ter um próprio, acrescenta «{servico.slug}» a caminhosDosIcones.ts.
        </p>
      )}

      {aEditar ? (
        <FormularioDeServico
          inicial={servico}
          rotuloDoBotao="Guardar alterações"
          aGuardar={atualizar.isPending}
          aoCancelar={() => setAEditar(false)}
          aoGuardar={guardar}
        />
      ) : aConfirmarApagar ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-700">Apagar «{servico.name}»?</span>
          <Button type="button" variant="danger" size="sm" disabled={apagar.isPending} onClick={confirmarApagar}>
            Sim, apagar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAConfirmarApagar(false)}>
            Voltar
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAEditar(true)}>
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAConfirmarApagar(true)}
            disabled={emUso}
            title={emUso ? 'Há profissionais com este serviço.' : undefined}
          >
            Apagar
          </Button>
        </div>
      )}
    </Card>
  )
}
