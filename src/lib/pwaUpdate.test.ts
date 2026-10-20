import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { iniciarActualizacaoAutomatica } from './pwaUpdate'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// Simula o navigator.serviceWorker, o documento e o `registerSW` do plugin: o teste dispara os
// eventos como o browser faria.
function montar({ comControlador = true } = {}) {
  const servico = new EventTarget() as EventTarget & { controller: object | null }
  servico.controller = comControlador ? {} : null
  const documento = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState })
  let opcoes: Parameters<Parameters<typeof iniciarActualizacaoAutomatica>[0]['registerSW']>[0] = {}
  const registerSW = vi.fn((o: typeof opcoes) => {
    opcoes = o
  })
  const aoHaverVersaoNova = vi.fn()
  iniciarActualizacaoAutomatica({
    registerSW,
    servico: servico as unknown as ServiceWorkerContainer,
    documento: documento as unknown as Document,
    aoHaverVersaoNova,
    intervaloMs: 1000,
  })
  const registo = { update: vi.fn().mockResolvedValue(undefined) } as unknown as ServiceWorkerRegistration & { update: ReturnType<typeof vi.fn> }
  return {
    registerSW,
    aoHaverVersaoNova,
    // `null` = o browser não devolveu registo (um parâmetro por omissão trocaria `undefined` pelo registo).
    registar: (r: ServiceWorkerRegistration | null = registo) => opcoes.onRegisteredSW?.('/sw.js', r ?? undefined),
    registo,
    trocarControlador: () => servico.dispatchEvent(new Event('controllerchange')),
    voltarAApp: () => {
      documento.visibilityState = 'visible'
      documento.dispatchEvent(new Event('visibilitychange'))
    },
  }
}

describe('iniciarActualizacaoAutomatica', () => {
  it('regista o service worker de imediato, sem pedir nada ao utilizador', () => {
    const { registerSW } = montar()

    expect(registerSW).toHaveBeenCalledWith(expect.objectContaining({ immediate: true }))
    expect(registerSW.mock.calls[0][0]).not.toHaveProperty('onNeedRefresh')
  })

  it('quando um service worker novo assume a página, há versão nova', () => {
    const { aoHaverVersaoNova, trocarControlador } = montar()

    trocarControlador()

    expect(aoHaverVersaoNova).toHaveBeenCalledTimes(1)
  })

  it('o primeiro service worker (primeira visita) não é versão nova', () => {
    const { aoHaverVersaoNova, trocarControlador } = montar({ comControlador: false })

    trocarControlador()
    expect(aoHaverVersaoNova).not.toHaveBeenCalled()

    trocarControlador()
    expect(aoHaverVersaoNova).toHaveBeenCalledTimes(1)
  })

  it('procura versão nova periodicamente enquanto há rede', () => {
    const { registar, registo } = montar()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)

    registar()
    vi.advanceTimersByTime(3000)

    expect(registo.update).toHaveBeenCalledTimes(3)
  })

  it('procura também ao voltar à app — mas não mais do que uma vez por minuto', () => {
    const { registar, registo, voltarAApp } = montar()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    registar()

    voltarAApp()
    expect(registo.update).not.toHaveBeenCalled()

    vi.setSystemTime(Date.now() + 61_000)
    voltarAApp()
    expect(registo.update).toHaveBeenCalledTimes(1)
  })

  it('não procura sem rede', () => {
    const { registar, registo } = montar()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    registar()
    vi.advanceTimersByTime(3000)

    expect(registo.update).not.toHaveBeenCalled()
  })

  it('uma falha ao procurar não rebenta nem deixa uma rejeição por tratar', async () => {
    const { registar, registo } = montar()
    registo.update.mockRejectedValue(new Error('rede'))
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)

    registar()
    vi.advanceTimersByTime(1000)
    await Promise.resolve()

    expect(registo.update).toHaveBeenCalledTimes(1)
  })

  it('sem registo (service worker não suportado) não agenda nada', () => {
    const { registar } = montar()

    expect(() => registar(null)).not.toThrow()
    expect(vi.getTimerCount()).toBe(0)
  })
})
