import { useState } from 'react'
import { toast } from 'sonner'
import { useRevokeAdmin } from '../../../hooks/useAdminAccounts'
import type { AdminAccount } from '../../../services/adminAccounts'
import { Button } from '../../ui/Button'

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeZone: 'Africa/Maputo' })

export function LinhaDeAdmin({ conta, ehEu }: { conta: AdminAccount; ehEu: boolean }) {
  const remover = useRevokeAdmin()
  const [aConfirmar, setAConfirmar] = useState(false)

  function confirmar() {
    remover.mutate(conta.id, {
      onSuccess: () => toast.success(`${conta.full_name} deixou de ser administrador.`),
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Não foi possível retirar o acesso.')
        setAConfirmar(false)
      },
    })
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-all shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 font-bold flex items-center justify-center shrink-0 border border-rose-100">
            {conta.full_name ? conta.full_name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-gray-900">{conta.full_name}</p>
              {ehEu && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-piquete-blue/10 text-piquete-blue">(tu)</span>}
            </div>
            <p className="truncate text-xs text-gray-500 mt-0.5">
              {conta.email ?? 'sem email'} · desde {dataFormatter.format(new Date(conta.created_at))}
            </p>
          </div>
        </div>

        {!ehEu && !aConfirmar && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAConfirmar(true)}
            aria-label={`Remover ${conta.full_name}`}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 shrink-0"
          >
            Remover
          </Button>
        )}
      </div>

      {aConfirmar && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 text-sm">
          <span className="text-gray-700 text-xs sm:text-sm">
            Retirar o acesso a {conta.full_name}? A conta fica como cliente, não é apagada.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="danger" size="sm" onClick={confirmar} disabled={remover.isPending}>
              Sim, retirar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAConfirmar(false)}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
