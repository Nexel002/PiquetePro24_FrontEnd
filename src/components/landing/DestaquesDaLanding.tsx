import { useFavorites } from '../../hooks/useFavorites'
import { useHomeFeed } from '../../hooks/useHomeFeed'
import { COLUNA } from '../home/layout'
import { WorkSlider } from '../home/WorkSlider'
import { Revelar } from './Revelar'

// A montra de trabalhos que já era a Home do visitante, agora como secção da landing. Sem trabalhos
// (a carregar, erro ou ainda nenhum publicado) a secção não aparece: uma landing não é o sítio para
// um aviso de erro, e o catálogo completo continua a um toque, em «Procurar profissionais».
export function DestaquesDaLanding() {
  const feed = useHomeFeed()
  const { isFavorite, toggleFavorite } = useFavorites()

  if (feed.estado !== 'pronto') return null

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className={COLUNA}>
        <Revelar>
          <WorkSlider
            id="destaques"
            titulo="Trabalhos em destaque"
            ligacao={{ to: '/profissionais', texto: 'Ver todos' }}
            works={feed.destaques}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </Revelar>
      </div>
    </section>
  )
}
