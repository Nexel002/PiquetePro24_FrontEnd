import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAssignedServiceRequests } from '../hooks/useServiceRequests'
import { useProfile } from '../hooks/useProfile'
import { useTeam } from '../hooks/useCompanyTeam'
import { AtribuirTecnico } from '../components/equipa/AtribuirTecnico'
import { BackButton } from '../components/BackButton'
import { ContactoCliente } from '../components/ContactoCliente'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { BotaoDenunciar } from '../components/moderacao/BotaoDenunciar'
import { RecorrenciasDoProfissional } from '../components/pedidos/RecorrenciasDoProfissional'
import type { TeamMember } from '../services/companyTeam'
import type { RequestStatus, ServiceRequest } from '../services/serviceRequests'

const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: 'Aberto',
  ASSIGNED: 'Em curso',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const STATUS_BADGE_VARIANT: Record<RequestStatus, 'info' | 'pending' | 'approved' | 'rejected'> = {
  OPEN: 'info',
  ASSIGNED: 'pending',
  COMPLETED: 'approved',
  CANCELLED: 'rejected',
}

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeZone: 'Africa/Maputo' })

// Backend TRD Adendo v1.12, itens B e G: os pedidos que o profissional aceitou, e o
// contacto do cliente para os que estão em curso. Sem isto, depois de aceitar um
// pedido em "Pedidos perto de ti" não havia forma de lhe voltar.
export function AssignedServiceRequests() {
  const { data: requests, isLoading, isError } = useAssignedServiceRequests()
  const { data: perfil } = useProfile()
  // A equipa só se pede a uma empresa: um singular nem tem equipa nem a rota (403).
  const ehEmpresa = perfil?.role === 'PROFESSIONAL' && perfil.professional_type === 'COMPANY'
  const { data: equipa } = useTeam({ enabled: ehEmpresa })
  const semTecnico = ehEmpresa ? (requests?.filter((r) => r.status === 'ASSIGNED' && !r.assigned_member_id).length ?? 0) : 0

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
          Trabalhos aceites
        </h1>
        <Link to="/perfil" className="text-xs font-semibold text-piquete-blue hover:text-piquete-yellow-hover hover:underline">
          Perfil
        </Link>
      </header>

      {semTecnico > 0 && (
        <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          {semTecnico === 1 ? '1 trabalho aceite ainda não tem técnico.' : `${semTecnico} trabalhos aceites ainda não têm técnico.`} Atribui um para o cliente saber quem vai.
        </p>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">
          Não foi possível carregar os teus trabalhos. Verifica a tua ligação e tenta novamente.
        </p>
      )}

      {requests && requests.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white border border-gray-100 shadow-card text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-piquete-yellow/15 border border-piquete-yellow/30 flex items-center justify-center text-2xl text-piquete-blue">
            🧰
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-piquete-blue">Ainda não aceitaste nenhum pedido</h3>
          </div>
          <Link to="/pedidos-proximos" className="mt-2">
            <Button variant="primary" size="md" className="rounded-xl font-bold shadow-glow-yellow">
              Ver pedidos perto de ti
            </Button>
          </Link>
        </div>
      )}

      {perfil?.role === 'PROFESSIONAL' && <RecorrenciasDoProfissional />}

      {requests && requests.length > 0 && (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <TrabalhoAceite key={request.id} request={request} equipa={ehEmpresa ? (equipa ?? []) : null} />
          ))}
        </ul>
      )}
    </main>
  )
}

// `equipa` é null num profissional singular (não tem técnicos a quem atribuir).
function TrabalhoAceite({ request, equipa }: { request: ServiceRequest; equipa: TeamMember[] | null }) {
  // O contacto só é pedido quando o profissional o abre — dados pessoais do cliente
  // não ficam em cache para todos os trabalhos da lista de uma vez.
  const [mostrarContacto, setMostrarContacto] = useState(false)

  return (
    <li className="flex flex-col gap-2.5 rounded-2xl bg-white border border-gray-100 shadow-card p-4 transition-all duration-300 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-piquete-blue">{request.title}</p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={STATUS_BADGE_VARIANT[request.status]}>{STATUS_LABELS[request.status]}</Badge>
          {/* Pedido direto que ainda ninguém abriu: é o que o profissional deve ver primeiro. */}
          {request.is_direct && !request.client_contact_viewed_at && request.status === 'ASSIGNED' && <Badge variant="warning">Novo pedido</Badge>}
          {/* Fase 42 (N3): uma das vezes de um serviço recorrente do cliente. */}
          {request.recurring_request_id && <Badge variant="info">Recorrente</Badge>}
        </div>
      </div>
      {request.description && <p className="text-xs text-gray-600 leading-relaxed">{request.description}</p>}
      <p className="text-[11px] text-gray-400">
        {[request.neighborhood, request.district, request.province].filter(Boolean).join(', ')}
        {request.assigned_at && ` · aceite a ${dataFormatter.format(new Date(request.assigned_at))}`}
      </p>

      {equipa !== null && request.status === 'ASSIGNED' && <AtribuirTecnico pedido={request} equipa={equipa} />}

      <BotaoDenunciar targetType="SERVICE_REQUEST" targetId={request.id} descricao="com este pedido" rotulo="Reportar um problema" />

      {request.status === 'ASSIGNED' &&
        (mostrarContacto ? (
          <ContactoCliente requestId={request.id} />
        ) : (
          <Button type="button" variant="primary" size="sm" onClick={() => setMostrarContacto(true)} className="self-start">
            Ver pedido de serviço
          </Button>
        ))}
    </li>
  )
}
