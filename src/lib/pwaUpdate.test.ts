import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { iniciarAvisoDeVersao } from './pwaUpdate'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// `registerSW` falso: guarda os callbacks para o teste os disparar como o browser faria.
function montar() {
  const actualizarSW = vi.fn().mockResolvedValue(undefined)
  let callbacks: Parameters<Parameters<typeof iniciarAvisoDeVersao>[0]['registerSW']>[0] = {}
  const registerSW = vi.fn((opcoes: typeof callbacks) => {
    callbacks = opcoes
    return actualizarSW
  })
  const avisar = vi.fn()
  iniciarAvisoDeVersao({ registerSW, avisar, intervaloMs: 1000 })
  return { actualizarSW, avisar, registerSW, callbacks: () => callbacks }
}

describe('iniciarAvisoDeVersao', () => {
  it('regista o service worker de imediato', () => {
    const { registerSW } = montar()

    expect(registerSW).toHaveBeenCalledWith(expect.objectContaining({ immediate: true }))
  })

  it('não avisa nem recarrega enquanto não houver versão nova', () => {
    const { avisar, actualizarSW } = montar()

    expect(avisar).not.toHaveBeenCalled()
    expect(actualizarSW).not.toHaveBeenCalled()
  })

  it('avisa quando há versão nova, mas só actualiza se o utilizador aceitar', () => {
    const { avisar, actualizarSW, callbacks } = montar()

    callbacks().onNeedRefresh?.()

    expect(avisar).toHaveBeenCalledTimes(1)
    expect(actualizarSW).not.toHaveBeenCalled()

    const aoAceitar = avisar.mock.calls[0][0] as () => void
    aoAceitar()

    expect(actualizarSW).toHaveBeenCalledWith(true)
  })

  it('procura versão nova periodicamente enquanto há rede', () => {
    const { callbacks } = montar()
    const registo = { update: vi.fn().mockResolvedValue(undefined) } as unknown as ServiceWorkerRegistration
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)

    callbacks().onRegisteredSW?.('/sw.js', registo)
    vi.advanceTimersByTime(3000)

    expect(registo.update).toHaveBeenCalledTimes(3)
  })

  it('não procura sem rede', () => {
    const { callbacks } = montar()
    const registo = { update: vi.fn().mockResolvedValue(undefined) } as unknown as ServiceWorkerRegistration
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    callbacks().onRegisteredSW?.('/sw.js', registo)
    vi.advanceTimersByTime(3000)

    expect(registo.update).not.toHaveBeenCalled()
  })

  it('uma falha ao procurar não rebenta nem deixa uma rejeição por tratar', async () => {
    const { callbacks } = montar()
    const registo = { update: vi.fn().mockRejectedValue(new Error('rede')) } as unknown as ServiceWorkerRegistration
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)

    callbacks().onRegisteredSW?.('/sw.js', registo)
    vi.advanceTimersByTime(1000)
    await Promise.resolve()

    expect(registo.update).toHaveBeenCalledTimes(1)
  })

  it('sem registo (service worker não suportado) não agenda nada', () => {
    const { callbacks } = montar()

    expect(() => callbacks().onRegisteredSW?.('/sw.js', undefined)).not.toThrow()
    expect(vi.getTimerCount()).toBe(0)
  })
})
