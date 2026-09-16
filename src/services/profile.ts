import { api } from '../lib/api'

// Espelha o enum user_role do backend (PiquetePro24_Backend, supabase/migrations).
export type UserRole = 'CLIENT' | 'PROFESSIONAL' | 'ADMIN'

export interface UserProfile {
  id: string
  full_name: string
  phone: string
  role: UserRole
  province: string | null
  district: string | null
  neighborhood: string | null
  location: unknown
  created_at: string
}

export type LocationUpdatePayload =
  | { latitude: number; longitude: number }
  | { province: string; district?: string; neighborhood?: string }

export async function fetchProfile(): Promise<UserProfile> {
  const response = await api.get<UserProfile>('/profile')
  return response.data
}

export async function updateLocation(payload: LocationUpdatePayload): Promise<UserProfile> {
  const response = await api.patch<UserProfile>('/profile/location', payload)
  return response.data
}
