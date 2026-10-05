import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { convertToWebp } from '../lib/imageConversion'

const PORTFOLIO_BUCKET = 'portfolio-photos'
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024

export class PortfolioUploadError extends Error {}

export interface PortfolioPhoto {
  id: string
  professional_id: string
  photo_url: string
  created_at: string
}

// Mesmo padrão de services/avatar.ts: upload direto ao Supabase Storage (anon key +
// RLS, ver migration da Fase 10 no backend), convertido para WebP antes do envio
// (lib/imageConversion.ts — já existia desde a Fase 2, preparado exatamente para
// este caso). Sem limite de quantidade de fotos (decisão do utilizador, TRD Adendo
// v1.17, item C) — só tamanho por ficheiro.
export async function uploadPortfolioPhoto(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new PortfolioUploadError('O ficheiro tem de ser uma imagem.')
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new PortfolioUploadError('A imagem não pode exceder 8 MB.')
  }

  const converted = await convertToWebp(file)
  const path = `${userId}/${Date.now()}.${converted.type === 'image/webp' ? 'webp' : file.name.split('.').pop()}`

  const { error: uploadError } = await supabase.storage
    .from(PORTFOLIO_BUCKET)
    .upload(path, converted, { upsert: false, contentType: converted.type })

  if (uploadError) {
    throw new PortfolioUploadError('Não foi possível enviar a foto. Tenta novamente.')
  }

  const { data } = supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// POST /professionals/me/portfolio — regista o URL já enviado ao Storage.
export async function addPortfolioPhoto(photoUrl: string): Promise<PortfolioPhoto> {
  const response = await api.post<PortfolioPhoto>('/professionals/me/portfolio', { photo_url: photoUrl })
  return response.data
}

// DELETE /professionals/me/portfolio/:id — o backend confirma que a foto pertence ao
// profissional autenticado antes de apagar; não apaga o ficheiro do Storage (mesma
// omissão já aceite para avatar_url ao trocar de foto, ver TRD Adendo v1.17, item D).
export async function removePortfolioPhoto(photoId: string): Promise<void> {
  await api.delete(`/professionals/me/portfolio/${photoId}`)
}
