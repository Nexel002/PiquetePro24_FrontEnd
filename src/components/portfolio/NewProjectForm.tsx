import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCreateProject } from '../../hooks/useCatalog'
import {
  MAX_PHOTOS_PER_PROJECT,
  MAX_PROJECT_DESCRIPTION_LENGTH,
  PortfolioUploadError,
  validatePortfolioFile,
} from '../../services/portfolio'
import type { ServiceCategory } from '../../services/serviceCategories'
import { Button } from '../ui/Button'

interface PickedPhoto {
  key: string
  file: File
  previewUrl: string
}

interface NewProjectFormProps {
  professionalId: string | undefined
  /** Só os serviços já guardados: o backend recusa um serviço que o profissional não tenha. */
  services: ServiceCategory[]
  onDone: () => void
}

// Criar um trabalho: serviço, fotos (a ordem é a do carrossel) e descrição. O trabalho só é
// criado depois de todas as fotos subirem ao Storage; se uma falhar, nada fica criado e o
// formulário mantém o que o profissional preencheu para tentar de novo.
export function NewProjectForm({ professionalId, services, onDone }: NewProjectFormProps) {
  const createProject = useCreateProject(professionalId)
  const [categoryId, setCategoryId] = useState<string | null>(services.length === 1 ? services[0].id : null)
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<PickedPhoto[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const photosRef = useRef(photos)
  photosRef.current = photos

  // As pré-visualizações são object URLs: sem revogar, ficam na memória até fechar o separador.
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), [])

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    const accepted: PickedPhoto[] = []
    for (const file of files) {
      const invalid = validatePortfolioFile(file)
      if (invalid) {
        toast.error(`${file.name}: ${invalid}`)
        continue
      }
      accepted.push({ key: `${file.name}-${file.size}-${crypto.randomUUID()}`, file, previewUrl: URL.createObjectURL(file) })
    }

    const room = MAX_PHOTOS_PER_PROJECT - photos.length
    if (accepted.length > room) {
      toast.error(`Um trabalho tem no máximo ${MAX_PHOTOS_PER_PROJECT} fotos.`)
      accepted.slice(room).forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    }
    setPhotos((current) => [...current, ...accepted.slice(0, room)])
  }

  function removePhoto(key: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.key === key)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return current.filter((photo) => photo.key !== key)
    })
  }

  function movePhoto(key: string, delta: -1 | 1) {
    setPhotos((current) => {
      const from = current.findIndex((photo) => photo.key === key)
      const to = from + delta
      if (from < 0 || to < 0 || to >= current.length) return current
      const next = [...current]
      ;[next[from], next[to]] = [next[to], next[from]]
      return next
    })
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!categoryId || photos.length === 0) return

    setProgress({ done: 0, total: photos.length })
    createProject.mutate(
      {
        files: photos.map((photo) => photo.file),
        categoryId,
        description,
        onProgress: (done, total) => setProgress({ done, total }),
      },
      {
        onSuccess: () => {
          toast.success('Trabalho adicionado.')
          onDone()
        },
        onError: (error) => {
          setProgress(null)
          toast.error(error instanceof PortfolioUploadError || error instanceof Error ? error.message : 'Não foi possível guardar o trabalho.')
        },
      },
    )
  }

  const canSubmit = categoryId !== null && photos.length > 0 && !createProject.isPending

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-piquete-blue/20 bg-piquete-blue/5 p-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-bold text-piquete-blue">1. Que serviço fizeste?</legend>
        <div className="flex flex-wrap gap-2" role="group">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setCategoryId(service.id)}
              aria-pressed={categoryId === service.id}
              disabled={createProject.isPending}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                categoryId === service.id
                  ? 'border-piquete-blue bg-piquete-blue text-white'
                  : 'border-gray-200 bg-white text-piquete-blue hover:border-piquete-blue/40'
              }`}
            >
              {service.name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-bold text-piquete-blue">
          2. Fotos ({photos.length}/{MAX_PHOTOS_PER_PROJECT})
        </legend>

        {photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((photo, position) => (
              <li key={photo.key} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                <img src={photo.previewUrl} alt={`Foto ${position + 1}`} className="h-full w-full object-cover" />
                {position === 0 && (
                  <span className="absolute left-1 top-1 rounded-full bg-piquete-yellow px-1.5 py-0.5 text-[10px] font-bold text-piquete-blue">Capa</span>
                )}
                {!createProject.isPending && (
                  <>
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.key)}
                      aria-label={`Remover foto ${position + 1}`}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-piquete-blue-deep/70 text-sm font-bold leading-none text-white hover:bg-rose-600"
                    >
                      ×
                    </button>
                    <div className="absolute inset-x-1 bottom-1 flex justify-between">
                      <button
                        type="button"
                        onClick={() => movePhoto(photo.key, -1)}
                        disabled={position === 0}
                        aria-label={`Mover foto ${position + 1} para trás`}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-piquete-blue disabled:opacity-30"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(photo.key, 1)}
                        disabled={position === photos.length - 1}
                        aria-label={`Mover foto ${position + 1} para a frente`}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-piquete-blue disabled:opacity-30"
                      >
                        ›
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {photos.length < MAX_PHOTOS_PER_PROJECT && (
          <label
            className={`flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-piquete-blue/30 bg-white px-3 py-4 text-xs font-semibold text-piquete-blue hover:border-piquete-blue/60 ${
              createProject.isPending ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {photos.length === 0 ? 'Escolher fotos' : 'Adicionar mais fotos'}
            <input type="file" accept="image/*" multiple className="hidden" disabled={createProject.isPending} onChange={handlePick} />
          </label>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="novo-trabalho-descricao" className="text-xs font-bold text-piquete-blue">
          3. Descrição (opcional)
        </label>
        <textarea
          id="novo-trabalho-descricao"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_PROJECT_DESCRIPTION_LENGTH}
          rows={3}
          disabled={createProject.isPending}
          placeholder="O que foi feito, materiais, o resultado..."
          className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none focus:ring-1 focus:ring-piquete-blue"
        />
        <span className="text-right text-xs text-gray-400">
          {description.length}/{MAX_PROJECT_DESCRIPTION_LENGTH}
        </span>
      </div>

      {progress && createProject.isPending && (
        <p role="status" className="text-xs font-medium text-piquete-blue">
          A enviar fotos... {progress.done}/{progress.total}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={createProject.isPending}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={!canSubmit} isLoading={createProject.isPending}>
          Publicar trabalho
        </Button>
      </div>
    </form>
  )
}
