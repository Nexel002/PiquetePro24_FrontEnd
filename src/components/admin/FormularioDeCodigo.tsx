import { useState } from 'react'
import { toast } from 'sonner'
import { useVerificarCodigo } from '../../hooks/useMfa'
import { codigoValido, mensagemDeErroDoMfa } from '../../services/mfa'
import { Button } from '../ui/Button'

// Campo do código de 6 dígitos, partilhado pelo ecrã de registo (confirmar o primeiro código) e
// pelo desafio de cada entrada.
export function FormularioDeCodigo({ factorId, rotuloDoBotao, aoVerificar }: { factorId: string; rotuloDoBotao: string; aoVerificar?: () => void }) {
  const verificar = useVerificarCodigo()
  const [codigo, setCodigo] = useState('')

  function submeter(event: React.FormEvent) {
    event.preventDefault()
    if (!codigoValido(codigo)) {
      toast.error('O código tem 6 dígitos.')
      return
    }
    verificar.mutate(
      { factorId, codigo },
      {
        onSuccess: () => aoVerificar?.(),
        onError: (err) => {
          toast.error(mensagemDeErroDoMfa(err))
          setCodigo('')
        },
      },
    )
  }

  return (
    <form onSubmit={submeter} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
        Código de 6 dígitos
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          className="rounded-xl border border-gray-200 px-3 py-2 text-center text-lg font-normal tracking-[0.4em]"
        />
      </label>
      <Button type="submit" size="sm" isLoading={verificar.isPending} disabled={verificar.isPending}>
        {rotuloDoBotao}
      </Button>
    </form>
  )
}
