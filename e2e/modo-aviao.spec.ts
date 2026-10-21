import { expect, test } from '@playwright/test'
import { CATEGORIAS, CLIENTE, entrarComo, profissionais, simularApi } from './ajudas'

const TRES = profissionais(['Carlos Macamo', 'Joana Sitoe', 'Bento Cossa'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// Fase 5 do plano: criar um pedido sem ligação, vê-lo guardado e enviado sozinho quando a rede
// volta, sem duplicar. O unitário (useCreateServiceRequest.test.tsx) cobre a lógica; aqui vê-se
// no browser real, com IndexedDB, eventos online/offline e o processador da fila.
test('modo avião: o pedido fica guardado e é enviado, uma só vez, quando a ligação volta', async ({ page, context }) => {
  await entrarComo(page, CLIENTE.id)
  const criados: unknown[] = []
  const api = await simularApi(page, {
    'GET /profile': () => ({ data: CLIENTE }),
    'GET /service-categories': () => ({ data: CATEGORIAS }),
    'GET /professionals/search': () => ({ data: TRES }),
    'GET /clients/me/locations': () => ({ data: [] }),
    'GET /service_requests': () => ({ data: criados }),
    'POST /service_requests': (pedido) => {
      const corpo = pedido.postDataJSON()
      const criado = { id: 'pedido-1', status: 'OPEN', client_id: CLIENTE.id, ...corpo }
      criados.push(criado)
      return { status: 201, data: criado }
    },
  })

  // Cada ecrã é um chunk carregado a pedido (code-splitting). Em produção o service worker
  // guarda-os todos em precache; aqui está bloqueado, por isso visita-se primeiro o ecrã de
  // destino (carrega o chunk) e passa-se à pesquisa SEM recarregar a página. Sem isto, o
  // browser ficava em chrome-error:// ao tentar abrir um chunk offline — um artefacto do teste.
  await page.goto('/os-meus-pedidos')
  await expect(page.getByRole('heading', { name: 'Os meus pedidos' })).toBeVisible()
  await page.evaluate(() => {
    window.history.pushState({}, '', '/profissionais?category=canalizacao')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  for (const nome of ['Carlos Macamo', 'Joana Sitoe', 'Bento Cossa']) {
    await page.getByRole('checkbox', { name: `Escolher ${nome}` }).check()
  }
  await page.getByRole('button', { name: 'Pedir a 3' }).click()
  await page.getByLabel('O que precisas?').fill('Torneira a pingar')

  // Modo avião antes de enviar.
  api.rede.cortada = true
  await context.setOffline(true)
  await expect(page.getByText(/Sem ligação à internet/)).toBeVisible()
  await page.getByRole('button', { name: 'Enviar a 3 profissionais' }).click()

  await expect(page).toHaveURL(/\/os-meus-pedidos$/)
  await expect(page.getByRole('region', { name: 'Pedidos por enviar' })).toContainText('Torneira a pingar')
  expect(api.chamadasA('POST /service_requests')).toHaveLength(0)

  // A ligação volta: a fila envia sozinha.
  api.rede.cortada = false
  await context.setOffline(false)

  await expect(page.getByText('O pedido guardado foi enviado.')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('region', { name: 'Pedidos por enviar' })).toHaveCount(0)

  const envios = api.chamadasA('POST /service_requests')
  expect(envios).toHaveLength(1)
  expect(envios[0].headers()['idempotency-key']).toMatch(UUID)
  expect(envios[0].postDataJSON()).toMatchObject({ title: 'Torneira a pingar', professional_ids: ['pro-1', 'pro-2', 'pro-3'] })
})
