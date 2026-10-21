import type { SearchedProfessional } from '../../services/professionalSearch'
import type { ServiceCategory } from '../../services/serviceCategories'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { AvisaMe } from './AvisaMe'
import { CartaoDeProfissional, EsqueletoDeResultado } from './CartaoDeProfissional'

interface ResultadosDaBuscaProps {
  aCarregar: boolean
  comErro: boolean
  carregou: boolean
  profissionais: SearchedProfessional[]
  comLocalizacao: boolean
  comFiltros: boolean
  seleccionaveis: boolean
  idsEscolhidos: string[]
  bloqueado: boolean
  temMais: boolean
  aCarregarMais: boolean
  aoAlternar: (id: string) => void
  aoTentarDeNovo: () => void
  aoVerMais: () => void
  // Fase 39 (N4): só para clientes, com um serviço escolhido. null = não oferecer o aviso.
  avisoDeOferta?: { servico: ServiceCategory; provinciaPadrao: string | null } | null
}

function CabecalhoDeSecao({ titulo, total, indicador }: { titulo: string; total: number; indicador?: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
      {indicador && <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />}
      <h2 className="font-heading text-base font-extrabold tracking-tight text-piquete-blue sm:text-lg">{titulo}</h2>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">{total}</span>
    </div>
  )
}

// Os quatro estados da pesquisa (a carregar, erro, vazio, resultados). Com localização, os
// resultados separam-se em «Perto de ti» e os restantes; sem ela é uma lista só.
export function ResultadosDaBusca(props: ResultadosDaBuscaProps) {
  const { profissionais, comLocalizacao, idsEscolhidos } = props
  const perto = profissionais.filter((profissional) => profissional.is_nearby)
  const outros = profissionais.filter((profissional) => !profissional.is_nearby)
  // Sem ninguém perto nem a atender a zona (só se sabe com localização) — a mesma regra que o
  // backend usa para registar a procura sem oferta.
  const semOfertaPerto = comLocalizacao && profissionais.length > 0 && !profissionais.some((p) => p.is_nearby || p.serves_area)

  function cartao(profissional: SearchedProfessional) {
    const escolhido = idsEscolhidos.includes(profissional.id)
    return (
      <li key={profissional.id}>
        <CartaoDeProfissional
          professional={profissional}
          selectable={props.seleccionaveis}
          selected={escolhido}
          blocked={props.bloqueado}
          onToggle={() => props.aoAlternar(profissional.id)}
        />
      </li>
    )
  }

  if (props.aCarregar) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <EsqueletoDeResultado />
        <EsqueletoDeResultado />
        <EsqueletoDeResultado />
        <EsqueletoDeResultado />
      </div>
    )
  }

  if (props.comErro) {
    return (
      <Card className="border-red-100 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-600">Não foi possível pesquisar agora. Verifica a tua ligação e tenta novamente.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={props.aoTentarDeNovo}>
          Tentar de novo
        </Button>
      </Card>
    )
  }

  if (!props.carregou) return null

  if (profissionais.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-piquete-blue/5 text-2xl text-piquete-blue">🔍</div>
        <p className="text-base font-bold text-gray-800">
          {props.comFiltros ? 'Nenhum profissional encontrado para esta pesquisa.' : 'Ainda não há profissionais registados.'}
        </p>
        {props.comFiltros && <p className="text-xs text-piquete-gray">Tenta outro serviço ou limpa os filtros da busca.</p>}
        {props.avisoDeOferta && (
          <div className="mt-3 w-full">
            <AvisaMe servico={props.avisoDeOferta.servico} provinciaPadrao={props.avisoDeOferta.provinciaPadrao} semNinguem />
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {semOfertaPerto && props.avisoDeOferta && (
        <AvisaMe servico={props.avisoDeOferta.servico} provinciaPadrao={props.avisoDeOferta.provinciaPadrao} semNinguem={false} />
      )}

      {comLocalizacao && perto.length > 0 && (
        <section className="flex flex-col gap-4">
          <CabecalhoDeSecao titulo="Perto de ti" total={perto.length} indicador />
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">{perto.map(cartao)}</ul>
        </section>
      )}

      {outros.length > 0 && (
        <section className="flex flex-col gap-4">
          <CabecalhoDeSecao titulo={comLocalizacao && perto.length > 0 ? 'Outros profissionais' : 'Profissionais'} total={outros.length} />
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">{outros.map(cartao)}</ul>
        </section>
      )}

      {props.temMais && (
        <Button
          type="button"
          variant="glass"
          onClick={props.aoVerMais}
          disabled={props.aCarregarMais}
          isLoading={props.aCarregarMais}
          className="self-center px-8"
        >
          Ver mais
        </Button>
      )}
    </div>
  )
}
