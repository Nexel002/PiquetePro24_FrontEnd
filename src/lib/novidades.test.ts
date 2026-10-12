import { describe, expect, it, vi } from 'vitest'
import { carregarNovidades, formatarData } from './novidades'

function resposta(corpo: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({ ok, json: async () => corpo }) as unknown as typeof fetch
}

describe('carregarNovidades', () => {
  it('lê o ficheiro sem usar a cache (o aviso aparece com a versão antiga a correr)', async () => {
    const pedir = resposta({ atualizadoEm: '2026-10-13', novidades: ['Mais rápido.'] })

    const resultado = await carregarNovidades(pedir)

    expect(pedir).toHaveBeenCalledWith('/novidades.json', { cache: 'no-store' })
    expect(resultado).toEqual({ atualizadoEm: '2026-10-13', novidades: ['Mais rápido.'] })
  })

  it('mostra no máximo 4 novidades e corta as muito compridas', async () => {
    const comprida = 'x'.repeat(300)
    const resultado = await carregarNovidades(
      resposta({ atualizadoEm: '2026-10-13', novidades: ['a', 'b', 'c', 'd', 'e', comprida] }),
    )
    expect(resultado?.novidades).toEqual(['a', 'b', 'c', 'd'])

    const cortada = await carregarNovidades(resposta({ atualizadoEm: '2026-10-13', novidades: [comprida] }))
    expect(cortada?.novidades[0]).toHaveLength(140)
    expect(cortada?.novidades[0].endsWith('…')).toBe(true)
  })

  it('ignora entradas vazias e que não são texto', async () => {
    const resultado = await carregarNovidades(resposta({ atualizadoEm: '2026-10-13', novidades: ['  ', 3, null, 'Boa.'] }))
    expect(resultado?.novidades).toEqual(['Boa.'])
  })

  it.each([
    ['resposta HTTP de erro', resposta({}, false)],
    ['data em formato errado', resposta({ atualizadoEm: '13/10/2026', novidades: ['a'] })],
    ['novidades que não é lista', resposta({ atualizadoEm: '2026-10-13', novidades: 'a' })],
    ['JSON que não é objecto', resposta('texto')],
    ['rede em baixo', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch],
    ['ficheiro que não é JSON (a Vercel devolve o index.html)', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError('Unexpected token <') } }) as unknown as typeof fetch],
  ])('%s: devolve null em vez de rebentar', async (_nome, pedir) => {
    expect(await carregarNovidades(pedir)).toBeNull()
  })
})

describe('formatarData', () => {
  it('escreve a data por extenso em português, sem recuar um dia por causa do fuso', () => {
    expect(formatarData('2026-10-13')).toBe('13 de outubro de 2026')
    expect(formatarData('2026-01-01')).toBe('1 de janeiro de 2026')
  })
})
