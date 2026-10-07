import { Link } from 'react-router-dom'
import type { LoginForm } from '../../hooks/useLoginForm'
import { AuthInput } from './AuthInput'
import { AuthToggleSwitch } from './AuthToggleSwitch'
import { ChannelTabs } from './ChannelTabs'
import { GoogleButton } from './GoogleButton'
import { OptionCards } from './OptionCards'
import { SubmitButton } from './SubmitButton'

const LIGACAO =
  'rounded-lg text-sm font-semibold text-piquete-blue-light underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-piquete-blue/40'

interface CredentialsFormProps {
  form: LoginForm
  aoEsquecerPalavraPasse: () => void
}

// Entrar / Criar conta. Só desenha: o estado e os envios vêm do `useLoginForm`.
export function CredentialsForm({ form, aoEsquecerPalavraPasse }: CredentialsFormProps) {
  const entrar = form.modo === 'sign-in'
  const porEmail = form.canal === 'email'

  return (
    <>
      <header className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[34px]">
          {entrar ? 'Bem-vindo' : 'Cria a tua conta'}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
          {entrar
            ? 'Entra na tua conta para gerir os teus serviços e pedidos.'
            : 'Junta-te a clientes e profissionais de confiança em Moçambique.'}
        </p>
      </header>

      <div className="space-y-4">
        <ChannelTabs value={form.canal} onChange={form.mudarCanal} />

        {!entrar && (
          <div className="space-y-4">
            <OptionCards
              legenda="Como vais usar o PiquetePro24?"
              nome="intended-role"
              opcoes={[
                { valor: 'CLIENT', rotulo: 'Sou cliente' },
                { valor: 'PROFESSIONAL', rotulo: 'Sou profissional' },
              ]}
              value={form.papel}
              onChange={form.setPapel}
            />
            {form.papel === 'PROFESSIONAL' && (
              <OptionCards
                legenda="Tipo de profissional"
                nome="intended-professional-type"
                opcoes={[
                  { valor: 'SINGULAR', rotulo: 'Singular' },
                  { valor: 'COMPANY', rotulo: 'Empresa' },
                ]}
                value={form.tipoProfissional}
                onChange={form.setTipoProfissional}
              />
            )}
          </div>
        )}

        <form onSubmit={(e) => void form.submeter(e)} className="flex flex-col gap-4">
          {!entrar && (
            <AuthInput
              label="Nome completo"
              type="text"
              autoComplete="name"
              value={form.nomeCompleto}
              onChange={(e) => form.setNomeCompleto(e.target.value)}
              placeholder="Ex.: Manuel Silva"
              required
            />
          )}

          <AuthInput
            label={porEmail ? 'Email' : 'Telefone'}
            type={porEmail ? 'email' : 'tel'}
            // Em "entrar", `username` deixa o gestor de palavras-passe emparelhar o
            // identificador com a palavra-passe guardada.
            autoComplete={entrar ? 'username' : porEmail ? 'email' : 'tel'}
            inputMode={porEmail ? 'email' : 'tel'}
            value={form.identificador}
            onChange={(e) => form.setIdentificador(e.target.value)}
            placeholder={porEmail ? 'nome@exemplo.com' : '+258 84 000 0000'}
            required
          />

          {!entrar && porEmail && (
            <AuthInput
              label="Telefone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={form.telefone}
              onChange={(e) => form.setTelefone(e.target.value)}
              placeholder="+258 84 000 0000"
              required
            />
          )}

          <AuthInput
            label="Palavra-passe"
            type="password"
            autoComplete={entrar ? 'current-password' : 'new-password'}
            value={form.palavraPasse}
            onChange={(e) => form.setPalavraPasse(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            showPasswordToggle
            required
            minLength={6}
          />

          {entrar && (
            <div className="-mt-1 flex flex-col gap-1">
              {porEmail && (
                <button type="button" onClick={aoEsquecerPalavraPasse} className={`min-h-11 self-start ${LIGACAO}`}>
                  Esqueceste a palavra-passe?
                </button>
              )}
              <AuthToggleSwitch
                label={`Lembrar o ${porEmail ? 'email' : 'telefone'} neste dispositivo`}
                checked={form.lembrar}
                onChange={form.setLembrar}
              />
            </div>
          )}

          {form.erro && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
              {form.erro}
            </div>
          )}
          {form.sucesso && (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              {form.sucesso}
            </div>
          )}

          <SubmitButton isLoading={form.aEnviar} textoAEnviar={entrar ? 'A entrar...' : 'A criar conta...'}>
            {entrar ? 'Entrar' : 'Criar conta'}
          </SubmitButton>
        </form>

        <div className="relative flex items-center justify-center py-1">
          <div className="absolute inset-x-0 top-1/2 border-t border-slate-200" />
          <span className="relative bg-white px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">ou</span>
        </div>

        <GoogleButton onClick={() => void form.entrarComGoogle()} isLoading={form.aIrParaGoogle} />

        {/* Nova aba: abrir os termos na mesma apagaria o que a pessoa já escreveu no formulário. */}
        <p className="text-center text-xs leading-relaxed text-slate-500">
          Ao continuares, aceitas os{' '}
          <Link to="/termos" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900">
            Termos de utilização
          </Link>
          .
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-slate-600">
        {entrar ? 'Ainda não tens conta?' : 'Já tens conta?'}{' '}
        <button
          type="button"
          onClick={() => form.mudarModo(entrar ? 'sign-up' : 'sign-in')}
          className={`min-h-11 px-1 font-bold ${LIGACAO}`}
        >
          {entrar ? 'Criar conta' : 'Entrar'}
        </button>
      </p>
    </>
  )
}
