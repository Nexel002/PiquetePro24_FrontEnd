import { toast } from 'sonner'
import { useDeleteSearchAlert, useSearchAlerts } from '../../hooks/useSearchAlerts'

// Fase 39 (TRD Adendo v1.66, N4): os avisos «Avisa-me quando houver» do cliente, no perfil. Sem
// avisos, a secção não aparece — é uma coisa que o cliente pede na pesquisa, não uma definição.
export function OsMeusAvisos() {
  const avisos = useSearchAlerts(true)
  const apagar = useDeleteSearchAlert()

  if (avisos.isLoading) return <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
  if (avisos.isError) {
    return <p className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">Não foi possível carregar os teus avisos de procura.</p>
  }
  if (!avisos.data || avisos.data.length === 0) return null

  function aoApagar(id: string) {
    apagar.mutate(id, {
      onSuccess: () => toast.success('Aviso apagado.'),
      onError: () => toast.error('Não foi possível apagar o aviso. Tenta novamente.'),
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Avisos de procura</span>
      <ul className="flex flex-col gap-2">
        {avisos.data.map((aviso) => (
          <li key={aviso.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm">
            <span className="min-w-0">
              <span className="font-semibold text-piquete-blue">{aviso.category.name}</span> em {aviso.province}
              <span className="block text-xs text-gray-500">{aviso.notified_at ? 'Já avisámos: há profissionais.' : 'À espera de profissionais.'}</span>
            </span>
            <button
              type="button"
              onClick={() => aoApagar(aviso.id)}
              disabled={apagar.isPending}
              className="min-h-[40px] shrink-0 rounded-full px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              Apagar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
