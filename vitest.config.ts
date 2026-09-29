import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Separado de vite.config.ts de propósito: os testes não precisam do vite-plugin-pwa
// (gera o service worker e o manifest a cada arranque, só atrasaria a suite).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // src/lib/supabase.ts cria o cliente no import e o createClient rebenta sem URL.
    // Valores falsos chegam: os testes simulam os hooks e nunca fazem pedidos de rede.
    env: {
      VITE_API_URL: 'http://localhost:3050',
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'chave-de-teste',
    },
  },
})
