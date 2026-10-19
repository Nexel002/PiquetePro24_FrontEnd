import { useState } from 'react'
import { toast } from 'sonner'
import { usePreviewBroadcast, useSendBroadcast } from '../../../hooks/useAdminBroadcasts'
import { MOZAMBIQUE_PROVINCES } from '../../../lib/provinces'
import { ROTULOS_DE_GRUPO, type AudienceRole } from '../../../services/adminBroadcasts'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { AreaDeTexto, CampoDeSeleccao, CampoDeTexto } from '../estrutura/CamposDeFormulario'

const pessoas = (n: number) => `${n} ${n === 1 ? 'pessoa' : 'pessoas'}`

// Fase 18: o fluxo tem de passar por «Ver destinatários»: o botão de enviar só aparece com o
// número calculado, e esse número segue no pedido — se o grupo mudou entretanto, o backend
// recusa. Alterar o grupo apaga o número, para não confirmar um grupo que não se viu.
export function FormularioDeComunicado() {
  const prever = usePreviewBroadcast()
  const enviar = useSendBroadcast()

  const [role, setRole] = useState<AudienceRole>('PROFESSIONAL')
  const [provincia, setProvincia] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [destinatarios, setDestinatarios] = useState<number | null>(null)
  const [aConfirmar, setAConfirmar] = useState(false)

  const grupo = { role, province: provincia || null }
  const textoValido = assunto.trim().length >= 3 && mensagem.trim().length >= 10

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

  return (
    <Card variant="solid" className="flex flex-col gap-4 p-5 border border-slate-200">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Novo comunicado por email</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoDeSeleccao rotulo="Para" value={role} onChange={(e) => mudarGrupo(() => setRole(e.target.value as AudienceRole))}>
          {Object.entries(ROTULOS_DE_GRUPO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </CampoDeSeleccao>
        <CampoDeSeleccao rotulo="Província" value={provincia} onChange={(e) => mudarGrupo(() => setProvincia(e.target.value))}>
          <option value="">Todas</option>
          {MOZAMBIQUE_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </CampoDeSeleccao>
      </div>

      <CampoDeTexto
        rotulo="Assunto"
        value={assunto}
        onChange={(e) => setAssunto(e.target.value)}
        maxLength={120}
        placeholder="Ex.: Manutenção programada da plataforma..."
      />
      <AreaDeTexto
        rotulo="Mensagem"
        ajuda="Uma linha em branco separa parágrafos. Texto simples: não há formatação."
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        maxLength={2000}
        rows={5}
        placeholder="Escreve o texto da mensagem a enviar..."
      />

      {destinatarios === null ? (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={calcular} isLoading={prever.isPending} disabled={prever.isPending}>
          Ver destinatários
        </Button>
      ) : aConfirmar ? (
        <div className="flex flex-wrap items-center gap-2 text-sm bg-amber-50 border border-amber-200 p-3 rounded-xl">
          <span className="text-amber-900 font-medium">Enviar para {pessoas(destinatarios)}? Não se pode desfazer.</span>
          <Button type="button" size="sm" onClick={confirmarEnvio} isLoading={enviar.isPending} disabled={enviar.isPending}>
            Sim, enviar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAConfirmar(false)}>
            Voltar
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-slate-700">
            {destinatarios === 0 ? 'Não há ninguém neste grupo.' : `${pessoas(destinatarios)} neste grupo.`}
          </p>
          <Button type="button" size="sm" onClick={() => setAConfirmar(true)} disabled={destinatarios === 0 || !textoValido}>
            Enviar comunicado
          </Button>
          {!textoValido && destinatarios > 0 && (
            <span className="text-xs text-slate-500">Escreve o assunto (3+) e a mensagem (10+ caracteres).</span>
          )}
        </div>
      )}
    </Card>
  )
}
