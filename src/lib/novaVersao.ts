import { useSyncExternalStore } from 'react'

// Estado do aviso «há uma nova versão». Fica fora de React porque quem o dispara é o registo do
// service worker (main.tsx), que corre antes e fora da árvore de componentes.
interface Estado {
  // Presente quando há versão nova à espera e o utilizador ainda não a dispensou.
  aoAceitar: (() => void) | null
}

let estado: Estado = { aoAceitar: null }
const ouvintes = new Set<() => void>()

function mudar(novo: Estado) {
  estado = novo
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function anunciarNovaVersao(aoAceitar: () => void): void {
  mudar({ aoAceitar })
}

// «Mais tarde»: esconde o aviso até à próxima vez que a app abrir. A versão nova continua à
// espera e nada se perde — o que o utilizador está a escrever fica como está.
export function dispensarNovaVersao(): void {
  mudar({ aoAceitar: null })
}

function subscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export function useNovaVersao(): Estado {
  return useSyncExternalStore(subscrever, () => estado, () => estado)
}

export function reporNovaVersaoParaTestes(): void {
  estado = { aoAceitar: null }
  ouvintes.clear()
}
