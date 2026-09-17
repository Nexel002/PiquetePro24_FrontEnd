import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

// Espelha o enum kyc_status do backend
// (PiquetePro24_Backend/supabase/migrations/20260915135236_schema_inicial.sql).
export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ProfessionalKyc {
  id: string
  user_id: string
  bi_number: string
  nuit_number: string
  bi_document_url: string | null
  status: KycStatus
  reviewed_by: string | null
  review_notes: string | null
  verified_at: string | null
}

export interface SubmitKycPayload {
  bi_number: string
  nuit_number: string
  bi_document_path: string
}

export async function fetchOwnKyc(): Promise<ProfessionalKyc | null> {
  try {
    const response = await api.get<ProfessionalKyc>('/kyc')
    return response.data
  } catch (err) {
    // 404 aqui significa "ainda não submeteste" (ver kycController.ts no backend),
    // não uma falha real — é o estado normal antes da primeira submissão.
    if (err instanceof Error && err.message === 'Ainda não submeteste documentos KYC.') {
      return null
    }
    throw err
  }
}

export async function submitKyc(payload: SubmitKycPayload): Promise<ProfessionalKyc> {
  const response = await api.post<ProfessionalKyc>('/kyc', payload)
  return response.data
}

// TRD Adendo v1.6: superfície mínima para um ADMIN exercer os endpoints
// administrativos da Fase 4 (GET /admin/kyc, PATCH /admin/kyc/:id) — sem paginação,
// mesmo espírito de fetchMyServiceRequests (volume esperado baixo para uma fila de
// revisão manual).
export async function fetchKycSubmissions(status?: KycStatus): Promise<ProfessionalKyc[]> {
  const response = await api.get<ProfessionalKyc[]>('/admin/kyc', { params: status ? { status } : undefined })
  return response.data
}

export interface ReviewKycPayload {
  status: 'APPROVED' | 'REJECTED'
  review_notes?: string
}

export async function reviewKyc(kycId: string, payload: ReviewKycPayload): Promise<ProfessionalKyc> {
  const response = await api.patch<ProfessionalKyc>(`/admin/kyc/${kycId}`, payload)
  return response.data
}

const KYC_DOCUMENTS_BUCKET = 'kyc-documents'
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export class KycUploadError extends Error {}

// Bucket privado (TRD Secção 5 — só ADMIN pode ler documentos KYC): ao contrário do
// avatar (bucket público, upload direto com a anon key), aqui o frontend não tem
// permissão de INSERT via RLS. O backend gera uma signed upload URL de uso único
// (createSignedUploadUrl, service_role key) e o ficheiro é enviado diretamente para
// essa URL — o Node do backend nunca lida com o binário. Ver
// kycService.createKycUploadUrl no backend.
export async function uploadKycDocument(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new KycUploadError('O documento tem de ser uma imagem (foto ou scan do BI).')
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new KycUploadError('O ficheiro não pode exceder 5 MB.')
  }

  const uploadUrlResponse = await api.post<{ path: string; signedUrl: string; token: string }>('/kyc/upload-url')
  const { path, token } = uploadUrlResponse.data

  const { error: uploadError } = await supabase.storage
    .from(KYC_DOCUMENTS_BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: file.type })

  if (uploadError) {
    throw new KycUploadError('Não foi possível enviar o documento. Tenta novamente.')
  }

  return path
}
