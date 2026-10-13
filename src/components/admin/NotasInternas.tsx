import { useState } from 'react'
import { toast } from 'sonner'
import { useAdminNotes, useCreateAdminNote } from '../../hooks/useAdminNotes'
import type { NoteTargetType } from '../../services/adminNotes'
import { Button } from '../ui/Button'

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Maputo' })

// Memória da equipa sobre uma conta ou um pedido. Nunca é visível a quem não é ADMIN (o
// backend só serve /admin/notes a administradores).
export function NotasInternas({ targetType, targetId }: { targetType: NoteTargetType; targetId: string }) {
  const { data: notas, isLoading, isError } = useAdminNotes(targetType, targetId)
  const criar = useCreateAdminNote(targetType, targetId)
  const [texto, setTexto] = useState('')

  function guardar() {
    const corpo = texto.trim()
    if (!corpo) {
      toast.error('Escreve a nota antes de guardar.')
      return
    }
    criar.mutate(corpo, {
      onSuccess: () => setTexto(''),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível guardar a nota.'),
    })
  }

  return (
    <section aria-label="Notas internas" className="flex flex-col gap-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Notas internas</h2>

      <div className="flex flex-col gap-2">
        <textarea
          aria-label="Nova nota interna"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Só a equipa vê isto."
          className="rounded-xl border border-gray-200 p-2 text-sm"
        />
        <Button type="button" size="sm" className="self-start" onClick={guardar} isLoading={criar.isPending} disabled={criar.isPending}>
          Guardar nota
        </Button>
      </div>

      {isLoading && <div role="status" aria-label="A carregar" className="h-12 animate-pulse rounded-xl bg-gray-200" />}
      {isError && <p className="text-sm text-gray-600">Não foi possível carregar as notas.</p>}
      {notas && notas.length === 0 && <p className="text-sm text-gray-500">Ainda sem notas.</p>}
      {notas && notas.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notas.map((nota) => (
            <li key={nota.id} className="rounded-xl bg-gray-50 p-3">
              <p className="whitespace-pre-wrap text-sm text-gray-800">{nota.body}</p>
              <p className="pt-1 text-xs text-gray-500">
                {nota.author_name ?? 'Conta apagada'} · {dataFormatter.format(new Date(nota.created_at))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
