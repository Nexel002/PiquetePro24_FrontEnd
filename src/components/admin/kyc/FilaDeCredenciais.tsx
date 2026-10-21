import { useState } from 'react'
import { toast } from 'sonner'
import { useCredentialDocument, useCredentialsForReview, useReviewCredential } from '../../../hooks/useAdminCredentials'
import type { CredentialForReview } from '../../../services/adminCredentials'
import { ROTULO_DO_TIPO } from '../../../services/credentials'
import { ACarregar, ErroAoCarregar, ListaVazia } from '../estrutura/EstadosDaLista'

// Fase 41 (TRD Adendo v1.66, N5): o separador «Credenciais» da secção KYC. Mais antigas primeiro,
// como a fila do KYC. O documento abre-se por um URL de 60 s pedido no momento (fica na auditoria).
function CartaoDeCredencial({ credencial }: { credencial: CredentialForReview }) {
  const documento = useCredentialDocument()
  const rever = useReviewCredential()
  const [motivo, setMotivo] = useState('')

  function decidir(status: 'APPROVED' | 'REJECTED') {
    rever.mutate(
      { id: credencial.id, status, review_notes: status === 'REJECTED' ? motivo.trim() : undefined },
      {
        onSuccess: () => toast.success(status === 'APPROVED' ? 'Credencial aprovada.' : 'Credencial rejeitada.'),
        onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível guardar a decisão.'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-2 p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-slate-800">{credencial.title}</p>
        <span className="text-xs text-slate-500">{new Date(credencial.submitted_at).toLocaleDateString('pt-PT')}</span>
      </div>
      <p className="text-xs text-slate-600">
        {ROTULO_DO_TIPO[credencial.type]} · {credencial.holder_name} ({credencial.holder_role === 'TECHNICIAN' ? 'técnico' : 'profissional'}) · KYC:{' '}
        {credencial.holder_kyc_status === 'APPROVED' ? 'aprovado' : (credencial.holder_kyc_status ?? 'não submetido')}
      </p>
      <p className="text-xs text-slate-500">
        {credencial.issuer ? `Emitido por ${credencial.issuer}. ` : ''}
        {credencial.issued_at ? `Emissão ${credencial.issued_at}. ` : ''}
        {credencial.expires_at ? `Validade ${credencial.expires_at}.` : 'Sem validade.'}
      </p>

      {documento.data ? (
        <a href={documento.data.url} target="_blank" rel="noopener noreferrer" className="block">
          <img src={documento.data.url} alt={`Documento: ${credencial.title}`} className="max-h-80 w-auto rounded-xl border border-slate-200 object-contain" />
          <span className="text-xs text-slate-500">O link expira em {documento.data.expires_in} s — toca para abrir em tamanho real.</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={() => documento.mutate(credencial.id, { onError: () => toast.error('Não foi possível abrir o documento.') })}
          disabled={documento.isPending}
          className="min-h-[40px] self-start rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50"
        >
          {documento.isPending ? 'A abrir…' : 'Ver documento'}
        </button>
      )}

      {credencial.status === 'PENDING' && (
        <div className="flex flex-col gap-2 pt-1">
          <input
            aria-label="Motivo da rejeição"
            placeholder="Motivo (obrigatório para rejeitar)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            className="min-h-[40px] rounded-xl border border-slate-200 px-3 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => decidir('APPROVED')}
              disabled={rever.isPending}
              className="min-h-[40px] rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white disabled:opacity-50"
            >
              Aprovar
            </button>
            <button
              type="button"
              onClick={() => decidir('REJECTED')}
              disabled={rever.isPending || !motivo.trim()}
              className="min-h-[40px] rounded-xl border border-rose-300 px-4 text-xs font-bold text-rose-700 disabled:opacity-50"
            >
              Rejeitar
            </button>
          </div>
        </div>
      )}
      {credencial.status === 'REJECTED' && credencial.review_notes && <p className="text-xs text-rose-700">Rejeitada: {credencial.review_notes}</p>}
    </div>
  )
}

export function FilaDeCredenciais() {
  const fila = useCredentialsForReview('PENDING')

  if (fila.isLoading) return <div className="p-4 sm:p-6"><ACarregar blocos={2} bloco="h-28" /></div>
  if (fila.isError) {
    return (
      <div className="m-4 sm:m-6">
        <ErroAoCarregar>Não foi possível carregar as credenciais. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>
      </div>
    )
  }
  if (!fila.data || fila.data.length === 0) {
    return <ListaVazia icone="circuloVerificado" titulo="Não há credenciais por verificar" descricao="Quando um profissional enviar uma, aparece aqui." />
  }

  return (
    <ul className="divide-y divide-slate-100 border-t border-slate-100">
      {fila.data.map((c) => (
        <li key={c.id}>
          <CartaoDeCredencial credencial={c} />
        </li>
      ))}
    </ul>
  )
}
