// Actualização automática da app (Fase 37). Vive aqui, e não em main.tsx, para poder ser testada:
// o módulo `virtual:pwa-register` só existe no build do Vite (não no Vitest), por isso quem o
// importa (main.tsx) passa-o por parâmetro.
//
// Antes (registerType 'prompt'), o service worker novo ficava «à espera» até o utilizador carregar
// em «Actualizar agora». Quem dispensava o aviso, ou nunca o via (PWA instalada no telemóvel, que
// quase nunca recarrega), ficava indefinidamente com o index.html e o JS antigos do precache — foi
// assim que o logótipo oficial não chegou a vários telemóveis. Agora o service worker novo activa-se
// sozinho (`skipWaiting` + `clientsClaim` no vite.config.ts) e esta página só tem de recarregar —
// num momento seguro, decidido em lib/novaVersao.ts.

import { marcarActualizacaoPendente } from './novaVersao'

export const UMA_HORA_MS = 60 * 60 * 1000
// Ao voltar à app, procura versão nova — mas não mais do que uma vez por minuto.
const INTERVALO_MINIMO_AO_VOLTAR_MS = 60_000

interface OpcoesDeRegisto {
  immediate?: boolean
  onRegisteredSW?: (swUrl: string, registo: ServiceWorkerRegistration | undefined) => void
}

type RegistarSW = (opcoes: OpcoesDeRegisto) => unknown

interface Opcoes {
  registerSW: RegistarSW
  servico?: Pick<ServiceWorkerContainer, 'controller' | 'addEventListener'> | undefined
  documento?: Pick<Document, 'visibilityState' | 'addEventListener'>
  aoHaverVersaoNova?: () => void
  intervaloMs?: number
  agora?: () => number
}

export function iniciarActualizacaoAutomatica({
  registerSW,
  servico = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
  documento = document,
  aoHaverVersaoNova = marcarActualizacaoPendente,
  intervaloMs = UMA_HORA_MS,
  agora = Date.now,
}: Opcoes) {
  // O primeiro service worker a assumir a página (primeira visita) também emite `controllerchange`;
  // isso não é versão nova. Só conta a troca de um controlador por outro.
  let tinhaControlador = Boolean(servico?.controller)
  servico?.addEventListener('controllerchange', () => {
    if (tinhaControlador) aoHaverVersaoNova()
    tinhaControlador = true
  })

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registo) {
      if (!registo) return
      // Sem rede, `update()` rejeita; não há nada a fazer — tenta-se na vez seguinte.
      const procurar = () => {
        if (!navigator.onLine) return
        registo.update().catch(() => {})
      }
      // Quem deixa a PWA aberta dias: o browser só procura um service worker novo quando a página
      // carrega, e essa pessoa nunca a recarrega.
      setInterval(procurar, intervaloMs)
      // Ao voltar à app (telemóvel desbloqueado, separador retomado): era aqui que o aviso antigo
      // «demorava a aparecer» — só se procurava de hora a hora.
      let ultimaProcura = agora()
      documento.addEventListener('visibilitychange', () => {
        if (documento.visibilityState !== 'visible' || agora() - ultimaProcura < INTERVALO_MINIMO_AO_VOLTAR_MS) return
        ultimaProcura = agora()
        procurar()
      })
    },
  })
}
