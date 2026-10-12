import { useSyncExternalStore } from 'react'

// Dois sinais, porque nenhum chega sozinho:
//  - navigator.onLine apanha o modo avião e o Wi-Fi desligado, mas diz «online» com Wi-Fi
//    ligado sem dados (o caso comum em redes móveis instáveis);
//  - o resultado dos pedidos à API apanha esse caso, mas só se sabe depois de falhar um.
// «Sem ligação» = a rede diz que está desligada. «Servidor inalcançável» = a rede diz que
// está ligada mas o último pedido à API nem obteve resposta.
export type EstadoDeLigacao = 'ligado' | 'sem-rede' | 'servidor-inalcancavel'

let navegadorOnline = typeof navigator === 'undefined' ? true : navigator.onLine
let servidorAlcancavel = true
const ouvintes = new Set<() => void>()

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte())
}

function estadoActual(): EstadoDeLigacao {
  if (!navegadorOnline) return 'sem-rede'
  return servidorAlcancavel ? 'ligado' : 'servidor-inalcancavel'
}

export function definirNavegadorOnline(online: boolean): void {
  if (navegadorOnline === online) return
  navegadorOnline = online
  // Ao voltar a rede, deixa de se assumir o servidor em baixo: o próximo pedido decide.
  if (online) servidorAlcancavel = true
  avisar()
}

export function registarRespostaDoServidor(alcancavel: boolean): void {
  if (servidorAlcancavel === alcancavel) return
  servidorAlcancavel = alcancavel
  avisar()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => definirNavegadorOnline(true))
  window.addEventListener('offline', () => definirNavegadorOnline(false))
}

function subscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export function useEstadoDeLigacao(): EstadoDeLigacao {
  return useSyncExternalStore(subscrever, estadoActual, () => 'ligado')
}

// Só para os testes: repõe o estado entre casos.
export function reporConectividadeParaTestes(): void {
  navegadorOnline = true
  servidorAlcancavel = true
  ouvintes.clear()
}
