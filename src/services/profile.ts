import { api } from '../lib/api'

// Espelha o enum user_role do backend (PiquetePro24_Backend, supabase/migrations).
export type UserRole = 'CLIENT' | 'PROFESSIONAL' | 'ADMIN'

// Espelha o enum professional_type do backend
// (20260916155516_tipo_profissional_singular_empresa.sql). Só relevante quando
// role = PROFESSIONAL; null em qualquer outro caso.
export type ProfessionalType = 'SINGULAR' | 'COMPANY'

export interface UserProfile {
  id: string
  full_name: string
  // null quando o signup foi via Google (o Google não partilha telefone via OAuth) —
  // ver getOnboardingStep abaixo.
  phone: string | null
  role: UserRole
  professional_type: ProfessionalType | null
  province: string | null
  district: string | null
  neighborhood: string | null
  location: unknown
  latitude: number | null
  longitude: number | null
  // URL pública no bucket 'avatars' do Supabase Storage; opcional (ver
  // services/avatar.ts para o fluxo de upload).
  avatar_url: string | null
  created_at: string
}

export type OnboardingStep = 'phone' | 'location' | 'complete'

// Deriva o passo de onboarding em falta a partir do próprio estado dos campos — sem
// coluna dedicada no backend. phone null só acontece em signup via Google (email e
// telefone já pedem o número no formulário de registo, ver Login.tsx); localização em
// falta é comum a todos os canais, ninguém a define no signup.
export function getOnboardingStep(profile: UserProfile): OnboardingStep {
  if (!profile.phone) return 'phone'
  if (!profile.province && profile.latitude == null) return 'location'
  return 'complete'
}

export type LocationUpdatePayload =
  | { latitude: number; longitude: number }
  | { province: string; district?: string; neighborhood?: string }

export interface ProfileDetailsUpdatePayload {
  full_name?: string
  phone?: string
  // null explícito remove a foto; undefined deixa o campo intocado.
  avatar_url?: string | null
}

export async function fetchProfile(): Promise<UserProfile> {
  const response = await api.get<UserProfile>('/profile')
  return response.data
}

export async function updateLocation(payload: LocationUpdatePayload): Promise<UserProfile> {
  const response = await api.patch<UserProfile>('/profile/location', payload)
  return response.data
}

export async function updateProfileDetails(payload: ProfileDetailsUpdatePayload): Promise<UserProfile> {
  const response = await api.patch<UserProfile>('/profile', payload)
  return response.data
}

// Apaga a conta "a 100%": auth.users, users_profile e todas as tabelas dependentes em
// cascata (ver plano do backend), mais o avatar no Storage. Irreversível — não há
// desfazer depois desta chamada.
export async function deleteAccount(): Promise<void> {
  await api.delete('/profile')
}

// Transição única CLIENT -> PROFESSIONAL, usada só pelo fluxo de signup via Google
// (que não permite escolher role no momento do signInWithOAuth) — ver AuthCallback.tsx
// e o INTENDED_ROLE_STORAGE_KEY/INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY em Login.tsx.
// Idempotente: se role já não for CLIENT, o backend devolve o perfil atual sem erro
// (nesse caso professionalType é ignorado pelo backend, mas continua obrigatório aqui
// porque o mesmo endpoint serve o caso normal, onde é a única fonte da escolha).
export async function becomeProfessional(professionalType: ProfessionalType): Promise<UserProfile> {
  const response = await api.post<UserProfile>('/profile/become-professional', {
    professional_type: professionalType,
  })
  return response.data
}
