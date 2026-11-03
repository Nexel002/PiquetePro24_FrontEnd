import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { iniciarActualizacaoAutomatica } from './lib/pwaUpdate'
import { iniciarTratamentoDeFalhaDeCarregamento } from './lib/falhaDeCarregamento'

// Antes de renderizar: uma falha ao descarregar um ecrã (deploy novo a meio) recarrega uma vez.
iniciarTratamentoDeFalhaDeCarregamento()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// A versão nova activa-se sozinha e a página recarrega num momento seguro (lib/novaVersao.ts); o que
// mudou aparece depois, em AvisoDeNovaVersao (montado em App).
iniciarActualizacaoAutomatica({ registerSW })
