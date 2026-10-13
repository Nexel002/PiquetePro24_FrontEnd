import { useState } from 'react'
import { toast } from 'sonner'
import { BackButton } from '../components/BackButton'
import { NavegacaoAdmin } from '../components/admin/NavegacaoAdmin'
import { CAMINHOS_DOS_ICONES } from '../components/busca/caminhosDosIcones'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import {
  useAdminCategories,
  useCreateAdminCategory,
  useDeleteAdminCategory,
  useUpdateAdminCategory,
} from '../hooks/useAdminCategories'
import { palavrasChaveDe, type AdminCategory } from '../services/adminCategories'

function FormularioDeServico({
  inicial,
  rotuloDoBotao,
  aGuardar,
  aoGuardar,
  aoCancelar,
}: {
  inicial?: AdminCategory
  rotuloDoBotao: string
  aGuardar: boolean
  aoGuardar: (dados: { name: string; keywords: string[] }) => void
  aoCancelar?: () => void
}) {
  const [nome, setNome] = useState(inicial?.name ?? '')
  const [palavras, setPalavras] = useState(inicial?.keywords.join(', ') ?? '')

  function submeter(event: React.FormEvent) {
    event.preventDefault()
    if (nome.trim().length < 2) {
      toast.error('O nome do serviço precisa de pelo menos 2 caracteres.')
      return
    }
    aoGuardar({ name: nome.trim(), keywords: palavrasChaveDe(palavras) })
  }

  return (
    <form onSubmit={submeter} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
        Nome do serviço
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={60}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
        Palavras de pesquisa (separadas por vírgulas)
        <input
          value={palavras}
          onChange={(e) => setPalavras(e.target.value)}
          placeholder="canalizador, encanador, torneira"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal"
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={aGuardar} disabled={aGuardar}>
          {rotuloDoBotao}
        </Button>
        {aoCancelar && (
          <Button type="button" variant="ghost" size="sm" onClick={aoCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}

function LinhaDeServico({ servico }: { servico: AdminCategory }) {
  const atualizar = useUpdateAdminCategory()
  const apagar = useDeleteAdminCategory()
  const [aEditar, setAEditar] = useState(false)
  const [aConfirmarApagar, setAConfirmarApagar] = useState(false)

  const semIcone = !(servico.slug in CAMINHOS_DOS_ICONES)

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
          aoGuardar={(dados) =>
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
        />
      ) : aConfirmarApagar ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-700">Apagar «{servico.name}»?</span>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={apagar.isPending}
            onClick={() =>
              apagar.mutate(servico.id, {
                onSuccess: () => toast.success('Serviço apagado.'),
                // O 409 («em uso») chega com mensagem própria do backend.
                onError: (err) => {
                  toast.error(err instanceof Error ? err.message : 'Não foi possível apagar.')
                  setAConfirmarApagar(false)
                },
              })
            }
          >
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
            disabled={servico.professional_count > 0}
            title={servico.professional_count > 0 ? 'Há profissionais com este serviço.' : undefined}
          >
            Apagar
          </Button>
        </div>
      )}
    </Card>
  )
}

// Fase 17: o admin cria e edita os serviços sem SQL. O slug nunca muda (identifica o serviço
// no URL e no mapa de ícones). O guard de role está na rota.
export function AdminServices() {
  const { data: servicos, isLoading, isError } = useAdminCategories()
  const criar = useCreateAdminCategory()
  const [formularioAberto, setFormularioAberto] = useState(false)

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">Serviços</h1>
      </header>

      <NavegacaoAdmin />

      {formularioAberto ? (
        <Card variant="solid" className="p-4">
          <FormularioDeServico
            rotuloDoBotao="Criar serviço"
            aGuardar={criar.isPending}
            aoCancelar={() => setFormularioAberto(false)}
            aoGuardar={(dados) =>
              criar.mutate(dados, {
                onSuccess: () => {
                  toast.success('Serviço criado.')
                  setFormularioAberto(false)
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível criar o serviço.'),
              })
            }
          />
        </Card>
      ) : (
        <Button type="button" size="sm" className="self-start" onClick={() => setFormularioAberto(true)}>
          Novo serviço
        </Button>
      )}

      {isLoading && (
        <div className="flex flex-col gap-2" role="status" aria-label="A carregar">
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      )}
      {isError && <p className="text-sm text-gray-600">Não foi possível carregar os serviços. Verifica a tua ligação e tenta novamente.</p>}
      {servicos && servicos.length === 0 && <p className="text-sm text-gray-600">Ainda não há serviços.</p>}
      {servicos && servicos.length > 0 && (
        <ul className="flex flex-col gap-3">
          {servicos.map((servico) => (
            <li key={servico.id}>
              <LinhaDeServico servico={servico} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
