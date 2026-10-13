import { Link } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
import { NavegacaoAdmin } from '../components/admin/NavegacaoAdmin'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { useEstadoDeSistema } from '../hooks/useAdminSystem'
import type { EstadoDoComponente } from '../services/adminSystem'

const ROTULOS: Record<EstadoDoComponente, string> = { OK: 'A funcionar', FALHA: 'Com falha', DESLIGADO: 'Desligado' }
const VARIANTES: Record<EstadoDoComponente, 'approved' | 'rejected' | 'pending'> = { OK: 'approved', FALHA: 'rejected', DESLIGADO: 'pending' }

const horaFormatter = new Intl.DateTimeFormat('pt-PT', { timeStyle: 'medium', timeZone: 'Africa/Maputo' })

function Linha({ rotulo, estado, nota }: { rotulo: string; estado: EstadoDoComponente; nota?: string }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div>
        <p className="text-sm font-semibold text-gray-900">{rotulo}</p>
        {nota && <p className="text-xs text-gray-500">{nota}</p>}
      </div>
      {/* O estado é texto, não só cor. */}
      <Badge variant={VARIANTES[estado]}>{ROTULOS[estado]}</Badge>
    </li>
  )
}

function Pendente({ rotulo, valor, to, avisar = false }: { rotulo: string; valor: number; to: string; avisar?: boolean }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between gap-3 rounded-xl px-1 py-2 hover:bg-gray-50">
        <span className="text-sm text-gray-700">{rotulo}</span>
        <span className={`text-sm font-bold ${valor > 0 && avisar ? 'text-amber-700' : 'text-piquete-blue'}`}>{valor === 0 ? 'Nenhum' : valor}</span>
      </Link>
    </li>
  )
}

// Fase 21: «está tudo a funcionar?» sem abrir os logs. Só estado, nunca segredos. O guard de role
// está na rota.
export function AdminSystem() {
  const { data, isLoading, isError } = useEstadoDeSistema()

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">Sistema</h1>
      </header>

      <NavegacaoAdmin />

      {isLoading && (
        <div role="status" aria-label="A carregar" className="flex flex-col gap-2">
          <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      )}

      {isError && <p className="text-sm text-gray-600">Não foi possível ler o estado do sistema. Se isto persistir, a própria API pode estar em baixo.</p>}

      {data && (
        <>
          <Card variant="solid" className="p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Componentes</h2>
            <ul className="divide-y divide-gray-100">
              <Linha
                rotulo="Base de dados"
                estado={data.base_de_dados.estado}
                nota={data.base_de_dados.latencia_ms !== null ? `${data.base_de_dados.latencia_ms} ms` : data.base_de_dados.detalhe}
              />
              <Linha
                rotulo="Cache (Redis)"
                estado={data.redis.estado}
                nota={data.redis.estado === 'DESLIGADO' ? 'Sem cache: a app funciona, só mais devagar.' : data.redis.detalhe}
              />
              <Linha
                rotulo="Email"
                estado={data.email.estado}
                nota={data.email.estado === 'DESLIGADO' ? 'Sem SMTP: os emails ficam no log e não saem.' : undefined}
              />
            </ul>
          </Card>

          <Card variant="solid" className="p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Configuração</h2>
            <ul className="divide-y divide-gray-100 text-sm">
              <li className="flex justify-between gap-3 py-2">
                <span className="text-gray-700">Pagamentos</span>
                <span className="font-semibold">{data.pagamentos.modo === 'SIMULADO' ? 'Simulados (teste)' : 'Confirmação manual'}</span>
              </li>
              <li className="flex justify-between gap-3 py-2">
                <span className="text-gray-700">Verificação em dois passos obrigatória</span>
                <span className="font-semibold">{data.seguranca.verificacao_dois_passos_obrigatoria ? 'Sim' : 'Não'}</span>
              </li>
            </ul>
          </Card>

          <Card variant="solid" className="p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Pendentes</h2>
            <ul>
              <Pendente rotulo="Verificações de identidade em análise" valor={data.pendentes.kyc_em_analise} to="/admin/kyc" />
              <Pendente rotulo="Denúncias por tratar" valor={data.pendentes.denuncias_abertas} to="/admin/moderacao" />
              <Pendente rotulo="Comunicados presos a meio do envio" valor={data.pendentes.comunicados_presos} to="/admin/comunicados" avisar />
            </ul>
          </Card>

          <p className="text-xs text-gray-500">Verificado às {horaFormatter.format(new Date(data.verificado_em))} · actualiza sozinho de 30 em 30 segundos.</p>
        </>
      )}
    </main>
  )
}
