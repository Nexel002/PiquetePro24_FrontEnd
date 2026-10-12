import 'fake-indexeddb/auto'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroDeApi } from '../lib/api'
import { definirNavegadorOnline, reporConectividadeParaTestes } from '../lib/conectividade'
import { listarPendentes, reporFilaParaTestes } from '../lib/filaOffline'
import type { CreateServiceRequestPayload } from '../services/serviceRequests'
import { useCreateServiceRequest } from './useServiceRequests'

const servico = vi.hoisted(() => ({ criar: vi.fn() }))
vi.mock('../services/serviceRequests', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/serviceRequests')>()),
  createServiceRequest: servico.criar,
}))
vi.mock('../store/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'ana' } } }) }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const payload: CreateServiceRequestPayload = { title: 'Torneira a pingar', location: { province: 'Maputo Cidade' } }

function envolver() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(async () => {
  await reporFilaParaTestes()
  reporConectividadeParaTestes()
  servico.criar.mockReset()
  Object.values(toast).forEach((f) => f.mockReset())
})
afterEach(cleanup)

describe('useCreateServiceRequest — fila offline', () => {
  it('com ligação e o servidor a responder: cria o pedido, com Idempotency-Key, e não guarda nada', async () => {
    servico.criar.mockResolvedValue({ id: 'sr-1' })
    const { result } = renderHook(() => useCreateServiceRequest(), { wrapper: envolver() })

    await act(() => result.current.mutateAsync(payload))

    expect(servico.criar).toHaveBeenCalledWith(payload, expect.stringMatching(/^[0-9a-f-]{36}$/))
    expect(await listarPendentes('ana')).toEqual([])
    expect(toast.success).toHaveBeenCalled()
  })

  it('sem resposta do servidor: guarda o pedido com A MESMA chave que usou na tentativa', async () => {
    servico.criar.mockRejectedValue(new ErroDeApi('Network Error'))
    const { result } = renderHook(() => useCreateServiceRequest(), { wrapper: envolver() })

    await act(() => result.current.mutateAsync(payload))

    const chaveUsada = servico.criar.mock.calls[0][1]
    const pendentes = await listarPendentes('ana')
    // É isto que impede o duplicado: se a primeira tentativa tiver chegado ao servidor, o reenvio
    // da fila leva a mesma chave e o servidor devolve o pedido original.
    expect(pendentes).toHaveLength(1)
    expect(pendentes[0].id).toBe(chaveUsada)
    expect(toast.info).toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('sem ligação à partida: guarda logo, sem sequer tentar o servidor', async () => {
    definirNavegadorOnline(false)
    const { result } = renderHook(() => useCreateServiceRequest(), { wrapper: envolver() })

    await act(() => result.current.mutateAsync(payload))

    expect(servico.criar).not.toHaveBeenCalled()
    expect(await listarPendentes('ana')).toHaveLength(1)
  })

  it('sem ligação o botão não fica a rodar para sempre (a mutação não é pausada pela rede)', async () => {
    definirNavegadorOnline(false)
    const { result } = renderHook(() => useCreateServiceRequest(), { wrapper: envolver() })

    act(() => result.current.mutate(payload))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('erro do servidor (400): mostra o erro e NÃO guarda — reenviar mais tarde só o faria falhar longe do formulário', async () => {
    servico.criar.mockRejectedValue(new ErroDeApi('Ainda não há profissionais para este serviço.', 400))
    const { result } = renderHook(() => useCreateServiceRequest(), { wrapper: envolver() })

    await act(async () => {
      await result.current.mutateAsync(payload).catch(() => undefined)
    })

    expect(await listarPendentes('ana')).toEqual([])
    expect(toast.error).toHaveBeenCalledWith('Ainda não há profissionais para este serviço.')
  })

  it('erro 5xx seguido de novo clique: reutiliza a mesma chave (a 1.ª tentativa pode ter criado o pedido)', async () => {
    servico.criar.mockRejectedValueOnce(new ErroDeApi('Erro interno', 500)).mockResolvedValueOnce({ id: 'sr-1' })
    const { result } = renderHook(() => useCreateServiceRequest(), { wrapper: envolver() })

    await act(async () => {
      await result.current.mutateAsync(payload).catch(() => undefined)
    })
    await act(() => result.current.mutateAsync(payload))

    expect(servico.criar.mock.calls[1][1]).toBe(servico.criar.mock.calls[0][1])
  })

  it('depois de um pedido criado, o seguinte usa uma chave nova (senão devolvia sempre o primeiro)', async () => {
    servico.criar.mockResolvedValue({ id: 'sr-1' })
    const { result } = renderHook(() => useCreateServiceRequest(), { wrapper: envolver() })

    await act(() => result.current.mutateAsync(payload))
    await act(() => result.current.mutateAsync(payload))

    expect(servico.criar.mock.calls[1][1]).not.toBe(servico.criar.mock.calls[0][1])
  })
})
