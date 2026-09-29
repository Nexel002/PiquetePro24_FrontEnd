import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
