import { expect, test } from '@playwright/test'
import { CATEGORIAS, CLIENTE, entrarComo, profissionais, simularApi } from './ajudas'

const TRES = profissionais(['Carlos Macamo', 'Joana Sitoe', 'Bento Cossa'])

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function pedidoCriado(corpo: { title: string; professional_ids?: string[] }) {
  return {
    id: 'pedido-1',
    client_id: CLIENTE.id,
    professional_id: null,
    title: corpo.title,
    description: null,
    status: 'OPEN',
    province: 'Maputo Cidade',
    district: 'KaMpfumo',
    neighborhood: 'Polana',
    created_at: '2026-10-12T10:00:00.000Z',
    assigned_at: null,
    completed_at: null,
    category_id: 'cat-1',
    invited_count: corpo.professional_ids?.length ?? 0,
    proposal_count: 0,
    has_review: false,
  }
}

test.describe('cliente: da pesquisa ao pedido enviado', () => {
  test('escolhe 3 profissionais, descreve o pedido e vê-o em "Os meus pedidos"', async ({ page }) => {
    await entrarComo(page, CLIENTE.id)
    const criados: Array<ReturnType<typeof pedidoCriado>> = []
    const api = await simularApi(page, {
      'GET /profile': () => ({ data: CLIENTE }),
      'GET /service-categories': () => ({ data: CATEGORIAS }),
      'GET /professionals/search': () => ({ data: TRES }),
      'GET /clients/me/locations': () => ({ data: [] }),
      'POST /service_requests': async (pedido) => {
        const corpo = pedido.postDataJSON()
        const criado = pedidoCriado(corpo)
        criados.push(criado)
        return { status: 201, data: criado }
      },
      'GET /service_requests': () => ({ data: criados }),
    })

    await page.goto('/profissionais?category=canalizacao')
    await expect(page.getByText('Carlos Macamo')).toBeVisible()

    // Sem 3 escolhidos o botão não deixa avançar.
    await expect(page.getByRole('button', { name: 'Pedir a 3' })).toBeDisabled()
    for (const nome of ['Carlos Macamo', 'Joana Sitoe', 'Bento Cossa']) {
      await page.getByRole('checkbox', { name: `Escolher ${nome}` }).check()
    }
    await expect(page.getByRole('button', { name: 'Pedir a 3' })).toBeEnabled()
    await page.getByRole('button', { name: 'Pedir a 3' }).click()

    await expect(page).toHaveURL(/\/novo-pedido$/)
    await expect(page.getByText(/Polana, KaMpfumo, Maputo Cidade/)).toBeVisible()
    await page.getByLabel('O que precisas?').fill('Torneira a pingar')
    await page.getByRole('button', { name: 'Enviar a 3 profissionais' }).click()

    await expect(page).toHaveURL(/\/os-meus-pedidos$/)
    await expect(page.getByText('Torneira a pingar')).toBeVisible()
    await expect(page.getByText(/Enviado a 3 profissionais/)).toBeVisible()

    // O que o backend recebeu: serviço, os 3 convidados, o local do perfil e a chave de idempotência.
    const [envio] = api.chamadasA('POST /service_requests')
    expect(envio.postDataJSON()).toMatchObject({
      title: 'Torneira a pingar',
      category_id: 'cat-1',
      professional_ids: ['pro-1', 'pro-2', 'pro-3'],
      location: { province: 'Maputo Cidade', district: 'KaMpfumo', neighborhood: 'Polana' },
    })
    expect(envio.headers()['idempotency-key']).toMatch(UUID)
    expect(api.naoSimulados).toEqual([])
  })

  test('abrir /novo-pedido directamente (sem escolha) volta à pesquisa', async ({ page }) => {
    await entrarComo(page, CLIENTE.id)
    await simularApi(page, {
      'GET /profile': () => ({ data: CLIENTE }),
      'GET /service-categories': () => ({ data: CATEGORIAS }),
      'GET /professionals/search': () => ({ data: TRES }),
      'GET /clients/me/locations': () => ({ data: [] }),
    })

    await page.goto('/novo-pedido')

    await expect(page).toHaveURL(/\/profissionais$/)
  })

  test('o servidor recusa o pedido: o cliente vê o motivo e continua no formulário', async ({ page }) => {
    await entrarComo(page, CLIENTE.id)
    await simularApi(page, {
      'GET /profile': () => ({ data: CLIENTE }),
      'GET /service-categories': () => ({ data: CATEGORIAS }),
      'GET /professionals/search': () => ({ data: TRES }),
      'GET /clients/me/locations': () => ({ data: [] }),
      'POST /service_requests': () => ({ status: 429, error: 'Demasiados pedidos. Tenta mais tarde.' }),
    })

    await page.goto('/profissionais?category=canalizacao')
    for (const nome of ['Carlos Macamo', 'Joana Sitoe', 'Bento Cossa']) {
      await page.getByRole('checkbox', { name: `Escolher ${nome}` }).check()
    }
    await page.getByRole('button', { name: 'Pedir a 3' }).click()
    await page.getByLabel('O que precisas?').fill('Torneira a pingar')
    await page.getByRole('button', { name: 'Enviar a 3 profissionais' }).click()

    await expect(page.getByText('Demasiados pedidos. Tenta mais tarde.')).toBeVisible()
    await expect(page).toHaveURL(/\/novo-pedido$/)
  })
})

test.describe('cliente: pesquisa com problemas', () => {
  test('erro do servidor mostra mensagem e "Tentar de novo" recupera', async ({ page }) => {
    await entrarComo(page, CLIENTE.id)
    let falhar = true
    await simularApi(page, {
      'GET /profile': () => ({ data: CLIENTE }),
      'GET /service-categories': () => ({ data: CATEGORIAS }),
      'GET /professionals/search': () => (falhar ? { status: 500, error: 'Erro interno.' } : { data: TRES }),
    })

    await page.goto('/profissionais?category=canalizacao')
    // O TanStack Query repete 3 vezes com espera antes de dar o erro; basta esperar por ele.
    const tentarDeNovo = page.getByRole('button', { name: 'Tentar de novo' })
    await expect(tentarDeNovo).toBeVisible({ timeout: 20_000 })

    falhar = false
    await tentarDeNovo.click()

    await expect(page.getByText('Carlos Macamo')).toBeVisible()
  })

  test('pesquisa sem resultados mostra o estado vazio, não um erro', async ({ page }) => {
    await entrarComo(page, CLIENTE.id)
    await simularApi(page, {
      'GET /profile': () => ({ data: CLIENTE }),
      'GET /service-categories': () => ({ data: CATEGORIAS }),
      'GET /professionals/search': () => ({ data: [] }),
    })

    await page.goto('/profissionais?q=astronauta')

    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toHaveCount(0)
    await expect(page.getByText(/Nenhum/i).first()).toBeVisible()
  })
})
