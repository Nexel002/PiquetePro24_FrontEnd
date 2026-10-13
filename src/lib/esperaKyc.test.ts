import { describe, expect, it } from 'vitest'
import { esperaDaSubmissao, LIMITE_ESPERA_KYC_HORAS } from './esperaKyc'

const AGORA = new Date('2026-10-13T12:00:00.000Z')
const haHoras = (h: number) => new Date(AGORA.getTime() - h * 60 * 60 * 1000).toISOString()

describe('esperaDaSubmissao', () => {
  it('menos de uma hora não está em atraso', () => {
    expect(esperaDaSubmissao(haHoras(0.2), AGORA)).toEqual({ horas: 0, emAtraso: false, texto: 'menos de 1 hora' })
  })

  it('conta horas inteiras', () => {
    expect(esperaDaSubmissao(haHoras(1), AGORA).texto).toBe('1 hora')
    expect(esperaDaSubmissao(haHoras(5.9), AGORA)).toMatchObject({ horas: 5, texto: '5 horas' })
  })

  it('só fica em atraso a partir do limite', () => {
    expect(esperaDaSubmissao(haHoras(LIMITE_ESPERA_KYC_HORAS - 1), AGORA).emAtraso).toBe(false)
    expect(esperaDaSubmissao(haHoras(LIMITE_ESPERA_KYC_HORAS), AGORA).emAtraso).toBe(true)
  })

  it('a partir das 48h passa a dias', () => {
    expect(esperaDaSubmissao(haHoras(72), AGORA).texto).toBe('3 dias')
  })

  it('data no futuro ou inválida conta como 0 horas, nunca negativo', () => {
    expect(esperaDaSubmissao(haHoras(-5), AGORA).horas).toBe(0)
    expect(esperaDaSubmissao('lixo', AGORA)).toMatchObject({ horas: 0, emAtraso: false })
  })
})
