import { useState } from 'react'
import { toast } from 'sonner'
import { useUpdateProfileDetails } from '../../hooks/useProfile'
import type { UserProfile } from '../../services/profile'
import { Button } from '../ui/Button'

// Fase 40 (TRD Adendo v1.66, N6): o cliente indica se é uma empresa ou instituição (condomínio,
// escritório, loja). O nome e o NUIT só são vistos pelo profissional que faz o pedido, junto do
// contacto, para emitir a factura. O NUIT valida-se só pelo formato (9 dígitos).
const NUIT = /^[0-9]{9}$/

export function DadosDaEmpresa({ profile }: { profile: UserProfile }) {
  const guardar = useUpdateProfileDetails()
  const ehEmpresa = profile.client_type === 'BUSINESS'
  const [empresa, setEmpresa] = useState(ehEmpresa)
  const [nome, setNome] = useState(profile.business_name ?? '')
  const [nuit, setNuit] = useState(profile.business_nuit ?? '')

  const nuitInvalido = nuit.trim() !== '' && !NUIT.test(nuit.trim())
  const nomeEmFalta = empresa && nome.trim().length < 2

  function aoGuardar() {
    const dados = empresa
      ? { client_type: 'BUSINESS' as const, business_name: nome.trim(), business_nuit: nuit.trim() || null }
      : { client_type: 'INDIVIDUAL' as const }
    guardar.mutate(dados, {
      onSuccess: () => toast.success(empresa ? 'Dados da empresa guardados.' : 'Conta de particular.'),
      onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível guardar. Tenta novamente.'),
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <label className="flex min-h-[44px] items-center gap-3 text-sm font-semibold text-gray-800">
        <input type="checkbox" checked={empresa} onChange={(e) => setEmpresa(e.target.checked)} className="h-5 w-5 accent-piquete-blue" />
        Sou uma empresa ou instituição
      </label>

      {empresa && (
        <>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
            Nome da empresa ou instituição
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={200}
              className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
            NUIT (opcional)
            <input
              value={nuit}
              onChange={(e) => setNuit(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={9}
              aria-invalid={nuitInvalido}
              className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none"
            />
          </label>
          {nuitInvalido && <p className="text-xs text-rose-600">O NUIT tem 9 dígitos.</p>}
          <p className="text-xs text-gray-500">Só o profissional que fizer o teu pedido vê estes dados, para te passar a factura.</p>
        </>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={aoGuardar}
          disabled={guardar.isPending || nuitInvalido || nomeEmFalta || (empresa === ehEmpresa && !empresa)}
          isLoading={guardar.isPending}
        >
          Guardar
        </Button>
      </div>
    </div>
  )
}
