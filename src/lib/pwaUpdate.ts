// Aviso de "há uma nova versão". Vive aqui, e não em main.tsx, para poder ser testado: o
// módulo `virtual:pwa-register` só existe no build do Vite (não no Vitest), por isso quem
// o importa (main.tsx) passa-o por parâmetro.

export const UMA_HORA_MS = 60 * 60 * 1000

interface OpcoesDeRegisto {
  immediate?: boolean
  onNeedRefresh?: () => void
  onRegisteredSW?: (swUrl: string, registo: ServiceWorkerRegistration | undefined) => void
}

type RegistarSW = (opcoes: OpcoesDeRegisto) => (recarregar?: boolean) => Promise<void>

interface Opcoes {
  registerSW: RegistarSW
  // Mostra o aviso ao utilizador; chama `aoAceitar` se ele escolher actualizar.
  avisar: (aoAceitar: () => void) => void
  intervaloMs?: number
}

// Porquê "prompt" e não recarregar sozinho: o service worker novo só assume o controlo quando
// o utilizador aceita. Uma página que recarrega sem aviso apagava um formulário a meio (pedido
// de serviço, KYC) — e o utilizador-alvo está em rede instável, onde perder o que escreveu
// custa caro. Quem não aceita continua na versão actual, sem perder nada, até fechar a app.
//
// A verificação periódica existe por causa de quem deixa a PWA instalada aberta dias: o
// browser só procura um service worker novo quando a página carrega, e essa pessoa nunca a
// recarrega.
export function iniciarAvisoDeVersao({ registerSW, avisar, intervaloMs = UMA_HORA_MS }: Opcoes) {
  const actualizar = registerSW({
    immediate: true,
    onNeedRefresh() {
      avisar(() => void actualizar(true))
    },
    onRegisteredSW(_swUrl, registo) {
      if (!registo) return
      setInterval(() => {
        // Sem rede, `update()` rejeita; não há nada a avisar — tenta-se na hora seguinte.
        if (!navigator.onLine) return
        registo.update().catch(() => {})
      }, intervaloMs)
    },
  })
}
