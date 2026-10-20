import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AquecerLocalizacao } from './AquecerLocalizacao'

const servico = vi.hoisted(() => ({ localizar: vi.fn(), repor: vi.fn(), permissaoConcedida: vi.fn() }))
vi.mock('../lib/servicoDeLocalizacao', () => servico)
const auth = vi.hoisted(() => ({ userId: 'ana' as string | undefined }))
vi.mock('../store/AuthContext', () => ({
  useAuth: () => ({ session: auth.userId ? { user: { id: auth.userId } } : null }),
}))

// A permissão resolve-se numa promessa: deixar correr as microtarefas antes de verificar.
const esperarPermissao = () => act(async () => {})

function mudarVisibilidade(estado: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  Object.values(servico).forEach((f) => f.mockReset())
  servico.permissaoConcedida.mockResolvedValue(true)
  auth.userId = 'ana'
})
afterEach(() => {
  cleanup()
  Reflect.deleteProperty(document, 'visibilityState')
})

describe('AquecerLocalizacao', () => {
  it('com sessão e permissão já concedida, começa a captar logo', async () => {
    render(<AquecerLocalizacao />)
    await esperarPermissao()

    expect(servico.localizar).toHaveBeenCalledTimes(1)
  })

  it('sem permissão concedida não capta: o pedido de permissão tem de vir de um toque', async () => {
    servico.permissaoConcedida.mockResolvedValue(false)
    render(<AquecerLocalizacao />)
    await esperarPermissao()

    expect(servico.localizar).not.toHaveBeenCalled()
  })

  it('sem sessão não capta', async () => {
    auth.userId = undefined
    render(<AquecerLocalizacao />)
    await esperarPermissao()

    expect(servico.permissaoConcedida).not.toHaveBeenCalled()
    expect(servico.localizar).not.toHaveBeenCalled()
  })

  it('ao voltar ao primeiro plano tenta de novo (o serviço ignora se a posição ainda for recente)', async () => {
    render(<AquecerLocalizacao />)
    await esperarPermissao()

    mudarVisibilidade('hidden')
    await esperarPermissao()
    expect(servico.localizar).toHaveBeenCalledTimes(1)

    mudarVisibilidade('visible')
    await esperarPermissao()
    expect(servico.localizar).toHaveBeenCalledTimes(2)
  })

  it('ao terminar sessão esquece a posição; um visitante sem sessão desde o início não é reposto', async () => {
    auth.userId = undefined
    const { rerender } = render(<AquecerLocalizacao />)
    expect(servico.repor).not.toHaveBeenCalled()

    auth.userId = 'ana'
    rerender(<AquecerLocalizacao />)
    await esperarPermissao()
    expect(servico.repor).not.toHaveBeenCalled()

    auth.userId = undefined
    rerender(<AquecerLocalizacao />)
    expect(servico.repor).toHaveBeenCalledTimes(1)
  })

  it('depois de sair do ecrã já não responde ao primeiro plano', async () => {
    const { unmount } = render(<AquecerLocalizacao />)
    await esperarPermissao()
    unmount()

    mudarVisibilidade('visible')
    await esperarPermissao()

    expect(servico.localizar).toHaveBeenCalledTimes(1)
  })
})
