import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useFiltrosDaBusca } from '../hooks/useFiltrosDaBusca'
import { useGeolocation } from '../hooks/useGeolocation'
import { useLocalizarSePermitido } from '../hooks/useLocalizarSePermitido'
import { useProfessionalSearch } from '../hooks/useProfessionalSearch'
import { useSelecaoParaPedido } from '../hooks/useSelecaoParaPedido'
import { useServiceCategories } from '../hooks/useServiceCategories'
import { AvisoUltimaLocalizacao } from '../components/AvisoUltimaLocalizacao'
import { AvisoLocalizacaoAproximada } from '../components/AvisoLocalizacaoAproximada'
import { BackButton } from '../components/BackButton'
import { AvisoDeLocalizacao } from '../components/busca/AvisoDeLocalizacao'
import { BarraDeEnvioDoPedido } from '../components/busca/BarraDeEnvioDoPedido'
import { BarraDePesquisa } from '../components/busca/BarraDePesquisa'
import { FiltroDeCategorias } from '../components/busca/FiltroDeCategorias'
import { OrientacaoDoPedido } from '../components/busca/OrientacaoDoPedido'
import { ResultadosDaBusca } from '../components/busca/ResultadosDaBusca'

// Compõe o ecrã de busca. O estado de cada parte vive em hooks (filtros no URL, localização,
// escolha de profissionais) e a apresentação em components/busca/.
export function FindProfessionals() {
  const geolocation = useGeolocation()
  const { coordinates, ultimaConhecidaEmUso, precisaoAproximadaM } = geolocation
  const filtros = useFiltrosDaBusca()
  const categories = useServiceCategories()
  const search = useProfessionalSearch({ q: filtros.q, category: filtros.category, coordinates })

  useLocalizarSePermitido(geolocation.locate)

  const professionals = useMemo(() => search.data?.pages.flat() ?? [], [search.data])
  const selecao = useSelecaoParaPedido({
    categoria: filtros.category,
    categorias: categories.data,
    profissionais: professionals,
    temMaisPaginas: Boolean(search.hasNextPage),
  })

  const hasLocation = coordinates !== null
  // Num telemóvel, focar o campo ao entrar abre o teclado por cima dos resultados antes de o
  // utilizador ter tocado em nada; só se foca onde há rato (hover) e ainda não há filtros.
  const focarAoMontar = !filtros.q && !filtros.category && (window.matchMedia?.('(hover: hover)')?.matches ?? false)

  return (
    <main className="relative min-h-dvh bg-slate-50/50 pb-36">
      {/* Formas decorativas orgânicas inspiradas na referência visual do TaskRabbit */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-piquete-blue/10 via-piquete-blue-light/5 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gradient-to-bl from-piquete-yellow/15 via-piquete-yellow-light/5 to-transparent blur-3xl" />

      <header className="relative z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BackButton />
            <Link to="/" className="flex items-center gap-2">
              <span className="font-heading text-xl font-extrabold tracking-tight text-piquete-blue">
                Piquete<span className="text-piquete-yellow">Pro24</span>
              </span>
            </Link>
          </div>
          <Link
            to="/perfil"
            className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-bold text-piquete-blue shadow-xs transition-all hover:border-piquete-blue hover:bg-piquete-blue hover:text-white"
          >
            Perfil
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-8 sm:px-6 sm:pt-12">
        <section className="flex flex-col items-center text-center">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-piquete-blue sm:text-4xl lg:text-5xl">
            Procurar profissionais
          </h1>
          <p className="mt-2.5 max-w-xl text-sm font-medium text-gray-500 sm:text-base">
            Canalizadores, eletricistas e técnicos de confiança para qualquer piquete na tua casa
          </p>

          <BarraDePesquisa texto={filtros.text} aoMudar={filtros.setText} aoPesquisar={filtros.search} focarAoMontar={focarAoMontar} />

          {categories.data && categories.data.length > 0 && (
            <FiltroDeCategorias categorias={categories.data} selecionada={filtros.category} aoSeleccionar={filtros.selectCategory} />
          )}

          <OrientacaoDoPedido nomeDoServico={selecao.servicoPedido?.name ?? null} profissionaisNecessarios={selecao.necessarios} />
        </section>

        <div className="flex flex-col gap-3">
          {ultimaConhecidaEmUso && <AvisoUltimaLocalizacao ultima={ultimaConhecidaEmUso} />}
          {precisaoAproximadaM !== null && <AvisoLocalizacaoAproximada precisaoM={precisaoAproximadaM} aoTentarDeNovo={geolocation.tentarDeNovo} />}

          {!hasLocation && (
            <AvisoDeLocalizacao
              falhou={geolocation.state.status === 'error'}
              aLocalizar={geolocation.state.status === 'locating'}
              aoLocalizar={geolocation.locate}
            />
          )}
        </div>

        <ResultadosDaBusca
          aCarregar={search.isLoading}
          comErro={search.isError}
          carregou={search.isSuccess}
          profissionais={professionals}
          comLocalizacao={hasLocation}
          comFiltros={filtros.q !== '' || filtros.category !== ''}
          seleccionaveis={selecao.servicoPedido !== null}
          idsEscolhidos={selecao.idsEscolhidos}
          bloqueado={selecao.escolhidos.length >= selecao.necessarios}
          temMais={Boolean(search.hasNextPage)}
          aCarregarMais={search.isFetchingNextPage}
          aoAlternar={selecao.alternar}
          aoTentarDeNovo={() => void search.refetch()}
          aoVerMais={() => void search.fetchNextPage()}
        />
      </div>

      {selecao.servicoPedido !== null && professionals.length > 0 && (
        <BarraDeEnvioDoPedido
          nomeDoServico={selecao.servicoPedido.name}
          escolhidos={selecao.escolhidos.length}
          necessarios={selecao.necessarios}
          podeEnviar={selecao.podeEnviar}
          aoEnviar={selecao.enviar}
        />
      )}
    </main>
  )
}
