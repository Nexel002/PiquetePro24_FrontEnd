import { expect, test } from '@playwright/test'
import { CATEGORIAS, CLIENTE, entrarComo, simularApi } from './ajudas'

const TRABALHO = {
  id: 'w1',
  title: 'Casa de banho completa',
  professional_id: 'pro-1',
  professional_name: 'Carlos Macamo',
  professional_avatar: null,
  service_slug: 'canalizacao',
  service_name: 'Canalização',
  location: 'Maputo Cidade · KaMpfumo',
  rating_avg: 4.5,
  rating_count: 12,
  completed_jobs_count: 7,
  badge: 'Verificado',
  // Dados em vez de rede: o teste não depende de nenhum servidor de imagens.
  image_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
}

test.describe('Home: trabalhos em destaque', () => {
  test('visitante sem sessão: convida a entrar e não chama a API de trabalhos', async ({ page }) => {
    const api = await simularApi(page, {})

    await page.goto('/')

    await expect(page.getByText('Entra para ver trabalhos de profissionais.')).toBeVisible()
    expect(api.chamadasA('GET /portfolio/featured')).toHaveLength(0)
  })

  test('cliente com sessão: vê os trabalhos reais devolvidos pela API', async ({ page }) => {
    await entrarComo(page, CLIENTE.id)
    await simularApi(page, {
      'GET /profile': () => ({ data: CLIENTE }),
      'GET /service-categories': () => ({ data: CATEGORIAS }),
      'GET /portfolio/featured': () => ({ data: [TRABALHO] }),
    })

    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Casa de banho completa' }).first()).toBeVisible()
    await expect(page.getByText('Carlos Macamo').first()).toBeVisible()
    await expect(page.getByText('Verificado').first()).toBeVisible()
    await expect(page.getByText('Entra para ver trabalhos')).toHaveCount(0)
  })

  test('erro no servidor: mensagem própria (não «sem trabalhos») e «Tentar de novo» recupera', async ({ page }) => {
    await entrarComo(page, CLIENTE.id)
    let falhar = true
    await simularApi(page, {
      'GET /profile': () => ({ data: CLIENTE }),
      'GET /service-categories': () => ({ data: CATEGORIAS }),
      'GET /portfolio/featured': () => (falhar ? { status: 500, error: 'Erro interno.' } : { data: [TRABALHO] }),
    })

    await page.goto('/')
    const tentarDeNovo = page.getByRole('button', { name: 'Tentar de novo' })
    await expect(tentarDeNovo).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Ainda não há trabalhos publicados.')).toHaveCount(0)

    falhar = false
    await tentarDeNovo.click()

    await expect(page.getByRole('link', { name: 'Casa de banho completa' }).first()).toBeVisible()
  })

  test('profissional com convites por responder: o sino mostra quantos', async ({ page }) => {
    await entrarComo(page, 'pro-1')
    const convite = (id: string, status: string, pedido = 'OPEN') => ({
      service_request_id: id,
      status,
      proposal_price: null,
      proposal_message: null,
      responded_at: null,
      created_at: '2026-10-01T10:00:00.000Z',
      request: { title: 'Torneira', description: null, status: pedido, province: 'Maputo Cidade', district: null, neighborhood: null, created_at: '2026-10-01T10:00:00.000Z' },
    })
    await simularApi(page, {
      'GET /profile': () => ({ data: { ...CLIENTE, id: 'pro-1', role: 'PROFESSIONAL' } }),
      'GET /service-categories': () => ({ data: CATEGORIAS }),
      'GET /portfolio/featured': () => ({ data: [] }),
      'GET /service_requests/invitations': () => ({
        data: {
          eligibility: { kyc_approved: true, subscription_active: true, eligible: true },
          // 2 por responder; os outros dois já têm desfecho ou o pedido fechou.
          invitations: [convite('a', 'INVITED'), convite('b', 'INVITED'), convite('c', 'PROPOSED'), convite('d', 'INVITED', 'CANCELLED')],
        },
      }),
    })

    await page.goto('/')

    await expect(page.getByRole('button', { name: 'Notificações, 2 convites por responder' })).toBeVisible()
  })
})
