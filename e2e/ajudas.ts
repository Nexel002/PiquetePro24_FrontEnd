import { readFileSync } from 'node:fs'
import type { Page, Request, Route } from '@playwright/test'

// Tem de coincidir com o `webServer.env` do playwright.config.ts: o build é feito com estes
// endereços, e a chave do armazenamento da sessão do Supabase deriva do anfitrião.
export const API = 'http://api.test'
const CHAVE_DA_SESSAO = 'sb-supabase-auth-token'

// Com a sessão gravada, src/lib/novidades.ts conclui que «já usava a app» e abre o aviso «O que há
// de novo» por cima da página — que intercepta os cliques. Os testes entram como quem já viu a
// versão do build; o aviso tem os seus próprios testes unitários.
const CHAVE_DA_VERSAO_VISTA = 'piquete:versao-vista'
const VERSAO_DO_BUILD = (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version

export interface RespostaSimulada {
  status?: number
  /** Vai para `data` do envelope `{ success, data }`. */
  data?: unknown
  /** Vai para `error` do envelope; usar com um `status` 4xx/5xx. */
  error?: string
}

export type ManipuladorDeRota = (pedido: Request) => RespostaSimulada | Promise<RespostaSimulada>

export interface PerfilSimulado {
  id: string
  full_name: string
  phone: string | null
  role: 'CLIENT' | 'PROFESSIONAL' | 'ADMIN'
  province: string | null
  district: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
}

export const CLIENTE: PerfilSimulado = {
  id: 'cliente-1',
  full_name: 'Ana Machava',
  phone: '+258840000000',
  role: 'CLIENT',
  province: 'Maputo Cidade',
  district: 'KaMpfumo',
  neighborhood: 'Polana',
  latitude: null,
  longitude: null,
}

function base64Url(valor: object): string {
  return Buffer.from(JSON.stringify(valor)).toString('base64url')
}

/**
 * Entra como `userId` sem passar pelo Supabase: grava no localStorage a sessão que o supabase-js
 * lê ao arrancar. Validade de uma hora, por isso não tenta renová-la (nem chama a rede).
 * Corre antes de qualquer script da página.
 */
export async function entrarComo(page: Page, userId: string) {
  const expiraEm = Math.floor(Date.now() / 1000) + 3600
  const sessao = {
    access_token: `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ sub: userId, exp: expiraEm, role: 'authenticated' })}.assinatura-de-e2e`,
    refresh_token: 'refresh-de-e2e',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiraEm,
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'ana@exemplo.test',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
    },
  }
  await page.addInitScript(
    ([chave, valor, chaveDaVersao, versao]) => {
      window.localStorage.setItem(chave, valor)
      window.localStorage.setItem(chaveDaVersao, versao)
    },
    [CHAVE_DA_SESSAO, JSON.stringify(sessao), CHAVE_DA_VERSAO_VISTA, VERSAO_DO_BUILD] as const,
  )
}

const CABECALHOS_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
}

/**
 * Simula o backend. `rotas` mapeia "METODO /caminho" (sem query) para a resposta; um pedido
 * sem rota registada responde 501 e fica em `naoSimulados`, para o teste poder falhar em vez
 * de ficar à espera de uma resposta que nunca vem.
 */
export async function simularApi(page: Page, rotas: Record<string, ManipuladorDeRota>) {
  const naoSimulados: string[] = []
  const chamadas: Array<{ chave: string; pedido: Request }> = []
  const rede = { cortada: false }

  await page.route(`${API}/**`, async (rota: Route) => {
    const pedido = rota.request()
    // Um pedido servido por page.route não passa pela rede emulada do browser: para simular
    // «modo avião» é preciso falhar aqui, como falharia o DNS ou a ligação a sério.
    if (rede.cortada) {
      await rota.abort('internetdisconnected')
      return
    }
    if (pedido.method() === 'OPTIONS') {
      await rota.fulfill({ status: 204, headers: CABECALHOS_CORS })
      return
    }

    const chave = `${pedido.method()} ${new URL(pedido.url()).pathname}`
    const manipulador = rotas[chave]
    if (!manipulador) {
      naoSimulados.push(chave)
      await rota.fulfill({
        status: 501,
        headers: CABECALHOS_CORS,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: `E2E: rota não simulada (${chave})` }),
      })
      return
    }

    chamadas.push({ chave, pedido })
    const resposta = await manipulador(pedido)
    const status = resposta.status ?? 200
    await rota.fulfill({
      status,
      headers: CABECALHOS_CORS,
      contentType: 'application/json',
      body: JSON.stringify(status < 400 ? { success: true, data: resposta.data } : { success: false, error: resposta.error }),
    })
  })

  return {
    naoSimulados,
    /** Corta (ou repõe) a ligação ao backend. Juntar `context.setOffline` para o browser saber que está offline. */
    rede,
    /** Pedidos que chegaram à rota "METODO /caminho", pela ordem. */
    chamadasA: (chave: string) => chamadas.filter((chamada) => chamada.chave === chave).map((chamada) => chamada.pedido),
  }
}

export function profissionais(nomes: string[]) {
  return nomes.map((nome, i) => ({
    id: `pro-${i + 1}`,
    full_name: nome,
    professional_type: 'SINGULAR',
    avatar_url: null,
    services: [{ id: 'cat-1', slug: 'canalizacao', name: 'Canalização' }],
    rating_avg: 4.5,
    rating_count: 10,
    distance_m: null,
    is_nearby: false,
  }))
}

export const CATEGORIAS = [
  { id: 'cat-1', slug: 'canalizacao', name: 'Canalização' },
  { id: 'cat-2', slug: 'pintura', name: 'Pintura' },
]
