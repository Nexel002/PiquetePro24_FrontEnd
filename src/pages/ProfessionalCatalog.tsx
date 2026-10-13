import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProfessionalCatalog } from '../hooks/useCatalog'
import { useProfile } from '../hooks/useProfile'
import type { ProjectPhoto } from '../services/portfolio'
import { BackButton } from '../components/BackButton'
import { ApresentacaoDoProfissional } from '../components/catalogo/ApresentacaoDoProfissional'
import { AvaliacoesDoProfissional } from '../components/catalogo/AvaliacoesDoProfissional'
import { EsqueletoDoCatalogo } from '../components/catalogo/EsqueletoDoCatalogo'
import { FotoDoCatalogo } from '../components/catalogo/FotoDoCatalogo'
import { LayoutDividido } from '../components/layout/LayoutDividido'
import { TrabalhosRealizados } from '../components/catalogo/TrabalhosRealizados'
import { PhotoLightbox } from '../components/portfolio/PhotoLightbox'

// Catálogo de um profissional (Fase 9, TRD Adendo v1.17): foto, apresentação, portfólio e
// avaliações. Usado por um CLIENT a ver um profissional (link em FindProfessionals.tsx) e
// pelo próprio profissional a pré-visualizar o que editou em MyCatalog.tsx. Cada bloco vive
// em components/catalogo/; aqui ficam só os dados e a foto aberta no ecrã inteiro.
export function ProfessionalCatalog() {
  const { id } = useParams<{ id: string }>()
  const { data: catalog, isLoading, isError } = useProfessionalCatalog(id)
  const { data: profile } = useProfile()
  const [openPhotos, setOpenPhotos] = useState<{ photos: ProjectPhoto[]; index: number } | null>(null)

  const ehDono = Boolean(profile && catalog && profile.id === catalog.id)
  const capa = catalog?.avatar_url ?? catalog?.projects[0]?.photos[0]?.photo_url ?? null

  return (
    // Telas menores: foto a toda a largura no topo, sem margens laterais.
    // Desktop (lg): ecrã dividido 50/50 — foto inteira à esquerda, informações à direita.
    <main className="min-h-dvh w-full pb-28 animate-fade-in lg:pb-0">
      {isLoading && (
        <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-10">
          <BackButton />
          <EsqueletoDoCatalogo />
        </div>
      )}

      {isError && (
        <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-10">
          <BackButton />
          <p className="rounded-3xl border border-rose-100 bg-rose-50 p-5 text-sm font-medium text-rose-600">
            Não foi possível carregar este catálogo. Verifica a tua ligação e tenta novamente.
          </p>
        </div>
      )}

      {catalog && (
        <LayoutDividido foto={<FotoDoCatalogo catalog={catalog} capa={capa} ehDono={ehDono} />}>
          <ApresentacaoDoProfissional catalog={catalog} ehDono={ehDono} />
          <TrabalhosRealizados projects={catalog.projects} ehDono={ehDono} aoAbrirFoto={(photos, index) => setOpenPhotos({ photos, index })} />
          <AvaliacoesDoProfissional reviews={catalog.reviews} media={catalog.rating_avg} />
        </LayoutDividido>
      )}

      {openPhotos && <PhotoLightbox photos={openPhotos.photos} startIndex={openPhotos.index} onClose={() => setOpenPhotos(null)} />}
    </main>
  )
}
