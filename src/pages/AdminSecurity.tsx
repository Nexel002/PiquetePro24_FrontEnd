import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { FormularioDeCodigo } from '../components/admin/FormularioDeCodigo'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { ACarregar, ErroAoCarregar } from '../components/admin/estrutura/EstadosDaLista'
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
  // Chega com este estado quando o backend recusou um ecrã de admin por falta do segundo factor
  // (ReencaminharParaSegundoFactor): explica porque é que o painel não abriu.
  const exigido = (useLocation().state as { segundoFactorExigido?: boolean } | null)?.segundoFactorExigido === true

  function comecar() {
    iniciar.mutate(undefined, {
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível iniciar o registo.'),
    })
  }

  return (
    <ConteudoDoSeparador
      icone="cadeado"
      titulo="Verificação em Dois Passos (2FA)"
      subtitulo="Proteção com códigos temporários via aplicação autenticadora"
      selo="Autenticação de alto nível (AAL2) suportada"
    >
      <div className="p-4 sm:p-6 border-t border-slate-100 flex flex-col gap-5">
        {exigido && (
          <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">O painel de administração exige verificação em dois passos.</p>
            <p className="mt-1">Ativa-a aqui em baixo e volta a abrir o ecrã que querias ver.</p>
          </div>
        )}

        <Card variant="solid" className="flex flex-col gap-4 p-5 border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado da conta</h3>

          {estado.isLoading && <ACarregar blocos={1} bloco="h-16" />}
          {estado.isError && (
            <ErroAoCarregar>Não foi possível ler o estado da verificação. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>
          )}

          {estado.data?.temFactor && (
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-xs sm:text-sm font-semibold text-emerald-700">Ativa nesta conta.</p>
              </div>
              <p className="text-sm text-slate-600">
                Sempre que entrares só com a palavra-passe, o painel pede o código da app de autenticação. Se perderes o telemóvel, a
                recuperação é feita pela equipa técnica no painel do Supabase.
              </p>
            </div>
          )}

          {estado.data && !estado.data.temFactor && !registo && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">
                Ainda não está ativa. Com ela, uma palavra-passe roubada já não chega ao painel: é preciso também o código da app de
                autenticação (Google Authenticator, Microsoft Authenticator, Authy…).
              </p>
              <Button type="button" size="sm" className="self-start" onClick={comecar} isLoading={iniciar.isPending} disabled={iniciar.isPending}>
                Ativar verificação em dois passos
              </Button>
            </div>
          )}

          {estado.data && !estado.data.temFactor && registo && (
            <div className="flex flex-col gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-800">1. Na app de autenticação, lê este código QR.</p>
              <img
                src={registo.qrCode}
                alt="Código QR para a app de autenticação"
                className="h-44 w-44 self-center rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm"
              />
              <p className="text-xs text-slate-500 text-center">
                Sem câmara? Escreve este segredo à mão:{' '}
                <code className="break-all font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">{registo.segredo}</code>
              </p>
              <p className="text-sm font-semibold text-slate-800 pt-2 border-t border-slate-200">2. Escreve o código de 6 dígitos que a app mostra.</p>
              <FormularioDeCodigo
                factorId={registo.factorId}
                rotuloDoBotao="Confirmar e ativar"
                aoVerificar={() => toast.success('Verificação em dois passos ativada.')}
              />
            </div>
          )}
        </Card>
      </div>
    </ConteudoDoSeparador>
  )
}
