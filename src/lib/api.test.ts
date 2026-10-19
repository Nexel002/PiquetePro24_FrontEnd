import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { aoFaltarSegundoFactor } from './segundoFactorExigido'

vi.mock('./supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}))

import { api } from './api'

const adaptadorOriginal = api.defaults.adapter

afterEach(() => {
  api.defaults.adapter = adaptadorOriginal
})

function responderCom(corpo: unknown, headers: Record<string, string> = {}): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => ({ data: corpo, status: 200, statusText: 'OK', headers, config })
}

function recusarCom(status: number, error: string): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError('recusado', 'ERR_BAD_REQUEST', config, null, {
      data: { success: false, error },
      status,
      statusText: '',
      headers: {},
      config,
    })
  }
}

describe('api — 403 por falta do segundo factor do admin', () => {
  it('avisa quando o backend exige os dois passos, e o erro continua a chegar a quem pediu', async () => {
    const ouvinte = vi.fn()
    const cancelar = aoFaltarSegundoFactor(ouvinte)
    api.defaults.adapter = recusarCom(403, 'O painel de administração exige verificação em dois passos. Ativa-a em Segurança.')

    await expect(api.get('/admin/users')).rejects.toMatchObject({ status: 403 })

    expect(ouvinte).toHaveBeenCalledTimes(1)
    cancelar()
  })

  it('não avisa num 403 por falta de papel nem num 401', async () => {
    const ouvinte = vi.fn()
    const cancelar = aoFaltarSegundoFactor(ouvinte)

    api.defaults.adapter = recusarCom(403, 'Sem permissão para aceder a este recurso.')
    await expect(api.get('/admin/users')).rejects.toMatchObject({ status: 403 })

    api.defaults.adapter = recusarCom(401, 'Token de autenticação inválido ou expirado.')
    await expect(api.get('/admin/users')).rejects.toMatchObject({ status: 401 })

    expect(ouvinte).not.toHaveBeenCalled()
    cancelar()
  })
})

describe('api — desembrulhar a resposta', () => {
  it('endpoints JSON: devolve só `data` do envelope', async () => {
    api.defaults.adapter = responderCom({ success: true, data: { ola: 'mundo' } })
    const resposta = await api.get('/qualquer-coisa')
    expect(resposta.data).toEqual({ ola: 'mundo' })
  })

  it('descarregamentos (blob): devolve o ficheiro tal como veio, sem envelope', async () => {
    const ficheiro = new Blob(['a,b\r\n1,2\r\n'], { type: 'text/csv' })
    api.defaults.adapter = responderCom(ficheiro, { 'x-linhas': '1' })

    const resposta = await api.get('/admin/exports/users', { responseType: 'blob' })

    expect(resposta.data).toBe(ficheiro)
    expect(resposta.headers['x-linhas']).toBe('1')
  })
})
