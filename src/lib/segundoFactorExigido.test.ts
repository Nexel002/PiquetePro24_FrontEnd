import { describe, expect, it, vi } from 'vitest'
import { aoFaltarSegundoFactor, avisarQueFaltaSegundoFactor, eRecusaPorFaltaDeSegundoFactor } from './segundoFactorExigido'

// Frase exacta que o backend envia em middlewares/auth.ts. Se mudar lá, este teste tem de falhar
// aqui — é a única ligação entre os dois repositórios.
const MENSAGEM_DO_BACKEND = 'O painel de administração exige verificação em dois passos. Ativa-a em Segurança.'

describe('eRecusaPorFaltaDeSegundoFactor', () => {
  it('reconhece o 403 com a mensagem que o backend envia', () => {
    expect(eRecusaPorFaltaDeSegundoFactor(403, MENSAGEM_DO_BACKEND)).toBe(true)
  })

  it('um 403 por falta de papel ADMIN não conta: reencaminhar para Segurança não resolveria nada', () => {
    expect(eRecusaPorFaltaDeSegundoFactor(403, 'Sem permissão para aceder a este recurso.')).toBe(false)
    expect(eRecusaPorFaltaDeSegundoFactor(403, 'Perfil não encontrado ou sem permissão.')).toBe(false)
  })

  it('outros estados com a mesma frase também não contam', () => {
    expect(eRecusaPorFaltaDeSegundoFactor(401, MENSAGEM_DO_BACKEND)).toBe(false)
    expect(eRecusaPorFaltaDeSegundoFactor(undefined, MENSAGEM_DO_BACKEND)).toBe(false)
  })
})

describe('avisarQueFaltaSegundoFactor', () => {
  it('chama quem está à escuta e deixa de chamar depois de cancelar', () => {
    const ouvinte = vi.fn()
    const cancelar = aoFaltarSegundoFactor(ouvinte)

    avisarQueFaltaSegundoFactor()
    expect(ouvinte).toHaveBeenCalledTimes(1)

    cancelar()
    avisarQueFaltaSegundoFactor()
    expect(ouvinte).toHaveBeenCalledTimes(1)
  })
})
