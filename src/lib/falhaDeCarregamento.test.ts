import { describe, expect, it, vi } from 'vitest'
import { iniciarTratamentoDeFalhaDeCarregamento, JANELA_MS, recarregarSeNovaVersao } from './falhaDeCarregamento'

function armazenamentoEmMemoria(inicial: Record<string, string> = {}) {
  const dados = { ...inicial }
  return {
    getItem: (k: string) => dados[k] ?? null,
    setItem: (k: string, v: string) => {
      dados[k] = v
    },
  }
}

describe('recarregarSeNovaVersao', () => {
  it('recarrega na primeira falha', () => {
    const recarregar = vi.fn()

    const fez = recarregarSeNovaVersao({ agora: () => 1_000_000, armazenamento: armazenamentoEmMemoria(), recarregar })

    expect(fez).toBe(true)
    expect(recarregar).toHaveBeenCalledTimes(1)
  })

  it('não recarrega duas vezes dentro da janela: sem rede, recarregar em ciclo seria pior do que o erro', () => {
    const recarregar = vi.fn()
    const armazenamento = armazenamentoEmMemoria()

    recarregarSeNovaVersao({ agora: () => 1_000_000, armazenamento, recarregar })
    const segunda = recarregarSeNovaVersao({ agora: () => 1_000_000 + JANELA_MS - 1, armazenamento, recarregar })

    expect(segunda).toBe(false)
    expect(recarregar).toHaveBeenCalledTimes(1)
  })

  it('passada a janela, volta a poder recarregar (outro deploy, outra falha)', () => {
    const recarregar = vi.fn()
    const armazenamento = armazenamentoEmMemoria()

    recarregarSeNovaVersao({ agora: () => 1_000_000, armazenamento, recarregar })
    const depois = recarregarSeNovaVersao({ agora: () => 1_000_000 + JANELA_MS, armazenamento, recarregar })

    expect(depois).toBe(true)
    expect(recarregar).toHaveBeenCalledTimes(2)
  })

  it('sem sessionStorage não recarrega: não há como garantir que não é um ciclo', () => {
    const recarregar = vi.fn()
    const quebrado = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
    }

    expect(recarregarSeNovaVersao({ armazenamento: quebrado, recarregar })).toBe(false)
    expect(recarregar).not.toHaveBeenCalled()
  })
})

describe('iniciarTratamentoDeFalhaDeCarregamento', () => {
  it('engole o erro (preventDefault) só quando recarrega', () => {
    const recarregar = vi.fn()
    const ouvintes: Record<string, (e: Event) => void> = {}
    iniciarTratamentoDeFalhaDeCarregamento(
      {
        addEventListener: ((tipo: string, fn: (e: Event) => void) => {
          ouvintes[tipo] = fn
        }) as Window['addEventListener'],
      },
      { armazenamento: armazenamentoEmMemoria(), recarregar },
    )

    const evento = new Event('vite:preloadError', { cancelable: true })
    ouvintes['vite:preloadError'](evento)

    expect(evento.defaultPrevented).toBe(true)
    expect(recarregar).toHaveBeenCalledTimes(1)

    // Segunda falha logo a seguir: não recarrega e deixa o erro seguir para o ecrã de erro.
    const segundo = new Event('vite:preloadError', { cancelable: true })
    ouvintes['vite:preloadError'](segundo)
    expect(segundo.defaultPrevented).toBe(false)
  })
})
