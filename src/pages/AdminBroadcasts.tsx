import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { FormularioDeComunicado } from '../components/admin/comunicados/FormularioDeComunicado'
import { HistoricoDeComunicados } from '../components/admin/comunicados/HistoricoDeComunicados'

// Fase 18: comunicados por email. As regras do envio estão no formulário; o guard de role está
// na rota.
export function AdminBroadcasts() {
  return (
    <ConteudoDoSeparador
      icone="envelope"
      titulo="Central de Comunicados"
      subtitulo="Disparos em massa com segmentação por cargo e província"
      selo="Disparos registados com auditoria de entrega"
    >
      <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/40">
        <FormularioDeComunicado />
      </div>
      <HistoricoDeComunicados />
    </ConteudoDoSeparador>
  )
}
