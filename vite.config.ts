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
        theme_color: '#031F4B',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        // Ícones quadrados com só o escudo do logótipo: o pwa-icon.png é horizontal
        // (1024x343) e, declarado como 192/512, o Chrome rejeita-o e a PWA deixa de ser
        // instalável. O maskable tem o escudo dentro da zona segura (80%) sobre fundo opaco.
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
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
