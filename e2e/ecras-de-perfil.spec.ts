import { expect, test, type Page } from '@playwright/test'
import { CATEGORIAS, CLIENTE, entrarComo, simularApi } from './ajudas'

// Layout dos ecrãs de perfil (/perfil e /profissionais/:id) em telemóvel, tablet e desktop. O que
// os testes de componente não vêem — geometria, sticky, que título está visível — só um browser
// vê, porque o Tailwind não corre no jsdom. SHOTS_DIR guarda capturas para inspecção manual.
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

const CATALOGO = {
  id: 'pro-1',
  full_name: 'Carlos Sitoe',
  avatar_url: null,
  professional_type: 'SINGULAR',
  bio: 'Canalizador há dez anos, com trabalho em casas e pequenos prédios de Maputo.',
  identity_verified: true,
  services: [{ id: 'cat-1', slug: 'canalizacao', name: 'Canalização' }],
  projects: [1, 2, 3].map((n) => ({
    id: `proj-${n}`,
    category: { id: 'cat-1', name: 'Canalização' },
    description: `Trabalho ${n}`,
    created_at: '2026-10-01T10:00:00.000Z',
    photos: [{ id: `foto-${n}`, photo_url: PIXEL, position: 0, created_at: '2026-10-01T10:00:00.000Z' }],
  })),
  rating_avg: 4.5,
  rating_count: 2,
  reviews: [
    { id: 'r1', service_request_id: 's1', professional_id: 'pro-1', client_id: 'c1', client_full_name: 'Ana', rating: 5, comment: 'Excelente.', created_at: '2026-10-02T10:00:00.000Z' },
    { id: 'r2', service_request_id: 's2', professional_id: 'pro-1', client_id: 'c2', client_full_name: 'Rui', rating: 4, comment: null, created_at: '2026-10-03T10:00:00.000Z' },
  ],
}

const TAMANHOS = [
  { nome: 'telemovel', largura: 390, altura: 844 },
  { nome: 'tablet', largura: 768, altura: 1024 },
  { nome: 'desktop', largura: 1280, altura: 800 },
] as const

async function preparar(page: Page) {
  await entrarComo(page, CLIENTE.id)
  await simularApi(page, {
    'GET /profile': () => ({ data: { ...CLIENTE, avatar_url: null, bio: null, professional_type: null, created_at: '2026-01-15T10:00:00.000Z' } }),
    'GET /service-categories': () => ({ data: CATEGORIAS }),
    'GET /service_requests': () => ({ data: [] }),
    'GET /professionals/pro-1/catalog': () => ({ data: CATALOGO }),
  })
}

async function capturar(page: Page, nome: string) {
  const pasta = process.env.SHOTS_DIR
  if (pasta) await page.screenshot({ path: `${pasta}/${nome}.png`, fullPage: true })
}

for (const { nome, largura, altura } of TAMANHOS) {
  test.describe(`${nome} (${largura}px)`, () => {
    test.use({ viewport: { width: largura, height: altura }, isMobile: false, hasTouch: false })

    for (const [rota, titulo, esperado] of [
      ['/perfil', 'Perfil', 'Ana Machava'],
      ['/profissionais/pro-1', 'Catálogo', 'Carlos Sitoe'],
    ] as const) {
      test(`${titulo}: um só título visível, foto sem margens e nome no sítio certo`, async ({ page }) => {
        await preparar(page)
        await page.goto(rota)

        const h1 = page.getByRole('heading', { level: 1 })
        // O primeiro carregamento (build frio, máquina ocupada) pode passar dos 5 s por omissão.
        await expect(h1).toHaveText(esperado, { timeout: 30_000 })
        await expect(h1).toHaveCount(1)
        await expect(h1).toBeVisible()

        const aside = page.locator('aside').first()
        const caixaDaFoto = await aside.locator('> div').first().boundingBox()
        const caixaDoNome = await h1.boundingBox()
        expect(caixaDaFoto).not.toBeNull()
        expect(caixaDoNome).not.toBeNull()

        if (largura < 1024) {
          // Telemóvel e tablet: foto de ponta a ponta e o nome por baixo dela.
          expect(caixaDaFoto!.x).toBe(0)
          expect(Math.round(caixaDaFoto!.width)).toBe(largura)
          expect(caixaDoNome!.y).toBeGreaterThanOrEqual(caixaDaFoto!.y + caixaDaFoto!.height - 1)
        } else {
          // Desktop: foto na metade esquerda, nome sobre ela.
          expect(caixaDaFoto!.x).toBe(0)
          expect(Math.round(caixaDaFoto!.width)).toBe(largura / 2)
          expect(caixaDoNome!.x).toBeLessThan(largura / 2)
          expect(caixaDoNome!.y).toBeGreaterThanOrEqual(caixaDaFoto!.y)
          expect(caixaDoNome!.y + caixaDoNome!.height).toBeLessThanOrEqual(caixaDaFoto!.y + caixaDaFoto!.height)
        }

        // Nada transborda para os lados.
        const transborda = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
        expect(transborda).toBe(false)

        await capturar(page, `${titulo.toLowerCase()}-${nome}`)
      })
    }

    test('Catálogo: selo «Identidade verificada», pedir serviço e trabalhos', async ({ page }) => {
      await preparar(page)
      await page.goto('/profissionais/pro-1')

      await expect(page.getByText('Identidade verificada')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Pedir Canalização' })).toHaveAttribute('href', '/profissionais?category=canalizacao')
      await expect(page.getByRole('heading', { name: 'Trabalhos realizados' })).toBeVisible()
    })

    if (largura >= 1024) {
      test('desktop: a página rola inteira e a foto fica presa ao topo', async ({ page }) => {
        await preparar(page)
        await page.goto('/profissionais/pro-1')
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

        const rolaPelaPagina = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)
        expect(rolaPelaPagina).toBe(true)

        await page.mouse.move(200, 400) // sobre a foto: a roda tem de rolar a página
        await page.mouse.wheel(0, 600)
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

        const topoDaFoto = await page.locator('aside').first().evaluate((el) => el.getBoundingClientRect().top)
        expect(Math.round(topoDaFoto)).toBe(0)
      })
    }
  })
}
