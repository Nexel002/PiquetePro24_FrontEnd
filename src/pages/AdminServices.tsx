import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { ACarregar, ErroAoCarregar, ListaVazia } from '../components/admin/estrutura/EstadosDaLista'
import { FormularioDeServico } from '../components/admin/servicos/FormularioDeServico'
import { LinhaDeServico } from '../components/admin/servicos/LinhaDeServico'
import { useAdminCategories, useCreateAdminCategory } from '../hooks/useAdminCategories'

// Fase 17: o admin cria e edita os serviços sem SQL. O slug nunca muda (identifica o serviço
// no URL e no mapa de ícones). O guard de role está na rota.
export function AdminServices() {
  const { data: servicos, isLoading, isError } = useAdminCategories()
  const criar = useCreateAdminCategory()
  const [formularioAberto, setFormularioAberto] = useState(false)

  function guardarNovo(dados: { name: string; keywords: string[] }) {
    criar.mutate(dados, {
      onSuccess: () => {
        toast.success('Serviço criado.')
        setFormularioAberto(false)
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível criar o serviço.'),
    })
  }

  return (
    <ConteudoDoSeparador
      icone="caixas"
      titulo="Categorias e Serviços"
      subtitulo={servicos ? `${servicos.length} categorias ativas` : 'Carregando serviços...'}
      selo="Categorias sincronizadas com busca e pedidos"
      acoes={
        !formularioAberto && (
          <Button type="button" size="sm" onClick={() => setFormularioAberto(true)}>
            Novo serviço
          </Button>
        )
      }
    >
      {formularioAberto && (
        <div className="p-4 sm:p-6 bg-slate-50/50 border-y border-slate-100">
          <Card variant="solid" className="p-5 border border-slate-200">
            <FormularioDeServico
              rotuloDoBotao="Criar serviço"
              aGuardar={criar.isPending}
              aoCancelar={() => setFormularioAberto(false)}
              aoGuardar={guardarNovo}
            />
          </Card>
        </div>
      )}

      <div className="p-4 sm:p-6 flex flex-col gap-4">
        {isLoading && <ACarregar />}

        {isError && <ErroAoCarregar>Não foi possível carregar os serviços. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>}

        {servicos && servicos.length === 0 && (
          <ListaVazia icone="caixas" titulo="Ainda não há serviços." descricao="Cria o primeiro serviço utilizando o botão acima." />
        )}

        {servicos && servicos.length > 0 && (
          <ul className="flex flex-col gap-3">
            {servicos.map((servico) => (
              <li key={servico.id}>
                <LinhaDeServico servico={servico} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </ConteudoDoSeparador>
  )
}
