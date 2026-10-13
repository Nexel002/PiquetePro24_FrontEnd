import { supabase } from '../lib/supabase'

// Verificação em dois passos (TOTP) do Supabase Auth para o painel de admin (backend Fase 22).
// O registo e a verificação falam directamente com o Supabase, como o resto da autenticação
// deste frontend: o backend só lê o nível da sessão (claim `aal`) no token.

export interface EstadoDoMfa {
  // Há um factor TOTP já confirmado nesta conta.
  temFactor: boolean
  factorId: string | null
  // aal1 = entrou só com a palavra-passe ou Google; aal2 = também passou o segundo factor.
  // Texto, como o SDK o devolve: só 'aal2' interessa a quem lê.
  nivelAtual: string | null
}

export interface RegistoDeFactor {
  factorId: string
  // Imagem SVG em data URL, pronta para um <img src>.
  qrCode: string
  // O mesmo segredo em texto, para quem não pode ler o código QR.
  segredo: string
}

const NOME_DO_FACTOR = 'Autenticador'

export async function obterEstadoDoMfa(): Promise<EstadoDoMfa> {
  const [factores, nivel] = await Promise.all([supabase.auth.mfa.listFactors(), supabase.auth.mfa.getAuthenticatorAssuranceLevel()])
  if (factores.error) throw factores.error
  if (nivel.error) throw nivel.error

  // `totp` só traz os factores já confirmados.
  const confirmado = factores.data.totp[0] ?? null
  return {
    temFactor: confirmado !== null,
    factorId: confirmado?.id ?? null,
    nivelAtual: nivel.data.currentLevel,
  }
}

// Um registo abandonado a meio (fechou o separador antes de escrever o código) deixa um factor
// por confirmar; o Supabase recusa um segundo com o mesmo nome. Apaga-se o que ficou antes de
// começar de novo.
export async function iniciarRegistoDeFactor(): Promise<RegistoDeFactor> {
  const factores = await supabase.auth.mfa.listFactors()
  if (factores.error) throw factores.error

  for (const factor of factores.data.all) {
    if (factor.status === 'unverified') {
      await supabase.auth.mfa.unenroll({ factorId: factor.id })
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: NOME_DO_FACTOR })
  if (error) throw error

  return { factorId: data.id, qrCode: data.totp.qr_code, segredo: data.totp.secret }
}

// Confirma o factor acabado de registar (primeiro código) ou passa o desafio de uma sessão aal1
// (cada entrada): são a mesma chamada. Eleva a sessão para aal2.
export async function verificarCodigo(factorId: string, codigo: string): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: codigo })
  if (error) throw error
}

// Seis dígitos, nada mais. O Supabase recusa o resto com uma mensagem em inglês; apanhar aqui dá
// uma mensagem em português antes de gastar um pedido (e uma das poucas tentativas permitidas).
export function codigoValido(codigo: string): boolean {
  return /^\d{6}$/.test(codigo)
}

export function mensagemDeErroDoMfa(erro: unknown): string {
  const mensagem = erro instanceof Error ? erro.message.toLowerCase() : ''
  if (mensagem.includes('invalid') || mensagem.includes('code')) {
    return 'Código inválido ou expirado. Confirma a hora do telemóvel e tenta com o código mais recente.'
  }
  if (mensagem.includes('rate') || mensagem.includes('too many')) {
    return 'Demasiadas tentativas. Espera um minuto e tenta outra vez.'
  }
  return 'Não foi possível verificar o código. Tenta outra vez.'
}
