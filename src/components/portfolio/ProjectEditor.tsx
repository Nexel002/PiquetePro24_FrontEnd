import { useState } from 'react'
import { toast } from 'sonner'
import { useAddProjectPhotos, useRemoveProject, useRemoveProjectPhoto, useUpdateProject } from '../../hooks/useCatalog'
import {
  MAX_PHOTOS_PER_PROJECT,
  MAX_PROJECT_DESCRIPTION_LENGTH,
  validatePortfolioFile,
  type PortfolioProject,
} from '../../services/portfolio'
import type { ServiceCategory } from '../../services/serviceCategories'
import { Button } from '../ui/Button'
import { ProjectCarousel } from './ProjectCarousel'

interface ProjectEditorProps {
  professionalId: string | undefined
  project: PortfolioProject
  services: ServiceCategory[]
}

// Editar um trabalho já publicado: serviço e descrição (guardados juntos), fotos (cada
// alteração é imediata) e apagar. O backend impõe os limites (1..10 fotos); a UI só evita
// pedidos que sabe que vão falhar.
export function ProjectEditor({ professionalId, project, services }: ProjectEditorProps) {
  const update = useUpdateProject(professionalId)
  const addPhotos = useAddProjectPhotos(professionalId)
  const removePhoto = useRemoveProjectPhoto(professionalId)
  const removeProject = useRemoveProject(professionalId)

  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const currentCategoryId = categoryId ?? project.category?.id ?? null
  const currentDescription = description ?? project.description ?? ''
  const changed =
    (categoryId !== null && categoryId !== project.category?.id) ||
    (description !== null && description.trim() !== (project.description ?? ''))
  const isLastPhoto = project.photos.length <= 1
  const busy = update.isPending || addPhotos.isPending || removePhoto.isPending || removeProject.isPending

  function handleSave() {
    update.mutate(
      {
        projectId: project.id,
        categoryId: categoryId !== null && categoryId !== project.category?.id ? categoryId : undefined,
        description: description !== null ? description.trim() || null : undefined,
      },
      {
        onSuccess: () => {
          setCategoryId(null)
          setDescription(null)
          toast.success('Trabalho atualizado.')
        },
        onError: (error) => toast.error(error.message || 'Não foi possível guardar o trabalho.'),
      },
    )
  }

  function handleAddPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    const invalid = files.map(validatePortfolioFile).find((message) => message !== null)
    if (invalid) {
      toast.error(invalid)
      return
    }
    if (project.photos.length + files.length > MAX_PHOTOS_PER_PROJECT) {
      toast.error(`Um trabalho tem no máximo ${MAX_PHOTOS_PER_PROJECT} fotos.`)
      return
    }

    addPhotos.mutate(
      { projectId: project.id, files },
      { onError: (error) => toast.error(error.message || 'Não foi possível enviar as fotos.') },
    )
  }

  function handleRemovePhoto(photoId: string) {
    removePhoto.mutate(
      { projectId: project.id, photoId },
      { onError: (error) => toast.error(error.message || 'Não foi possível remover a foto.') },
    )
  }

  function handleDelete() {
    removeProject.mutate(project.id, {
      onError: (error) => {
        setConfirmingDelete(false)
        toast.error(error.message || 'Não foi possível apagar o trabalho.')
      },
    })
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <ProjectCarousel photos={project.photos} />

      <div className="flex flex-col gap-3 p-4">
        <ul className="flex flex-wrap gap-2" aria-label="Fotos do trabalho">
          {project.photos.map((photo, position) => (
            <li key={photo.id} className="relative h-14 w-14 overflow-hidden rounded-xl bg-gray-100">
              <img src={photo.photo_url} alt={`Foto ${position + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemovePhoto(photo.id)}
                disabled={busy || isLastPhoto}
                aria-label={`Remover foto ${position + 1}`}
                title={isLastPhoto ? 'Um trabalho precisa de pelo menos uma foto' : undefined}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-piquete-blue-deep/70 text-xs font-bold leading-none text-white hover:bg-rose-600 disabled:opacity-30"
              >
                ×
              </button>
            </li>
          ))}
          {project.photos.length < MAX_PHOTOS_PER_PROJECT && (
            <li>
              <label
                className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-piquete-blue/30 text-center text-[10px] font-semibold leading-tight text-piquete-blue hover:border-piquete-blue/60 ${
                  busy ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                {addPhotos.isPending ? '...' : '+ Fotos'}
                <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={handleAddPhotos} />
              </label>
            </li>
          )}
        </ul>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-piquete-blue">Serviço</p>
          {project.category === null && categoryId === null && (
            <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-700">Este trabalho não tem serviço. Escolhe um para os clientes o encontrarem.</p>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Serviço do trabalho">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => setCategoryId(service.id)}
                aria-pressed={currentCategoryId === service.id}
                disabled={busy}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  currentCategoryId === service.id
                    ? 'border-piquete-blue bg-piquete-blue text-white'
                    : 'border-gray-200 bg-white text-piquete-blue hover:border-piquete-blue/40'
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>
          {/* Serviço que o profissional já deixou de prestar: continua a aparecer no chip do
              catálogo, mas não se pode escolher de novo (o backend recusaria). */}
          {project.category && !services.some((service) => service.id === project.category?.id) && (
            <p className="text-xs text-gray-500">Serviço atual: {project.category.name} (já não está nos teus serviços).</p>
          )}
        </div>

        <textarea
          value={currentDescription}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_PROJECT_DESCRIPTION_LENGTH}
          rows={3}
          disabled={busy}
          aria-label="Descrição do trabalho"
          placeholder="Descreve este trabalho..."
          className="w-full rounded-2xl border border-gray-200 p-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none focus:ring-1 focus:ring-piquete-blue"
        />

        <div className="flex items-center justify-between gap-2">
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Apagar este trabalho?</span>
              <Button type="button" size="sm" variant="danger" onClick={handleDelete} isLoading={removeProject.isPending}>
                Apagar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={removeProject.isPending}>
                Não
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)} disabled={busy}>
              Apagar trabalho
            </Button>
          )}

          <Button type="button" size="sm" onClick={handleSave} disabled={!changed || busy} isLoading={update.isPending}>
            Guardar
          </Button>
        </div>
      </div>
    </article>
  )
}
