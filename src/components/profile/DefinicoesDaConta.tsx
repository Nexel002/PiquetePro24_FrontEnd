import { useState, type FormEvent } from 'react'
import { useUpdateProfileDetails } from '../../hooks/useProfile'
import { describeAuthError } from '../../lib/authErrors'
import { PHONE_PREFIX, stripPhonePrefix } from '../../lib/phone'
import { supabase } from '../../lib/supabase'
import type { UserProfile } from '../../services/profile'
import { Button } from '../ui/Button'
import { DeleteAccountSection } from './DeleteAccountSection'
import { PhoneIcon } from './PhoneIcon'

const CLASSE_DO_CAMPO =
  'w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue'

// Painel atrás da engrenagem do perfil. Monta-se ao abrir e desmonta-se ao fechar, e é isso
// que repõe os rascunhos (nome, telefone, passwords) e as mensagens a cada abertura — sem
// efeitos nem limpezas manuais.
export function DefinicoesDaConta({ profile }: { profile: UserProfile }) {
  const updateDetails = useUpdateProfileDetails()

  const [nomeRascunho, setNomeRascunho] = useState(profile.full_name)
  const [telefoneRascunho, setTelefoneRascunho] = useState(stripPhonePrefix(profile.phone ?? ''))

  const [novaPassword, setNovaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [erroDePassword, setErroDePassword] = useState<string | null>(null)
  const [passwordAtualizada, setPasswordAtualizada] = useState<string | null>(null)
  const [aGuardarPassword, setAGuardarPassword] = useState(false)

  const mensagemDeErroDosDados =
    updateDetails.error instanceof Error ? updateDetails.error.message : 'Não foi possível guardar os dados. Tenta novamente.'

  function guardarDados(event: FormEvent) {
    event.preventDefault()
    updateDetails.mutate({ full_name: nomeRascunho, phone: `${PHONE_PREFIX}${telefoneRascunho}` })
  }

  async function alterarPassword(event: FormEvent) {
    event.preventDefault()
    setErroDePassword(null)
    setPasswordAtualizada(null)

    if (novaPassword.length < 6) {
      setErroDePassword('A password tem de ter pelo menos 6 caracteres.')
      return
    }
    if (novaPassword !== confirmarPassword) {
      setErroDePassword('As passwords não coincidem.')
      return
    }

    setAGuardarPassword(true)
    const { error } = await supabase.auth.updateUser({ password: novaPassword })
    setAGuardarPassword(false)

    if (error) {
      setErroDePassword(describeAuthError(error))
      return
    }

    setPasswordAtualizada('Password atualizada com sucesso.')
    setNovaPassword('')
    setConfirmarPassword('')
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-gray-50 border border-gray-100 p-4">
      <form onSubmit={guardarDados} className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Dados pessoais</span>

        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Nome completo
          <input type="text" value={nomeRascunho} onChange={(event) => setNomeRascunho(event.target.value)} required className={CLASSE_DO_CAMPO} />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Telefone
          <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-piquete-blue focus-within:ring-2 focus-within:ring-piquete-blue/20">
            <span className="flex items-center gap-1.5 bg-gray-100 px-3 text-sm text-gray-500 font-mono">
              <PhoneIcon className="h-4 w-4 text-gray-400" />
              {PHONE_PREFIX}
            </span>
            <input
              type="tel"
              value={telefoneRascunho}
              onChange={(event) => setTelefoneRascunho(event.target.value)}
              required
              className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-900 outline-none"
            />
          </div>
        </label>

        <Button type="submit" variant="primary" size="sm" disabled={updateDetails.isPending} isLoading={updateDetails.isPending} className="self-start">
          Guardar dados
        </Button>
        {updateDetails.isError && <p className="text-xs text-rose-600">{mensagemDeErroDosDados}</p>}
      </form>

      <form onSubmit={(event) => void alterarPassword(event)} className="flex flex-col gap-3 border-t border-gray-200 pt-4">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Alterar password</span>
        <input
          type="password"
          placeholder="Nova password (mín. 6 caracteres)"
          value={novaPassword}
          onChange={(event) => setNovaPassword(event.target.value)}
          required
          minLength={6}
          className={CLASSE_DO_CAMPO}
        />
        <input
          type="password"
          placeholder="Confirmar nova password"
          value={confirmarPassword}
          onChange={(event) => setConfirmarPassword(event.target.value)}
          required
          minLength={6}
          className={CLASSE_DO_CAMPO}
        />
        {erroDePassword && <p role="alert" className="text-xs text-rose-600">{erroDePassword}</p>}
        {passwordAtualizada && <p role="status" className="text-xs text-emerald-600">{passwordAtualizada}</p>}
        <Button type="submit" variant="primary" size="sm" disabled={aGuardarPassword} isLoading={aGuardarPassword} className="self-start">
          Guardar password
        </Button>
      </form>

      {profile.avatar_url && (
        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => updateDetails.mutate({ avatar_url: null })}
            disabled={updateDetails.isPending}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
          >
            Remover foto de perfil
          </button>
        </div>
      )}

      {profile.role !== 'ADMIN' && <DeleteAccountSection papel={profile.role} />}
    </div>
  )
}
