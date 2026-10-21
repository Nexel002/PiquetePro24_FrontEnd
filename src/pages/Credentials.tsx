import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BackButton } from '../components/BackButton'
import { FormularioDeCredencial } from '../components/credenciais/FormularioDeCredencial'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { useDeleteCredential, useOwnCredentials } from '../hooks/useCredentials'
import { useProfile } from '../hooks/useProfile'
import { mesEAno, ROTULO_DO_TIPO, type EstadoDaCredencial } from '../services/credentials'

const ESTADO: Record<EstadoDaCredencial, { rotulo: string; classe: string }> = {
  PENDING: { rotulo: 'Em verificação', classe: 'bg-amber-50 text-amber-700' },
  APPROVED: { rotulo: 'Verificada', classe: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { rotulo: 'Não aceite', classe: 'bg-rose-50 text-rose-700' },
}

// Fase 41 (TRD Adendo v1.66, N5): as credenciais do profissional ou do técnico — enviar, ver o
// estado (e o motivo de uma rejeição) e apagar. Guard inline, como em MyCatalog.tsx.
export function Credentials() {
  const { data: perfil, isLoading: aCarregarPerfil } = useProfile()
  const credenciais = useOwnCredentials()
  const apagar = useDeleteCredential()
  const [aEnviar, setAEnviar] = useState(false)

  if (aCarregarPerfil) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 sm:p-6">
        <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />
      </main>
    )
  }
  if (perfil?.role !== 'PROFESSIONAL' && perfil?.role !== 'TECHNICIAN') return <Navigate to="/" replace />

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 pb-12 sm:p-6 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 font-heading text-xl font-extrabold text-piquete-blue">As minhas credenciais</h1>
      </header>

      <p className="text-sm text-gray-600">
        Provas opcionais — registo criminal, carteira profissional, formação. Depois de verificadas, aparecem como selo no catálogo e dão
        mais confiança a quem te deixa entrar em casa.
      </p>

      <Card variant="solid">
        <CardContent className="flex flex-col gap-3">
          {aEnviar ? (
            <FormularioDeCredencial aoTerminar={() => setAEnviar(false)} />
          ) : (
            <Button type="button" onClick={() => setAEnviar(true)} className="self-start">
              Enviar uma credencial
            </Button>
          )}
        </CardContent>
      </Card>

      {credenciais.isLoading && <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />}
      {credenciais.isError && <p className="text-sm text-gray-600">Não foi possível carregar as tuas credenciais. Tenta novamente.</p>}
      {credenciais.data && credenciais.data.length === 0 && <p className="text-sm text-gray-500">Ainda não enviaste nenhuma credencial.</p>}

      {credenciais.data && credenciais.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {credenciais.data.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-piquete-blue">{c.title}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO[c.status].classe}`}>{ESTADO[c.status].rotulo}</span>
              </div>
              <p className="text-xs text-gray-500">
                {ROTULO_DO_TIPO[c.type]}
                {c.issuer ? ` · ${c.issuer}` : ''}
                {c.expires_at ? ` · válida até ${mesEAno(c.expires_at)}` : ''}
              </p>
              {c.status === 'REJECTED' && c.review_notes && <p className="text-xs text-rose-700">Motivo: {c.review_notes}</p>}
              <button
                type="button"
                onClick={() => apagar.mutate(c.id, { onError: () => toast.error('Não foi possível apagar. Tenta novamente.') })}
                disabled={apagar.isPending}
                className="min-h-[40px] self-end rounded-full px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                Apagar
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
