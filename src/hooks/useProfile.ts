import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  becomeProfessional,
  deleteAccount,
  fetchProfile,
  updateLocation,
  updateProfileDetails,
  type LocationUpdatePayload,
  type ProfileDetailsUpdatePayload,
} from '../services/profile'
import { uploadAvatar } from '../services/avatar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/AuthContext'

const profileQueryKey = ['profile'] as const

export function useProfile() {
  const { session } = useAuth()

  return useQuery({
    queryKey: profileQueryKey,
    queryFn: fetchProfile,
    // Sem sessão não há token para o interceptor injetar — pedir só desperdiçaria um
    // round-trip para acabar em 401.
    enabled: session !== null,
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LocationUpdatePayload) => updateLocation(payload),
    onSuccess: (profile) => {
      // A resposta do PATCH já é o perfil atualizado — grava-a diretamente na cache em
      // vez de invalidar e esperar por um novo GET /profile.
      queryClient.setQueryData(profileQueryKey, profile)
    },
  })
}

export function useUpdateProfileDetails() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ProfileDetailsUpdatePayload) => updateProfileDetails(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey, profile)
    },
  })
}

// Usado só em AuthCallback.tsx, depois de um signup via Google em que o utilizador
// tinha escolhido "Profissional" antes do redirect (ver INTENDED_ROLE_STORAGE_KEY em
// Login.tsx). Não expõe UI própria fora desse fluxo.
export function useBecomeProfessional() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: becomeProfessional,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey, profile)
    },
  })
}

// Depois do backend apagar a conta (auth.users + tudo em cascata, ver plano do
// backend), a sessão local no browser ainda "parece" válida até expirar — signOut()
// limpa-a explicitamente e a UI (ver Profile.tsx) redireciona para fora de qualquer
// rota protegida. queryClient.clear() evita que dados do utilizador apagado
// sobrevivam na cache do TanStack Query.
export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await supabase.auth.signOut()
      queryClient.clear()
    },
  })
}

// Upload direto ao Storage (services/avatar.ts) seguido de PATCH /profile com o URL
// resultante — duas chamadas de rede numa só mutation, para o componente só precisar
// de um estado de loading/erro em vez de coordenar duas mutations separadas.
export function useUploadAvatar() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!session) throw new Error('Sessão expirada. Recarrega a página e tenta novamente.')
      const avatarUrl = await uploadAvatar(session.user.id, file)
      return updateProfileDetails({ avatar_url: avatarUrl })
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey, profile)
    },
  })
}
