import { Link } from 'react-router-dom'
import type { ProfessionalEligibility } from '../hooks/useProfessionalEligibility'

// Explica ao profissional o que lhe falta para aceitar pedidos, com o caminho para o
// resolver (CLAUDE.md Secção 8: "a UI explica o que falta, em vez de um botão
// desativado sem contexto"). A ordem dos passos é a ordem real: sem KYC aprovado nem
// sequer se pode pagar a subscrição (Backend TRD Adendo v1.12, item F).
export function EligibilityNotice({ eligibility }: { eligibility: ProfessionalEligibility }) {
  if (eligibility.isLoading || eligibility.eligible) {
    return null
  }

  if (eligibility.isError) {
    return (
      <p className="rounded-lg border border-gray-200 p-3 text-sm text-gray-600">
        Não foi possível confirmar se já podes aceitar pedidos. Verifica a tua ligação e tenta novamente.
      </p>
    )
  }

  return (
    <section id="aviso-elegibilidade" className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-800">Ainda não podes aceitar pedidos</p>
      <p className="text-sm text-amber-800">Para aceitar pedidos e ver o contacto dos clientes precisas de:</p>
      <ol className="flex flex-col gap-2 text-sm">
        <li className="flex items-center justify-between gap-2">
          <span className="text-gray-800">
            <span aria-hidden>{eligibility.kycApproved ? '✓' : '1.'}</span> Identidade verificada (KYC aprovado)
            {eligibility.kycApproved && <span className="sr-only"> — concluído</span>}
          </span>
          {!eligibility.kycApproved && (
            <Link to="/verificacao-identidade" className="shrink-0 text-amber-900 underline">
              Verificar
            </Link>
          )}
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="text-gray-800">
            <span aria-hidden>{eligibility.subscriptionActive ? '✓' : '2.'}</span> Subscrição ativa
            {eligibility.subscriptionActive && <span className="sr-only"> — concluído</span>}
          </span>
          {!eligibility.subscriptionActive && eligibility.kycApproved && (
            <Link to="/subscricao" className="shrink-0 text-amber-900 underline">
              Ativar
            </Link>
          )}
        </li>
      </ol>
    </section>
  )
}
