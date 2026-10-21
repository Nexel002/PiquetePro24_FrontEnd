import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

// Fase 41 (TRD Adendo v1.66, N5): selos de credenciais. Espelha credentialService.ts do backend
// (Fase 34). Opcionais: não contam para a elegibilidade nem substituem o KYC.
export type TipoDeCredencial = 'CRIMINAL_RECORD' | 'PROFESSIONAL_LICENSE' | 'TRAINING' | 'OTHER'
export type EstadoDaCredencial = 'PENDING' | 'APPROVED' | 'REJECTED'

export const ROTULO_DO_TIPO: Record<TipoDeCredencial, string> = {
  CRIMINAL_RECORD: 'Registo criminal',
  PROFESSIONAL_LICENSE: 'Carteira ou licença profissional',
  TRAINING: 'Formação ou certificado',
  OTHER: 'Outra credencial',
}

// O que o próprio vê: estado e motivo, nunca o caminho do ficheiro.
export interface OwnCredential {
  id: string
  type: TipoDeCredencial
  title: string
  issuer: string | null
  issued_at: string | null
  expires_at: string | null
  status: EstadoDaCredencial
  review_notes: string | null
  submitted_at: string
}

// O selo no catálogo.
export interface PublicCredential {
  type: TipoDeCredencial
  title: string
  issuer: string | null
  expires_at: string | null
}

export interface SubmitCredentialPayload {
  type: TipoDeCredencial
  title: string
  issuer?: string | null
  issued_at?: string | null
  expires_at?: string | null
  document_path: string
}

const BUCKET = 'credential-documents'
const TAMANHO_MAXIMO = 5 * 1024 * 1024

export class CredentialUploadError extends Error {}

// Bucket privado, como o do KYC (services/kyc.ts): o backend gera um URL de upload de uso único e o
// ficheiro vai directo para o Storage; o Node nunca lida com o binário.
export async function uploadCredentialDocument(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new CredentialUploadError('O documento tem de ser uma imagem (foto ou digitalização).')
  if (file.size > TAMANHO_MAXIMO) throw new CredentialUploadError('O ficheiro não pode exceder 5 MB.')

  const resposta = await api.post<{ path: string; signedUrl: string; token: string }>('/credentials/upload-url')
  const { path, token } = resposta.data
  const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(path, token, file, { contentType: file.type })
  if (error) throw new CredentialUploadError('Não foi possível enviar o documento. Tenta novamente.')
  return path
}

export async function submitCredential(payload: SubmitCredentialPayload): Promise<OwnCredential> {
  const response = await api.post<OwnCredential>('/credentials', payload)
  return response.data
}

export async function fetchOwnCredentials(): Promise<OwnCredential[]> {
  const response = await api.get<OwnCredential[]>('/credentials')
  return response.data
}

export async function deleteCredential(id: string): Promise<void> {
  await api.delete(`/credentials/${id}`)
}

// «2027-03-01» → «03/2027», como aparece no selo.
export function mesEAno(aaaaMmDd: string): string {
  const [ano, mes] = aaaaMmDd.split('-')
  return `${mes}/${ano}`
}
