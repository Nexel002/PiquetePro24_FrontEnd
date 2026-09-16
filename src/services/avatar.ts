import { supabase } from '../lib/supabase'
import { convertToWebp } from '../lib/imageConversion'

const AVATARS_BUCKET = 'avatars'
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export class AvatarUploadError extends Error {}

// Upload direto ao Supabase Storage (anon key + RLS — ver
// supabase/migrations/20260916124214_avatar_perfil.sql no backend), não via
// PiquetePro24_Backend: o ficheiro nunca passa pelo servidor Node, só o URL
// resultante é depois gravado com PATCH /profile. Converte para WebP antes do
// upload (lib/imageConversion.ts, reutilizável para outros uploads de imagem
// futuros, ex. fotos de trabalhos dos profissionais).
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new AvatarUploadError('O ficheiro tem de ser uma imagem.')
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AvatarUploadError('A imagem não pode exceder 5 MB.')
  }

  const converted = await convertToWebp(file)
  // RLS do bucket exige que o primeiro segmento do path seja o próprio auth.uid() —
  // ver policies em storage.objects na migration do backend.
  const path = `${userId}/avatar-${Date.now()}.${converted.type === 'image/webp' ? 'webp' : file.name.split('.').pop()}`

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, converted, { upsert: false, contentType: converted.type })

  if (uploadError) {
    throw new AvatarUploadError('Não foi possível enviar a foto. Tenta novamente.')
  }

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
