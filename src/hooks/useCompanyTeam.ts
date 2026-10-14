import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addMember, assignMember, fetchTeam, setMemberStatus, updateMember, type MemberStatus } from '../services/companyTeam'

const teamKey = ['company-team'] as const

export function useTeam(options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: teamKey, queryFn: fetchTeam, enabled: options.enabled ?? true })
}

export function useAddMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addMember,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamKey })
    },
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; changes: { title?: string; category_ids?: string[] } }) => updateMember(input.id, input.changes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamKey })
    },
  })
}

export function useSetMemberStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: MemberStatus }) => setMemberStatus(input.id, input.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamKey })
    },
  })
}

// Depois de atribuir, a lista de trabalhos da empresa e a da equipa (trabalhos em curso de cada
// técnico) mudam.
export function useAssignMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { requestId: string; memberId: string }) => assignMember(input.requestId, input.memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service_requests'] })
      void queryClient.invalidateQueries({ queryKey: teamKey })
    },
  })
}
