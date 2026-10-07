import { useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BottomNav } from '../components/BottomNav'
import { CategoryFilter } from '../components/home/CategoryFilter'
import { COLUNA } from '../components/home/layout'
import { HomeHeader } from '../components/home/HomeHeader'
import { HomeHero } from '../components/home/HomeHero'
import { HomeShortcuts } from '../components/home/HomeShortcuts'
import { SearchResults } from '../components/home/SearchResults'
import { WorkSlider } from '../components/home/WorkSlider'
import { useFavorites } from '../hooks/useFavorites'
import { useHomeFeed } from '../hooks/useHomeFeed'
import { useHomeUser } from '../hooks/useHomeUser'

// Esta página só compõe: quem é o utilizador (useHomeUser), o que se mostra (useHomeFeed) e
// os blocos visuais (components/home). Fundo branco e conteúdo plano, no estilo das
// plataformas de catálogo; o cabeçalho e a barra de categorias ocupam a largura toda, o
// resto vive numa coluna centrada.
export function Home() {
  const navigate = useNavigate()
  const { temSessao, profile, primeiroNome, localizacao, terminarSessao } = useHomeUser()
  const feed = useHomeFeed()
  const { isFavorite, toggleFavorite } = useFavorites()

  function aoPesquisar(event: FormEvent) {
    event.preventDefault()
    const termo = feed.pesquisa.trim()
    navigate(termo ? `/profissionais?q=${encodeURIComponent(termo)}` : '/profissionais')
  }

  function aoClicarNotificacoes() {
    if (profile?.role === 'PROFESSIONAL') navigate('/pedidos-recebidos')
    else if (profile?.role === 'CLIENT') navigate('/os-meus-pedidos')
    else toast.info('Não tens novas notificações no momento.')
  }

  // O `body` é cinzento (gray-50) para os restantes ecrãs. Aqui passa a branco enquanto a Home
  // está montada, para nenhuma faixa cinzenta aparecer atrás do conteúdo (ao esticar o ecrã,
  // no "rubber-band" do telemóvel ou quando o conteúdo é mais curto que a janela).
  useEffect(() => {
    const anterior = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#ffffff'
    return () => {
      document.body.style.backgroundColor = anterior
    }
  }, [])

  const slider = { isFavorite, onToggleFavorite: toggleFavorite }

  return (
    <div className="min-h-dvh bg-white text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      <HomeHeader
        temSessao={temSessao}
        primeiroNome={primeiroNome}
        nomeCompleto={profile?.full_name ?? undefined}
        avatarUrl={profile?.avatar_url}
        papel={profile?.role}
        pesquisa={feed.pesquisa}
        aoMudarPesquisa={feed.setPesquisa}
        aoPesquisar={aoPesquisar}
        aoClicarNotificacoes={aoClicarNotificacoes}
        aoTerminarSessao={() => void terminarSessao()}
      />
      <CategoryFilter categorias={feed.categorias} selecionada={feed.categoria} aoSeleccionar={feed.setCategoria} />

      {/* O espaço em baixo cobre a barra de navegação flutuante (só em telemóvel) e a área
          segura dos telemóveis com barra de gestos. */}
      <main className={`${COLUNA} pb-[calc(7rem+env(safe-area-inset-bottom))]`}>
        <HomeHero
          temSessao={temSessao}
          primeiroNome={primeiroNome}
          nomeCompleto={profile?.full_name ?? undefined}
          avatarUrl={profile?.avatar_url}
          papel={profile?.role}
          localizacao={localizacao}
        />

        {feed.filtroActivo ? (
          <SearchResults
            works={feed.trabalhosFiltrados}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            aoLimpar={feed.limparFiltros}
          />
        ) : (
          <>
            {temSessao && <HomeShortcuts papel={profile?.role} />}
            <div className="space-y-12 sm:space-y-14">
              <WorkSlider
                id="destaques"
                titulo="Trabalhos em destaque"
                ligacao={{ to: '/profissionais', texto: 'Ver todos' }}
                works={feed.destaques}
                {...slider}
              />
              <WorkSlider
                id="canalizacao"
                titulo="Canalização e reparações hidráulicas"
                ligacao={{ to: '/profissionais?category=canalizacao', texto: 'Ver canalizadores' }}
                works={feed.canalizacao}
                {...slider}
              />
              <WorkSlider
                id="eletricidade"
                titulo="Eletricidade e instalações de energia"
                ligacao={{ to: '/profissionais?category=eletricidade', texto: 'Ver eletricistas' }}
                works={feed.eletricidade}
                {...slider}
              />
              <WorkSlider
                id="exteriores"
                titulo="Pintura, acabamentos e espaços verdes"
                ligacao={{ to: '/profissionais', texto: 'Explorar todos' }}
                works={feed.exteriores}
                {...slider}
              />
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
