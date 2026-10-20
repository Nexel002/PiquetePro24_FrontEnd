import { beforeEach, describe, expect, it, vi } from 'vitest'
import { actualizacaoPendente, aplicarSePendente, ARRANQUE_MS, AUSENCIA_MS, marcarActualizacaoPendente, reporNovaVersaoParaTestes } from './novaVersao'

let agora = 0
let desdeQueAbriu = 0
const recarregar = vi.fn()
const documento = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState })
const mudarVisibilidade = (estado: DocumentVisibilityState) => {
  documento.visibilityState = estado
  documento.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  agora = 1_000_000
  desdeQueAbriu = 60_000
  recarregar.mockReset()
  documento.visibilityState = 'visible'
  reporNovaVersaoParaTestes({ recarregar, desdeQueAbriu: () => desdeQueAbriu, agora: () => agora, documento: documento as unknown as Document })
})

describe('quando recarregar depois de a versão nova se activar', () => {
  it('logo depois de abrir a app, recarrega de imediato (ainda não houve tempo de escrever nada)', () => {
    desdeQueAbriu = ARRANQUE_MS - 1

    marcarActualizacaoPendente()

    expect(recarregar).toHaveBeenCalledTimes(1)
  })

  it('a meio do uso NÃO recarrega logo: um formulário a meio perder-se-ia', () => {
    marcarActualizacaoPendente()

    expect(recarregar).not.toHaveBeenCalled()
    expect(actualizacaoPendente()).toBe(true)
  })

  it('na mudança de ecrã seguinte, recarrega', () => {
    marcarActualizacaoPendente()

    aplicarSePendente()

    expect(recarregar).toHaveBeenCalledTimes(1)
  })

  it('sem versão nova, mudar de ecrã não recarrega', () => {
    aplicarSePendente()

    expect(recarregar).not.toHaveBeenCalled()
  })

  it('ao voltar à app depois de 5 min fora, recarrega', () => {
    marcarActualizacaoPendente()

    mudarVisibilidade('hidden')
    agora += AUSENCIA_MS
    mudarVisibilidade('visible')

    expect(recarregar).toHaveBeenCalledTimes(1)
  })

  it('uma saída curta (ver uma mensagem e voltar) não recarrega', () => {
    marcarActualizacaoPendente()

    mudarVisibilidade('hidden')
    agora += 30_000
    mudarVisibilidade('visible')

    expect(recarregar).not.toHaveBeenCalled()
  })
})
