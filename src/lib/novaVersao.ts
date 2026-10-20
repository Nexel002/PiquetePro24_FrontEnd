// Quando recarregar a página depois de o service worker novo se ter activado (lib/pwaUpdate.ts).
// Fica fora de React porque quem o dispara é o registo do service worker (main.tsx), que corre
// antes e fora da árvore de componentes.
//
// Recarregar logo, a qualquer momento, apagava um formulário a meio (pedido de serviço, KYC), e o
// utilizador-alvo está em rede instável, onde perder o que escreveu custa caro. Por isso recarrega-se
// só num momento em que não há nada a perder:
// - nos primeiros segundos depois de abrir a app (ainda não houve tempo de escrever nada);
// - na próxima mudança de ecrã (quem muda de ecrã já saiu do formulário) — ActualizarAoMudarDeEcra;
// - ao voltar à app depois de um bocado fora (quem volta ao fim de minutos já não está a meio).
// Entretanto a app continua a funcionar na versão antiga; se um ecrã antigo falhar a carregar, o
// tratamento de lib/falhaDeCarregamento.ts recarrega na mesma.

// Até aqui depois de abrir a app, recarrega-se logo.
export const ARRANQUE_MS = 15_000
// Fora da app pelo menos isto, recarrega-se ao voltar.
export const AUSENCIA_MS = 5 * 60_000

interface Dependencias {
  recarregar: () => void
  // Milissegundos desde que a página abriu.
  desdeQueAbriu: () => number
  agora: () => number
  documento: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>
}

const POR_OMISSAO: Dependencias = {
  recarregar: () => window.location.reload(),
  desdeQueAbriu: () => performance.now(),
  agora: Date.now,
  documento: typeof document === 'undefined' ? (undefined as never) : document,
}

let pendente = false
let deps = POR_OMISSAO
let pararDeVigiar: (() => void) | null = null

export function actualizacaoPendente(): boolean {
  return pendente
}

export function marcarActualizacaoPendente(): void {
  if (pendente) return
  pendente = true
  if (deps.desdeQueAbriu() < ARRANQUE_MS) {
    deps.recarregar()
    return
  }
  vigiarRegresso()
}

/** Chamado na mudança de ecrã: se há versão nova à espera, este é um momento seguro para recarregar. */
export function aplicarSePendente(): void {
  if (pendente) deps.recarregar()
}

function vigiarRegresso() {
  let saiuEm: number | null = null
  const aoMudar = () => {
    if (deps.documento.visibilityState === 'hidden') {
      saiuEm = deps.agora()
    } else if (saiuEm !== null && deps.agora() - saiuEm >= AUSENCIA_MS) {
      deps.recarregar()
    }
  }
  deps.documento.addEventListener('visibilitychange', aoMudar)
  pararDeVigiar = () => deps.documento.removeEventListener('visibilitychange', aoMudar)
}

export function reporNovaVersaoParaTestes(dependencias: Partial<Dependencias> = {}): void {
  pararDeVigiar?.()
  pararDeVigiar = null
  pendente = false
  deps = { ...POR_OMISSAO, ...dependencias }
}
