import { api } from '../lib/api'

// Espelha o enum user_role do backend (PiquetePro24_Backend, supabase/migrations).
export type UserRole = 'CLIENT' | 'PROFESSIONAL' | 'ADMIN'

export interface UserProfile {
  id: string
  full_name: string
  // null quando o signup foi via Google (o Google não partilha telefone via OAuth) —
  // ver getOnboardingStep abaixo.
  phone: string | null
  role: UserRole
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
