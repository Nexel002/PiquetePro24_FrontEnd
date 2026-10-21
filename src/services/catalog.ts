import { api } from '../lib/api'
import type { PortfolioProject } from './portfolio'
import type { ProfessionalType } from './profile'
import type { ServiceCategory } from './serviceCategories'
import type { PublicCredential } from './credentials'

export interface Review {
  id: string
  service_request_id: string
  professional_id: string
  client_id: string
  client_full_name: string
  rating: number
  // null quando o comentário foi ocultado por moderação; a nota continua a contar.
  comment: string | null
  comment_hidden: boolean
  // Nota do técnico e quem era (só em pedidos de empresas que tiveram técnico). A nota da empresa
  // é `rating`; esta é à parte e não entra na média da empresa.
  member_rating: number | null
  technician: { first_name: string; title: string } | null
  created_at: string
}

// Um técnico no catálogo da empresa: primeiro nome, título, foto e nota. Nunca telefone nem email.
export interface PublicTeamMember {
  id: string
  first_name: string
  title: string
  avatar_url: string | null
  services: ServiceCategory[]
  rating_avg: number | null
  rating_count: number
  // Fase 41 (N5): selos das credenciais verificadas do técnico (opcional: backend anterior à Fase 34).
  credentials?: PublicCredential[]
}

// Fase 38 (TRD Adendo v1.66, N1): até onde o profissional se desloca e que províncias cobre.
// `radius_km` null e `provinces` vazio = não definiu zona (aparece só pela distância, como antes).
export const RAIOS_DE_ATENDIMENTO_KM = [5, 10, 25, 50, 100] as const
export type RaioDeAtendimentoKm = (typeof RAIOS_DE_ATENDIMENTO_KM)[number]

export interface ServiceArea {
  radius_km: RaioDeAtendimentoKm | null
  provinces: string[]
}

export interface ProfessionalCatalog {
  id: string
  full_name: string
  avatar_url: string | null
  professional_type: ProfessionalType | null
  bio: string | null
  // true só com o KYC aprovado por um administrador (o backend decide; ver Adendo v1.39).
  identity_verified: boolean
  // Contacto à vista no catálogo (Fase 28). O backend só envia o número se o profissional pode atender
  // (KYC aprovado e subscrição ativa); sem isso `contact_available` é false e `phone` é null.
  // `phone` null com `contact_available` true = ainda não registou telefone.
  contact_available: boolean
  phone: string | null
  services: ServiceCategory[]
  // Fase 38 (N1). Nunca traz coordenadas: o raio diz-se em km, sem o centro.
  service_area: ServiceArea
  // Fase 41 (N5): selos das credenciais verificadas e válidas. Nunca o documento.
  credentials?: PublicCredential[]
  // O backend ainda envia `portfolio` (fotos soltas) por compatibilidade com versões antigas
  // do frontend (TRD Adendo v1.23, item D); esta versão só lê `projects`.
  projects: PortfolioProject[]
  rating_avg: number | null
  rating_count: number
  // Só empresas (vazio nos singulares): técnicos ativos com a identidade verificada.
  team: PublicTeamMember[]
  reviews: Review[]
}

// GET /professionals/:id/catalog (Fase 9, TRD Adendo v1.17) — só para utilizadores
// autenticados (sem link público, decisão do utilizador); qualquer role, tanto um
// CLIENT a ver um profissional como o próprio PROFESSIONAL a pré-visualizar o que
// editou (MyCatalog.tsx chama isto com o próprio id).
export async function fetchProfessionalCatalog(professionalId: string): Promise<ProfessionalCatalog> {
  const response = await api.get<ProfessionalCatalog>(`/professionals/${professionalId}/catalog`)
  return response.data
}

// PATCH /professionals/me/service-area (Backend Fase 31) — só o profissional; devolve a zona gravada.
export async function updateServiceArea(area: ServiceArea): Promise<ServiceArea> {
  const response = await api.patch<ServiceArea>('/professionals/me/service-area', area)
  return response.data
}
