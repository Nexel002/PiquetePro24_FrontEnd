import { mesEAno, ROTULO_DO_TIPO, type PublicCredential } from '../../services/credentials'

// Fase 41 (TRD Adendo v1.66, N5): os selos que o cliente vê — só credenciais verificadas pela equipa
// e ainda válidas (o backend já filtra). Em texto: «Registo criminal verificado, válido até 03/2027».
export function SelosDeCredenciais({ credenciais, compacto = false }: { credenciais: PublicCredential[] | undefined; compacto?: boolean }) {
  if (!credenciais || credenciais.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Credenciais verificadas">
      {credenciais.map((c, i) => (
        <li
          key={`${c.type}-${i}`}
          className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 ${
            compacto ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
          }`}
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {c.type === 'OTHER' ? c.title : ROTULO_DO_TIPO[c.type]} verificado
          {c.expires_at ? `, válido até ${mesEAno(c.expires_at)}` : ''}
        </li>
      ))}
    </ul>
  )
}
