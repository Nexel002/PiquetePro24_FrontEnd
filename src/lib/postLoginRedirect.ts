// Para onde levar o utilizador depois de entrar. Quem toca num cartão da Home sem sessão vai
// para o login e, ao entrar, deve chegar ao sítio onde queria ir — não à Home outra vez.

export const DESTINO_POS_LOGIN_KEY = 'piquetepro24:post-login-redirect'

// Só aceita caminhos internos da própria app. O destino vem do URL (`?next=`), ou seja, de
// quem constrói o link: sem esta validação, `/entrar?next=//sitio-falso.com` mandava a pessoa,
// já autenticada, para um site de terceiros (open redirect usado em phishing).
export function destinoSeguro(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith('/')) return null
  // "//host" e "/\host" são lidos pelo browser como endereço externo.
  if (valor.startsWith('//') || valor.includes('\\')) return null
  // Tabulações e quebras de linha são removidas pelo parser de URLs: "/\t/host" vira "//host".
  if (valor.split('').some((caracter) => caracter.charCodeAt(0) < 32)) return null
  // Voltar ao próprio login criaria um ciclo.
  if (valor === '/entrar' || valor.startsWith('/entrar?') || valor.startsWith('/entrar/')) return null
  if (valor.startsWith('/auth/callback')) return null
  return valor
}

export function caminhoDoLogin(destino?: string, modo?: 'criar-conta'): string {
  const params = new URLSearchParams()
  const seguro = destinoSeguro(destino)
  // "/" é para onde se vai de qualquer forma; não polui o URL.
  if (seguro && seguro !== '/') params.set('next', seguro)
  if (modo) params.set('modo', modo)
  const texto = params.toString()
  return texto ? `/entrar?${texto}` : '/entrar'
}

// O fluxo do Google sai da app e volta por /auth/callback, onde o `?next=` já não existe:
// guarda-se em sessionStorage (que sobrevive ao redirect no mesmo separador).
export function guardarDestinoPosLogin(destino: string | null) {
  try {
    if (destino) sessionStorage.setItem(DESTINO_POS_LOGIN_KEY, destino)
    else sessionStorage.removeItem(DESTINO_POS_LOGIN_KEY)
  } catch {
    // sessionStorage indisponível (modo privado restrito): cai na Home, sem erro.
  }
}

export function consumirDestinoPosLogin(): string | null {
  try {
    const valor = sessionStorage.getItem(DESTINO_POS_LOGIN_KEY)
    sessionStorage.removeItem(DESTINO_POS_LOGIN_KEY)
    return destinoSeguro(valor)
  } catch {
    return null
  }
}
