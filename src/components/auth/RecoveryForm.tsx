import { useState, type FormEvent } from 'react'
import { requestPasswordRecovery } from '../../services/passwordRecovery'
import { AuthInput } from './AuthInput'
import { SubmitButton } from './SubmitButton'

interface RecoveryFormProps {
  onBack: () => void
}

// Recuperação de palavra-passe com o estado todo aqui dentro: o ecrã de login deixou de ter
// cinco variáveis de estado que só este formulário usa.
export function RecoveryForm({ onBack }: RecoveryFormProps) {
  const [email, setEmail] = useState('')
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aEnviar, setAEnviar] = useState(false)

  async function aoEnviar(event: FormEvent) {
    event.preventDefault()
    setErro(null)
    setMensagem(null)
    setAEnviar(true)

    try {
      setMensagem(await requestPasswordRecovery(email))
    } catch (caught) {
      setErro(caught instanceof Error ? caught.message : 'Não foi possível pedir a recuperação. Tenta novamente.')
    } finally {
      setAEnviar(false)
    }
  }

  return (
    <div>
      <header className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 text-balance">Recuperar palavra-passe</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
          Indica o teu email e enviamos-te um link seguro para escolheres uma nova palavra-passe.
        </p>
      </header>

      <form onSubmit={(e) => void aoEnviar(e)} className="flex flex-col gap-4">
        <AuthInput
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome@exemplo.com"
          required
        />

        {erro && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {erro}
          </div>
        )}
        {mensagem && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            {mensagem}
          </div>
        )}

        <SubmitButton isLoading={aEnviar} textoAEnviar="A enviar link...">
          Enviar link
        </SubmitButton>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-lg px-3 text-sm font-semibold text-piquete-blue-light underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-piquete-blue/40"
        >
          ← Voltar a entrar
        </button>
      </div>
    </div>
  )
}
