import type { AuditLogEntry } from '../../../services/auditLog'
import { Badge } from '../../ui/Badge'

const dataFormatter = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'Africa/Maputo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function EntradaDeAuditoria({ entrada }: { entrada: AuditLogEntry }) {
  return (
    <div className="p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-all shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-bold text-piquete-blue font-mono">{entrada.action}</span>
        <Badge variant={entrada.success ? 'approved' : 'rejected'}>{entrada.status_code}</Badge>
      </div>

      {entrada.description && <p className="text-sm text-gray-700 mt-1">{entrada.description}</p>}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500 font-mono">
        <span>{dataFormatter.format(new Date(entrada.created_at))}</span>
        <span>·</span>
        <span className="font-semibold text-gray-700">
          {entrada.method} {entrada.path}
        </span>
        {entrada.user_id && (
          <>
            <span>·</span>
            <span>utilizador {entrada.user_id}</span>
          </>
        )}
        {entrada.ip_address && (
          <>
            <span>·</span>
            <span className="text-gray-400">{entrada.ip_address}</span>
          </>
        )}
      </div>
    </div>
  )
}
