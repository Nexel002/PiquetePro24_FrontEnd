import { Link } from 'react-router-dom'
import type { AdminUserDetail } from '../../services/adminUsers'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const KYC: Record<string, { rotulo: string; variante: 'approved' | 'pending' | 'rejected' | 'info' }> = {
  APPROVED: { rotulo: 'Identidade verificada', variante: 'approved' },
  PENDING: { rotulo: 'Em análise', variante: 'pending' },
  REJECTED: { rotulo: 'Rejeitada', variante: 'rejected' },
  NONE: { rotulo: 'Sem documentos', variante: 'info' },
}

// Na ficha de uma EMPRESA: a equipa, com o KYC e os trabalhos em curso de cada técnico. Cada nome
// leva à ficha do técnico, onde se vê o KYC e a auditoria. Mostra o email porque o admin pode
// precisar de contactar o técnico; é o único sítio, além da própria empresa, em que aparece.
export function EquipaNaFicha({ team }: { team: NonNullable<AdminUserDetail['team']> }) {
  return (
    <Card variant="solid" className="flex flex-col gap-3 p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
        Equipa ({team.filter((m) => m.status === 'ACTIVE').length} ativos de {team.length})
      </h2>
      {team.length === 0 ? (
        <p className="text-sm text-gray-600">Esta empresa ainda não tem técnicos.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {team.map((m) => {
            const kyc = KYC[m.kyc_status]
            return (
              <li key={m.id} className="flex items-start justify-between gap-2 rounded-xl bg-gray-50 p-3">
                <div className="min-w-0">
                  <Link to={`/admin/utilizadores/${m.user_id}`} className="truncate text-sm font-bold text-piquete-blue underline">
                    {m.full_name}
                  </Link>
                  <p className="truncate text-xs text-gray-500">
                    {m.title} · {m.email ?? 'sem email'}
                    {m.active_jobs > 0 && ` · ${m.active_jobs} em curso`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={kyc.variante}>{kyc.rotulo}</Badge>
                  {m.status === 'INACTIVE' && <Badge variant="rejected">Desativado</Badge>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// Na ficha de um TÉCNICO: a empresa a que pertence e o estado dele nela.
export function EmpresaNaFicha({ company }: { company: NonNullable<AdminUserDetail['company']> }) {
  return (
    <Card variant="solid" className="flex flex-col gap-1 p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Empresa</h2>
      <p className="text-sm text-gray-900">
        <Link to={`/admin/utilizadores/${company.id}`} className="font-bold text-piquete-blue underline">
          {company.full_name}
        </Link>{' '}
        · {company.title}
      </p>
      {company.status === 'INACTIVE' && <p className="text-xs font-semibold text-rose-600">Desativado pela empresa.</p>}
    </Card>
  )
}
