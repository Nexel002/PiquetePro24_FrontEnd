import { beforeEach, describe, expect, it, vi } from 'vitest'
import { descreverIdade, guardarUltimaLocalizacao, IDADE_MAXIMA_MS, lerUltimaLocalizacao } from './ultimaLocalizacao'

const AGORA = 1_800_000_000_000
const MAPUTO = { latitude: -25.9692, longitude: 32.5732 }

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('última localização conhecida', () => {
  it('devolve o que foi guardado', () => {
    guardarUltimaLocalizacao(MAPUTO, AGORA - 60_000)
    expect(lerUltimaLocalizacao(AGORA)).toEqual({ ...MAPUTO, guardadaEm: AGORA - 60_000 })
  })

  it('sem nada guardado devolve null', () => {
    expect(lerUltimaLocalizacao(AGORA)).toBeNull()
  })

  it('ignora uma posição com mais de 30 dias', () => {
    guardarUltimaLocalizacao(MAPUTO, AGORA - IDADE_MAXIMA_MS - 1)
    expect(lerUltimaLocalizacao(AGORA)).toBeNull()
  })

  it('ignora uma posição fora de Moçambique (o backend recusá-la-ia)', () => {
    guardarUltimaLocalizacao({ latitude: 48.8, longitude: 2.3 }, AGORA)
    expect(lerUltimaLocalizacao(AGORA)).toBeNull()
  })

  it('ignora uma data no futuro (relógio mudado ou valor adulterado)', () => {
    guardarUltimaLocalizacao(MAPUTO, AGORA + 3_600_000)
    expect(lerUltimaLocalizacao(AGORA)).toBeNull()
  })

  it('ignora JSON corrompido sem rebentar', () => {
    localStorage.setItem('piquete:ultima-localizacao', '{nao e json')
    expect(lerUltimaLocalizacao(AGORA)).toBeNull()
  })

  it('ignora um objecto com campos do tipo errado', () => {
    localStorage.setItem('piquete:ultima-localizacao', JSON.stringify({ latitude: '-25', longitude: 32, guardadaEm: AGORA }))
    expect(lerUltimaLocalizacao(AGORA)).toBeNull()
  })

  it('não rebenta quando o localStorage não está disponível', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => guardarUltimaLocalizacao(MAPUTO, AGORA)).not.toThrow()
    expect(lerUltimaLocalizacao(AGORA)).toBeNull()
  })
})

describe('descreverIdade', () => {
  it.each([
    [10_000, 'agora mesmo'],
    [5 * 60_000, 'há 5 min'],
    [3 * 3_600_000, 'há 3 h'],
    [24 * 3_600_000, 'há 1 dia'],
    [3 * 24 * 3_600_000, 'há 3 dias'],
  ])('%i ms atrás → %s', (atras, esperado) => {
    expect(descreverIdade(AGORA - atras, AGORA)).toBe(esperado)
  })
})
