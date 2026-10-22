import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { gerarSitemap } from './src/lib/paginasPublicas.ts'
import { ordenarDaMaisRecente, validarHistorico, type EntradaDeVersao } from './src/lib/versoes.ts'

const versao = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version

// Injecta no bundle (__NOVIDADES__, lido por lib/novidades.ts) o histórico de src/data/novidadesPorVersao.json,
// para o aviso «A app foi actualizada» dizer o que mudou. No build, uma versão do package.json sem
// entrada falha o build: antes o ficheiro era editado à mão e esquecia-se, e o aviso falava de uma
// versão antiga. Em desenvolvimento só avisa, para não impedir de trabalhar a meio de uma versão.
// Vai no bundle, e não num ficheiro lido da rede como antes, porque o aviso aparece DEPOIS de
// actualizar (Fase 37): a versão que corre é a nova e conhece as suas próprias novidades.
function novidadesDaVersao(): Plugin {
  return {
    name: 'novidades-da-versao',
    config(_config, { command }) {
      const historico = JSON.parse(readFileSync('src/data/novidadesPorVersao.json', 'utf8')) as unknown
      let entradas: EntradaDeVersao[] = []
      try {
        entradas = validarHistorico(historico, versao)
      } catch (erro) {
        if (command === 'build') throw erro
        console.warn(`[novidades] ${(erro as Error).message}`)
      }
      return { define: { __NOVIDADES__: JSON.stringify(ordenarDaMaisRecente(entradas)) } }
    },
  }
}

// Depois do build (TRD Adendo v1.70): grava o sitemap.xml a partir de src/lib/paginasPublicas.ts e
// uma cópia do index.html com `noindex`, o app.html, que a Vercel serve em todas as rotas que não
// são públicas (vercel.json). Sem isto, o Google recebia a mesma página inicial, indexável, em
// /perfil, /os-meus-pedidos ou num endereço que não existe (a app redirecciona-o para / com 200) e
// tratava-as como cópias da página inicial. Se o index.html deixar de ter o robots esperado, o
// build falha, em vez de publicar um app.html indexável sem ninguém dar por isso.
function indexacao(): Plugin {
  let pastaDeSaida = 'dist'
  return {
    name: 'indexacao',
    apply: 'build',
    configResolved(config) {
      pastaDeSaida = resolve(config.root, config.build.outDir)
    },
    writeBundle() {
      const robotsIndexavel = '<meta name="robots" content="index, follow" />'
      const index = readFileSync(join(pastaDeSaida, 'index.html'), 'utf8')
      if (!index.includes(robotsIndexavel)) throw new Error(`[indexacao] o index.html já não tem ${robotsIndexavel}`)
      writeFileSync(join(pastaDeSaida, 'app.html'), index.replace(robotsIndexavel, '<meta name="robots" content="noindex" />'))
      writeFileSync(join(pastaDeSaida, 'sitemap.xml'), gerarSitemap())
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
    indexacao(),
    VitePWA({
      // 'prompt' e não 'autoUpdate', mas sem aviso (Fase 37): com 'autoUpdate' o cliente do plugin
      // recarrega a página no instante em que o service worker novo se activa, e apagava um
      // formulário a meio. Com 'prompt' quem decide quando recarregar é src/lib/novaVersao.ts. O
      // service worker novo activa-se sozinho na mesma — skipWaiting/clientsClaim abaixo.
      registerType: 'prompt',
      manifest: {
        // `id` fixo: o Chrome identifica a app instalada por ele (por omissão, o start_url); mudar o
        // start_url no futuro deixa assim de criar uma «segunda» app no telemóvel de quem a instalou.
        id: '/',
        name: 'PiquetePro24',
        short_name: 'PiquetePro24',
        description: 'Encontra profissionais de serviços com identidade verificada perto de ti, em Moçambique.',
        lang: 'pt-MZ',
        dir: 'ltr',
        categories: ['business', 'lifestyle', 'utilities'],
        theme_color: '#031F4B',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
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
        // Sem isto, o service worker novo ficava «à espera» até o utilizador aceitar um aviso, e quem
        // não aceitava (ou nunca o via, como na PWA instalada no telemóvel) continuava com o
        // index.html e o JS antigos do precache — foi assim que o logótipo oficial não chegou a vários
        // telemóveis. Também liberta quem está hoje preso numa versão antiga, na próxima abertura.
        skipWaiting: true,
        clientsClaim: true,
        // Explícito (já é o valor por omissão): apaga o precache das versões anteriores ao activar.
        cleanupOutdatedCaches: true,
        // woff2 acrescentado ao padrão por omissão (js/css/html): sem isto as fontes
        // de @fontsource não entram no precache e, offline, a UI perde a tipografia.
        globPatterns: ['**/*.{js,css,html,woff2}'],
        // Sem runtimeCaching de propósito (TRD Adendo v1.71, item S3, decisão do utilizador). Até à
        // 0.4.0 havia uma regra 'NetworkFirst' para /api/*: nunca apanhou nada em produção (a API
        // responde na raiz de piquetepro24-backend.fly.dev, sem /api/), mas bastava a API mudar de
        // caminho para o perfil, o contacto do cliente e as listas do admin passarem a ficar no
        // disco do telemóvel, com o URL como chave e sem serem apagados ao sair. Nenhum ecrã precisa
        // de dados da API sem rede: o offline da app é a fila de pedidos (lib/filaOffline.ts).
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
