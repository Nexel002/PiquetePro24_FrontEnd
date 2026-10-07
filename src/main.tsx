import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'
// Fontes alojadas no próprio bundle, e não via fonts.googleapis.com: a CSP do
// vercel.json (style-src/font-src 'self') bloquearia o Google em silêncio e, offline,
// a PWA cairia para a fonte do sistema. Só o subconjunto latin (cobre o português) e
// os pesos usados no tailwind.config.js — cada peso a mais é download em rede 3G.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-600.css'
import '@fontsource/outfit/latin-700.css'
import '@fontsource/outfit/latin-800.css'
import './index.css'
import App from './App.tsx'
import { iniciarAvisoDeVersao } from './lib/pwaUpdate'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Sem isto, quem deixa a PWA aberta (ou nem recarrega o separador) fica numa versão antiga
// para sempre — o service worker novo descarrega em segundo plano mas ninguém o activa.
iniciarAvisoDeVersao({
  registerSW,
  avisar: (aoAceitar) =>
    toast('Há uma nova versão disponível', {
      id: 'nova-versao',
      // Fica até o utilizador decidir: um aviso que desaparece sozinho deixa-o na versão antiga.
      duration: Infinity,
      action: { label: 'Actualizar', onClick: aoAceitar },
    }),
})
