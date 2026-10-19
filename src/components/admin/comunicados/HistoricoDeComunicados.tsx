import { useBroadcasts } from '../../../hooks/useAdminBroadcasts'
import { ROTULOS_DE_GRUPO, type Broadcast } from '../../../services/adminBroadcasts'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'
import { ACarregar, ErroAoCarregar, ListaVazia } from '../estrutura/EstadosDaLista'

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Maputo' })

function CartaoDeComunicado({ comunicado }: { comunicado: Broadcast }) {
  const concluido = comunicado.status === 'DONE'
  return (
    <Card variant="solid" className="flex flex-col gap-1 p-4 border border-slate-200">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">{comunicado.subject}</p>
        <Badge variant={concluido ? 'approved' : 'pending'}>{concluido ? 'Concluído' : 'A enviar'}</Badge>
      </div>
      <p className="text-xs text-slate-500">
        {ROTULOS_DE_GRUPO[comunicado.audience_role]}
        {comunicado.audience_province ? ` · ${comunicado.audience_province}` : ''} · {dataFormatter.format(new Date(comunicado.created_at))}
        {comunicado.author_name ? ` · ${comunicado.author_name}` : ''}
      </p>
      <p className="text-sm text-slate-700">
        {comunicado.sent_count} de {comunicado.recipient_count} enviados
        {comunicado.failed_count > 0 && ` · ${comunicado.failed_count} sem entrega`}
      </p>
    </Card>
  )
}

export function HistoricoDeComunicados() {
  const { data: historico, isLoading, isError } = useBroadcasts()

  return (
    <section className="p-4 sm:p-6 flex flex-col gap-3 border-t border-slate-100">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Enviados</h3>
      {isLoading && <ACarregar blocos={1} />}
      {isError && <ErroAoCarregar>Não foi possível carregar o histórico. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>}
      {historico && historico.length === 0 && <ListaVazia icone="envelope" titulo="Ainda não enviaste nenhum comunicado." />}
      {historico && historico.length > 0 && (
        <ul className="flex flex-col gap-3">
          {historico.map((comunicado) => (
            <li key={comunicado.id}>
              <CartaoDeComunicado comunicado={comunicado} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
