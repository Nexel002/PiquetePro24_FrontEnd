import { expect, test } from '@playwright/test'
import { CATEGORIAS, CLIENTE, entrarComo, simularApi } from './ajudas'

test.describe('acesso e onboarding', () => {
  test('sem sessão, uma rota protegida leva ao login e guarda o destino', async ({ page }) => {
    await page.goto('/profissionais')

    await expect(page).toHaveURL(/\/entrar\?next=%2Fprofissionais/)
  })

  test('as páginas públicas abrem sem sessão', async ({ page }) => {
    await page.goto('/termos')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('com sessão mas sem telefone, o onboarding leva ao passo do telefone', async ({ page }) => {
    await entrarComo(page, CLIENTE.id)
    await simularApi(page, {
      'GET /profile': () => ({ data: { ...CLIENTE, phone: null } }),
      'GET /service-categories': () => ({ data: CATEGORIAS }),
    })

    await page.goto('/profissionais')

    await expect(page).toHaveURL(/\/completar-perfil\/telefone$/)
    await expect(page.getByLabel('Telefone')).toBeVisible()
  })

  test('com telefone mas sem localização, vai para o passo da localização', async ({ page }) => {
    await entrarComo(page, CLIENTE.id)
    await simularApi(page, {
      'GET /profile': () => ({ data: { ...CLIENTE, province: null, district: null, neighborhood: null } }),
      'GET /service-categories': () => ({ data: CATEGORIAS }),
    })

    await page.goto('/os-meus-pedidos')

    await expect(page).toHaveURL(/\/completar-perfil\/localizacao$/)
  })

  test('o perfil não carrega: mensagem compreensível em vez de ecrã em branco', async ({ page }) => {
    await entrarComo(page, CLIENTE.id)
    await simularApi(page, {
      'GET /profile': () => ({ status: 500, error: 'Erro interno.' }),
    })

    await page.goto('/perfil')

    await expect(page.getByText(/Não foi possível carregar o teu perfil/)).toBeVisible({ timeout: 20_000 })
  })
})
