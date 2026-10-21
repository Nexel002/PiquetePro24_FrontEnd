import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BackButton } from '../components/BackButton'
import { ContactoDoProfissional } from '../components/pedidos/ContactoDoProfissional'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useProfessionalCatalog } from '../hooks/useCatalog'
import { useCreateDirectRequest } from '../hooks/useDirectRequest'
import { useProfile } from '../hooks/useProfile'
import { LOCAL_DO_PERFIL, localDoPedido, moradaEscolhida, textoDoLocal } from '../lib/localDoPedido'
import { useClientLocations } from '../hooks/useClientLocations'
import { EscolhaDoLocal } from '../components/pedidos/EscolhaDoLocal'
import type { DirectRequestResult } from '../services/directRequest'

// Fase 27: «Solicitar serviço» a um profissional (ou empresa). Carregar em enviar regista o pedido e
// só então mostra o telefone para ligar: é assim que se obriga a seguir o fluxo (decisão do
// utilizador, 16/10/2026). O profissional é avisado e vê o cliente ao abrir o pedido.
export function SolicitarServico() {
  const { id } = useParams<{ id: string }>()
  const { data: catalogo, isLoading, isError } = useProfessionalCatalog(id)
  const { data: perfil, isLoading: aCarregarPerfil, isError: erroDoPerfil, refetch: recarregarPerfil } = useProfile()
  const criar = useCreateDirectRequest()

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [servicoEscolhido, setServicoEscolhido] = useState('')
  const [resultado, setResultado] = useState<DirectRequestResult | null>(null)
  // Fase 40 (N6): a morada é a do perfil ou um local guardado do cliente.
  const [escolhaDoLocal, setEscolhaDoLocal] = useState(LOCAL_DO_PERFIL)
  const locais = useClientLocations(perfil?.role === 'CLIENT')

  const local = moradaEscolhida(perfil, escolhaDoLocal, locais.data)
  const textoLocal = textoDoLocal(local)
  const textoDoPerfil = textoDoLocal(perfil ? localDoPedido(perfil) : null)
  // Um só serviço: nem se pergunta. Vários: o cliente escolhe qual precisa.
  const servicoId = catalogo?.services.length === 1 ? catalogo.services[0].id : servicoEscolhido

  function enviar(event: FormEvent) {
    event.preventDefault()
    if (!catalogo || !local || !titulo.trim() || !servicoId) return

    criar.mutate(
      {
        professional_id: catalogo.id,
        category_id: servicoId,
        title: titulo.trim(),
        description: descricao.trim() || undefined,
        location: local,
      },
      {
        onSuccess: setResultado,
        // O 409 («já tens um pedido em curso», «não está disponível») chega com mensagem própria.
        onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível enviar o pedido. Tenta novamente.'),
      },
    )
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 sm:p-6">
        <BackButton />
        <div role="status" aria-label="A carregar" className="h-40 animate-pulse rounded-2xl bg-gray-200" />
      </main>
    )
  }

  if (isError || !catalogo) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 sm:p-6">
        <BackButton />
        <p role="alert" className="rounded-3xl border border-rose-100 bg-rose-50 p-5 text-sm font-medium text-rose-600">
          Não foi possível carregar este profissional. Verifica a tua ligação e tenta novamente.
        </p>
      </main>
    )
  }

  if (resultado) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 pb-12 sm:p-6 animate-fade-in">
        <h1 className="font-heading text-xl font-bold text-piquete-blue">Pedido enviado</h1>
        <p className="text-sm text-gray-700">
          Registámos o teu pedido «{resultado.request.title}» e avisámos {resultado.professional.full_name}. Já podes contactar.
        </p>

        <ContactoDoProfissional nome={resultado.professional.full_name} telefone={resultado.professional.phone} />

        <p className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-600">
          Combina o trabalho com {resultado.professional.full_name}. Quando terminar, volta a «Os meus pedidos» para o dares como concluído e
          o avaliares: é isso que ajuda os outros clientes a escolher bem.
        </p>

        <Link to="/os-meus-pedidos" className="self-start">
          <Button type="button" variant="primary" size="md">
            Ver os meus pedidos
          </Button>
        </Link>
      </main>
    )
  }

  const semServicos = catalogo.services.length === 0

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 pb-12 sm:p-6 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 font-heading text-xl font-bold text-piquete-blue">Solicitar serviço</h1>
      </header>

      <Card variant="solid">
        <CardContent className="flex flex-col gap-1">
          <p className="text-sm font-bold text-piquete-blue">{catalogo.full_name}</p>
          <p className="text-xs text-piquete-gray-dark">
            Ao enviares o pedido, ele fica registado e {catalogo.full_name} é avisado.
          </p>
        </CardContent>
      </Card>

      {semServicos && (
        <p role="alert" className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
          Este profissional ainda não indicou os serviços que presta, por isso não pode receber pedidos.
        </p>
      )}

      <Card variant="solid">
        <CardContent>
          <form onSubmit={enviar} className="flex flex-col gap-4">
            {catalogo.services.length > 1 && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-piquete-blue-dark">Serviço</span>
                <select
                  value={servicoEscolhido}
                  onChange={(e) => setServicoEscolhido(e.target.value)}
                  required
                  className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900"
                >
                  <option value="">Escolhe o serviço…</option>
                  {catalogo.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {catalogo.services.length === 1 && <p className="text-sm font-semibold text-piquete-blue">{catalogo.services[0].name}</p>}

            <Input
              label="O que precisas?"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              maxLength={200}
              placeholder="Ex: Reparar uma torneira a pingar"
            />

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-piquete-blue-dark">Detalhes (opcional)</span>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Quanto mais detalhe, melhor o profissional se prepara."
                className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none focus:ring-2 focus:ring-piquete-blue/20"
              />
            </label>

            <EscolhaDoLocal locais={locais.data ?? []} textoDoPerfil={textoDoPerfil} valor={escolhaDoLocal} aoMudar={setEscolhaDoLocal} />

            {aCarregarPerfil && <div className="h-10 animate-pulse rounded-xl bg-gray-200" />}

            {!aCarregarPerfil && !erroDoPerfil && textoLocal && (
              <p className="rounded-xl bg-gray-50 p-3 text-xs text-piquete-gray-dark">
                <span className="font-semibold text-piquete-blue">Local do serviço:</span> {textoLocal}.{' '}
                <Link to="/perfil" className="font-semibold text-piquete-blue underline">
                  Alterar no perfil
                </Link>
              </p>
            )}

            {erroDoPerfil && (
              <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                Não foi possível carregar o teu perfil, por isso não sabemos o local do serviço.{' '}
                <button type="button" onClick={() => void recarregarPerfil()} className="font-semibold underline">
                  Tentar de novo
                </button>
              </p>
            )}

            {!aCarregarPerfil && !erroDoPerfil && !textoLocal && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                Ainda não tens uma localização no perfil.{' '}
                <Link to="/perfil" className="font-semibold underline">
                  Define-a no perfil
                </Link>{' '}
                para enviares o pedido.
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={criar.isPending}
              disabled={criar.isPending || !local || !titulo.trim() || !servicoId || semServicos}
            >
              Enviar pedido e ver o contacto
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
