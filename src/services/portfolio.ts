import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { convertToWebp } from '../lib/imageConversion'

const PORTFOLIO_BUCKET = 'portfolio-photos'
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024
// Espelha o limite imposto pelas funções SQL do backend (Adendo v1.23, item C).
export const MAX_PHOTOS_PER_PROJECT = 10
export const MAX_PROJECT_DESCRIPTION_LENGTH = 500
// Uploads em paralelo: uma foto de telemóvel convertida ronda os 200–400 KB, e três de cada
// vez enchem uma ligação 3G sem deixar nenhuma a meio durante minutos.
const UPLOAD_CONCURRENCY = 3

export class PortfolioUploadError extends Error {}

export interface ProjectPhoto {
  id: string
  photo_url: string
  position: number
}

// Um trabalho do profissional: um serviço, uma descrição e 1..10 fotos (carrossel).
// `category` é null só nas fotos anteriores ao Adendo v1.23, que não tinham serviço.
export interface PortfolioProject {
  id: string
  category: { id: string; name: string } | null
  description: string | null
  created_at: string
  photos: ProjectPhoto[]
  // Ocultado por moderação: só o dono recebe estes trabalhos, com o motivo (Fase 17 do backend).
  hidden: boolean
  hidden_reason: string | null
}

// Devolve a mensagem de erro de um ficheiro que não serve, ou null. Separado do upload
// para o formulário rejeitar logo ao escolher, em vez de só ao submeter.
export function validatePortfolioFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'O ficheiro tem de ser uma imagem.'
  if (file.size > MAX_FILE_SIZE_BYTES) return 'A imagem não pode exceder 8 MB.'
  return null
}

function randomSuffix(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

// Upload direto ao Supabase Storage (anon key + RLS), convertido para WebP antes do envio
// (lib/imageConversion.ts) — mesmo padrão de services/avatar.ts. O caminho leva um sufixo
// aleatório: com várias fotos em paralelo, só `Date.now()` repetia-se no mesmo milissegundo.
async function uploadOne(userId: string, file: File): Promise<string> {
  const invalid = validatePortfolioFile(file)
  if (invalid) throw new PortfolioUploadError(invalid)

  const converted = await convertToWebp(file)
  const extension = converted.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() ?? 'jpg')
  const path = `${userId}/${Date.now()}-${randomSuffix()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(PORTFOLIO_BUCKET)
    .upload(path, converted, { upsert: false, contentType: converted.type })

  if (uploadError) {
    throw new PortfolioUploadError('Não foi possível enviar uma das fotos. Tenta novamente.')
  }

  return supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl
}

// Envia todas as fotos e devolve os URLs pela mesma ordem dos ficheiros (a ordem é a do
// carrossel). À primeira falha pára de arrancar novos uploads e rejeita: o projeto só é
// criado quando TODAS as fotos estão no Storage, por isso nunca existe um projeto
// incompleto. As que já subiram ficam órfãs no bucket — mesma omissão já aceite para as
// fotos removidas (TRD Adendo v1.17, item D).
export async function uploadPortfolioPhotos(
  userId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const urls = Array.from<string>({ length: files.length })
  let next = 0
  let done = 0
  let failure: unknown = null

  async function worker() {
    while (failure === null) {
      const index = next++
      if (index >= files.length) return
      try {
        urls[index] = await uploadOne(userId, files[index])
        onProgress?.(++done, files.length)
      } catch (error) {
        failure ??= error
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker))
  if (failure !== null) throw failure
  return urls
}

// POST /professionals/me/projects — cria o trabalho com as fotos já enviadas ao Storage.
export async function createPortfolioProject(input: {
  category_id: string
  description: string | null
  photo_urls: string[]
}): Promise<PortfolioProject> {
  const response = await api.post<PortfolioProject>('/professionals/me/projects', input)
  return response.data
}

// PATCH /professionals/me/projects/:id — `description: null` apaga a descrição.
export async function updatePortfolioProject(
  projectId: string,
  input: { category_id?: string; description?: string | null },
): Promise<PortfolioProject> {
  const response = await api.patch<PortfolioProject>(`/professionals/me/projects/${projectId}`, input)
  return response.data
}

// POST /professionals/me/projects/:id/photos
export async function addProjectPhotos(projectId: string, photoUrls: string[]): Promise<PortfolioProject> {
  const response = await api.post<PortfolioProject>(`/professionals/me/projects/${projectId}/photos`, { photo_urls: photoUrls })
  return response.data
}

// DELETE .../photos/:photoId — o backend recusa (409) apagar a última foto de um trabalho.
export async function removeProjectPhoto(projectId: string, photoId: string): Promise<PortfolioProject> {
  const response = await api.delete<PortfolioProject>(`/professionals/me/projects/${projectId}/photos/${photoId}`)
  return response.data
}

// DELETE /professionals/me/projects/:id — apaga o trabalho e as suas fotos (não apaga os
// ficheiros do Storage; ver uploadPortfolioPhotos).
export async function removePortfolioProject(projectId: string): Promise<void> {
  await api.delete(`/professionals/me/projects/${projectId}`)
}
