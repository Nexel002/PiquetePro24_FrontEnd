import { describe, expect, it } from 'vitest'
import { formatarData, marcarNovidadesVistas, novidadesPorMostrar } from './novidades'
import type { EntradaDeVersao } from './versoes'

const HISTORICO: EntradaDeVersao[] = [
  { versao: '0.2.2', data: '2026-10-20', novidades: ['A app actualiza-se sozinha.'] },
  { versao: '0.2.1', data: '2026-10-19', novidades: ['Logótipo oficial.'] },
  { versao: '0.2.0', data: '2026-10-18', novidades: ['Menu lateral no admin.'] },
]

// localStorage em memória, com as chaves que o teste quiser.
function armazenamento(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial))
  return {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
    key: (i: number) => [...dados.keys()][i] ?? null,
    get length() {
      return dados.size
    },
    dados,
  }
}
const SESSAO = { 'sb-abcdef-auth-token': '{}' }

describe('novidadesPorMostrar — depois de a app se actualizar', () => {
  it('quem vinha de uma versão anterior vê o que essa versão ainda não tinha', () => {
    const a = armazenamento({ 'piquete:versao-vista': '0.2.1' })

    expect(novidadesPorMostrar({ historico: HISTORICO, versaoActual: '0.2.2', armazenamento: a })).toEqual({
      atualizadoEm: '2026-10-20',
      novidades: ['A app actualiza-se sozinha.'],
    })
  })

  it('quem saltou versões vê tudo o que perdeu', () => {
    const a = armazenamento({ 'piquete:versao-vista': '0.2.0' })

    expect(novidadesPorMostrar({ historico: HISTORICO, versaoActual: '0.2.2', armazenamento: a })?.novidades).toEqual([
      'A app actualiza-se sozinha.',
      'Logótipo oficial.',
    ])
  })

  it('já viu as novidades desta versão: nada', () => {
    const a = armazenamento({ 'piquete:versao-vista': '0.2.2' })

    expect(novidadesPorMostrar({ historico: HISTORICO, versaoActual: '0.2.2', armazenamento: a })).toBeNull()
  })

  it('alguém novo, na primeira abertura: nada (não houve actualização), e fica marcada a versão', () => {
    const a = armazenamento()

    expect(novidadesPorMostrar({ historico: HISTORICO, versaoActual: '0.2.2', armazenamento: a })).toBeNull()
    expect(a.dados.get('piquete:versao-vista')).toBe('0.2.2')
  })

  it('quem já usava a app antes desta marcação (tem sessão guardada) vê as novidades da versão actual', () => {
    const a = armazenamento(SESSAO)

    expect(novidadesPorMostrar({ historico: HISTORICO, versaoActual: '0.2.2', armazenamento: a })?.novidades).toEqual(['A app actualiza-se sozinha.'])
  })

  it('não anuncia entradas posteriores à versão que corre', () => {
    const a = armazenamento({ 'piquete:versao-vista': '0.2.0' })

    expect(novidadesPorMostrar({ historico: HISTORICO, versaoActual: '0.2.1', armazenamento: a })?.novidades).toEqual(['Logótipo oficial.'])
  })

  it('depois de fechado, não volta a aparecer nesta versão', () => {
    const a = armazenamento({ 'piquete:versao-vista': '0.2.1' })

    marcarNovidadesVistas({ versaoActual: '0.2.2', armazenamento: a })

    expect(novidadesPorMostrar({ historico: HISTORICO, versaoActual: '0.2.2', armazenamento: a })).toBeNull()
  })

  it('sem localStorage não rebenta: só não há aviso', () => {
    const falha = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => undefined,
      key: () => null,
      length: 0,
    }

    expect(novidadesPorMostrar({ historico: HISTORICO, versaoActual: '0.2.2', armazenamento: falha })).toBeNull()
  })
})

describe('formatarData', () => {
  it('escreve a data por extenso em português, sem recuar um dia por causa do fuso', () => {
    expect(formatarData('2026-10-13')).toBe('13 de outubro de 2026')
  })
})
