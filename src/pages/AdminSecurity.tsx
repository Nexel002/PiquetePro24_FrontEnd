import { toast } from 'sonner'
import { BackButton } from '../components/BackButton'
import { NavegacaoAdmin } from '../components/admin/NavegacaoAdmin'
import { FormularioDeCodigo } from '../components/admin/FormularioDeCodigo'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useEstadoDoMfa, useIniciarRegistoDeFactor } from '../hooks/useMfa'

// Fase 20: registo da verificação em dois passos (TOTP). Remover o factor não está aqui de
// propósito: tirar a protecção a partir de uma sessão que pode estar roubada é o que o segundo
// factor existe para impedir. Quem perde o telemóvel recupera pelo painel do Supabase.
export function AdminSecurity() {
  const estado = useEstadoDoMfa()
  const iniciar = useIniciarRegistoDeFactor()
  const registo = iniciar.data

  function comecar() {
    iniciar.mutate(undefined, {
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível iniciar o registo.'),
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">Segurança</h1>
      </header>

      <NavegacaoAdmin />

      <Card variant="solid" className="flex flex-col gap-3 p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Verificação em dois passos</h2>

        {estado.isLoading && <div role="status" aria-label="A carregar" className="h-16 animate-pulse rounded-xl bg-gray-200" />}
        {estado.isError && <p className="text-sm text-gray-600">Não foi possível ler o estado da verificação. Verifica a tua ligação e tenta novamente.</p>}

        {estado.data?.temFactor && (
          <>
            <p className="text-sm font-semibold text-emerald-700">Ativa nesta conta.</p>
            <p className="text-sm text-gray-600">
              Sempre que entrares só com a palavra-passe, o painel pede o código da app de autenticação. Se perderes o telemóvel, a
              recuperação é feita pela equipa técnica no painel do Supabase.
            </p>
          </>
        )}

        {estado.data && !estado.data.temFactor && !registo && (
          <>
            <p className="text-sm text-gray-600">
              Ainda não está ativa. Com ela, uma palavra-passe roubada já não chega ao painel: é preciso também o código da app de
              autenticação (Google Authenticator, Microsoft Authenticator, Authy…).
            </p>
            <Button type="button" size="sm" className="self-start" onClick={comecar} isLoading={iniciar.isPending} disabled={iniciar.isPending}>
              Ativar verificação em dois passos
            </Button>
          </>
        )}

        {estado.data && !estado.data.temFactor && registo && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-700">1. Na app de autenticação, lê este código QR.</p>
            <img src={registo.qrCode} alt="Código QR para a app de autenticação" className="h-44 w-44 self-center rounded-xl border border-gray-200 bg-white p-2" />
            <p className="text-xs text-gray-500">
              Sem câmara? Escreve este segredo à mão: <code className="break-all font-mono text-gray-800">{registo.segredo}</code>
            </p>
            <p className="text-sm text-gray-700">2. Escreve o código de 6 dígitos que a app mostra.</p>
            <FormularioDeCodigo
              factorId={registo.factorId}
              rotuloDoBotao="Confirmar e ativar"
              aoVerificar={() => toast.success('Verificação em dois passos ativada.')}
            />
          </div>
        )}
      </Card>
    </main>
  )
}
