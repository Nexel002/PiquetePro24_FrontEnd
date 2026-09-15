import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PiquetePro24',
        short_name: 'PiquetePro24',
        description: 'Marketplace de Serviços Locais para Moçambique',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        // TODO(design): favicon.svg é placeholder do template Vite. Substituir por
        // ícones PWA reais (192x192 e 512x512 PNG, mais maskable) antes da Fase 6.
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache' },
          },
        ],
      },
    }),
  ],
})
