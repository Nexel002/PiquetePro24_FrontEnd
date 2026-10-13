import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createAdminNote, fetchAdminNotes, type NoteTargetType } from '../services/adminNotes'

const notesKey = (targetType: NoteTargetType, targetId: string) => ['admin-notes', targetType, targetId] as const

export function useAdminNotes(targetType: NoteTargetType, targetId: string) {
  return useQuery({
    queryKey: notesKey(targetType, targetId),
    queryFn: () => fetchAdminNotes(targetType, targetId),
  })
}

export function useCreateAdminNote(targetType: NoteTargetType, targetId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: string) => createAdminNote(targetType, targetId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notesKey(targetType, targetId) })
    },
  })
}
