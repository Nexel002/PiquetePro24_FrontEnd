import { describe, expect, it } from 'vitest'
import { compararVersoes, dataValida, novidadesDesde, validarHistorico } from './versoes'

const entrada = (versao: string, data = '2026-10-14', novidades = ['Algo novo.']) => ({ versao, data, novidades })

describe('compararVersoes', () => {
  it('compara número a número, não como texto (0.10.0 é depois de 0.9.0)', () => {
    expect(compararVersoes('0.10.0', '0.9.0')).toBeGreaterThan(0)
    expect(compararVersoes('1.0.0', '0.99.99')).toBeGreaterThan(0)
    expect(compararVersoes('0.1.0', '0.1.0')).toBe(0)
    expect(compararVersoes('0.1.0', '0.1.1')).toBeLessThan(0)
  })
})

describe('dataValida', () => {
  it('recusa formatos errados e dias que não existem', () => {
    expect(dataValida('2026-10-14')).toBe(true)
    expect(dataValida('14/10/2026')).toBe(false)
    expect(dataValida('2026-02-31')).toBe(false)
    expect(dataValida(20261014)).toBe(false)
  })
})

describe('novidadesDesde — só o que falta a quem está a ver', () => {
  const historico = [entrada('0.1.0', '2026-10-14', ['A']), entrada('0.2.0', '2026-10-20', ['B']), entrada('0.3.0', '2026-10-25', ['C', 'D'])]

  it('quem tem a versão anterior só vê o que essa versão trouxe, com a data dela', () => {
    expect(novidadesDesde(historico, '0.2.0')).toEqual({ atualizadoEm: '2026-10-25', novidades: ['C', 'D'] })
  })

  it('quem saltou versões vê tudo o que perdeu, da mais recente para a mais antiga', () => {
    expect(novidadesDesde(historico, '0.1.0')).toEqual({ atualizadoEm: '2026-10-25', novidades: ['C', 'D', 'B'] })
  })

  it('quem já tem a última não vê novidades inventadas', () => {
    expect(novidadesDesde(historico, '0.3.0')).toBeNull()
  })

  it('respeita o limite de 4 itens do ecrã, mantendo os mais recentes', () => {
    const muitas = [entrada('0.1.0', '2026-10-14', ['1', '2']), entrada('0.2.0', '2026-10-15', ['3', '4', '5'])]
    expect(novidadesDesde(muitas, '0.0.0')?.novidades).toEqual(['3', '4', '5', '1'])
  })
})

describe('validarHistorico — falha o build quando o aviso ficaria errado', () => {
  it('aceita um histórico com entrada para a versão do pacote', () => {
    expect(validarHistorico([entrada('0.1.0')], '0.1.0')).toHaveLength(1)
  })

  it('a versão do pacote sem entrada falha, e diz o que fazer', () => {
    expect(() => validarHistorico([entrada('0.1.0')], '0.2.0')).toThrow(/0\.2\.0.*não tem entrada/)
  })

  it('uma entrada mais recente do que o pacote falha (esqueceram-se de subir a versão)', () => {
    expect(() => validarHistorico([entrada('0.1.0'), entrada('0.2.0')], '0.1.0')).toThrow(/mais recente do que a do package\.json/)
  })

  it.each([
    ['sem frases', [entrada('0.1.0', '2026-10-14', [])], /1 a 4 frases/],
    ['frases a mais', [entrada('0.1.0', '2026-10-14', ['a', 'b', 'c', 'd', 'e'])], /1 a 4 frases/],
    ['frase demasiado comprida', [entrada('0.1.0', '2026-10-14', ['x'.repeat(141)])], /141 caracteres/],
    ['data inventada', [entrada('0.1.0', '2026-02-31')], /data real/],
    ['versão mal escrita', [entrada('v1')], /AAA\.BBB\.CCC/],
    ['versão repetida', [entrada('0.1.0'), entrada('0.1.0')], /duas vezes/],
  ])('%s', (_nome, historico, erro) => {
    expect(() => validarHistorico(historico, '0.1.0')).toThrow(erro)
  })

  it('o ficheiro vazio ou que não é lista falha', () => {
    expect(() => validarHistorico([], '0.1.0')).toThrow()
    expect(() => validarHistorico({}, '0.1.0')).toThrow()
  })
})

describe('o histórico real do repositório', () => {
  it('é válido e tem entrada para a versão do package.json', async () => {
    const { readFileSync } = await import('node:fs')
    const pacote = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }
    const historico = JSON.parse(readFileSync('src/data/novidadesPorVersao.json', 'utf8')) as unknown
    expect(() => validarHistorico(historico, pacote.version)).not.toThrow()
  })
})
