import { useState } from 'react'
import { toast } from 'sonner'
import { BackButton } from '../components/BackButton'
import { PalavraPasseProvisoria } from '../components/PalavraPasseProvisoria'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useProfessionalCatalog } from '../hooks/useCatalog'
import { useAddMember, useSetMemberStatus, useTeam, useUpdateMember } from '../hooks/useCompanyTeam'
import { useProfile } from '../hooks/useProfile'
import { MAX_TECNICOS_POR_EMPRESA, type TeamMember } from '../services/companyTeam'

type ServicoDaEmpresa = { id: string; name: string }

const ROTULO_KYC: Record<TeamMember['kyc_status'], { rotulo: string; variante: 'approved' | 'pending' | 'rejected' | 'info' }> = {
  APPROVED: { rotulo: 'Identidade verificada', variante: 'approved' },
  PENDING: { rotulo: 'Em análise', variante: 'pending' },
  REJECTED: { rotulo: 'Rejeitada', variante: 'rejected' },
  NONE: { rotulo: 'Ainda sem documentos', variante: 'info' },
}

function EscolhaDeServicos({ servicos, escolhidos, aoMudar }: { servicos: ServicoDaEmpresa[]; escolhidos: string[]; aoMudar: (ids: string[]) => void }) {
  if (servicos.length === 0) {
    return <p className="text-xs text-amber-700">A tua empresa ainda não escolheu os serviços que presta. Faz isso em «O meu catálogo» antes de adicionar técnicos.</p>
  }
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-xs font-semibold text-gray-600">Serviços que faz</legend>
      <div className="flex flex-wrap gap-2">
        {servicos.map((s) => (
          <label key={s.id} className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-sm">
            <input
              type="checkbox"
              checked={escolhidos.includes(s.id)}
              onChange={(e) => aoMudar(e.target.checked ? [...escolhidos, s.id] : escolhidos.filter((id) => id !== s.id))}
            />
            {s.name}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function FormularioDeTecnico({
  servicos,
  inicial,
  rotuloDoBotao,
  aGuardar,
  aoGuardar,
  aoCancelar,
}: {
  servicos: ServicoDaEmpresa[]
  inicial?: TeamMember
  rotuloDoBotao: string
  aGuardar: boolean
  aoGuardar: (dados: { full_name: string; email: string; title: string; category_ids: string[] }) => void
  aoCancelar?: () => void
}) {
  const [nome, setNome] = useState(inicial?.full_name ?? '')
  const [email, setEmail] = useState(inicial?.email ?? '')
  const [titulo, setTitulo] = useState(inicial?.title ?? '')
  const [servicosEscolhidos, setServicosEscolhidos] = useState<string[]>(inicial?.services.map((s) => s.id) ?? [])
  const aEditar = inicial !== undefined

  function submeter(event: React.FormEvent) {
    event.preventDefault()
    if (!aEditar && (nome.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email.trim()))) {
      toast.error('Indica o nome completo e um email válido.')
      return
    }
    if (titulo.trim().length < 2) {
      toast.error('Indica o título do técnico (por exemplo «Eletricista»).')
      return
    }
    if (servicosEscolhidos.length === 0) {
      toast.error('Escolhe pelo menos um serviço.')
      return
    }
    aoGuardar({ full_name: nome.trim(), email: email.trim(), title: titulo.trim(), category_ids: servicosEscolhidos })
  }

  return (
    <form onSubmit={submeter} noValidate className="flex flex-col gap-3">
      {!aEditar && (
        <>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Nome completo
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Email (é com ele que o técnico entra)
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal" />
          </label>
        </>
      )}
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
        Título
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={60}
          placeholder="Eletricista"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal"
        />
      </label>
      <EscolhaDeServicos servicos={servicos} escolhidos={servicosEscolhidos} aoMudar={setServicosEscolhidos} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={aGuardar} disabled={aGuardar || servicos.length === 0}>
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

function LinhaDeTecnico({ membro, servicos }: { membro: TeamMember; servicos: ServicoDaEmpresa[] }) {
  const atualizar = useUpdateMember()
  const estado = useSetMemberStatus()
  const [aEditar, setAEditar] = useState(false)
  const kyc = ROTULO_KYC[membro.kyc_status]
  const desativado = membro.status === 'INACTIVE'

  function mudarEstado(novo: 'ACTIVE' | 'INACTIVE') {
    estado.mutate(
      { id: membro.id, status: novo },
      {
        onSuccess: () => toast.success(novo === 'ACTIVE' ? 'Técnico reativado.' : 'Técnico desativado.'),
        // O 409 (trabalhos em curso, limite de 15) chega com mensagem própria do backend.
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível alterar o técnico.'),
      },
    )
  }

  return (
    <Card variant="solid" className={`flex flex-col gap-2 p-4 ${desativado ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-piquete-blue">{membro.full_name}</p>
          <p className="truncate text-xs text-gray-500">
            {membro.title} · {membro.email ?? 'sem email'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={kyc.variante}>{kyc.rotulo}</Badge>
          {desativado && <Badge variant="rejected">Desativado</Badge>}
        </div>
      </div>

      {membro.services.length > 0 && <p className="text-xs text-gray-600">{membro.services.map((s) => s.name).join(', ')}</p>}
      {membro.active_jobs > 0 && (
        <p className="text-xs font-semibold text-gray-700">
          {membro.active_jobs} {membro.active_jobs === 1 ? 'trabalho em curso' : 'trabalhos em curso'}
        </p>
      )}
      {!desativado && membro.kyc_status !== 'APPROVED' && (
        <p className="text-xs text-amber-700">Só recebe trabalhos depois de a identidade estar verificada.</p>
      )}

      {aEditar ? (
        <FormularioDeTecnico
          servicos={servicos}
          inicial={membro}
          rotuloDoBotao="Guardar alterações"
          aGuardar={atualizar.isPending}
          aoCancelar={() => setAEditar(false)}
          aoGuardar={(dados) =>
            atualizar.mutate(
              { id: membro.id, changes: { title: dados.title, category_ids: dados.category_ids } },
              {
                onSuccess: () => {
                  toast.success('Técnico atualizado.')
                  setAEditar(false)
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível guardar.'),
              },
            )
          }
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAEditar(true)}>
            Editar
          </Button>
          {desativado ? (
            <Button type="button" variant="outline" size="sm" onClick={() => mudarEstado('ACTIVE')} disabled={estado.isPending}>
              Reativar
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => mudarEstado('INACTIVE')}
              disabled={estado.isPending || membro.active_jobs > 0}
              title={membro.active_jobs > 0 ? 'Atribui os trabalhos em curso a outro técnico primeiro.' : undefined}
            >
              Desativar
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

// Fase 23: «A minha equipa». O administrador da empresa cria os técnicos (cada um com login e KYC
// próprios), diz que serviços fazem e, mais tarde, atribui-os aos pedidos. Máximo de 15 ativos.
export function CompanyTeam() {
  const { data: perfil } = useProfile()
  const { data: catalogo } = useProfessionalCatalog(perfil?.id)
  const { data: equipa, isLoading, isError } = useTeam()
  const adicionar = useAddMember()

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [novo, setNovo] = useState<{ email: string; palavraPasse: string } | null>(null)

  const servicos: ServicoDaEmpresa[] = catalogo?.services ?? []
  const ativos = equipa?.filter((m) => m.status === 'ACTIVE').length ?? 0
  const cheia = ativos >= MAX_TECNICOS_POR_EMPRESA

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">A minha equipa</h1>
        <span className="text-xs font-semibold text-gray-500">
          {ativos} de {MAX_TECNICOS_POR_EMPRESA} ativos
        </span>
      </header>

      {novo && (
        <PalavraPasseProvisoria titulo={`Conta criada para ${novo.email}.`} palavraPasse={novo.palavraPasse} aoFechar={() => setNovo(null)} />
      )}

      {formularioAberto ? (
        <Card variant="solid" className="p-4">
          <FormularioDeTecnico
            servicos={servicos}
            rotuloDoBotao="Criar técnico"
            aGuardar={adicionar.isPending}
            aoCancelar={() => setFormularioAberto(false)}
            aoGuardar={(dados) =>
              adicionar.mutate(dados, {
                onSuccess: (r) => {
                  setNovo({ email: r.member.email ?? dados.email, palavraPasse: r.temporary_password })
                  setFormularioAberto(false)
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível criar o técnico.'),
              })
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-1">
          <Button type="button" size="sm" className="self-start" onClick={() => setFormularioAberto(true)} disabled={cheia}>
            Adicionar técnico
          </Button>
          {cheia && <p className="text-xs text-gray-500">Chegaste ao máximo de {MAX_TECNICOS_POR_EMPRESA} técnicos ativos. Desativa um para adicionar outro.</p>}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Cada técnico entra com o seu próprio email e palavra-passe, e tem de ter a identidade verificada (KYC), como um profissional singular. A empresa
        responde pelos técnicos (ver Termos de utilização).
      </p>

      {isLoading && (
        <div role="status" aria-label="A carregar" className="flex flex-col gap-2">
          <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      )}
      {isError && <p className="text-sm text-gray-600">Não foi possível carregar a equipa. Verifica a tua ligação e tenta novamente.</p>}
      {equipa && equipa.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-card">
          <h2 className="text-base font-bold text-piquete-blue">Ainda não tens técnicos</h2>
          <p className="text-sm text-gray-600">Adiciona o primeiro para o poderes atribuir aos pedidos que a tua empresa ganhar.</p>
        </div>
      )}
      {equipa && equipa.length > 0 && (
        <ul className="flex flex-col gap-3">
          {equipa.map((m) => (
            <li key={m.id}>
              <LinhaDeTecnico membro={m} servicos={servicos} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
