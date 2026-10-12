import type { PortfolioProject } from '../../services/portfolio'
import { ProjectCarousel } from './ProjectCarousel'

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' })

interface ProjectCardProps {
  project: PortfolioProject
  onOpenPhoto: (index: number) => void
}

// Um trabalho tal como o cliente o vê no catálogo: carrossel de fotos, o serviço prestado
// e a descrição — como um post com várias imagens.
export function ProjectCard({ project, onOpenPhoto }: ProjectCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <ProjectCarousel photos={project.photos} onOpenPhoto={onOpenPhoto} />

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          {project.category ? (
            <span className="rounded-full bg-piquete-blue/10 px-3 py-1 text-xs font-semibold text-piquete-blue">{project.category.name}</span>
          ) : (
            <span />
          )}
          <time dateTime={project.created_at} className="text-[11px] text-piquete-gray">
            {dateFormatter.format(new Date(project.created_at))}
          </time>
        </div>

        {project.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-piquete-gray-dark">{project.description}</p>}
      </div>
    </article>
  )
}
