import { defineConfig, devices } from '@playwright/test'

// E2E do frontend contra o BUILD real (vite preview), com o backend e o Supabase simulados no
// próprio browser (page.route). Não precisa de staging: valida a jornada do ponto de vista da UI
// (rotas, guardas, formulários, fila offline); a integração real com o backend continua a ser da
// Fase 7 e exige o ambiente de staging.
//
// Os endereços são de propósito domínios que não existem (`.test`, reservado pela RFC 6761): se
// alguma chamada escapar aos mocks, falha de forma visível em vez de bater num servidor a sério.
const PORTA = 4173
const API = 'http://api.test'
const SUPABASE = 'http://supabase.test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORTA}`,
    // O service worker do build intercepta pedidos e escapa ao page.route; sem ele os mocks
    // valem para tudo. O aviso de nova versão e o precache têm testes unitários próprios.
    serviceWorkers: 'block',
    locale: 'pt-PT',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'telemovel',
      // Pixel 5 porque o público-alvo usa o telemóvel; o desktop é o caso secundário.
      // E2E_BROWSER=msedge|chrome usa o browser já instalado (evita descarregar o Chromium
      // do Playwright numa máquina de desenvolvimento); no CI usa-se o Chromium dele.
      use: { ...devices['Pixel 5'], channel: process.env.E2E_BROWSER || undefined },
    },
  ],
  webServer: {
    // Pasta própria (dist-e2e): não pisa o `dist` de quem corre `npm run build` à mão. Sem `tsc -b`
    // — o tipo-checking já corre no `npm run build` do CI.
    command: `npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      VITE_API_URL: API,
      VITE_SUPABASE_URL: SUPABASE,
      VITE_SUPABASE_ANON_KEY: 'chave-publica-de-e2e',
    },
  },
})
