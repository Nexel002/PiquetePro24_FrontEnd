import { beforeEach, describe, expect, it, vi } from 'vitest'

const mfa = vi.hoisted(() => ({
  listFactors: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  enroll: vi.fn(),
  unenroll: vi.fn(),
  challengeAndVerify: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({ supabase: { auth: { mfa } } }))

import { codigoValido, iniciarRegistoDeFactor, mensagemDeErroDoMfa, obterEstadoDoMfa, verificarCodigo } from './mfa'

beforeEach(() => Object.values(mfa).forEach((m) => m.mockReset()))

describe('obterEstadoDoMfa', () => {
  it('sem factor confirmado', async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [], all: [] }, error: null })
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null })

    expect(await obterEstadoDoMfa()).toEqual({ temFactor: false, factorId: null, nivelAtual: 'aal1' })
  })

  it('com factor confirmado e sessão ainda aal1', async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: 'f1' }], all: [{ id: 'f1' }] }, error: null })
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null })

    expect(await obterEstadoDoMfa()).toEqual({ temFactor: true, factorId: 'f1', nivelAtual: 'aal1' })
  })

  it('propaga o erro do Supabase em vez de fingir que não há factor', async () => {
    mfa.listFactors.mockResolvedValue({ data: null, error: new Error('rede') })
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1' }, error: null })

    await expect(obterEstadoDoMfa()).rejects.toThrow('rede')
  })
})

describe('iniciarRegistoDeFactor', () => {
  it('apaga primeiro os factores que ficaram por confirmar e regista um novo', async () => {
    mfa.listFactors.mockResolvedValue({
      data: { totp: [], all: [{ id: 'velho', status: 'unverified' }, { id: 'bom', status: 'verified' }] },
      error: null,
    })
    mfa.unenroll.mockResolvedValue({ error: null })
    mfa.enroll.mockResolvedValue({ data: { id: 'novo', totp: { qr_code: 'data:image/svg+xml;utf8,<svg/>', secret: 'ABC123' } }, error: null })

    const registo = await iniciarRegistoDeFactor()

    expect(mfa.unenroll).toHaveBeenCalledTimes(1)
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: 'velho' })
    expect(mfa.enroll).toHaveBeenCalledWith({ factorType: 'totp', friendlyName: 'Autenticador' })
    expect(registo).toEqual({ factorId: 'novo', qrCode: 'data:image/svg+xml;utf8,<svg/>', segredo: 'ABC123' })
  })

  it('propaga o erro do registo', async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [], all: [] }, error: null })
    mfa.enroll.mockResolvedValue({ data: null, error: new Error('MFA desligado no projecto') })

    await expect(iniciarRegistoDeFactor()).rejects.toThrow('MFA desligado')
  })
})

describe('verificarCodigo', () => {
  it('desafia e verifica com o factor e o código', async () => {
    mfa.challengeAndVerify.mockResolvedValue({ error: null })
    await verificarCodigo('f1', '123456')
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f1', code: '123456' })
  })

  it('um código errado propaga o erro', async () => {
    mfa.challengeAndVerify.mockResolvedValue({ error: new Error('Invalid TOTP code entered') })
    await expect(verificarCodigo('f1', '000000')).rejects.toThrow('Invalid TOTP')
  })
})

describe('codigoValido e mensagemDeErroDoMfa', () => {
  it('só seis dígitos', () => {
    expect(codigoValido('123456')).toBe(true)
    expect(codigoValido('12345')).toBe(false)
    expect(codigoValido('1234567')).toBe(false)
    expect(codigoValido('12a456')).toBe(false)
  })

  it('traduz os erros do Supabase', () => {
    expect(mensagemDeErroDoMfa(new Error('Invalid TOTP code entered'))).toMatch(/inválido ou expirado/)
    expect(mensagemDeErroDoMfa(new Error('Too many requests'))).toMatch(/demasiadas tentativas/i)
    expect(mensagemDeErroDoMfa(new Error('boom'))).toMatch(/não foi possível verificar/i)
    expect(mensagemDeErroDoMfa('texto')).toMatch(/não foi possível verificar/i)
  })
})
