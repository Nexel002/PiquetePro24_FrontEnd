import { useEffect, useState, type FormEvent } from 'react'
import { describeAuthError } from '../lib/authErrors'
import {
  INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY,
  INTENDED_ROLE_STORAGE_KEY,
  type Canal,
  type PapelPretendido,
  type TipoProfissionalPretendido,
} from '../lib/authIntent'
import { guardarDestinoPosLogin } from '../lib/postLoginRedirect'
import { supabase } from '../lib/supabase'
import { sendWelcomeNotification } from '../services/notifications'

export type Modo = 'sign-in' | 'sign-up'

const REMEMBER_IDENTIFIER_STORAGE_KEY = 'piquetepro24:remember-identifier'

// O que "lembrar" guarda: só o email ou telemóvel (nunca a palavra-passe) e por que canal foi
// escrito, para repor o separador certo — um telemóvel guardado a aparecer no campo de email
// seria um erro à primeira vista.
function lerIdentificadorLembrado(): { canal: Canal; valor: string } | null {
  try {
    const bruto = localStorage.getItem(REMEMBER_IDENTIFIER_STORAGE_KEY)
    if (!bruto) return null
    const guardado = JSON.parse(bruto) as { canal?: Canal; valor?: string }
    if (guardado.valor && (guardado.canal === 'email' || guardado.canal === 'phone')) {
      return { canal: guardado.canal, valor: guardado.valor }
    }
  } catch {
    // Formato antigo (texto simples) ou localStorage indisponível: ignora.
  }
  return null
}

function guardarIdentificadorLembrado(lembrar: boolean, canal: Canal, valor: string) {
  try {
    if (lembrar && valor) {
      localStorage.setItem(REMEMBER_IDENTIFIER_STORAGE_KEY, JSON.stringify({ canal, valor }))
    } else {
      localStorage.removeItem(REMEMBER_IDENTIFIER_STORAGE_KEY)
    }
  } catch {
    // localStorage indisponível: entrar não depende disto.
  }
}

// Todo o estado e os envios do formulário de entrada/registo. O ecrã (CredentialsForm) só
// desenha; fica aqui o que mexe em Supabase e em storage, e que se testa sem desenhar nada.
export function useLoginForm({ modoInicial, destino }: { modoInicial: Modo; destino: string | null }) {
  const [modo, setModo] = useState<Modo>(modoInicial)
  const [canal, setCanalEstado] = useState<Canal>('email')
  const [papel, setPapel] = useState<PapelPretendido>('CLIENT')
  const [tipoProfissional, setTipoProfissional] = useState<TipoProfissionalPretendido>('SINGULAR')
  const [identificador, setIdentificador] = useState('')
  const [palavraPasse, setPalavraPasse] = useState('')
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [telefone, setTelefone] = useState('')
  const [lembrar, setLembrar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [aEnviar, setAEnviar] = useState(false)
  const [aIrParaGoogle, setAIrParaGoogle] = useState(false)

  useEffect(() => {
    const lembrado = lerIdentificadorLembrado()
    if (!lembrado) return
    setCanalEstado(lembrado.canal)
    setIdentificador(lembrado.valor)
    setLembrar(true)
  }, [])

  function limparMensagens() {
    setErro(null)
    setSucesso(null)
  }

  function mudarCanal(novo: Canal) {
    setCanalEstado(novo)
    limparMensagens()
  }

  function mudarModo(novo: Modo) {
    setModo(novo)
    limparMensagens()
  }

  async function entrarComGoogle() {
    setErro(null)
    setAIrParaGoogle(true)
    // O Google leva a pessoa para fora da app e o `?next=` perde-se na viagem.
    guardarDestinoPosLogin(destino)
    if (modo === 'sign-up') {
      sessionStorage.setItem(INTENDED_ROLE_STORAGE_KEY, papel)
      if (papel === 'PROFESSIONAL') {
        sessionStorage.setItem(INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY, tipoProfissional)
      } else {
        sessionStorage.removeItem(INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY)
      }
    } else {
      sessionStorage.removeItem(INTENDED_ROLE_STORAGE_KEY)
      sessionStorage.removeItem(INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY)
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setErro(describeAuthError(error))
      setAIrParaGoogle(false)
    }
  }

  async function submeter(event: FormEvent) {
    event.preventDefault()
    limparMensagens()
    setAEnviar(true)
    guardarIdentificadorLembrado(lembrar, canal, identificador.trim())

    try {
      if (modo === 'sign-up') {
        const metadata = {
          full_name: nomeCompleto,
          phone: canal === 'phone' ? identificador : telefone,
          role: papel,
          professional_type: papel === 'PROFESSIONAL' ? tipoProfissional : undefined,
        }

        const { data, error } =
          canal === 'email'
            ? await supabase.auth.signUp({ email: identificador, password: palavraPasse, options: { data: metadata } })
            : await supabase.auth.signUp({ phone: identificador, password: palavraPasse, options: { data: metadata } })

        if (error) throw error

        if (!data.session) {
          setSucesso(
            canal === 'email'
              ? 'Conta criada com sucesso! Verifica o teu email para confirmar antes de entrares.'
              : 'Conta criada com sucesso! Verifica o teu telemóvel para confirmar antes de entrares.',
          )
        } else {
          void sendWelcomeNotification().catch(() => {})
        }
      } else {
        const { error } =
          canal === 'email'
            ? await supabase.auth.signInWithPassword({ email: identificador, password: palavraPasse })
            : await supabase.auth.signInWithPassword({ phone: identificador, password: palavraPasse })

        if (error) throw error
      }
    } catch (caught) {
      setErro(describeAuthError(caught))
    } finally {
      setAEnviar(false)
    }
  }

  return {
    modo,
    canal,
    papel,
    tipoProfissional,
    identificador,
    palavraPasse,
    nomeCompleto,
    telefone,
    lembrar,
    erro,
    sucesso,
    aEnviar,
    aIrParaGoogle,
    setPapel,
    setTipoProfissional,
    setIdentificador,
    setPalavraPasse,
    setNomeCompleto,
    setTelefone,
    setLembrar,
    mudarCanal,
    mudarModo,
    entrarComGoogle,
    submeter,
  }
}

export type LoginForm = ReturnType<typeof useLoginForm>
