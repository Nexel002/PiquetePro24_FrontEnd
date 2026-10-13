import { useState } from 'react'
import { toast } from 'sonner'
import { BackButton } from '../components/BackButton'
import { NavegacaoAdmin } from '../components/admin/NavegacaoAdmin'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useBroadcasts, usePreviewBroadcast, useSendBroadcast } from '../hooks/useAdminBroadcasts'
import { MOZAMBIQUE_PROVINCES } from '../lib/provinces'
import { ROTULOS_DE_GRUPO, type AudienceRole } from '../services/adminBroadcasts'

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Maputo' })

// Fase 18: comunicados por email. O fluxo tem de passar por «Ver destinatários»: o botão de enviar
// só aparece com o número calculado, e esse número segue no pedido — se o grupo mudou entretanto,
// o backend recusa. Alterar o grupo apaga o número, para não confirmar um grupo que não se viu.
export function AdminBroadcasts() {
  const { data: historico, isLoading, isError } = useBroadcasts()
  const prever = usePreviewBroadcast()
  const enviar = useSendBroadcast()

  const [role, setRole] = useState<AudienceRole>('PROFESSIONAL')
  const [provincia, setProvincia] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [destinatarios, setDestinatarios] = useState<number | null>(null)
  const [aConfirmar, setAConfirmar] = useState(false)

  const grupo = { role, province: provincia || null }

  function mudarGrupo(alteracao: () => void) {
    alteracao()
    setDestinatarios(null)
    setAConfirmar(false)
  }

  function calcular() {
    prever.mutate(grupo, {
      onSuccess: (r) => setDestinatarios(r.recipients),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível calcular os destinatários.'),
    })
  }

  function confirmarEnvio() {
    if (destinatarios === null) return
    enviar.mutate(
      { subject: assunto.trim(), message: mensagem.trim(), audience: grupo, confirm_recipients: destinatarios },
      {
        onSuccess: () => {
          toast.success('Comunicado a caminho. Acompanha o envio no histórico.')
          setAssunto('')
          setMensagem('')
          setDestinatarios(null)
          setAConfirmar(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Não foi possível enviar o comunicado.')
          setAConfirmar(false)
        },
      },
    )
  }

  const textoValido = assunto.trim().length >= 3 && mensagem.trim().length >= 10

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">Comunicados</h1>
      </header>

      <NavegacaoAdmin />

      <Card variant="solid" className="flex flex-col gap-3 p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Novo comunicado por email</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Para
            <select
              value={role}
              onChange={(e) => mudarGrupo(() => setRole(e.target.value as AudienceRole))}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal"
            >
              {Object.entries(ROTULOS_DE_GRUPO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Província
            <select
              value={provincia}
              onChange={(e) => mudarGrupo(() => setProvincia(e.target.value))}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal"
            >
              <option value="">Todas</option>
              {MOZAMBIQUE_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Assunto
          <input
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            maxLength={120}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Mensagem
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            maxLength={2000}
            rows={5}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal"
          />
          <span className="font-normal text-gray-500">Uma linha em branco separa parágrafos. Texto simples: não há formatação.</span>
        </label>

        {destinatarios === null ? (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={calcular} isLoading={prever.isPending} disabled={prever.isPending}>
            Ver destinatários
          </Button>
        ) : aConfirmar ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-700">
              Enviar para {destinatarios} {destinatarios === 1 ? 'pessoa' : 'pessoas'}? Não se pode desfazer.
            </span>
            <Button type="button" size="sm" onClick={confirmarEnvio} isLoading={enviar.isPending} disabled={enviar.isPending}>
              Sim, enviar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAConfirmar(false)}>
              Voltar
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-700">
              {destinatarios === 0 ? 'Não há ninguém neste grupo.' : `${destinatarios} ${destinatarios === 1 ? 'pessoa' : 'pessoas'} neste grupo.`}
            </p>
            <Button type="button" size="sm" onClick={() => setAConfirmar(true)} disabled={destinatarios === 0 || !textoValido}>
              Enviar comunicado
            </Button>
            {!textoValido && destinatarios > 0 && (
              <span className="text-xs text-gray-500">Escreve o assunto (3+) e a mensagem (10+ caracteres).</span>
            )}
          </div>
        )}
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Enviados</h2>
        {isLoading && <div role="status" aria-label="A carregar" className="h-20 animate-pulse rounded-2xl bg-gray-200" />}
        {isError && <p className="text-sm text-gray-600">Não foi possível carregar o histórico. Verifica a tua ligação e tenta novamente.</p>}
        {historico && historico.length === 0 && <p className="text-sm text-gray-600">Ainda não enviaste nenhum comunicado.</p>}
        {historico && historico.length > 0 && (
          <ul className="flex flex-col gap-3">
            {historico.map((b) => (
              <li key={b.id}>
                <Card variant="solid" className="flex flex-col gap-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-piquete-blue">{b.subject}</p>
                    <Badge variant={b.status === 'DONE' ? 'approved' : 'pending'}>{b.status === 'DONE' ? 'Concluído' : 'A enviar'}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {ROTULOS_DE_GRUPO[b.audience_role]}
                    {b.audience_province ? ` · ${b.audience_province}` : ''} · {dataFormatter.format(new Date(b.created_at))}
                    {b.author_name ? ` · ${b.author_name}` : ''}
                  </p>
                  <p className="text-sm text-gray-700">
                    {b.sent_count} de {b.recipient_count} enviados
                    {b.failed_count > 0 && ` · ${b.failed_count} sem entrega`}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
