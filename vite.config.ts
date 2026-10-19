import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { montarFicheiro, validarHistorico } from './src/lib/versoes.ts'

const versao = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version

// Gera o /novidades.json (o texto do aviso «Nova versão disponível») a partir de
// src/data/novidadesPorVersao.json. No build, uma versão do package.json sem entrada falha o build:
// antes o ficheiro era editado à mão e esquecia-se, e o aviso mostrava novidades e uma data de uma
// versão antiga. Em desenvolvimento só avisa, para não impedir de trabalhar a meio de uma versão.
function novidadesDaVersao(): Plugin {
  const corpo = () => {
    const historico = JSON.parse(readFileSync('src/data/novidadesPorVersao.json', 'utf8')) as unknown
    return JSON.stringify(montarFicheiro(validarHistorico(historico, versao), versao), null, 2)
  }
  let emBuild = false
  return {
    name: 'novidades-da-versao',
    configResolved(config) {
      emBuild = config.command === 'build'
    },
    buildStart() {
      if (!emBuild) return
      this.emitFile({ type: 'asset', fileName: 'novidades.json', source: corpo() })
    },
    configureServer(servidor) {
      servidor.middlewares.use('/novidades.json', (_pedido, resposta) => {
        try {
          resposta.setHeader('Content-Type', 'application/json')
          resposta.end(corpo())
        } catch (erro) {
          console.warn(`[novidades] ${(erro as Error).message}`)
          resposta.statusCode = 404
          resposta.end()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Versão do package.json, lida por lib/novidades.ts para saber o que a app instalada já tem.
  define: { __APP_VERSION__: JSON.stringify(versao) },
  plugins: [
    react(),
    novidadesDaVersao(),
    VitePWA({
      // 'prompt' e não 'autoUpdate': a versão nova só é activada quando o utilizador aceita o
      // aviso (ver src/lib/pwaUpdate.ts). Com 'autoUpdate' e sem recarregar, quem deixava a
      // app aberta ficava na versão antiga indefinidamente.
      registerType: 'prompt',
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
        // woff2 acrescentado ao padrão por omissão (js/css/html): sem isto as fontes
        // de @fontsource não entram no precache e, offline, a UI perde a tipografia.
        globPatterns: ['**/*.{js,css,html,woff2}'],
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
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas em ficheiros próprios, separadas do código da app. Não encolhem o primeiro
        // download; evitam repeti-lo: o código da app muda a cada deploy e as bibliotecas quase nunca,
        // por isso, com o hash no nome, o telemóvel (e o precache do service worker) só volta a
        // descarregar o que mudou. Em 3G, cada actualização deixa de custar ~150 KB de bibliotecas.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          const pacote = id.split('node_modules/').pop()?.split('/')
          const nome = pacote?.[0]?.startsWith('@') ? `${pacote[0]}/${pacote[1]}` : pacote?.[0]
          if (nome?.startsWith('@supabase/') || nome === 'iceberg-js') return 'vendor-supabase'
          if (nome && ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'].includes(nome)) return 'vendor-react'
          return undefined
        },
      },
    },
  },
})
