import { useState } from 'react'
import type { PortfolioProject, ProjectPhoto } from '../../services/portfolio'
import { BotaoDenunciar } from '../moderacao/BotaoDenunciar'
import { ProjectCard } from '../portfolio/ProjectCard'

interface TrabalhosRealizadosProps {
  projects: PortfolioProject[]
  ehDono: boolean
  aoAbrirFoto: (fotos: ProjectPhoto[], indice: number) => void
}

export function TrabalhosRealizados({ projects, ehDono, aoAbrirFoto }: TrabalhosRealizadosProps) {
  const [serviceFilter, setServiceFilter] = useState<string | null>(null)

  // Serviços com pelo menos um trabalho, para o filtro. Só aparece com 2 ou mais: com um
  // só, o filtro não separava nada. Trabalhos sem serviço (anteriores ao Adendo v1.23)
  // ficam fora dos chips mas continuam na lista "Todos".
  const projectServices = new Map<string, string>()
  for (const project of projects) {
    if (project.category) projectServices.set(project.category.id, project.category.name)
  }
  const visibleProjects = projects.filter((project) => serviceFilter === null || project.category?.id === serviceFilter)

  return (
      <section className="flex flex-col gap-4 rounded-[2.5rem] bg-white p-6 shadow-card border border-gray-100 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-piquete-blue sm:text-xl">Trabalhos realizados</h2>
            <p className="text-xs text-piquete-gray">Portfólio com fotos reais de projetos concluídos</p>
          </div>
          {projects.length > 0 && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-piquete-blue/10 px-3 py-1 text-xs font-bold text-piquete-blue">
              {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
            </span>
          )}
        </div>

        {projects.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-piquete-gray">
            {ehDono ? 'Ainda não adicionaste trabalhos ao teu catálogo.' : 'Este profissional ainda não adicionou trabalhos.'}
          </p>
        ) : (
          <>
            {/* Filtro por serviço */}
            {projectServices.size > 1 && (
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar trabalhos por serviço">
                {[[null, 'Todos'] as const, ...projectServices.entries()].map(([id, name]) => (
                  <button
                    key={id ?? 'todos'}
                    type="button"
                    onClick={() => setServiceFilter(id)}
                    aria-pressed={serviceFilter === id}
                    className={`shrink-0 rounded-full border px-3.5 py-1 text-xs font-semibold transition-all ${
                      serviceFilter === id
                        ? 'border-piquete-blue bg-piquete-blue text-white shadow-sm'
                        : 'border-gray-200 bg-white text-piquete-blue hover:border-piquete-blue/40'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {/* Grid de Trabalhos (Carrossel estilo Instagram para cada trabalho) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleProjects.map((project) => (
                <div key={project.id} className="flex flex-col gap-2">
                  {project.hidden && (
                    <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Este trabalho foi ocultado pela moderação e não aparece a outros utilizadores
                      {project.hidden_reason ? `: ${project.hidden_reason}` : '.'}
                    </p>
                  )}
                  <ProjectCard project={project} onOpenPhoto={(index) => aoAbrirFoto(project.photos, index)} />
                  {!ehDono && <BotaoDenunciar targetType="PORTFOLIO_PROJECT" targetId={project.id} descricao="este trabalho" />}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
  )
}
