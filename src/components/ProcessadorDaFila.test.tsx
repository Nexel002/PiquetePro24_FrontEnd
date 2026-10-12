import 'fake-indexeddb/auto'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroDeApi } from '../lib/api'
import { definirNavegadorOnline, reporConectividadeParaTestes } from '../lib/conectividade'
import { enfileirar, listarPendentes, reporFilaParaTestes } from '../lib/filaOffline'
import { ProcessadorDaFila } from './ProcessadorDaFila'

const servico = vi.hoisted(() => ({ criar: vi.fn() }))
vi.mock('../services/serviceRequests', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/serviceRequests')>()),
  createServiceRequest: servico.criar,
}))
vi.mock('../store/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'ana' } } }) }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const payload = { title: 'Torneira a pingar', location: { province: 'Maputo Cidade' } }

function montar() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ProcessadorDaFila />
    </QueryClientProvider>,
  )
}

beforeEach(async () => {
  await reporFilaParaTestes()
  reporConectividadeParaTestes()
  servico.criar.mockReset()
  Object.values(toast).forEach((f) => f.mockReset())
})
afterEach(cleanup)

describe('ProcessadorDaFila', () => {
  it('ao abrir a app com ligação, envia o que ficou guardado, com a chave guardada, e avisa', async () => {
    await enfileirar({ id: 'chave-1', userId: 'ana', payload })
    servico.criar.mockResolvedValue({ id: 'sr-1' })

    montar()

    await waitFor(() => expect(servico.criar).toHaveBeenCalledWith(payload, 'chave-1'))
    await waitFor(async () => expect(await listarPendentes('ana')).toEqual([]))
    expect(toast.success).toHaveBeenCalled()
  })

  it('sem ligação não tenta; quando a ligação volta, envia', async () => {
    definirNavegadorOnline(false)
    await enfileirar({ id: 'chave-1', userId: 'ana', payload })
    servico.criar.mockResolvedValue({ id: 'sr-1' })

    montar()
    await new Promise((r) => setTimeout(r, 30))
    expect(servico.criar).not.toHaveBeenCalled()

    act(() => definirNavegadorOnline(true))

    await waitFor(() => expect(servico.criar).toHaveBeenCalledTimes(1))
  })

  it('se o servidor ainda não responde, o pedido fica guardado e não há aviso de sucesso', async () => {
    await enfileirar({ id: 'chave-1', userId: 'ana', payload })
    servico.criar.mockRejectedValue(new ErroDeApi('Network Error'))

    montar()

    await waitFor(() => expect(servico.criar).toHaveBeenCalled())
    expect(await listarPendentes('ana')).toHaveLength(1)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('um pedido recusado pelo servidor gera aviso de erro e fica visível', async () => {
    await enfileirar({ id: 'chave-1', userId: 'ana', payload })
    servico.criar.mockRejectedValue(new ErroDeApi('Serviço inexistente.', 400))

    montar()

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect((await listarPendentes('ana'))[0].recusado).toBe('Serviço inexistente.')
  })
})
