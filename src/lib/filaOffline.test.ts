import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroDeApi } from './api'
import { descartar, enfileirar, enviarPendentes, listarPendentes, reporFilaParaTestes } from './filaOffline'
import type { CreateServiceRequestPayload, ServiceRequest } from '../services/serviceRequests'

const payload: CreateServiceRequestPayload = { title: 'Torneira a pingar', location: { province: 'Maputo Cidade' } }
const criado = (id: string) => ({ id }) as ServiceRequest

beforeEach(async () => {
  await reporFilaParaTestes()
})

describe('fila offline de pedidos', () => {
  it('guarda e devolve os pendentes do utilizador, do mais antigo para o mais recente', async () => {
    await enfileirar({ id: 'k1', userId: 'ana', payload })
    await new Promise((r) => setTimeout(r, 2))
    await enfileirar({ id: 'k2', userId: 'ana', payload })

    const lista = await listarPendentes('ana')
    expect(lista.map((p) => p.id)).toEqual(['k1', 'k2'])
  })

  it('não mostra nem envia os pedidos de outro utilizador (telemóvel partilhado)', async () => {
    await enfileirar({ id: 'k1', userId: 'ana', payload })
    const enviar = vi.fn()

    expect(await listarPendentes('bento')).toEqual([])
    const resultado = await enviarPendentes('bento', enviar)

    expect(enviar).not.toHaveBeenCalled()
    expect(resultado).toEqual({ enviados: [], recusados: 0, pendentes: 0 })
    expect(await listarPendentes('ana')).toHaveLength(1)
  })

  it('envia com a Idempotency-Key guardada e remove da fila quando o servidor aceita', async () => {
    await enfileirar({ id: 'chave-1', userId: 'ana', payload })
    const enviar = vi.fn().mockResolvedValue(criado('sr-1'))

    const resultado = await enviarPendentes('ana', enviar)

    expect(enviar).toHaveBeenCalledWith(payload, 'chave-1')
    expect(resultado.enviados).toHaveLength(1)
    expect(await listarPendentes('ana')).toEqual([])
  })

  it('sem resposta do servidor: o pedido fica na fila e conta uma tentativa, sem se perder', async () => {
    await enfileirar({ id: 'k1', userId: 'ana', payload })
    const enviar = vi.fn().mockRejectedValue(new ErroDeApi('Network Error'))

    const resultado = await enviarPendentes('ana', enviar)

    expect(resultado).toMatchObject({ enviados: [], recusados: 0, pendentes: 1 })
    const [item] = await listarPendentes('ana')
    expect(item).toMatchObject({ id: 'k1', tentativas: 1 })
    expect(item.recusado).toBeUndefined()
  })

  it('pára à primeira falha de rede: não tenta os seguintes, que falhariam pelo mesmo motivo', async () => {
    await enfileirar({ id: 'k1', userId: 'ana', payload })
    await new Promise((r) => setTimeout(r, 2))
    await enfileirar({ id: 'k2', userId: 'ana', payload })
    const enviar = vi.fn().mockRejectedValue(new ErroDeApi('Network Error'))

    const resultado = await enviarPendentes('ana', enviar)

    expect(enviar).toHaveBeenCalledTimes(1)
    expect(resultado.pendentes).toBe(2)
  })

  it.each([401, 408, 429, 500, 503])('HTTP %i é temporário: mantém o pedido para reenviar', async (status) => {
    await enfileirar({ id: 'k1', userId: 'ana', payload })

    const resultado = await enviarPendentes('ana', vi.fn().mockRejectedValue(new ErroDeApi('falha', status)))

    expect(resultado.pendentes).toBe(1)
    expect((await listarPendentes('ana'))[0].recusado).toBeUndefined()
  })

  it('recusa do servidor (4xx): guarda a mensagem, não volta a tentar, e continua com os seguintes', async () => {
    await enfileirar({ id: 'k1', userId: 'ana', payload })
    await new Promise((r) => setTimeout(r, 2))
    await enfileirar({ id: 'k2', userId: 'ana', payload })
    const enviar = vi
      .fn()
      .mockRejectedValueOnce(new ErroDeApi('Ainda não há profissionais para este serviço.', 400))
      .mockResolvedValueOnce(criado('sr-2'))

    const resultado = await enviarPendentes('ana', enviar)

    expect(resultado).toMatchObject({ recusados: 1, pendentes: 0 })
    expect(resultado.enviados).toHaveLength(1)
    const restantes = await listarPendentes('ana')
    expect(restantes).toHaveLength(1)
    expect(restantes[0]).toMatchObject({ id: 'k1', recusado: 'Ainda não há profissionais para este serviço.' })

    // O recusado não é reenviado na volta seguinte.
    const outra = vi.fn()
    await enviarPendentes('ana', outra)
    expect(outra).not.toHaveBeenCalled()
  })

  it('um erro que não é da API (bug) deixa o pedido na fila em vez de o perder', async () => {
    await enfileirar({ id: 'k1', userId: 'ana', payload })

    const resultado = await enviarPendentes('ana', vi.fn().mockRejectedValue(new TypeError('x is undefined')))

    expect(resultado.pendentes).toBe(1)
    expect(await listarPendentes('ana')).toHaveLength(1)
  })

  it('dois envios ao mesmo tempo (online + intervalo) fazem um só envio', async () => {
    await enfileirar({ id: 'k1', userId: 'ana', payload })
    const enviar = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10))
      return criado('sr-1')
    })

    const [a, b] = await Promise.all([enviarPendentes('ana', enviar), enviarPendentes('ana', enviar)])

    expect(enviar).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('descartar remove o item', async () => {
    await enfileirar({ id: 'k1', userId: 'ana', payload })
    await descartar('k1')
    expect(await listarPendentes('ana')).toEqual([])
  })

  it('o mesmo id enfileirado duas vezes é um só item (a chave identifica o pedido)', async () => {
    await enfileirar({ id: 'k1', userId: 'ana', payload })
    await enfileirar({ id: 'k1', userId: 'ana', payload })
    expect(await listarPendentes('ana')).toHaveLength(1)
  })
})
