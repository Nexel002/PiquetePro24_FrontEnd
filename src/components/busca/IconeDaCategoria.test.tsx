import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CAMINHOS_DO_ICONE_GENERICO, CAMINHOS_DOS_ICONES, IconeDaCategoria } from './IconeDaCategoria'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// Os slugs do seed das categorias de serviço (migration do backend). Se uma categoria nova for
// acrescentada lá sem ícone aqui, este teste não a apanha — por isso há também o aviso em
// desenvolvimento —, mas garante que nenhuma das actuais cai no ícone genérico.
const SLUGS_DO_SEED = [
  'canalizacao',
  'carpintaria',
  'climatizacao',
  'eletricidade',
  'informatica-eletronica',
  'jardinagem',
  'limpeza-domestica',
  'mudancas-transporte',
  'pintura',
  'serralharia',
]

describe('IconeDaCategoria', () => {
  it.each(SLUGS_DO_SEED)('«%s» tem ícone próprio, diferente do genérico', (slug) => {
    expect(CAMINHOS_DOS_ICONES[slug]).toBeDefined()
    expect(CAMINHOS_DOS_ICONES[slug]).not.toEqual(CAMINHOS_DO_ICONE_GENERICO)
  })

  it('uma categoria desconhecida desenha o ícone genérico e avisa na consola', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const { container } = render(<IconeDaCategoria slug="categoria-nova" />)

    expect(container.querySelectorAll('path')).toHaveLength(CAMINHOS_DO_ICONE_GENERICO.length)
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('categoria-nova'))
  })

  it('uma categoria conhecida não avisa', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(<IconeDaCategoria slug="pintura" />)

    expect(aviso).not.toHaveBeenCalled()
  })
})
