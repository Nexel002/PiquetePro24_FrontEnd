import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
import { ContactoCliente } from '../components/ContactoCliente'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useTechnicianContext, useTechnicianJobs } from '../hooks/useTechnician'
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

function Trabalho({ pedido }: { pedido: ServiceRequest }) {
  // O contacto só é pedido quando o técnico o abre: dados pessoais do cliente não ficam em cache
  // para todos os trabalhos da lista de uma vez.
  const [mostrarContacto, setMostrarContacto] = useState(false)

  return (
    <li className="flex flex-col gap-2.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-piquete-blue">{pedido.title}</p>
        <Badge variant={STATUS_BADGE_VARIANT[pedido.status]}>{STATUS_LABELS[pedido.status]}</Badge>
      </div>
      {pedido.description && <p className="text-xs leading-relaxed text-gray-600">{pedido.description}</p>}
      <p className="text-[11px] text-gray-400">
        {[pedido.neighborhood, pedido.district, pedido.province].filter(Boolean).join(', ')}
        {pedido.assigned_at && ` · atribuído a ${dataFormatter.format(new Date(pedido.assigned_at))}`}
      </p>

      {pedido.status === 'ASSIGNED' &&
        (mostrarContacto ? (
          <ContactoCliente requestId={pedido.id} />
        ) : (
          <Button type="button" size="sm" className="self-start" onClick={() => setMostrarContacto(true)}>
            Ver pedido de serviço
          </Button>
        ))}
    </li>
  )
}

// Fase 23: «Os meus trabalhos» do técnico de uma empresa. Mostra primeiro o que impede o técnico
// de trabalhar (o seu KYC por aprovar, a empresa sem subscrição, a conta desativada) e só depois os
// trabalhos que a empresa lhe atribuiu.
export function TechnicianJobs() {
  const contexto = useTechnicianContext()
  const trabalhos = useTechnicianJobs()

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">Os meus trabalhos</h1>
        <Link to="/perfil" className="text-xs font-semibold text-piquete-blue hover:underline">
          Perfil
        </Link>
      </header>

      {contexto.data && (
        <p className="-mt-3 text-sm text-gray-600">
          {contexto.data.title} · {contexto.data.company_name}
        </p>
      )}

      {contexto.data && !contexto.data.own_kyc_approved && (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Para receberes trabalhos precisas de ter a tua identidade verificada (KYC), como qualquer profissional.</p>
          <Link to="/verificacao-identidade" className="self-start font-semibold underline">
            Enviar os meus documentos
          </Link>
        </div>
      )}

      {contexto.data && !contexto.data.company_eligible && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          A tua empresa ainda não pode receber trabalhos (falta a verificação ou a subscrição). Fala com o administrador da empresa.
        </div>
      )}

      {(trabalhos.isLoading || contexto.isLoading) && (
        <div role="status" aria-label="A carregar" className="flex flex-col gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      )}

      {/* A mensagem do backend explica o motivo: conta desativada pela empresa, sem empresa… */}
      {trabalhos.isError && (
        <p role="alert" className="text-sm text-gray-700">
          {trabalhos.error instanceof Error ? trabalhos.error.message : 'Não foi possível carregar os teus trabalhos.'}
        </p>
      )}

      {trabalhos.data && trabalhos.data.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-card">
          <h2 className="text-base font-bold text-piquete-blue">Ainda não tens trabalhos atribuídos</h2>
          <p className="text-sm text-gray-600">Quando a tua empresa te atribuir um pedido, aparece aqui e recebes um email.</p>
        </div>
      )}

      {trabalhos.data && trabalhos.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {trabalhos.data.map((pedido) => (
            <Trabalho key={pedido.id} pedido={pedido} />
          ))}
        </ul>
      )}
    </main>
  )
}
