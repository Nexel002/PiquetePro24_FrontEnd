import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { aplicarMetadados } from './metadadosDaPagina'
import { enderecoCanonico, gerarSitemap, ORIGEM_DO_SITE, PAGINAS_PUBLICAS, paginaPublica, TITULO_POR_OMISSAO } from './paginasPublicas'

interface Reescrita {
  source: string
  destination: string
}

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { rewrites: Reescrita[] }
const indexHtml = readFileSync('index.html', 'utf8')

afterEach(() => {
  document.head.innerHTML = ''
  document.title = ''
})

describe('páginas públicas — conteúdo', () => {
  it('caminhos únicos, títulos ≤ 60 e descrições ≤ 155 caracteres', () => {
    const caminhos = PAGINAS_PUBLICAS.map((p) => p.caminho)
    expect(new Set(caminhos).size).toBe(caminhos.length)
    for (const pagina of PAGINAS_PUBLICAS) {
      expect(pagina.titulo.length).toBeLessThanOrEqual(60)
      expect(pagina.descricao.length).toBeLessThanOrEqual(155)
    }
  })

  it('o domínio oficial é o www, em https', () => {
    expect(ORIGEM_DO_SITE).toBe('https://www.piquetepro24.co.mz')
    expect(enderecoCanonico('/')).toBe('https://www.piquetepro24.co.mz/')
    expect(enderecoCanonico('/termos')).toBe('https://www.piquetepro24.co.mz/termos')
  })

  it('reconhece a página com ou sem barra no fim, e nada mais', () => {
    expect(paginaPublica('/privacidade/')?.caminho).toBe('/privacidade')
    expect(paginaPublica('/perfil')).toBeUndefined()
    expect(paginaPublica('/termos/outra')).toBeUndefined()
  })
})

describe('páginas públicas — vercel.json', () => {
  it('cada página pública (menos a raiz, que é o próprio index.html) é servida pelo index.html', () => {
    const paraOIndex = vercel.rewrites.filter((r) => r.destination === '/index.html').map((r) => r.source)
    const esperadas = PAGINAS_PUBLICAS.filter((p) => p.caminho !== '/').map((p) => p.caminho)

    expect(paraOIndex.sort()).toEqual(esperadas.sort())
  })

  it('tudo o resto cai no app.html (com noindex), e essa regra é a última', () => {
    const ultima = vercel.rewrites.at(-1)
    expect(ultima).toEqual({ source: '/(.*)', destination: '/app.html' })
  })
})

describe('páginas públicas — index.html', () => {
  it('a descrição estática é a da página inicial (é a que o WhatsApp e os rastreadores sem JavaScript lêem)', () => {
    const inicio = paginaPublica('/')!
    expect(indexHtml).toContain(`<meta name="description" content="${inicio.descricao}" />`)
    expect(indexHtml).toContain(`<meta property="og:description" content="${inicio.descricao}" />`)
    expect(indexHtml).toContain(`<title>${inicio.titulo}</title>`)
  })

  it('traz o robots que o build troca por noindex no app.html (vite.config.ts)', () => {
    expect(indexHtml).toContain('<meta name="robots" content="index, follow" />')
  })

  it('não tem canonical fixo (seria o mesmo em /termos e /privacidade)', () => {
    expect(indexHtml).not.toContain('rel="canonical"')
  })
})

describe('sitemap', () => {
  it('lista o endereço canónico de cada página pública', () => {
    const xml = gerarSitemap()

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    for (const pagina of PAGINAS_PUBLICAS) expect(xml).toContain(`<loc>${enderecoCanonico(pagina.caminho)}</loc>`)
    expect(xml.match(/<url>/g)).toHaveLength(PAGINAS_PUBLICAS.length)
  })
})

describe('aplicarMetadados', () => {
  it('numa página pública: título, descrição, index e canonical dela', () => {
    aplicarMetadados('/privacidade')
    const pagina = paginaPublica('/privacidade')!

    expect(document.title).toBe(pagina.titulo)
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(pagina.descricao)
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe('index, follow')
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe('https://www.piquetepro24.co.mz/privacidade')
  })

  it('numa rota privada: noindex, título por omissão e sem canonical', () => {
    aplicarMetadados('/termos')
    aplicarMetadados('/os-meus-pedidos')

    expect(document.title).toBe(TITULO_POR_OMISSAO)
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe('noindex')
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  })

  it('não duplica as etiquetas ao mudar de página várias vezes', () => {
    aplicarMetadados('/')
    aplicarMetadados('/termos')
    aplicarMetadados('/privacidade')

    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.head.querySelectorAll('meta[name="robots"]')).toHaveLength(1)
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
  })
})
