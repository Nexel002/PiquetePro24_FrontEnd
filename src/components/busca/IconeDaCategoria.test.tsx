import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CAMINHOS_DO_ICONE_GENERICO, CAMINHOS_DOS_ICONES } from './caminhosDosIcones'
import { IconeDaCategoria } from './IconeDaCategoria'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// Os slugs do seed das categorias de serviço (migration do backend), copiados à mão. O teste
// seguinte lê-os do repositório do backend, quando está ao lado, para apanhar categorias novas.
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

// O backend é um repositório à parte: só se compara quando está na pasta ao lado (como na
// máquina de desenvolvimento). No CI do frontend, sozinho, este teste fica de fora — o aviso em
// desenvolvimento cobre esse caso.
const PASTA_DAS_MIGRATIONS = join(process.cwd(), '..', 'PiquePro24_Backend', 'supabase', 'migrations')

describe.skipIf(!existsSync(PASTA_DAS_MIGRATIONS))('IconeDaCategoria — contra as migrations do backend', () => {
  it('toda a categoria inserida pelas migrations tem ícone próprio', () => {
    const slugs = readdirSync(PASTA_DAS_MIGRATIONS)
      .filter((nome) => nome.endsWith('.sql'))
      .flatMap((nome) => {
        const sql = readFileSync(join(PASTA_DAS_MIGRATIONS, nome), 'utf8')
        return [...sql.matchAll(/insert into service_categories[^;]*;/gi)].flatMap(([insercao]) =>
          [...insercao.matchAll(/\(\s*'([a-z0-9-]+)'\s*,\s*'/g)].map((m) => m[1]),
        )
      })

    expect(slugs.length).toBeGreaterThan(0)
    const semIcone = slugs.filter((slug) => !CAMINHOS_DOS_ICONES[slug])
    expect(semIcone).toEqual([])
  })
})
