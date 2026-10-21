import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useSubmitCredential } from '../../hooks/useCredentials'
import { ROTULO_DO_TIPO, type TipoDeCredencial } from '../../services/credentials'
import { Button } from '../ui/Button'

const CLASSE_DO_CAMPO =
  'min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none'

// Fase 41 (TRD Adendo v1.66, N5): enviar uma credencial para a equipa verificar. O registo criminal
// exige a data de emissão; sem validade indicada, o backend conta 12 meses a partir dela.
export function FormularioDeCredencial({ aoTerminar }: { aoTerminar: () => void }) {
  const enviar = useSubmitCredential()
  const [tipo, setTipo] = useState<TipoDeCredencial>('PROFESSIONAL_LICENSE')
  const [titulo, setTitulo] = useState('')
  const [emissor, setEmissor] = useState('')
  const [emissao, setEmissao] = useState('')
  const [validade, setValidade] = useState('')
  const [ficheiro, setFicheiro] = useState<File | null>(null)

  const faltaEmissao = tipo === 'CRIMINAL_RECORD' && !emissao
  const datasTrocadas = Boolean(emissao && validade && validade < emissao)

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (!ficheiro) return
    enviar.mutate(
      {
        type: tipo,
        title: titulo.trim(),
        issuer: emissor.trim() || null,
        issued_at: emissao || null,
        expires_at: validade || null,
        file: ficheiro,
      },
      {
        onSuccess: () => {
          toast.success('Credencial enviada. A equipa vai verificá-la.')
          aoTerminar()
        },
        onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível enviar. Tenta novamente.'),
      },
    )
  }

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
        Tipo
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDeCredencial)} className={CLASSE_DO_CAMPO}>
          {(Object.keys(ROTULO_DO_TIPO) as TipoDeCredencial[]).map((t) => (
            <option key={t} value={t}>
              {ROTULO_DO_TIPO[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
        Título
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} required placeholder="Ex.: Carteira de electricista" className={CLASSE_DO_CAMPO} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
        Emitido por (opcional)
        <input value={emissor} onChange={(e) => setEmissor(e.target.value)} maxLength={120} className={CLASSE_DO_CAMPO} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
          Emissão{tipo === 'CRIMINAL_RECORD' ? '' : ' (opcional)'}
          <input type="date" value={emissao} onChange={(e) => setEmissao(e.target.value)} className={CLASSE_DO_CAMPO} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
          Validade (opcional)
          <input type="date" value={validade} min={emissao || undefined} onChange={(e) => setValidade(e.target.value)} className={CLASSE_DO_CAMPO} />
        </label>
      </div>
      {tipo === 'CRIMINAL_RECORD' && (
        <p className="text-xs text-gray-500">Sem validade no documento, o registo criminal conta 12 meses a partir da emissão.</p>
      )}
      {datasTrocadas && <p className="text-xs text-rose-600">A validade não pode ser anterior à emissão.</p>}
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
        Fotografia do documento
        <input type="file" accept="image/*" onChange={(e) => setFicheiro(e.target.files?.[0] ?? null)} className="text-sm" />
      </label>
      <p className="text-xs text-gray-500">Só a equipa vê o documento. No teu catálogo aparece apenas o selo.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={aoTerminar}>
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!ficheiro || !titulo.trim() || faltaEmissao || datasTrocadas || enviar.isPending}
          isLoading={enviar.isPending}
        >
          Enviar para verificação
        </Button>
      </div>
    </form>
  )
}
