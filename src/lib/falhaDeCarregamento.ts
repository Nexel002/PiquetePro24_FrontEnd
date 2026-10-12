// Um ecrã carregado sob pedido (code-splitting, Fase 6) pode falhar a descarregar. Os dois casos
// reais:
//  1. Depois de um deploy novo, o separador aberto ainda aponta para ficheiros de uma versão que
//     já não existe no servidor (os nomes têm hash). Recarregar apanha o index.html novo e resolve.
//  2. Sem rede (ou rede a falhar) a meio. Recarregar não resolve — e recarregar em ciclo seria
//     pior do que o erro.
// O Vite emite `vite:preloadError` em ambos. Recarrega-se UMA vez por janela de tempo; se falhar
// outra vez dentro dela, deixa-se o erro seguir para o ecrã de erro, que oferece «Tentar de novo».

const CHAVE = 'piquete:recarga-por-falha-de-ficheiro'
export const JANELA_MS = 60_000

interface Dependencias {
  agora?: () => number
  armazenamento?: Pick<Storage, 'getItem' | 'setItem'>
  recarregar?: () => void
}

// Devolve true se recarregou (e o erro deve ser engolido), false se não — já recarregou há pouco
// ou o armazenamento não está disponível para o garantir.
export function recarregarSeNovaVersao({
  agora = Date.now,
  armazenamento = sessionStorage,
  recarregar = () => window.location.reload(),
}: Dependencias = {}): boolean {
  try {
    const ultima = Number(armazenamento.getItem(CHAVE) ?? 0)
    if (agora() - ultima < JANELA_MS) return false
    armazenamento.setItem(CHAVE, String(agora()))
  } catch {
    // Sem sessionStorage não há como garantir que não é um ciclo: não recarrega.
    return false
  }
  recarregar()
  return true
}

export function iniciarTratamentoDeFalhaDeCarregamento(
  janela: Pick<Window, 'addEventListener'> = window,
  dependencias: Dependencias = {},
): void {
  janela.addEventListener('vite:preloadError', (evento) => {
    if (recarregarSeNovaVersao(dependencias)) evento.preventDefault()
  })
}
